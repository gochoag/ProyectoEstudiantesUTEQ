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

  // 1. Verificar que tenga 10 dígitos
  if (!cedula || typeof cedula !== 'string') {
    resultado.mensaje = 'La cédula es requerida';
    return resultado;
  }

  // Eliminar espacios y asegurar que solo contenga dígitos
  const cedulaLimpia = cedula.trim().replace(/\D/g, '');
  
  if (cedulaLimpia.length !== 10) {
    resultado.mensaje = 'La cédula debe tener exactamente 10 dígitos';
    return resultado;
  }

  // 2. Verificar que solo contenga dígitos
  if (!/^\d{10}$/.test(cedulaLimpia)) {
    resultado.mensaje = 'La cédula debe contener solo dígitos';
    return resultado;
  }

  // 3. Verificar código de provincia (primeros dos dígitos)
  const provincia = parseInt(cedulaLimpia.substring(0, 2), 10);
  if (provincia < 1 || provincia > 24) {
    resultado.mensaje = 'La cedula no es valida';
    return resultado;
  }

  // 4. Verificar tercer dígito (menor a 6)
  const tercerDigito = parseInt(cedulaLimpia.charAt(2), 10);
  if (tercerDigito >= 6) {
    resultado.mensaje = 'La cedula no es valida';
    return resultado;
  }

  // 5. Algoritmo de validación del último dígito (dígito verificador)
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
    resultado.mensaje = 'La cédula no es válida';
    return resultado;
  }

  // Si pasó todas las validaciones
  resultado.esValida = true;
  return resultado;
};