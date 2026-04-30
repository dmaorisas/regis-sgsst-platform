// =========================================================
// NIT validator — Algoritmo módulo 11 (DIAN)
// =========================================================
// Tarea: T-F15-009
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/27
//
// El NIT (Número de Identificación Tributaria) colombiano se compone
// de un número base (9–10 dígitos) y un dígito de verificación (DV).
// La DIAN calcula el DV con un algoritmo de módulo 11 con pesos
// 3,7,13,17,19,23,29,37,41,43, aplicados de derecha (menos
// significativo) a izquierda (más significativo) sobre el número base.
//
// Fórmula:
//   suma = Σ digito[n-1-i] * pesos[i]
//   resto = suma % 11
//   DV    = resto >= 2 ? 11 - resto : resto
//
// Decisiones técnicas (R7):
//  - Aceptamos varios formatos de entrada: con/sin guiones, puntos,
//    espacios. Internamente normalizamos antes de validar.
//  - Aceptamos longitudes de 9 ó 10 dígitos para el número base
//    (NITs de empresa típicamente arrancan con 800/830/860/890/900/901;
//    longitudes ≥ 9 dígitos según historicidad DIAN). Total: 10–11 dígitos
//    incluyendo el DV.
//  - El campo `reason` usa códigos estables ('formato_invalido',
//    'digito_verificacion_incorrecto') para que la UI los traduzca y
//    los tests no se rompan al cambiar copys.
//  - NIT spec del issue (`900123456-7`) usa un DV "ficticio" — el
//    algoritmo correcto da DV=8. Nuestro test fixture verifica con
//    NITs REALES (Bavaria 860007738-9, EPM 890903938-8, etc.). Ver
//    flag_concern en el reporte de ejecución.
// =========================================================

/** Resultado de validación. `reason` solo se entrega si `valid=false`. */
export type NitValidationResult = {
  valid: boolean
  reason?: 'formato_invalido' | 'digito_verificacion_incorrecto'
  /** DV calculado por el algoritmo (debug / UI helper). */
  computedCheckDigit?: number
}

/** Pesos del algoritmo módulo 11 (DIAN), de menos a más significativo. */
const DIAN_WEIGHTS = [3, 7, 13, 17, 19, 23, 29, 37, 41, 43] as const

/**
 * Valida un NIT colombiano. Acepta formatos como `900.123.456-8`,
 * `900123456-8`, `900123456 8`, `9001234568`.
 *
 * @example
 *   validateNIT('860007738-9')   // → { valid: true,  computedCheckDigit: 9 }
 *   validateNIT('900123456-1')   // → { valid: false, reason: 'digito_verificacion_incorrecto' }
 *   validateNIT('abc-1')         // → { valid: false, reason: 'formato_invalido' }
 */
export function validateNIT(nit: string): NitValidationResult {
  if (typeof nit !== 'string' || nit.length === 0) {
    return { valid: false, reason: 'formato_invalido' }
  }

  // Normalizar: quitar espacios, puntos, guiones.
  const cleaned = nit.replace(/[\s.\-_]/g, '')

  // El total (base + DV) debe ser 10 u 11 dígitos.
  if (!/^\d{10,11}$/.test(cleaned)) {
    return { valid: false, reason: 'formato_invalido' }
  }

  const baseNumber = cleaned.slice(0, -1)
  const expectedCheck = parseInt(cleaned.slice(-1), 10)
  const computed = computeCheckDigit(baseNumber)

  if (computed !== expectedCheck) {
    return {
      valid: false,
      reason: 'digito_verificacion_incorrecto',
      computedCheckDigit: computed,
    }
  }

  return { valid: true, computedCheckDigit: computed }
}

/**
 * Calcula el dígito de verificación módulo 11 para un número base
 * (9–10 dígitos). Útil para autocompletar el NIT cuando el usuario
 * solo ingresa el número.
 *
 * @throws Si el input no es estrictamente 9–10 dígitos.
 */
export function computeCheckDigit(baseNumber: string): number {
  if (!/^\d{9,10}$/.test(baseNumber)) {
    throw new Error(`computeCheckDigit: base debe tener 9-10 dígitos, recibido "${baseNumber}"`)
  }
  let sum = 0
  for (let i = 0; i < baseNumber.length; i++) {
    const ch = baseNumber.charAt(baseNumber.length - 1 - i)
    const digit = parseInt(ch, 10)
    const weight = DIAN_WEIGHTS[i] ?? 0
    sum += digit * weight
  }
  const remainder = sum % 11
  return remainder >= 2 ? 11 - remainder : remainder
}

/**
 * Formatea un NIT al estilo DIAN: `900.123.456-8`. Si el input está
 * incompleto o malformado, devuelve el original sin tocarlo (no lanza).
 */
export function formatNIT(rawNit: string): string {
  if (typeof rawNit !== 'string') return rawNit
  const cleaned = rawNit.replace(/[\s.\-_]/g, '')
  if (!/^\d{10,11}$/.test(cleaned)) return rawNit
  const number = cleaned.slice(0, -1)
  const check = cleaned.slice(-1)
  // Insertar puntos cada 3 dígitos desde la derecha.
  const formatted = number.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${formatted}-${check}`
}
