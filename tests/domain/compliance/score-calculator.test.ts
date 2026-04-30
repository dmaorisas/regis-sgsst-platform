// =========================================================
// Tests — Score Calculator (🔥 T-F1-016 CRÍTICA)
// =========================================================
// Casos numéricos verificados a mano antes de declarar passing.
// La invariante "Σ by_cycle == total_percentage" se chequea siempre.
// =========================================================

import { describe, it, expect } from 'vitest'
import { calculateScore } from '@/domain/compliance/score-calculator'
import type { CyclePHVA, Evaluation, EvaluationStatus, Standard } from '@/domain/compliance/types'
import standardsSeed from '../../../docs/research/standards_0312_seed.json'

// ---------------------------------------------------------------------------
// Builders
// ---------------------------------------------------------------------------

function mkStd(
  n: string,
  weight: number,
  cycle: CyclePHVA = 'Planear',
  flags: { i: boolean; ii: boolean; iii: boolean } = {
    i: true,
    ii: true,
    iii: true,
  },
): Standard {
  return {
    id: `id-${n}`,
    standard_number: n,
    weight_capitulo_iii: weight,
    cycle_phva: cycle,
    applies_chapter_i: flags.i,
    applies_chapter_ii: flags.ii,
    applies_chapter_iii: flags.iii,
  }
}

function mkEval(standard_id: string, status: EvaluationStatus): Evaluation {
  return { standard_id, status }
}

/** Carga los 60 estándares reales del seed. */
function realStandards(): Standard[] {
  return (standardsSeed as Array<Record<string, unknown>>).map((s, idx) => ({
    id: `std-${idx + 1}`,
    standard_number: s.standard_number as string,
    weight_capitulo_iii: s.weight_capitulo_iii as number,
    cycle_phva: s.cycle_phva as CyclePHVA,
    applies_chapter_i: s.applies_chapter_i as boolean,
    applies_chapter_ii: s.applies_chapter_ii as boolean,
    applies_chapter_iii: s.applies_chapter_iii as boolean,
  }))
}

/** Tolerancia 0.01 para comparar % redondeados a 2 decimales. */
function approxEqual(a: number, b: number, eps = 0.01): boolean {
  return Math.abs(a - b) <= eps
}

function sumByCycle(by: { Planear: number; Hacer: number; Verificar: number; Actuar: number }) {
  return by.Planear + by.Hacer + by.Verificar + by.Actuar
}

// ---------------------------------------------------------------------------
// Casos
// ---------------------------------------------------------------------------

describe('calculateScore — casos baseline', () => {
  it('Cap III, 60 estándares todos cumple → score = 100.00', () => {
    const stds = realStandards().filter((s) => s.applies_chapter_iii)
    const evs = stds.map((s) => mkEval(s.id, 'cumple'))
    const r = calculateScore(stds, evs)
    expect(r.total_percentage).toBe(100)
    expect(r.total_cumple).toBe(60)
    expect(r.total_no_aplica).toBe(0)
    expect(r.total_pendiente).toBe(0)
    expect(approxEqual(sumByCycle(r.by_cycle), r.total_percentage)).toBe(true)
  })

  it('todos no_cumple → score = 0.00', () => {
    const stds = realStandards().filter((s) => s.applies_chapter_iii)
    const evs = stds.map((s) => mkEval(s.id, 'no_cumple'))
    const r = calculateScore(stds, evs)
    expect(r.total_percentage).toBe(0)
    expect(r.total_no_cumple).toBe(60)
    expect(approxEqual(sumByCycle(r.by_cycle), r.total_percentage)).toBe(true)
  })

  it('todos no_aplica → score = 100 (vacuidad lógica, decisión documentada)', () => {
    const stds = realStandards().filter((s) => s.applies_chapter_iii)
    const evs = stds.map((s) => mkEval(s.id, 'no_aplica'))
    const r = calculateScore(stds, evs)
    expect(r.total_percentage).toBe(100)
    expect(r.total_no_aplica).toBe(60)
    expect(r.total_aplicables).toBe(0)
  })

  it('mitad cumple, mitad no_cumple, sin no_aplica → score = 50.00', () => {
    // Construyo set sintético: 4 estándares con pesos iguales 25/25/25/25.
    const stds = [
      mkStd('1.1.1', 25, 'Planear'),
      mkStd('1.1.2', 25, 'Hacer'),
      mkStd('1.1.3', 25, 'Verificar'),
      mkStd('1.1.4', 25, 'Actuar'),
    ]
    const evs = [
      mkEval(stds[0]!.id, 'cumple'),
      mkEval(stds[1]!.id, 'cumple'),
      mkEval(stds[2]!.id, 'no_cumple'),
      mkEval(stds[3]!.id, 'no_cumple'),
    ]
    const r = calculateScore(stds, evs)
    expect(r.total_percentage).toBe(50)
    expect(approxEqual(sumByCycle(r.by_cycle), r.total_percentage)).toBe(true)
  })
})

