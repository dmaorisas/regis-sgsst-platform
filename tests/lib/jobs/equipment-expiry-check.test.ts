import { describe, it, expect, vi, beforeEach } from 'vitest'
import { runEquipmentExpiryCheck } from '@/lib/jobs/equipment-expiry-check'
import { getNotificationService } from '@/lib/notifications/service'

let mockEquipmentData: unknown[] = []
let mockRolesData: unknown[] = []
let currentTable = ''

// Mock Supabase admin client with chainable query builder
vi.mock('@/lib/supabase-admin', () => {
  const queryBuilder: Record<string, unknown> = {}

  queryBuilder.select = vi.fn().mockReturnValue(queryBuilder)
  queryBuilder.update = vi.fn().mockReturnValue(queryBuilder)
  queryBuilder.eq = vi.fn().mockReturnValue(queryBuilder)
  queryBuilder.lte = vi.fn().mockReturnValue(queryBuilder)
  queryBuilder.gte = vi.fn().mockReturnValue(queryBuilder)
  queryBuilder.contains = vi.fn().mockReturnValue(queryBuilder)
  queryBuilder.or = vi.fn().mockReturnValue(queryBuilder)

  queryBuilder.then = (onfulfilled: ((value: unknown) => unknown) | null | undefined) => {
    const result = { data: [] as unknown[], error: null as unknown }
    if (currentTable === 'emergency_equipment') {
      result.data = mockEquipmentData
    } else if (currentTable === 'notifications') {
      result.data = [] // simulate no sent notifications in last 7 days
    } else if (currentTable === 'user_company_role') {
      result.data = mockRolesData
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

// Mock Notification Service
vi.mock('@/lib/notifications/service', () => {
  const mockNotify = vi.fn().mockResolvedValue({ id: 'notif-id' })
  return {
    getNotificationService: vi.fn().mockReturnValue({
      notify: mockNotify,
    }),
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

describe('runEquipmentExpiryCheck', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockEquipmentData = []
    mockRolesData = []
    currentTable = ''
  })

  it('should not notify if no equipment is expiring', async () => {
    mockEquipmentData = []

    await runEquipmentExpiryCheck()

    const service = getNotificationService()
    expect(service.notify).not.toHaveBeenCalled()
  })

  it('should notify assigned consultants when equipment is expiring', async () => {
    mockEquipmentData = [
      {
        id: 'eq-1',
        tipo: 'extintor',
        codigo_interno: 'EXT-01',
        fecha_vencimiento: '2026-06-15',
        fecha_vencimiento_vida_util: null,
        company_id: 'company-a',
        companies: {
          razon_social: 'Empresa Alfa',
        },
        centro_id: 'centro-1',
        centros_de_trabajo: {
          nombre: 'Piso 1',
        },
      },
    ]

    mockRolesData = [
      {
        user_id: 'user-consultant-1',
        users: {
          id: 'user-consultant-1',
          nombre: 'Carlos Consultor',
          email: 'consultant1@regis.com',
        },
        roles: {
          nombre: 'regis_consultant',
        },
      },
    ]

    await runEquipmentExpiryCheck()

    const service = getNotificationService()
    expect(service.notify).toHaveBeenCalledTimes(1)
    expect(service.notify).toHaveBeenCalledWith({
      recipient_id: 'user-consultant-1',
      channel: 'email',
      template: 'equipment_expiry',
      payload: expect.objectContaining({
        equipment_id: 'eq-1',
        consultant_name: 'Carlos Consultor',
        company_name: 'Empresa Alfa',
        centro_name: 'Piso 1',
        equipment_type: 'extintor',
        equipment_code: 'EXT-01',
        expiry_date: '2026-06-15',
      }),
    })
  })
})
