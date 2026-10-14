/* Las columnas DATE llegan como 'YYYY-MM-DD'. new Date('2026-10-14') las toma como medianoche UTC y en
   Colombia (UTC-5) se mostraban un dia antes. Este helper arma la fecha local con sus partes; un
   timestamp completo (con hora) se deja pasar tal cual porque ese si es un instante real. */
const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/

export function parseLocalDate(value: string | Date): Date {
  if (value instanceof Date) return value
  const m = DATE_ONLY.exec(String(value).trim().slice(0, 10) === String(value).trim() ? String(value).trim() : '')
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date(value)
}

export function formatLocalDate(
  value: string | Date | null | undefined,
  locales?: string | string[],
  options?: Intl.DateTimeFormatOptions,
): string {
  if (!value) return ''
  return parseLocalDate(value).toLocaleDateString(locales, options)
}
