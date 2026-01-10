const express = require('express');
const cors = require('cors');
const { Client, LocalAuth, MessageMedia } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3001;

// ==================== CONFIGURACIÓN DE COLA ====================
// Ajusta estos valores para balancear velocidad vs seguridad
// Modo Rápido (~4 min para 100 msgs): MIN=1000, MAX=3500
// Modo Seguro (~29 min para 100 msgs): MIN=10000, MAX=25000
const DELAY_MIN_MS = 1000;  // 1 segundo mínimo entre mensajes
const DELAY_MAX_MS = 3500;  // 3.5 segundos máximo entre mensajes
const DELAY_AVERAGE_MS = (DELAY_MIN_MS + DELAY_MAX_MS) / 2; // Para calcular tiempo estimado

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Estado global
let qrCodeData = null;
let clientStatus = 'disconnected'; // disconnected, qr, authenticated, ready

// ==================== SISTEMA DE COLA ====================
const messageQueue = [];
let isProcessingQueue = false;
let queueStats = {
    totalEnqueued: 0,
    totalSent: 0,
    totalFailed: 0,
    currentBatchId: null,
    currentBatchTotal: 0,
    currentBatchSent: 0,
    startTime: null,
    estimatedEndTime: null
};

// Función para generar delay aleatorio
function getRandomDelay() {
    return Math.floor(Math.random() * (DELAY_MAX_MS - DELAY_MIN_MS + 1)) + DELAY_MIN_MS;
}

// Función para esperar
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Generar ID único para batch
function generateBatchId() {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Procesar cola de mensajes
async function processQueue() {
    if (isProcessingQueue) return;
    if (messageQueue.length === 0) return;
    if (clientStatus !== 'ready') {
        console.log('⏸️ Cola pausada: WhatsApp no está listo');
        return;
    }

    isProcessingQueue = true;
    console.log(`🚀 Iniciando procesamiento de cola: ${messageQueue.length} mensajes pendientes`);

    while (messageQueue.length > 0 && clientStatus === 'ready') {
        const item = messageQueue.shift();
        const delay = getRandomDelay();

        try {
            // Formatear número
            let formattedPhone = item.phone.replace(/[^0-9]/g, '');
            if (!formattedPhone.endsWith('@c.us')) {
                formattedPhone = formattedPhone + '@c.us';
            }

            let result;

            if (item.type === 'text') {
                // Enviar mensaje de texto
                result = await client.sendMessage(formattedPhone, item.message);
            } else if (item.type === 'media') {
                // Enviar mensaje con media
                let media;
                if (item.mediaBase64) {
                    media = new MessageMedia(
                        item.mimeType || 'image/jpeg',
                        item.mediaBase64,
                        item.filename || 'image.jpg'
                    );
                } else if (item.mediaUrl) {
                    media = await MessageMedia.fromUrl(item.mediaUrl, { unsafeMime: true });
                }
                result = await client.sendMessage(formattedPhone, media, {
                    caption: item.message || ''
                });
            }

            queueStats.totalSent++;
            queueStats.currentBatchSent++;

            console.log(`📤 [${queueStats.currentBatchSent}/${queueStats.currentBatchTotal}] Enviado a ${item.phone}`);

            // Broadcast progreso por WebSocket
            broadcast('queue_progress', {
                batchId: item.batchId,
                phone: item.phone,
                status: 'sent',
                messageId: result?.id?._serialized || null,
                progress: {
                    sent: queueStats.currentBatchSent,
                    total: queueStats.currentBatchTotal,
                    remaining: messageQueue.length,
                    percentComplete: Math.round((queueStats.currentBatchSent / queueStats.currentBatchTotal) * 100)
                }
            });

            // Resolver la promesa del item
            if (item.resolve) {
                item.resolve({ success: true, messageId: result?.id?._serialized });
            }

        } catch (error) {
            queueStats.totalFailed++;
            console.error(`❌ Error enviando a ${item.phone}:`, error.message);

            broadcast('queue_progress', {
                batchId: item.batchId,
                phone: item.phone,
                status: 'failed',
                error: error.message,
                progress: {
                    sent: queueStats.currentBatchSent,
                    total: queueStats.currentBatchTotal,
                    remaining: messageQueue.length,
                    percentComplete: Math.round((queueStats.currentBatchSent / queueStats.currentBatchTotal) * 100)
                }
            });

            if (item.reject) {
                item.reject(error);
            }
        }

        // Esperar antes del próximo mensaje (si quedan más)
        if (messageQueue.length > 0) {
            console.log(`⏳ Esperando ${delay}ms antes del siguiente mensaje...`);
            await sleep(delay);
        }
    }

    // Cola terminada
    if (messageQueue.length === 0) {
        console.log('✅ Cola de mensajes procesada completamente');
        broadcast('queue_complete', {
            batchId: queueStats.currentBatchId,
            totalSent: queueStats.currentBatchSent,
            totalFailed: queueStats.totalFailed,
            duration: Date.now() - queueStats.startTime
        });

        // Reset stats del batch actual
        queueStats.currentBatchId = null;
        queueStats.currentBatchTotal = 0;
        queueStats.currentBatchSent = 0;
        queueStats.startTime = null;
        queueStats.estimatedEndTime = null;
    }

    isProcessingQueue = false;
}

// Crear servidor HTTP
const server = http.createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server });

