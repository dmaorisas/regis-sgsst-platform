// =========================================================
// Domain Layer — Snapshot Generator (T-F1-017)
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/23
// =========================================================
// Construye un snapshot inmutable a partir de un ScoreResult y calcula
// un hash SHA-256 determinístico sobre su contenido canonicalizado.
//
// Determinismo del hash:
//   - JSON canonical: keys ordenadas alfabéticamente en cada nivel.
//   - Números formateados con su representación decimal exacta tras round2.
//   - by_standard asume orden estable (lo da score-calculator).
//   - El resultado: 64 hex chars (SHA-256).
//
// Crypto: usamos `node:crypto` (built-in). No agrega dependencia externa.
// =========================================================

import { createHash } from 'node:crypto'
import type { ScoreResult, Snapshot } from './types'

/**
 * Genera un snapshot a partir del ScoreResult del centro/empresa/fecha.
 * El hash cierra sobre TODOS los campos del snapshot, así cualquier
 * mutación posterior produciría un hash distinto (detectable).
 */
export function generateSnapshot(
  centro_id: string,
  company_id: string,
  snapshot_date: string,
  scoreResult: ScoreResult,
): Snapshot {
  if (!isYYYYMMDD(snapshot_date)) {
    throw new Error(`snapshot_date must be 'YYYY-MM-DD' (got '${snapshot_date}')`)
  }
  if (!centro_id) throw new Error('centro_id required')
  if (!company_id) throw new Error('company_id required')

  const partial: Omit<Snapshot, 'hash'> = {
    centro_id,
    company_id,
    snapshot_date,
    total_percentage: scoreResult.total_percentage,
    by_cycle: scoreResult.by_cycle,
    by_standard: scoreResult.by_standard,
    total_evaluated: scoreResult.total_evaluated,
    total_aplicables: scoreResult.total_aplicables,
  }

  return {
    ...partial,
    hash: computeHash(partial),
  }
}

/**
 * Computa SHA-256 hex (64 chars) sobre la representación canónica
 * del payload. Determinístico: mismo input → mismo hash.
 */
export function computeHash(payload: unknown): string {
  const canonical = canonicalStringify(payload)
  return createHash('sha256').update(canonical, 'utf8').digest('hex')
}

/**
 * JSON-stringify estable: ordena claves de cada objeto alfabéticamente.
 * No soporta cycles (no esperamos referencias circulares en snapshots).
 */
export function canonicalStringify(value: unknown): string {
  if (value === null) return 'null'
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) {
      throw new Error(`non-finite number cannot be hashed: ${value}`)
    }
    // Number.toString() es estable en JS para finitos.
    return JSON.stringify(value)
  }
  if (typeof value === 'string' || typeof value === 'boolean') {
    return JSON.stringify(value)
  }
  if (Array.isArray(value)) {
    return '[' + value.map(canonicalStringify).join(',') + ']'
  }
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const keys = Object.keys(obj).sort()
    const body = keys.map((k) => JSON.stringify(k) + ':' + canonicalStringify(obj[k])).join(',')
    return '{' + body + '}'
  }
  if (typeof value === 'undefined') {
    // En JSON canónico undefined no existe; lo tratamos como null para
    // estabilidad. No esperamos undefined en snapshots, pero si llegase
    // tras un map(), no romperíamos.
    return 'null'
  }
  throw new Error(`unsupported value type: ${typeof value}`)
}

function isYYYYMMDD(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s)
}
