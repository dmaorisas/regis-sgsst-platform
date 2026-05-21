// =========================================================
// Tests — Score Calculator (🔥 T-F1-016 CRÍTICA)
// =========================================================
// Casos numéricos verificados según la estructura oficial de
// la Resolución 0312 de 2019 con 7 macroestándares.
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
  weight: number = 0.5,
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

  it('todos no_aplica → score = 100 (vacuidad lógica, decisión oficial)', () => {
    const stds = realStandards().filter((s) => s.applies_chapter_iii)
    const evs = stds.map((s) => mkEval(s.id, 'no_aplica'))
    const r = calculateScore(stds, evs)
    expect(r.total_percentage).toBe(100)
    expect(r.total_no_aplica).toBe(60)
    expect(r.total_aplicables).toBe(0)
  })
})

describe('calculateScore — matemática jerárquica por macroestándares', () => {
  it('cálculo exacto con cumple, no_cumple y un macroestándar completamente no_aplica', () => {
    // 7 estándares, uno para cada uno de los 7 macroestándares
    const stds = [
      mkStd('1.1.1', 0, 'Planear'), // Recursos (weight=10) -> cumple
      mkStd('2.1.1', 0, 'Planear'), // Gestión integral SG-SST (weight=15) -> no_cumple
      mkStd('3.1.1', 0, 'Hacer'), // Gestión de la salud (weight=20) -> no_aplica (inactivo!)
      mkStd('4.1.1', 0, 'Hacer'), // Gestión de peligros y riesgos (weight=30) -> cumple
      mkStd('5.1.1', 0, 'Hacer'), // Gestión de amenazas (weight=10) -> no_cumple
      mkStd('6.1.1', 0, 'Verificar'), // Verificación (weight=5) -> cumple
      mkStd('7.1.1', 0, 'Actuar'), // Mejoramiento (weight=10) -> no_cumple
    ]

    const evs = [
      mkEval(stds[0]!.id, 'cumple'),
      mkEval(stds[1]!.id, 'no_cumple'),
      mkEval(stds[2]!.id, 'no_aplica'),
      mkEval(stds[3]!.id, 'cumple'),
      mkEval(stds[4]!.id, 'no_cumple'),
      mkEval(stds[5]!.id, 'cumple'),
      mkEval(stds[6]!.id, 'no_cumple'),
    ]

    // Cálculo esperado:
    // Recursos (10): cumple -> avance=100%, aporte=10
    // Gestión integral (15): no_cumple -> avance=0%, aporte=0
    // Gestión de la salud (20): no_aplica -> inactivo (excluido)
    // Gestión de peligros (30): cumple -> avance=100%, aporte=30
    // Gestión de amenazas (10): no_cumple -> avance=0%, aporte=0
    // Verificación (5): cumple -> avance=100%, aporte=5
    // Mejoramiento (10): no_cumple -> avance=0%, aporte=0
    //
    // Suma de pesos activos = 10 + 15 + 30 + 10 + 5 + 10 = 80%
    // Suma de aportes = 10 + 0 + 30 + 0 + 5 + 0 = 45%
    // Score final esperado = 45 / 80 * 100 = 56.25%

    const r = calculateScore(stds, evs)
    expect(r.total_percentage).toBe(56.25)
    expect(r.total_aplicables).toBe(6)
    expect(r.total_no_aplica).toBe(1)
    expect(r.total_cumple).toBe(3)
    expect(approxEqual(sumByCycle(r.by_cycle), r.total_percentage)).toBe(true)
  })

  it('macroestándar con múltiples estándares internos calcula promedio local correctamente', () => {
    // 3 estándares en Recursos (weight=10)
    // 2 estándares en Gestión integral (weight=15)
    const stds = [
      mkStd('1.1.1', 0, 'Planear'), // Recursos
      mkStd('1.1.2', 0, 'Planear'), // Recursos
      mkStd('1.2.1', 0, 'Planear'), // Recursos
      mkStd('2.1.1', 0, 'Planear'), // Gestión integral
      mkStd('2.2.1', 0, 'Planear'), // Gestión integral
    ]

    const evs = [
      mkEval(stds[0]!.id, 'cumple'),
      mkEval(stds[1]!.id, 'cumple'),
      mkEval(stds[2]!.id, 'no_aplica'), // Excluido de Recursos -> Recursos tiene 2 aplicables, ambos cumple -> 100%
      mkEval(stds[3]!.id, 'cumple'),
      mkEval(stds[4]!.id, 'no_cumple'), // Gestión integral tiene 2 aplicables, 1 cumple -> 50%
    ]

    // Recursos (10): cumple 2 de 2 aplicables -> avance=100%, aporte=10
    // Gestión integral (15): cumple 1 de 2 aplicables -> avance=50%, aporte=7.5
    //
    // Suma pesos activos = 10 + 15 = 25%
    // Suma aportes = 10 + 7.5 = 17.5%
    // Score final = 17.5 / 25 * 100 = 70.00%

    const r = calculateScore(stds, evs)
    expect(r.total_percentage).toBe(70)
    expect(r.total_aplicables).toBe(4)
    expect(r.total_no_aplica).toBe(1)
    expect(approxEqual(sumByCycle(r.by_cycle), r.total_percentage)).toBe(true)
  })
})

describe('calculateScore — pendiente y casos límite', () => {
  it('pendiente cuenta como no_cumple (mismo score)', () => {
    const stds = [mkStd('1.1.1', 0, 'Planear'), mkStd('2.1.1', 0, 'Planear')]
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

  it('Cap I (7 estándares) — todos cumple → 100.00 por redistribución de pesos de macros', () => {
    const stds = realStandards().filter((s) => s.applies_chapter_i)
    expect(stds.length).toBe(7)
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

  it('by_standard ordenado por standard_number jerárquico', () => {
    const stds = [
      mkStd('1.10.1', 0, 'Planear'),
      mkStd('1.2.1', 0, 'Planear'),
      mkStd('1.1.1', 0, 'Planear'),
      mkStd('2.1.1', 0, 'Planear'),
    ]
    const r = calculateScore(stds, [])
    expect(r.by_standard.map((d) => d.standard_number)).toEqual([
      '1.1.1',
      '1.2.1',
      '1.10.1',
      '2.1.1',
    ])
  })
})