// Broadcast a todos los clientes WebSocket
function broadcast(type, data) {
    const message = JSON.stringify({ type, data });
    wss.clients.forEach(client => {
        if (client.readyState === 1) { // WebSocket.OPEN
            client.send(message);
        }
    });
}

// Cliente de WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: './.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu'
        ]
    }
});

// Eventos de WhatsApp
client.on('qr', async (qr) => {
    console.log('📱 QR Code recibido');
    qrcodeTerminal.generate(qr, { small: true });
    
    try {
        qrCodeData = await qrcode.toDataURL(qr);
        clientStatus = 'qr';
        broadcast('qr', qrCodeData);
        broadcast('status', clientStatus);
    } catch (err) {
        console.error('Error generando QR:', err);
    }
});

client.on('authenticated', () => {
    console.log('✅ Autenticado correctamente');
    clientStatus = 'authenticated';
    qrCodeData = null;
    broadcast('authenticated', true);
    broadcast('status', clientStatus);
});

client.on('ready', () => {
    console.log('🚀 WhatsApp listo para enviar mensajes');
    clientStatus = 'ready';
    broadcast('ready', true);
    broadcast('status', clientStatus);

    // Si hay mensajes en cola, comenzar a procesarlos
    if (messageQueue.length > 0) {
        processQueue();
    }
});

client.on('disconnected', (reason) => {
    console.log('❌ Desconectado:', reason);
    clientStatus = 'disconnected';
    qrCodeData = null;
    broadcast('disconnected', reason);
    broadcast('status', clientStatus);
});

client.on('auth_failure', (msg) => {
    console.error('🔴 Error de autenticación:', msg);
    clientStatus = 'disconnected';
    broadcast('auth_failure', msg);
    broadcast('status', clientStatus);
});

// Inicializar cliente WhatsApp
console.log('🔄 Inicializando cliente de WhatsApp...');
client.initialize().catch(err => {
    console.error('Error inicializando cliente:', err);
});

// ==================== ENDPOINTS REST ====================

// Estado del servicio
app.get('/status', (req, res) => {
    res.json({
        status: clientStatus,
        timestamp: new Date().toISOString(),
        queue: {
            pending: messageQueue.length,
            processing: isProcessingQueue,
            stats: queueStats
        }
    });
});

// Obtener estado de la cola
app.get('/queue/status', (req, res) => {
    res.json({
        success: true,
        queue: {
            pending: messageQueue.length,
            processing: isProcessingQueue,
            currentBatchId: queueStats.currentBatchId,
            currentBatchTotal: queueStats.currentBatchTotal,
            currentBatchSent: queueStats.currentBatchSent,
            percentComplete: queueStats.currentBatchTotal > 0 
                ? Math.round((queueStats.currentBatchSent / queueStats.currentBatchTotal) * 100) 
                : 0,
            estimatedEndTime: queueStats.estimatedEndTime,
            stats: {
                totalEnqueued: queueStats.totalEnqueued,
                totalSent: queueStats.totalSent,
                totalFailed: queueStats.totalFailed
            }
        },
        config: {
            delayMin: DELAY_MIN_MS,
            delayMax: DELAY_MAX_MS,
            delayAverage: DELAY_AVERAGE_MS
        }
    });
});

