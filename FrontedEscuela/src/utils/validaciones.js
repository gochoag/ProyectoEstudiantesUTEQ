/**
 * Validación de cédula ecuatoriana según normas oficiales
 * @param {string} cedula - Número de cédula a validar
 * @returns {Object} - Objeto con estado de validación y mensaje de error
 */
export const validarCedulaEcuatoriana = (cedula) => {
  // Resultado por defecto
  const resultado = {
    esValida: false,
    mensaje: ''
  };

  // 1. Verificar que la cédula exista
  if (!cedula || (typeof cedula !== 'string' && typeof cedula !== 'number')) {
    resultado.mensaje = 'La cédula es requerida';
    return resultado;
  }

  // Convertir a string si es número y eliminar espacios
  const cedulaLimpia = String(cedula).trim().replace(/\D/g, '');
  
  if (cedulaLimpia.length === 0) {
    resultado.mensaje = 'La cédula es requerida';
    return resultado;
  }
  
  // 2. Verificar que tenga exactamente 10 dígitos
  if (cedulaLimpia.length !== 10) {
    resultado.mensaje = 'La cédula debe tener exactamente 10 dígitos';
    return resultado;
  }

  // 3. Verificar que solo contenga dígitos
  if (!/^\d{10}$/.test(cedulaLimpia)) {
    resultado.mensaje = 'La cédula debe contener solo números';
    return resultado;
  }

  // 4. Verificar código de provincia (primeros dos dígitos)
  // En Ecuador hay 24 provincias, código válido: 01-24
  const provincia = parseInt(cedulaLimpia.substring(0, 2), 10);
  if (provincia < 1 || provincia > 24) {
    resultado.mensaje = 'La cédula no es ecuatoriana';
    return resultado;
  }

  // 5. Verificar tercer dígito (tipo de documento)
  // Para cédulas de ciudadanía debe ser menor a 6
  const tercerDigito = parseInt(cedulaLimpia.charAt(2), 10);
  if (tercerDigito >= 6) {
    resultado.mensaje = 'La cédula no es ecuatoriana';
    return resultado;
  }

  // 6. Algoritmo de validación del último dígito (dígito verificador - módulo 10)
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  const verificador = parseInt(cedulaLimpia.charAt(9), 10);
  
  let suma = 0;
  for (let i = 0; i < coeficientes.length; i++) {
    let valor = parseInt(cedulaLimpia.charAt(i), 10) * coeficientes[i];
    if (valor > 9) {
      valor -= 9;
    }
    suma += valor;
  }

  const digitoVerificador = (suma % 10 === 0) ? 0 : 10 - (suma % 10);
  
  if (verificador !== digitoVerificador) {
    resultado.mensaje = 'La cédula no es ecuatoriana';
    return resultado;
  }

  // Si pasó todas las validaciones
  resultado.esValida = true;
  resultado.mensaje = 'Cédula válida';
  return resultado;
};