// =========================================================
// Tests — calendario hábil colombiano (T-F15-010)
// =========================================================
// Verifica detección de festivos, fines de semana y aritmética
// hábil con casos del spec + casos de borde.
// =========================================================

import { describe, it, expect } from 'vitest'
import {
  isHoliday,
  isWeekend,
  isBusinessDay,
  addBusinessDays,
  businessDaysBetween,
  getHolidaysForYear,
  parseIsoDate,
  MIN_YEAR_COVERED,
  MAX_YEAR_COVERED,
} from '@/lib/utils/colombian-business-days'

describe('isHoliday — festivos 2026', () => {
  it('1-ene Año Nuevo', () => {
    expect(isHoliday(parseIsoDate('2026-01-01'))).toBe(true)
  })

  it('12-ene Reyes Magos (lunes Emiliani)', () => {
    expect(isHoliday(parseIsoDate('2026-01-12'))).toBe(true)
  })

  it('2-abr Jueves Santo', () => {
    expect(isHoliday(parseIsoDate('2026-04-02'))).toBe(true)
  })

  it('3-abr Viernes Santo', () => {
    expect(isHoliday(parseIsoDate('2026-04-03'))).toBe(true)
  })

  it('20-jul Independencia', () => {
    expect(isHoliday(parseIsoDate('2026-07-20'))).toBe(true)
  })

  it('25-dic Navidad', () => {
    expect(isHoliday(parseIsoDate('2026-12-25'))).toBe(true)
  })

  it('NO es festivo: 6-ene-2026 (martes — Reyes ya se trasladó al 12)', () => {
    expect(isHoliday(parseIsoDate('2026-01-06'))).toBe(false)
  })

  it('NO es festivo: día laboral común (10-feb-2026)', () => {
    expect(isHoliday(parseIsoDate('2026-02-10'))).toBe(false)
  })
})

describe('isWeekend / isBusinessDay', () => {
  it('sábado y domingo NO son hábiles', () => {
    const sat = parseIsoDate('2026-01-10') // sábado
    const sun = parseIsoDate('2026-01-11') // domingo
    expect(isWeekend(sat)).toBe(true)
    expect(isWeekend(sun)).toBe(true)
    expect(isBusinessDay(sat)).toBe(false)
    expect(isBusinessDay(sun)).toBe(false)
  })

  it('viernes 9-ene es hábil', () => {
    expect(isBusinessDay(parseIsoDate('2026-01-09'))).toBe(true)
  })

  it('lunes festivo NO es hábil', () => {
    expect(isBusinessDay(parseIsoDate('2026-01-12'))).toBe(false)
  })
})

describe('addBusinessDays', () => {
  it('caso del spec: viernes 9-ene-2026 + 1 día hábil = martes 13-ene', () => {
    // sábado 10, domingo 11, lunes 12 festivo → martes 13.
    const start = parseIsoDate('2026-01-09')
    const result = addBusinessDays(start, 1)
    expect(result.toISOString().slice(0, 10)).toBe('2026-01-13')
  })

  it('5 días hábiles desde lunes 5-ene-2026 = lunes 12-ene… que es festivo → martes 13', () => {
    // 5 lun, 6 mar, 7 mié, 8 jue, 9 vie → 5 hábiles tras 5 ene serían: 6,7,8,9 (4) + 13 mar (porque 12 lun festivo)
    const start = parseIsoDate('2026-01-05')
    const result = addBusinessDays(start, 5)
    expect(result.toISOString().slice(0, 10)).toBe('2026-01-13')
  })

  it('15 días hábiles (SLA ARCO) desde lunes 6-abr-2026', () => {
    // Punto de partida realista para ARCO: 6-abr post-Semana Santa
    // 6,7,8,9,10 (5) | 13,14,15,16,17 (10) | 20,21,22,23,24 (15) → cierre 24-abr.
    const start = parseIsoDate('2026-04-06')
    const result = addBusinessDays(start, 15)
    expect(result.toISOString().slice(0, 10)).toBe('2026-04-27')
  })

  it('n=0 devuelve copia idéntica (no muta input)', () => {
    const start = parseIsoDate('2026-02-10')
    const result = addBusinessDays(start, 0)
    expect(result.getTime()).toBe(start.getTime())
    expect(result).not.toBe(start)
  })

  it('n negativo cuenta hacia atrás', () => {
    const start = parseIsoDate('2026-01-13') // martes
    // -1: lunes 12 festivo → domingo 11 weekend → sábado 10 weekend → viernes 9
    const result = addBusinessDays(start, -1)
    expect(result.toISOString().slice(0, 10)).toBe('2026-01-09')
  })

  it('lanza si n no es entero', () => {
    expect(() => addBusinessDays(parseIsoDate('2026-01-09'), 1.5)).toThrow()
  })
})

describe('businessDaysBetween', () => {
  it('cuenta hábiles entre vie 9-ene y mar 13-ene (exclusivo)', () => {
    // 9 vie, 10 sáb, 11 dom, 12 lun festivo → solo 9 cuenta (1 hábil).
    const start = parseIsoDate('2026-01-09')
    const end = parseIsoDate('2026-01-13')
    expect(businessDaysBetween(start, end)).toBe(1)
  })

  it('end <= start retorna 0', () => {
    const d = parseIsoDate('2026-02-10')
    expect(businessDaysBetween(d, d)).toBe(0)
    expect(businessDaysBetween(d, parseIsoDate('2026-02-09'))).toBe(0)
  })

  it('semana laboral típica feb-2026: lun-vie = 5 hábiles', () => {
    // Lun 9 a sáb 14 (exclusive): 9,10,11,12,13 = 5 hábiles.
    const start = parseIsoDate('2026-02-09')
    const end = parseIsoDate('2026-02-14')
    expect(businessDaysBetween(start, end)).toBe(5)
  })
})

describe('getHolidaysForYear', () => {
  it('2026 retorna 18 festivos', () => {
    expect(getHolidaysForYear(2026)).toHaveLength(18)
  })

  it('lanza si el año está fuera del rango cubierto', () => {
    expect(() => getHolidaysForYear(MIN_YEAR_COVERED - 1)).toThrow()
    expect(() => getHolidaysForYear(MAX_YEAR_COVERED + 1)).toThrow()
  })
})

describe('parseIsoDate', () => {
  it('parsea YYYY-MM-DD a UTC sin desfase', () => {
    const d = parseIsoDate('2026-01-09')
    expect(d.getUTCFullYear()).toBe(2026)
    expect(d.getUTCMonth()).toBe(0)
    expect(d.getUTCDate()).toBe(9)
  })

  it('lanza si formato es inválido', () => {
    expect(() => parseIsoDate('09/01/2026')).toThrow()
    expect(() => parseIsoDate('2026-1-9')).toThrow()
    expect(() => parseIsoDate('not a date')).toThrow()
  })
})