describe('calculateScore — redistribución No Aplica (núcleo CRÍTICO)', () => {
  // Caso canónico del Issue: pesos [50, 30, 20], el de 30 no_aplica.
  // total_aplicable = 70, factor = 100/70 ≈ 1.4286
  // peso_redistribuido(50) ≈ 71.43, peso_redistribuido(20) ≈ 28.57

  it('caso 50/30/20 — el de 30 no_aplica + restantes cumple → 100.00', () => {
    const stds = [
      mkStd('A.1', 50, 'Planear'),
      mkStd('A.2', 30, 'Hacer'),
      mkStd('A.3', 20, 'Verificar'),
    ]
    const evs = [
      mkEval(stds[0]!.id, 'cumple'),
      mkEval(stds[1]!.id, 'no_aplica'),
      mkEval(stds[2]!.id, 'cumple'),
    ]
    const r = calculateScore(stds, evs)
    expect(r.total_percentage).toBe(100)
    expect(r.total_no_aplica).toBe(1)
    expect(r.total_aplicables).toBe(2)

    const detailA1 = r.by_standard.find((d) => d.standard_number === 'A.1')!
    const detailA3 = r.by_standard.find((d) => d.standard_number === 'A.3')!
    expect(approxEqual(detailA1.redistributed_weight, 71.43)).toBe(true)
    expect(approxEqual(detailA3.redistributed_weight, 28.57)).toBe(true)
  })

  it('caso 50/30/20 — el de 30 no_aplica + solo el de 50 cumple → 71.43', () => {
    const stds = [
      mkStd('A.1', 50, 'Planear'),
      mkStd('A.2', 30, 'Hacer'),
      mkStd('A.3', 20, 'Verificar'),
    ]
    const evs = [
      mkEval(stds[0]!.id, 'cumple'),
      mkEval(stds[1]!.id, 'no_aplica'),
      mkEval(stds[2]!.id, 'no_cumple'),
    ]
    const r = calculateScore(stds, evs)
    expect(approxEqual(r.total_percentage, 71.43, 0.01)).toBe(true)
    expect(approxEqual(sumByCycle(r.by_cycle), r.total_percentage)).toBe(true)
  })

  it('peso 0 redistribuido para no_aplica (no contribuye al score)', () => {
    const stds = [
      mkStd('A.1', 50, 'Planear'),
      mkStd('A.2', 30, 'Hacer'),
      mkStd('A.3', 20, 'Verificar'),
    ]
    const evs = [
      mkEval(stds[0]!.id, 'no_cumple'),
      mkEval(stds[1]!.id, 'no_aplica'),
      mkEval(stds[2]!.id, 'no_cumple'),
    ]
    const r = calculateScore(stds, evs)
    expect(r.total_percentage).toBe(0)
    const noAplica = r.by_standard.find((d) => d.standard_number === 'A.2')!
    expect(noAplica.redistributed_weight).toBe(0)
    expect(noAplica.contributes_to_score).toBe(0)
  })
})