// Obtener QR actual
app.get('/qr', (req, res) => {
    if (clientStatus === 'ready' || clientStatus === 'authenticated') {
        return res.json({
            success: false,
            message: 'Ya autenticado, no se necesita QR',
            status: clientStatus
        });
    }
    
    if (!qrCodeData) {
        return res.json({
            success: false,
            message: 'QR no disponible aún, espere...',
            status: clientStatus
        });
    }
    
    res.json({
        success: true,
        qr: qrCodeData,
        status: clientStatus
    });
});

// ==================== ENVÍO DE MENSAJES (CON COLA) ====================

// Enviar mensajes en lote (NUEVO - Endpoint principal para campañas)
app.post('/send-bulk', async (req, res) => {
    const { messages } = req.body;
    
    // messages debe ser un array: [{ phone, message, mediaUrl?, mediaBase64?, mimeType?, filename? }]
    if (!Array.isArray(messages) || messages.length === 0) {
        return res.status(400).json({
            success: false,
            error: 'Se requiere un array "messages" con al menos un elemento'
        });
    }

    if (clientStatus !== 'ready') {
        return res.status(400).json({
            success: false,
            error: 'WhatsApp no está listo. Estado actual: ' + clientStatus
        });
    }

    const batchId = generateBatchId();
    const totalMessages = messages.length;
    const estimatedTimeMs = totalMessages * DELAY_AVERAGE_MS;
    const estimatedEndTime = new Date(Date.now() + estimatedTimeMs);

    // Actualizar stats del batch
    queueStats.currentBatchId = batchId;
    queueStats.currentBatchTotal = totalMessages;
    queueStats.currentBatchSent = 0;
    queueStats.startTime = Date.now();
    queueStats.estimatedEndTime = estimatedEndTime.toISOString();

    // Encolar todos los mensajes
    messages.forEach((msg, index) => {
        const queueItem = {
            batchId,
            index,
            phone: msg.phone,
            message: msg.message || '',
            type: (msg.mediaUrl || msg.mediaBase64) ? 'media' : 'text',
            mediaUrl: msg.mediaUrl || null,
            mediaBase64: msg.mediaBase64 || null,
            mimeType: msg.mimeType || null,
            filename: msg.filename || null,
            enqueuedAt: new Date().toISOString()
        };
        messageQueue.push(queueItem);
        queueStats.totalEnqueued++;
    });

    console.log(`📥 Batch ${batchId}: ${totalMessages} mensajes encolados`);

    // Iniciar procesamiento de cola
    processQueue();

    // Responder inmediatamente al cliente
    res.json({
        success: true,
        message: `${totalMessages} mensajes encolados para envío`,
        batchId,
        totalMessages,
        estimatedTimeSeconds: Math.round(estimatedTimeMs / 1000),
        estimatedTimeFormatted: formatTime(estimatedTimeMs),
        estimatedEndTime: estimatedEndTime.toISOString(),
        tip: 'Usa WebSocket o GET /queue/status para monitorear el progreso'
    });
});

// Enviar mensaje individual (ahora usa la cola)
app.post('/send-message', async (req, res) => {
    const { phone, message } = req.body;
    
    if (!phone || !message) {
        return res.status(400).json({
            success: false,
            error: 'Se requiere phone y message'
        });
    }
    
    if (clientStatus !== 'ready') {
        return res.status(400).json({
            success: false,
            error: 'WhatsApp no está listo. Estado actual: ' + clientStatus
        });
    }
    
    const batchId = generateBatchId();
    
    // Si no hay batch activo, crear uno nuevo
    if (!queueStats.currentBatchId) {
        queueStats.currentBatchId = batchId;
        queueStats.currentBatchTotal = 1;
        queueStats.currentBatchSent = 0;
        queueStats.startTime = Date.now();
    } else {
        queueStats.currentBatchTotal++;
    }

    const queueItem = {
        batchId: queueStats.currentBatchId,
        phone,
        message,
        type: 'text',
        enqueuedAt: new Date().toISOString()
    };

    messageQueue.push(queueItem);
    queueStats.totalEnqueued++;

    console.log(`📥 Mensaje encolado para ${phone}`);

    // Iniciar procesamiento
    processQueue();

    res.json({
        success: true,
        message: 'Mensaje encolado para envío',
        batchId: queueStats.currentBatchId,
        queuePosition: messageQueue.length,
        to: phone
    });
});

