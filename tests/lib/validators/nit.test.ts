// =========================================================
// Tests — validateNIT (T-F15-009)
// =========================================================
// Caso fixture verificado contra NITs REALES de empresas colombianas,
// no contra los ejemplos del issue (que usan DV ficticios).
//
// Referencias:
//   - Bavaria S.A.: 860007738-9   (DV correcto: 9)
//   - EPM:          890903938-8   (DV correcto: 8)
//   - Ecopetrol:    899999068-1   (DV correcto: 1)
//   - El issue lista `900123456-7` como válido pero el algoritmo
//     módulo 11 DIAN entrega DV=8 para el base 900123456 — ver
//     flag_concern en el reporte de ejecución de T-F15-009.
// =========================================================

import { describe, it, expect } from 'vitest'
import { validateNIT, computeCheckDigit, formatNIT } from '@/lib/validators/nit'

describe('validateNIT — NITs reales (positivos)', () => {
  it('valida Bavaria S.A. (860007738-9)', () => {
    const result = validateNIT('860007738-9')
    expect(result.valid).toBe(true)
    expect(result.computedCheckDigit).toBe(9)
  })

  it('valida EPM (890903938-8)', () => {
    const result = validateNIT('890903938-8')
    expect(result.valid).toBe(true)
    expect(result.computedCheckDigit).toBe(8)
  })

  it('valida 830987654-3 (NIT spec del issue, DV correcto)', () => {
    const result = validateNIT('830987654-3')
    expect(result.valid).toBe(true)
    expect(result.computedCheckDigit).toBe(3)
  })

  it('acepta NIT con puntos y guion (formato DIAN)', () => {
    expect(validateNIT('860.007.738-9').valid).toBe(true)
  })

  it('acepta NIT sin separadores', () => {
    expect(validateNIT('8600077389').valid).toBe(true)
  })

  it('acepta NIT con espacios', () => {
    expect(validateNIT(' 860 007 738 9 ').valid).toBe(true)
  })
})

describe('validateNIT — DV incorrecto', () => {
  it('rechaza 860007738-0 (DV mal)', () => {
    const result = validateNIT('860007738-0')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('digito_verificacion_incorrecto')
    expect(result.computedCheckDigit).toBe(9)
  })

  it('rechaza 900123456-1 (DV mal — el correcto sería 8)', () => {
    const result = validateNIT('900123456-1')
    expect(result.valid).toBe(false)
    expect(result.reason).toBe('digito_verificacion_incorrecto')
    expect(result.computedCheckDigit).toBe(8)
  })

  it('rechaza 900123456-7 (DV ficticio del spec — correcto es 8)', () => {
    // Documenta que el ejemplo del issue está mal: el módulo 11 DIAN
    // sobre 900123456 entrega 8, no 7. Test guard contra reintroducción.
    const result = validateNIT('900123456-7')
    expect(result.valid).toBe(false)
    expect(result.computedCheckDigit).toBe(8)
  })
})

describe('validateNIT — formato inválido', () => {
  it('rechaza string vacío', () => {
    expect(validateNIT('').valid).toBe(false)
    expect(validateNIT('').reason).toBe('formato_invalido')
  })

  it('rechaza valor con letras (abc-1)', () => {
    expect(validateNIT('abc-1').valid).toBe(false)
    expect(validateNIT('abc-1').reason).toBe('formato_invalido')
  })

  it('rechaza NIT muy corto (8 dígitos totales)', () => {
    expect(validateNIT('12345678').valid).toBe(false)
    expect(validateNIT('12345678').reason).toBe('formato_invalido')
  })

  it('rechaza NIT muy largo (12 dígitos totales)', () => {
    expect(validateNIT('123456789012').valid).toBe(false)
    expect(validateNIT('123456789012').reason).toBe('formato_invalido')
  })

  it('rechaza input no-string', () => {
    // @ts-expect-error null is not assignable to string; verificamos contrato runtime
    expect(validateNIT(null).valid).toBe(false)
    // @ts-expect-error undefined is not assignable to string; verificamos contrato runtime
    expect(validateNIT(undefined).valid).toBe(false)
    // @ts-expect-error number is not assignable to string; verificamos contrato runtime
    expect(validateNIT(900123456).valid).toBe(false)
  })
})

describe('computeCheckDigit', () => {
  it('calcula 9 para 860007738', () => {
    expect(computeCheckDigit('860007738')).toBe(9)
  })

  it('calcula 8 para 890903938', () => {
    expect(computeCheckDigit('890903938')).toBe(8)
  })

  it('calcula 8 para 900123456 (no 7 como dice el spec del issue)', () => {
    expect(computeCheckDigit('900123456')).toBe(8)
  })

  it('lanza si recibe base mal formada', () => {
    expect(() => computeCheckDigit('123')).toThrow()
    expect(() => computeCheckDigit('abc')).toThrow()
  })
})

describe('formatNIT', () => {
  it('formatea 8600077389 → 860.007.738-9', () => {
    expect(formatNIT('8600077389')).toBe('860.007.738-9')
  })

  it('respeta input ya formateado', () => {
    expect(formatNIT('860.007.738-9')).toBe('860.007.738-9')
  })

  it('devuelve input sin tocar si está malformado', () => {
    expect(formatNIT('abc')).toBe('abc')
    expect(formatNIT('123')).toBe('123')
  })
})
