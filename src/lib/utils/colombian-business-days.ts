// =========================================================
// Colombian business days — calendario hábil 2026-2030
// =========================================================
// Tarea: T-F15-010
// Issue: https://github.com/dmaorisas/regis-sgsst-platform/issues/27
//
// Festivos colombianos según Ley 51 de 1983 (Ley Emiliani): los
// festivos no fijos se trasladan al lunes siguiente. Los fijos
// se respetan en la fecha original.
//
// Fechas usadas en el set hardcodeado fueron verificadas contra:
//   - Easter (Anonymous Gregorian / Meeus-Jones-Butcher) para
//     Jueves Santo, Viernes Santo, Ascensión (Easter+39 → lunes),
//     Corpus Christi (Easter+60 → lunes), Sagrado Corazón
//     (Easter+68 → lunes).
//   - Ley Emiliani: 6-ene Reyes, 19-mar San José, 29-jun San Pedro,
//     15-ago Asunción, 12-oct Raza, 1-nov Todos los Santos,
//     11-nov Indep. Cartagena → todos al lunes siguiente si no caen
//     en lunes.
//   - Festivos fijos: 1-ene, 1-may, 20-jul, 7-ago, 8-dic, 25-dic.
//
// Decisiones técnicas (R7):
//   - Hardcodeamos 2026–2030 (alcance del concurso + 4 años de
//     uso productivo). Más allá de 2030 la función throws — un
//     mantenimiento explícito antes que un cómputo silencioso
//     que pueda divergir si la Ley Emiliani se modifica.
//   - Usamos timezone implícito UTC en la lógica interna pero
//     interpretamos la fecha como "fecha civil colombiana" — en la
//     práctica eso significa: comparamos siempre por YYYY-MM-DD,
//     nunca por timestamp. El consumidor que reciba un Date debe
//     pensar en "día calendario", no en "instante".
//   - addBusinessDays itera día a día (n días = ≤ ~3n iteraciones
//     incluso en periodos densos en festivos). Para n grandes (>500)
//     es eficiente igual; el algoritmo es O(n).
// =========================================================

/** Set de festivos por año en formato YYYY-MM-DD (ISO short). */
const HOLIDAYS_BY_YEAR: Record<number, string[]> = {
  2026: [
    '2026-01-01', // Año Nuevo (fijo)
    '2026-01-12', // Reyes Magos (Emiliani — lunes)
    '2026-03-23', // San José (Emiliani — lunes)
    '2026-04-02', // Jueves Santo (Easter -3)
    '2026-04-03', // Viernes Santo (Easter -2)
    '2026-05-01', // Día del Trabajo (fijo)
    '2026-05-18', // Ascensión del Señor (Easter +39 → lunes)
    '2026-06-08', // Corpus Christi (Easter +60 → lunes)
    '2026-06-15', // Sagrado Corazón (Easter +68 → lunes)
    '2026-06-29', // San Pedro y San Pablo (Emiliani — ya cae lunes)
    '2026-07-20', // Independencia (fijo)
    '2026-08-07', // Batalla de Boyacá (fijo)
    '2026-08-17', // Asunción de la Virgen (Emiliani — lunes)
    '2026-10-12', // Día de la Raza (Emiliani — ya cae lunes)
    '2026-11-02', // Todos los Santos (Emiliani — lunes)
    '2026-11-16', // Independencia de Cartagena (Emiliani — lunes)
    '2026-12-08', // Inmaculada Concepción (fijo)
    '2026-12-25', // Navidad (fijo)
  ],
  2027: [
    '2027-01-01',
    '2027-01-11', // Reyes
    '2027-03-22', // San José
    '2027-03-25', // Jueves Santo
    '2027-03-26', // Viernes Santo
    '2027-05-01',
    '2027-05-10', // Ascensión
    '2027-05-31', // Corpus Christi
    '2027-06-07', // Sagrado Corazón
    '2027-07-05', // San Pedro y San Pablo (cae martes 29 jun → lunes 5 jul)
    '2027-07-20',
    '2027-08-07',
    '2027-08-16', // Asunción
    '2027-10-18', // Raza
    '2027-11-01', // Todos los Santos (cae lunes)
    '2027-11-15', // Indep. Cartagena
    '2027-12-08',
    '2027-12-25',
  ],
  2028: [
    '2028-01-01',
    '2028-01-10', // Reyes
    '2028-03-20', // San José
    '2028-04-13', // Jueves Santo
    '2028-04-14', // Viernes Santo
    '2028-05-01',
    '2028-05-29', // Ascensión
    '2028-06-19', // Corpus Christi
    '2028-06-26', // Sagrado Corazón
    '2028-07-03', // San Pedro
    '2028-07-20',
    '2028-08-07',
    '2028-08-21', // Asunción
    '2028-10-16', // Raza
    '2028-11-06', // Todos los Santos
    '2028-11-13', // Indep. Cartagena
    '2028-12-08',
    '2028-12-25',
  ],
  2029: [
    '2029-01-01',
    '2029-01-08', // Reyes
    '2029-03-19', // San José (cae lunes)
    '2029-03-29', // Jueves Santo
    '2029-03-30', // Viernes Santo
    '2029-05-01',
    '2029-05-14', // Ascensión
    '2029-06-04', // Corpus Christi
    '2029-06-11', // Sagrado Corazón
    '2029-07-02', // San Pedro
    '2029-07-20',
    '2029-08-07',
    '2029-08-20', // Asunción
    '2029-10-15', // Raza
    '2029-11-05', // Todos los Santos
    '2029-11-12', // Indep. Cartagena
    '2029-12-08',
    '2029-12-25',
  ],
  2030: [
    '2030-01-01',
    '2030-01-07', // Reyes
    '2030-03-25', // San José
    '2030-04-18', // Jueves Santo
    '2030-04-19', // Viernes Santo
    '2030-05-01',
    '2030-06-03', // Ascensión
    '2030-06-24', // Corpus Christi
    '2030-07-01', // Sagrado Corazón
    '2030-07-01', // San Pedro y San Pablo (también cae lunes — duplicado neutro)
    '2030-07-20',
    '2030-08-07',
    '2030-08-19', // Asunción
    '2030-10-14', // Raza
    '2030-11-04', // Todos los Santos
    '2030-11-11', // Indep. Cartagena
    '2030-12-08',
    '2030-12-25',
  ],
}

