// A show as a calendar event: the .ics file "Agregar a mi calendario" opens (src/pages/fechas/[show].ics.ts),
// which the phone hands to its Calendar app. With no time set, it is an all-day event.
import type { Show } from './site';

export const slug = (s: Show) =>
  `${s.date}-${s.city.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')}`;

/** "sábado, 14 de noviembre de 2026", as iOS wrote the day of an event. */
export const longDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

const esc = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
const compact = (iso: string) => iso.replace(/-/g, '');
const nextDay = (iso: string) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + 1); return d.toISOString().slice(0, 10); };

export function ics(s: Show, artist: string) {
  const title = `${artist} en ${s.city}`;
  const when = s.time
    ? [`DTSTART:${compact(s.date)}T${s.time.replace(':', '')}00`]    // the venue's local time
    : [`DTSTART;VALUE=DATE:${compact(s.date)}`, `DTEND;VALUE=DATE:${compact(nextDay(s.date))}`];
  const lines = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', `PRODID:-//${artist}//Fechas//ES`, 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${slug(s)}@${artist.toLowerCase()}`,
    `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
    ...when,
    `SUMMARY:${esc(title)}`,
    `LOCATION:${esc(`${s.venue}, ${s.city}`)}`,
    ...(s.tickets ? [`URL:${s.tickets}`, `DESCRIPTION:${esc(`Boletos: ${s.tickets}`)}`] : []),
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${esc(`Mañana: ${title}`)}`, 'END:VALARM',
    'END:VEVENT', 'END:VCALENDAR',
  ];
  return lines.join('\r\n') + '\r\n';
}
