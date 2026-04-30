// =========================================================
// Tests — Chapter Classifier (T-F1-015)
// =========================================================

import { describe, it, expect } from 'vitest'
import { classifyCompany, getApplicableStandards } from '@/domain/compliance/chapter-classifier'
import type { Standard } from '@/domain/compliance/types'

describe('classifyCompany', () => {
  it('6 trab + riesgo 1 → Capítulo I', () => {
    expect(classifyCompany({ numero_trabajadores: 6, clase_riesgo: 1 })).toBe('I')
  })

  it('10 trab + riesgo 3 → Capítulo I (límite superior)', () => {
    expect(classifyCompany({ numero_trabajadores: 10, clase_riesgo: 3 })).toBe('I')
  })

  it('11 trab + riesgo 1 → Capítulo II (límite inferior)', () => {
    expect(classifyCompany({ numero_trabajadores: 11, clase_riesgo: 1 })).toBe('II')
  })

  it('49 trab + riesgo 3 → Capítulo II (límite superior)', () => {
    expect(classifyCompany({ numero_trabajadores: 49, clase_riesgo: 3 })).toBe('II')
  })

  it('50 trab + riesgo 1 → Capítulo III (límite inferior)', () => {
    expect(classifyCompany({ numero_trabajadores: 50, clase_riesgo: 1 })).toBe('III')
  })

  it('5 trab + riesgo 4 → Capítulo III (riesgo alto fuerza Cap III)', () => {
    expect(classifyCompany({ numero_trabajadores: 5, clase_riesgo: 4 })).toBe('III')
  })

  it('1 trab + riesgo 5 → Capítulo III (riesgo V)', () => {
    expect(classifyCompany({ numero_trabajadores: 1, clase_riesgo: 5 })).toBe('III')
  })

  it('100 trab + riesgo 5 → Capítulo III', () => {
    expect(classifyCompany({ numero_trabajadores: 100, clase_riesgo: 5 })).toBe('III')
  })

  it('lanza error si numero_trabajadores < 0', () => {
    expect(() => classifyCompany({ numero_trabajadores: -1, clase_riesgo: 1 })).toThrow()
  })

  it('lanza error si clase_riesgo fuera de 1..5', () => {
    expect(() =>
      classifyCompany({
        numero_trabajadores: 10,
        // @ts-expect-error testeando guard
        clase_riesgo: 6,
      }),
    ).toThrow()
  })
})

describe('getApplicableStandards', () => {
  const std = (n: string, flags: { i: boolean; ii: boolean; iii: boolean }): Standard => ({
    id: n,
    standard_number: n,
    weight_capitulo_iii: 1,
    cycle_phva: 'Planear',
    applies_chapter_i: flags.i,
    applies_chapter_ii: flags.ii,
    applies_chapter_iii: flags.iii,
  })

  const all: Standard[] = [
    std('1.1.1', { i: true, ii: true, iii: true }),
    std('1.1.2', { i: false, ii: false, iii: true }),
    std('1.1.3', { i: false, ii: true, iii: true }),
    std('2.5.1', { i: false, ii: false, iii: true }),
  ]

  it('Capítulo I retorna solo los marcados applies_chapter_i', () => {
    const out = getApplicableStandards('I', all)
    expect(out.map((s) => s.standard_number)).toEqual(['1.1.1'])
  })

  it('Capítulo II retorna los que aplican a II', () => {
    const out = getApplicableStandards('II', all)
    expect(out.map((s) => s.standard_number)).toEqual(['1.1.1', '1.1.3'])
  })

  it('Capítulo III retorna todos los marcados applies_chapter_iii', () => {
    const out = getApplicableStandards('III', all)
    expect(out.map((s) => s.standard_number)).toEqual(['1.1.1', '1.1.2', '1.1.3', '2.5.1'])
  })

  it('preserva el orden de entrada (estable)', () => {
    const reversed = [...all].reverse()
    const out = getApplicableStandards('III', reversed)
    expect(out.map((s) => s.standard_number)).toEqual(['2.5.1', '1.1.3', '1.1.2', '1.1.1'])
  })
})
