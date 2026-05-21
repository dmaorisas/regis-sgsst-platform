import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runMonthlyLogGeneration, isLastDayOfMonth } from '@/lib/jobs/monthly-log-job'

let mockCompanies: unknown[] = []
let mockMonthlyLogs: unknown[] = []
let currentTable = ''
let insertCalledWith: unknown = null

// Mock Supabase admin client
vi.mock('@/lib/supabase-admin', () => {
  const queryBuilder: Record<string, unknown> = {}

  queryBuilder.select = vi.fn().mockReturnValue(queryBuilder)
  // Mock methods for query building
  queryBuilder.eq = vi.fn().mockReturnValue(queryBuilder)
  queryBuilder.gte = vi.fn().mockReturnValue(queryBuilder)
  queryBuilder.lte = vi.fn().mockReturnValue(queryBuilder)
  queryBuilder.order = vi.fn().mockReturnValue(queryBuilder)
  queryBuilder.single = vi.fn().mockReturnValue(queryBuilder)

  queryBuilder.maybeSingle = vi.fn().mockImplementation(() => {
    return Promise.resolve({ data: mockMonthlyLogs[0] || null, error: null })
  })

  queryBuilder.insert = vi.fn().mockImplementation((data) => {
    insertCalledWith = data
    return Promise.resolve({ data, error: null })
  })

  queryBuilder.then = (onfulfilled: ((value: unknown) => unknown) | null | undefined) => {
    const result = { data: [] as unknown[], error: null as unknown }
    if (currentTable === 'companies') {
      result.data = mockCompanies
    } else if (currentTable === 'documents') {
      result.data = []
    } else if (currentTable === 'standard_evaluations') {
      result.data = []
    } else if (currentTable === 'emergency_equipment') {
      result.data = []
    }
    return Promise.resolve(result).then(onfulfilled)
  }

  const mockFrom = vi.fn().mockImplementation((table) => {
    currentTable = table
    return queryBuilder
  })

  return {
    getSupabaseAdminClient: vi.fn().mockReturnValue({
      from: mockFrom,
    }),
  }
})

// Mock AI MonthlyLogGenerator to return mock results instantly
vi.mock('@/lib/ai/monthly-log-generator', () => {
  class MockMonthlyLogGenerator {
    generate = vi.fn().mockResolvedValue({
      completed_summary: '### Logros locales',
      pending_summary: '### Pendientes locales',
      next_month_plan: '### Plan local',
    })
  }
  return {
    MonthlyLogGenerator: MockMonthlyLogGenerator,
  }
})

// Mock pg-boss
vi.mock('@/lib/pg-boss', () => {
  return {
    getBoss: vi.fn().mockResolvedValue({
      send: vi.fn().mockResolvedValue('job-id'),
      schedule: vi.fn().mockResolvedValue('schedule-id'),
      work: vi.fn().mockResolvedValue('work-id'),
    }),
  }
})

describe('monthly-log-job unit tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCompanies = []
    mockMonthlyLogs = []
    currentTable = ''
    insertCalledWith = null
  })

  describe('isLastDayOfMonth', () => {
    it('should return true for May 31, 2026', () => {
      const date = new Date(2026, 4, 31) // May 31
      expect(isLastDayOfMonth(date)).toBe(true)
    })

    it('should return false for May 30, 2026', () => {
      const date = new Date(2026, 4, 30) // May 30
      expect(isLastDayOfMonth(date)).toBe(false)
    })

    it('should return true for Feb 28, 2026 (non-leap year)', () => {
      const date = new Date(2026, 1, 28) // Feb 28
      expect(isLastDayOfMonth(date)).toBe(true)
    })
  })

  describe('runMonthlyLogGeneration', () => {
    it('should skip execution if it is not the last day of the month', async () => {
      const midMonthDate = new Date(2026, 4, 15) // May 15
      mockCompanies = [{ id: 'comp-1', razon_social: 'Empresa Test' }]

      await runMonthlyLogGeneration(midMonthDate)

      expect(insertCalledWith).toBeNull()
    })

    it('should execute and save log if it is the last day of the month', async () => {
      const endOfMonthDate = new Date(2026, 4, 31) // May 31
      mockCompanies = [{ id: 'comp-1', razon_social: 'Empresa Test' }]
      mockMonthlyLogs = [] // No logs exist yet

      await runMonthlyLogGeneration(endOfMonthDate)

      expect(insertCalledWith).not.toBeNull()
      expect(insertCalledWith).toEqual({
        company_id: 'comp-1',
        month: '2026-05',
        completed_summary: '### Logros locales',
        pending_summary: '### Pendientes locales',
        next_month_plan: '### Plan local',
        ia_metadata: expect.objectContaining({
          is_automated: true,
        }),
      })
    })

    it('should skip if monthly log already exists for that month', async () => {
      const endOfMonthDate = new Date(2026, 4, 31) // May 31
      mockCompanies = [{ id: 'comp-1', razon_social: 'Empresa Test' }]
      mockMonthlyLogs = [{ id: 'existing-log-id' }]

      await runMonthlyLogGeneration(endOfMonthDate)

      expect(insertCalledWith).toBeNull()
    })
  })
})
