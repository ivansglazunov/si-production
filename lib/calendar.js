/**
 * CalDAV клиент для Radicale — прямые HTTP-запросы
 * Надёжнее чем tsdav для Radicale (не требует auto-discovery)
 */

const RADICALE_URL = process.env.RADICALE_URL || 'http://localhost:5232'
const RADICALE_USER = process.env.RADICALE_USER || 'bot'
const RADICALE_PASS = process.env.RADICALE_PASS || 'bot-si'
const CALENDAR_PATH = process.env.RADICALE_CALENDAR || '/admin/schedule/'

const AUTH_HEADER = 'Basic ' + Buffer.from(`${RADICALE_USER}:${RADICALE_PASS}`).toString('base64')

function calendarUrl() {
  return `${RADICALE_URL}${CALENDAR_PATH}`
}

function generateUID() {
  return 'si-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9)
}

function toICalDate(date) {
  const d = new Date(date)
  const pad = (n) => String(n).padStart(2, '0')
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    'T' +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  )
}

function parseICalDate(str) {
  if (!str) return null
  const clean = str.replace(/[^0-9T]/g, '')
  const match = clean.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})/)
  if (match) {
    return new Date(match[1], match[2] - 1, match[3], match[4], match[5], match[6])
  }
  const dateMatch = clean.match(/^(\d{4})(\d{2})(\d{2})/)
  if (dateMatch) {
    return new Date(dateMatch[1], dateMatch[2] - 1, dateMatch[3])
  }
  return null
}

function parseVEvent(icalData) {
  const event = {}
  const lines = icalData.replace(/\r\n /g, '').replace(/\r\n\t/g, '').split(/\r?\n/)

  for (const line of lines) {
    if (line.startsWith('SUMMARY:')) event.summary = line.substring(8)
    else if (line.startsWith('DTSTART')) {
      const val = line.split(':').pop()
      event.start = parseICalDate(val)
    }
    else if (line.startsWith('DTEND')) {
      const val = line.split(':').pop()
      event.end = parseICalDate(val)
    }
    else if (line.startsWith('DESCRIPTION:')) event.description = line.substring(12).replace(/\\n/g, '\n').replace(/\\,/g, ',')
    else if (line.startsWith('LOCATION:')) event.location = line.substring(9).replace(/\\,/g, ',')
    else if (line.startsWith('UID:')) event.uid = line.substring(4)
    else if (line.startsWith('STATUS:')) event.status = line.substring(7)
    else if (line.startsWith('CATEGORIES:')) event.categories = line.substring(11)
  }

  return event
}

function buildVCalendar({ uid, summary, start, end, description, location, categories }) {
  const eventUid = uid || generateUID()
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SI-Production Bot//RU',
    'BEGIN:VEVENT',
    `UID:${eventUid}`,
    `DTSTAMP:${toICalDate(new Date())}`,
    `DTSTART:${toICalDate(start)}`,
  ]

  if (end) {
    lines.push(`DTEND:${toICalDate(end)}`)
  } else {
    const endDate = new Date(new Date(start).getTime() + 60 * 60 * 1000)
    lines.push(`DTEND:${toICalDate(endDate)}`)
  }

  if (summary) lines.push(`SUMMARY:${summary}`)
  if (description) lines.push(`DESCRIPTION:${description.replace(/\n/g, '\\n').replace(/,/g, '\\,')}`)
  if (location) lines.push(`LOCATION:${location.replace(/,/g, '\\,')}`)
  if (categories) lines.push(`CATEGORIES:${categories}`)

  lines.push('END:VEVENT', 'END:VCALENDAR')
  return lines.join('\r\n')
}

// ===== CalDAV запросы =====

/**
 * Получает все события из календаря (REPORT calendar-query)
 */
async function getEvents(from, to) {
  try {
    let timeFilter = ''
    if (from && to) {
      const f = new Date(from).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
      const t = new Date(to).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
      timeFilter = `<C:time-range start="${f}" end="${t}"/>`
    }

    const body = `<?xml version="1.0" encoding="UTF-8"?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag/>
    <C:calendar-data/>
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        ${timeFilter}
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`

    const res = await fetch(calendarUrl(), {
      method: 'REPORT',
      headers: {
        Authorization: AUTH_HEADER,
        'Content-Type': 'application/xml; charset=utf-8',
        Depth: '1',
      },
      body,
    })

    if (!res.ok && res.status !== 207) {
      console.error('CalDAV REPORT error:', res.status)
      return []
    }

    const xml = await res.text()

    // Парсим XML ответ (поддержка разных namespace форматов)
    const events = []
    const responses = xml.split(/<(?:d:|D:)?response>/i).slice(1)

    for (const resp of responses) {
      const hrefMatch = resp.match(/<(?:d:|D:)?href>([^<]+)<\/(?:d:|D:)?href>/i)
      const etagMatch = resp.match(/<(?:d:|D:)?getetag>"?([^"<]+)"?<\/(?:d:|D:)?getetag>/i)
      const dataMatch = resp.match(/<(?:cal:|C:)?calendar-data[^>]*>([\s\S]*?)<\/(?:cal:|C:)?calendar-data>/i)

      if (dataMatch) {
        const icalData = dataMatch[1]
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')

        const event = parseVEvent(icalData)
        event.url = hrefMatch ? hrefMatch[1] : null
        event.etag = etagMatch ? etagMatch[1] : null
        events.push(event)
      }
    }

    events.sort((a, b) => (a.start || 0) - (b.start || 0))
    return events
  } catch (error) {
    console.error('Calendar getEvents error:', error.message)
    return []
  }
}

