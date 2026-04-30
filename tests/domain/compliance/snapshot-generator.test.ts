// =========================================================
// Tests — Snapshot Generator (T-F1-017)
// =========================================================

import { describe, it, expect } from 'vitest'
import {
  generateSnapshot,
  computeHash,
  canonicalStringify,
} from '@/domain/compliance/snapshot-generator'
import type { ScoreResult } from '@/domain/compliance/types'

const baseScore: ScoreResult = {
  total_percentage: 71.43,
  total_aplicables: 2,
  total_evaluated: 3,
  total_cumple: 1,
  total_no_cumple: 1,
  total_no_aplica: 1,
  total_pendiente: 0,
  by_cycle: {
    Planear: 71.43,
    Hacer: 0,
    Verificar: 0,
    Actuar: 0,
  },
  by_standard: [
    {
      standard_id: 'id-A.1',
      standard_number: 'A.1',
      status: 'cumple',
      cycle_phva: 'Planear',
      original_weight: 50,
      redistributed_weight: 71.43,
      contributes_to_score: 71.43,
    },
    {
      standard_id: 'id-A.2',
      standard_number: 'A.2',
      status: 'no_aplica',
      cycle_phva: 'Hacer',
      original_weight: 30,
      redistributed_weight: 0,
      contributes_to_score: 0,
    },
    {
      standard_id: 'id-A.3',
      standard_number: 'A.3',
      status: 'no_cumple',
      cycle_phva: 'Verificar',
      original_weight: 20,
      redistributed_weight: 28.57,
      contributes_to_score: 0,
    },
  ],
}

describe('generateSnapshot', () => {
  it('produce hash hex de 64 caracteres (SHA-256)', () => {
    const s = generateSnapshot('c1', 'co1', '2026-04-28', baseScore)
    expect(s.hash).toMatch(/^[0-9a-f]{64}$/)
  })

  it('hash determinístico — mismo input → mismo hash', () => {
    const s1 = generateSnapshot('c1', 'co1', '2026-04-28', baseScore)
    const s2 = generateSnapshot('c1', 'co1', '2026-04-28', baseScore)
    expect(s1.hash).toBe(s2.hash)
  })

  it('hash cambia si total_percentage cambia', () => {
    const s1 = generateSnapshot('c1', 'co1', '2026-04-28', baseScore)
    const s2 = generateSnapshot('c1', 'co1', '2026-04-28', {
      ...baseScore,
      total_percentage: 71.44,
    })
    expect(s1.hash).not.toBe(s2.hash)
  })

  it('hash cambia si centro_id cambia', () => {
    const s1 = generateSnapshot('c1', 'co1', '2026-04-28', baseScore)
    const s2 = generateSnapshot('c2', 'co1', '2026-04-28', baseScore)
    expect(s1.hash).not.toBe(s2.hash)
  })

  it('hash cambia si snapshot_date cambia', () => {
    const s1 = generateSnapshot('c1', 'co1', '2026-04-28', baseScore)
    const s2 = generateSnapshot('c1', 'co1', '2026-04-29', baseScore)
    expect(s1.hash).not.toBe(s2.hash)
  })

  it('rechaza snapshot_date sin formato YYYY-MM-DD', () => {
    expect(() => generateSnapshot('c1', 'co1', '2026/04/28', baseScore)).toThrow()
  })

  it('snapshot incluye todos los campos del payload', () => {
    const s = generateSnapshot('c1', 'co1', '2026-04-28', baseScore)
    expect(s).toMatchObject({
      centro_id: 'c1',
      company_id: 'co1',
      snapshot_date: '2026-04-28',
      total_percentage: 71.43,
      total_evaluated: 3,
      total_aplicables: 2,
      by_cycle: baseScore.by_cycle,
    })
    expect(s.by_standard.length).toBe(3)
  })
})

describe('canonicalStringify', () => {
  it('ordena claves alfabéticamente', () => {
    expect(canonicalStringify({ b: 1, a: 2 })).toBe('{"a":2,"b":1}')
  })

  it('mismo objeto con keys reordenadas → misma salida', () => {
    const a = canonicalStringify({ b: { y: 1, x: 2 }, a: [3, 2, 1] })
    const b = canonicalStringify({ a: [3, 2, 1], b: { x: 2, y: 1 } })
    expect(a).toBe(b)
  })

  it('lanza error en number no finito', () => {
    expect(() => canonicalStringify({ x: NaN })).toThrow()
  })
})

describe('computeHash', () => {
  it('SHA-256 hex 64 chars', () => {
    expect(computeHash({ a: 1 })).toMatch(/^[0-9a-f]{64}$/)
  })

  it('robusto al orden de claves', () => {
    expect(computeHash({ a: 1, b: 2 })).toBe(computeHash({ b: 2, a: 1 }))
  })
})