// Cerrar sesión
app.post('/logout', async (req, res) => {
    try {
        if (clientStatus === 'ready' || clientStatus === 'authenticated') {
            await client.logout();
            console.log('👋 Sesión cerrada');
        }
        
        clientStatus = 'disconnected';
        qrCodeData = null;
        
        res.json({
            success: true,
            message: 'Sesión cerrada correctamente'
        });
        
        // Reinicializar cliente para nuevo QR
        setTimeout(() => {
            client.initialize().catch(err => {
                console.error('Error reinicializando:', err);
            });
        }, 2000);
        
    } catch (error) {
        console.error('Error cerrando sesión:', error);
        res.status(500).json({
            success: false,
            error: 'Error al cerrar sesión: ' + error.message
        });
    }
});

// Enviar mensaje con imagen (ahora usa la cola)
app.post('/send-media', async (req, res) => {
    const { phone, message, mediaUrl, mediaBase64, mimeType, filename } = req.body;
    
    if (!phone) {
        return res.status(400).json({
            success: false,
            error: 'Se requiere phone'
        });
    }
    
    if (!mediaUrl && !mediaBase64) {
        return res.status(400).json({
            success: false,
            error: 'Se requiere mediaUrl o mediaBase64'
        });
    }
    
    if (clientStatus !== 'ready') {
        return res.status(400).json({
            success: false,
            error: 'WhatsApp no está listo. Estado actual: ' + clientStatus
        });
    }
    
    const batchId = generateBatchId();
    
    if (!queueStats.currentBatchId) {
        queueStats.currentBatchId = batchId;
        queueStats.currentBatchTotal = 1;
        queueStats.currentBatchSent = 0;
        queueStats.startTime = Date.now();
    } else {
        queueStats.currentBatchTotal++;
    }

    const queueItem = {
        batchId: queueStats.currentBatchId,
        phone,
        message: message || '',
        type: 'media',
        mediaUrl,
        mediaBase64,
        mimeType,
        filename,
        enqueuedAt: new Date().toISOString()
    };

    messageQueue.push(queueItem);
    queueStats.totalEnqueued++;

    console.log(`📥 Media encolada para ${phone}`);

    // Iniciar procesamiento
    processQueue();

    res.json({
        success: true,
        message: 'Media encolada para envío',
        batchId: queueStats.currentBatchId,
        queuePosition: messageQueue.length,
        to: phone
    });
});

// Cancelar cola de mensajes
app.post('/queue/cancel', (req, res) => {
    const cancelledCount = messageQueue.length;
    messageQueue.length = 0; // Vaciar la cola

    console.log(`🛑 Cola cancelada: ${cancelledCount} mensajes eliminados`);

    broadcast('queue_cancelled', {
        batchId: queueStats.currentBatchId,
        cancelledCount
    });

    res.json({
        success: true,
        message: `Cola cancelada. ${cancelledCount} mensajes eliminados.`,
        cancelledCount
    });
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'wa-node-service' });
});

// Función auxiliar para formatear tiempo
function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes > 0) {
        return `${minutes} min ${remainingSeconds} seg`;
    }
    return `${seconds} seg`;
}

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('🔌 Cliente WebSocket conectado');
    
    // Enviar estado actual al conectarse
    ws.send(JSON.stringify({ type: 'status', data: clientStatus }));
    
    if (qrCodeData && clientStatus === 'qr') {
        ws.send(JSON.stringify({ type: 'qr', data: qrCodeData }));
    }

    // Enviar estado de la cola
    ws.send(JSON.stringify({
        type: 'queue_status',
        data: {
            pending: messageQueue.length,
            processing: isProcessingQueue,
            stats: queueStats
        }
    }));
    
    ws.on('close', () => {
        console.log('🔌 Cliente WebSocket desconectado');
    });
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`🌐 Servidor WhatsApp corriendo en puerto ${PORT}`);
    console.log(`   REST API: http://localhost:${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
    console.log(`   ⚙️ Configuración de cola:`);
    console.log(`      - Delay mínimo: ${DELAY_MIN_MS}ms`);
    console.log(`      - Delay máximo: ${DELAY_MAX_MS}ms`);
    console.log(`      - Tiempo estimado para 100 msg: ${formatTime(100 * DELAY_AVERAGE_MS)}`);
});
