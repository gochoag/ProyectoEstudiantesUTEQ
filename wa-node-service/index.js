const express = require('express');
const cors = require('cors');
const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const { WebSocketServer } = require('ws');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Estado global
let qrCodeData = null;
let clientStatus = 'disconnected'; // disconnected, qr, authenticated, ready

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
    
    // Generar QR como imagen base64
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
        timestamp: new Date().toISOString()
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

// Enviar mensaje
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
    
    try {
        // Formatear número (agregar @c.us si no lo tiene)
        let formattedPhone = phone.replace(/[^0-9]/g, '');
        if (!formattedPhone.endsWith('@c.us')) {
            formattedPhone = formattedPhone + '@c.us';
        }
        
        // Enviar mensaje
        const result = await client.sendMessage(formattedPhone, message);
        
        console.log(`📤 Mensaje enviado a ${phone}`);
        
        res.json({
            success: true,
            message: 'Mensaje enviado correctamente',
            messageId: result.id._serialized,
            to: phone
        });
    } catch (error) {
        console.error('Error enviando mensaje:', error);
        res.status(500).json({
            success: false,
            error: 'Error al enviar mensaje: ' + error.message
        });
    }
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

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', service: 'wa-node-service' });
});

// WebSocket connection handler
wss.on('connection', (ws) => {
    console.log('🔌 Cliente WebSocket conectado');
    
    // Enviar estado actual al conectarse
    ws.send(JSON.stringify({ type: 'status', data: clientStatus }));
    
    if (qrCodeData && clientStatus === 'qr') {
        ws.send(JSON.stringify({ type: 'qr', data: qrCodeData }));
    }
    
    ws.on('close', () => {
        console.log('🔌 Cliente WebSocket desconectado');
    });
});

// Iniciar servidor
server.listen(PORT, () => {
    console.log(`🌐 Servidor WhatsApp corriendo en puerto ${PORT}`);
    console.log(`   REST API: http://localhost:${PORT}`);
    console.log(`   WebSocket: ws://localhost:${PORT}`);
});