/** Set precomputado para lookup O(1). */
const HOLIDAY_SET: Set<string> = new Set(Object.values(HOLIDAYS_BY_YEAR).flatMap((list) => list))

/** Año mínimo cubierto. */
export const MIN_YEAR_COVERED = 2026
/** Año máximo cubierto. */
export const MAX_YEAR_COVERED = 2030

/**
 * Convierte un Date a YYYY-MM-DD usando UTC. La asunción es que el
 * Date ya representa un día calendario civil (los componentes de
 * tiempo se ignoran). Quien construya un Date desde una hora local
 * debe ser consistente: o todo UTC o todo local, sin mezclar.
 */
function toIsoDate(date: Date): string {
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    throw new Error('toIsoDate: invalid Date')
  }
  const y = date.getUTCFullYear()
  const m = String(date.getUTCMonth() + 1).padStart(2, '0')
  const d = String(date.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function assertYearCovered(year: number): void {
  if (year < MIN_YEAR_COVERED || year > MAX_YEAR_COVERED) {
    throw new Error(
      `Año fuera del rango cubierto (${MIN_YEAR_COVERED}-${MAX_YEAR_COVERED}): ${year}. ` +
        `Actualizar HOLIDAYS_BY_YEAR antes de operar fechas en ${year}.`,
    )
  }
}

/** TRUE si la fecha es festivo en Colombia (cualquier año cubierto). */
export function isHoliday(date: Date): boolean {
  const iso = toIsoDate(date)
  const year = date.getUTCFullYear()
  assertYearCovered(year)
  return HOLIDAY_SET.has(iso)
}

/** TRUE si la fecha es sábado (6) o domingo (0). */
export function isWeekend(date: Date): boolean {
  const dow = date.getUTCDay()
  return dow === 0 || dow === 6
}

/** TRUE si es día hábil colombiano: ni fin de semana ni festivo. */
export function isBusinessDay(date: Date): boolean {
  return !isWeekend(date) && !isHoliday(date)
}

/**
 * Suma `n` días hábiles a una fecha. Si `n` es negativo, resta. La
 * fecha de partida NUNCA se cuenta — ya sea hábil o no, el conteo
 * arranca desde el día siguiente.
 *
 * @example
 *   addBusinessDays(viernes_2026-01-09, 1)
 *     → martes 2026-01-13 (sábado, domingo y lunes festivo descartados)
 */
export function addBusinessDays(date: Date, n: number): Date {
  if (!Number.isInteger(n)) {
    throw new Error(`addBusinessDays: n debe ser entero, recibido ${n}`)
  }
  const result = new Date(date.getTime())
  if (n === 0) return result
  const step = n > 0 ? 1 : -1
  let remaining = Math.abs(n)
  while (remaining > 0) {
    result.setUTCDate(result.getUTCDate() + step)
    if (isBusinessDay(result)) remaining -= 1
  }
  return result
}

/**
 * Cuenta días hábiles entre `start` (inclusive) y `end` (exclusive).
 * Si end <= start, devuelve 0. Útil para SLA legales: 15 días hábiles
 * de plazo para responder solicitud ARCO desde la fecha de recepción.
 */
export function businessDaysBetween(start: Date, end: Date): number {
  if (end.getTime() <= start.getTime()) return 0
  let count = 0
  const cursor = new Date(start.getTime())
  while (cursor.getTime() < end.getTime()) {
    if (isBusinessDay(cursor)) count += 1
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return count
}

/** Lista (lectura) de festivos para un año dado. Útil en UIs / pruebas. */
export function getHolidaysForYear(year: number): string[] {
  assertYearCovered(year)
  return [...(HOLIDAYS_BY_YEAR[year] ?? [])]
}

/**
 * Helper: parsea un `YYYY-MM-DD` a Date en UTC. Evita los bugs típicos
 * de `new Date('2026-01-09')` en TZs negativas que retroceden 1 día.
 */
export function parseIsoDate(iso: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    throw new Error(`parseIsoDate: formato inválido "${iso}", esperado YYYY-MM-DD`)
  }
  const parts = iso.split('-').map((p) => parseInt(p, 10))
  const y = parts[0] ?? 0
  const m = parts[1] ?? 1
  const d = parts[2] ?? 1
  return new Date(Date.UTC(y, m - 1, d))
}