describe('calculateScore — pendiente y casos límite', () => {
  it('pendiente cuenta como no_cumple (mismo score)', () => {
    const stds = [mkStd('A.1', 50, 'Planear'), mkStd('A.2', 50, 'Hacer')]
    const r1 = calculateScore(stds, [
      mkEval(stds[0]!.id, 'cumple'),
      mkEval(stds[1]!.id, 'pendiente'),
    ])
    const r2 = calculateScore(stds, [
      mkEval(stds[0]!.id, 'cumple'),
      mkEval(stds[1]!.id, 'no_cumple'),
    ])
    expect(r1.total_percentage).toBe(r2.total_percentage)
    expect(r1.total_pendiente).toBe(1)
    expect(r2.total_no_cumple).toBe(1)
  })

  it('Cap I (7 estándares) — todos cumple → 100.00 aunque sum_base != 100', () => {
    const stds = realStandards().filter((s) => s.applies_chapter_i)
    expect(stds.length).toBe(7)
    const sumBase = stds.reduce((a, s) => a + s.weight_capitulo_iii, 0)
    expect(sumBase).toBeLessThan(100) // confirma que sum_base ≠ 100
    const evs = stds.map((s) => mkEval(s.id, 'cumple'))
    const r = calculateScore(stds, evs)
    expect(r.total_percentage).toBe(100)
    expect(approxEqual(sumByCycle(r.by_cycle), r.total_percentage)).toBe(true)
  })

  it('sin evaluaciones → todos pendiente → score = 0', () => {
    const stds = realStandards().filter((s) => s.applies_chapter_iii)
    const r = calculateScore(stds, [])
    expect(r.total_percentage).toBe(0)
    expect(r.total_pendiente).toBe(60)
    expect(r.total_evaluated).toBe(0)
  })

  it('lista de standards vacía → score = 100 (no hay nada que evaluar)', () => {
    const r = calculateScore([], [])
    expect(r.total_percentage).toBe(100)
    expect(r.total_aplicables).toBe(0)
  })

  it('evaluaciones de estándares no aplicables se ignoran', () => {
    const stds = [mkStd('A.1', 100, 'Planear')]
    const r = calculateScore(stds, [
      mkEval('id-A.1', 'cumple'),
      mkEval('id-X.99', 'no_cumple'), // no existe en stds → ignored
    ])
    expect(r.total_percentage).toBe(100)
    expect(r.total_cumple).toBe(1)
    expect(r.total_no_cumple).toBe(0)
  })

  it('precision: sin drift de flotantes (sum exacto)', () => {
    // 0.1 + 0.2 ≠ 0.3 en float. Aquí debemos obtener 100.00 exacto.
    const stds = [
      mkStd('A.1', 0.1, 'Planear'),
      mkStd('A.2', 0.2, 'Hacer'),
      mkStd('A.3', 0.7, 'Verificar'),
    ]
    const evs = stds.map((s) => mkEval(s.id, 'cumple'))
    const r = calculateScore(stds, evs)
    expect(r.total_percentage).toBe(100)
    expect(approxEqual(sumByCycle(r.by_cycle), 100, 0.01)).toBe(true)
  })

  it('by_cycle suma correctamente al total_percentage (Cap III mixed)', () => {
    const stds = realStandards().filter((s) => s.applies_chapter_iii)
    // Cumple los 5 primeros, no_aplica los 5 siguientes, resto pendiente.
    const evs: Evaluation[] = []
    for (let i = 0; i < 5; i++) evs.push(mkEval(stds[i]!.id, 'cumple'))
    for (let i = 5; i < 10; i++) evs.push(mkEval(stds[i]!.id, 'no_aplica'))
    const r = calculateScore(stds, evs)
    expect(approxEqual(sumByCycle(r.by_cycle), r.total_percentage, 0.01)).toBe(true)
  })

  it('by_standard ordenado por standard_number jerárquico', () => {
    const stds = [
      mkStd('1.10.1', 25, 'Planear'),
      mkStd('1.2.1', 25, 'Planear'),
      mkStd('1.1.1', 25, 'Planear'),
      mkStd('2.1.1', 25, 'Planear'),
    ]
    const r = calculateScore(stds, [])
    expect(r.by_standard.map((d) => d.standard_number)).toEqual([
      '1.1.1',
      '1.2.1',
      '1.10.1',
      '2.1.1',
    ])
  })

  it('error si algún standard tiene weight negativo', () => {
    const stds = [mkStd('A.1', -1, 'Planear')]
    expect(() => calculateScore(stds, [])).toThrow()
  })
})