/**
 * Создаёт новое событие (PUT)
 */
async function createEvent({ summary, start, end, description, location, categories }) {
  const uid = generateUID()
  const icalData = buildVCalendar({ uid, summary, start, end, description, location, categories })

  const eventUrl = `${calendarUrl()}${uid}.ics`

  const res = await fetch(eventUrl, {
    method: 'PUT',
    headers: {
      Authorization: AUTH_HEADER,
      'Content-Type': 'text/calendar; charset=utf-8',
    },
    body: icalData,
  })

  if (!res.ok && res.status !== 201) {
    throw new Error(`Create event failed: ${res.status}`)
  }

  console.log(`[CALENDAR] Created: ${summary} at ${new Date(start).toLocaleString('ru-RU')}`)
  return { uid, url: eventUrl }
}

/**
 * Обновляет существующее событие (PUT с URL)
 */
async function updateEvent(eventUrl, etag, { summary, start, end, description, location, categories, uid }) {
  const icalData = buildVCalendar({ uid, summary, start, end, description, location, categories })

  const fullUrl = eventUrl.startsWith('http') ? eventUrl : `${RADICALE_URL}${eventUrl}`

  const headers = {
    Authorization: AUTH_HEADER,
    'Content-Type': 'text/calendar; charset=utf-8',
  }
  if (etag) headers['If-Match'] = `"${etag}"`

  const res = await fetch(fullUrl, {
    method: 'PUT',
    headers,
    body: icalData,
  })

  if (!res.ok && res.status !== 201 && res.status !== 204) {
    throw new Error(`Update event failed: ${res.status}`)
  }

  console.log(`[CALENDAR] Updated: ${summary}`)
}

/**
 * Удаляет событие (DELETE)
 */
async function deleteEvent(eventUrl, etag) {
  const fullUrl = eventUrl.startsWith('http') ? eventUrl : `${RADICALE_URL}${eventUrl}`

  const headers = { Authorization: AUTH_HEADER }
  if (etag) headers['If-Match'] = `"${etag}"`

  const res = await fetch(fullUrl, {
    method: 'DELETE',
    headers,
  })

  if (!res.ok && res.status !== 204) {
    throw new Error(`Delete event failed: ${res.status}`)
  }

  console.log(`[CALENDAR] Deleted event: ${eventUrl}`)
}

// ===== Утилиты для бота =====

async function getTodaySchedule() {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
  return getEvents(startOfDay, endOfDay)
}

async function getScheduleForDate(date) {
  const d = new Date(date)
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0)
  const endOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59)
  return getEvents(startOfDay, endOfDay)
}

async function getWeekSchedule() {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0)
  const endOfWeek = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000)
  return getEvents(startOfDay, endOfWeek)
}

async function checkAvailability(date, durationHours = 1) {
  const start = new Date(date)
  const end = new Date(start.getTime() + durationHours * 60 * 60 * 1000)

  const dayEvents = await getScheduleForDate(start)

  const conflicts = dayEvents.filter(event => {
    if (!event.start || !event.end) return false
    return event.start < end && event.end > start
  })

  return {
    available: conflicts.length === 0,
    conflicts,
  }
}

function formatEvent(event) {
  const timeOpts = { hour: '2-digit', minute: '2-digit' }
  const startStr = event.start ? event.start.toLocaleTimeString('ru-RU', timeOpts) : '?'
  const endStr = event.end ? event.end.toLocaleTimeString('ru-RU', timeOpts) : '?'
  let result = `${startStr}–${endStr}: ${event.summary || 'Без названия'}`
  if (event.location) result += ` (${event.location})`
  if (event.description) result += ` — ${event.description}`
  return result
}

function formatScheduleForAI(events, dateLabel) {
  if (!events || events.length === 0) {
    return `📅 ${dateLabel}: свободен, нет запланированных событий.`
  }

  const lines = events.map(e => `  • ${formatEvent(e)}`)
  return `📅 ${dateLabel}:\n${lines.join('\n')}`
}

export {
  getEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  getTodaySchedule,
  getScheduleForDate,
  getWeekSchedule,
  checkAvailability,
  formatEvent,
  formatScheduleForAI,
}
