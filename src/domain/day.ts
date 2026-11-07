/** Calendar day as `YYYY-MM-DD`. */
export type DayKey = string

export interface DaySettings {
  /** IANA zone, e.g. `Asia/Manila`. Comes from settings, never the device. */
  timeZone: string
  /** Local hour (0-23) when a new day starts. Before it, it's still yesterday. */
  rolloverHour: number
}

const formatters = new Map<string, Intl.DateTimeFormat>()

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone)
  if (!f) {
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      hourCycle: 'h23',
    })
    formatters.set(timeZone, f)
  }
  return f
}

/**
 * The study day `now` belongs to: the local date in `settings.timeZone`, minus one day if the
 * local wall-clock hour is before `rolloverHour`. Uses the wall clock (not `now - N hours`) so
 * DST changes don't shift the boundary.
 */
export function toDay(now: Date, settings: DaySettings): DayKey {
  const parts = formatterFor(settings.timeZone).formatToParts(now)
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value)

  const date = new Date(Date.UTC(get('year'), get('month') - 1, get('day')))
  if (get('hour') < settings.rolloverHour) date.setUTCDate(date.getUTCDate() - 1)

  return date.toISOString().slice(0, 10)
}
