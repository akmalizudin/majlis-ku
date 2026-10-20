// An iCalendar (.ics) file for "Add to calendar". Times are written in UTC so every phone shows local time.

const DEFAULT_LENGTH_MS = 4 * 60 * 60 * 1000;

function stamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escape(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** Lines longer than 75 octets are folded, as the format requires. */
function fold(line: string): string {
  const parts: string[] = [];
  let rest = line;
  while (Buffer.byteLength(rest) > 75) {
    let cut = 75;
    while (Buffer.byteLength(rest.slice(0, cut)) > 75) cut--;
    parts.push(rest.slice(0, cut));
    rest = ` ${rest.slice(cut)}`;
  }
  parts.push(rest);
  return parts.join("\r\n");
}

export function eventIcs({
  uid,
  title,
  startsAt,
  endsAt,
  location,
  description,
  url,
  now = new Date(),
}: {
  uid: string;
  title: string;
  startsAt: Date;
  endsAt: Date | null;
  location: string | null;
  description: string;
  url: string;
  now?: Date;
}): string {
  const end = endsAt ?? new Date(startsAt.getTime() + DEFAULT_LENGTH_MS);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Majlis Ku//E-card//MS",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${stamp(now)}`,
    `DTSTART:${stamp(startsAt)}`,
    `DTEND:${stamp(end)}`,
    `SUMMARY:${escape(title)}`,
    ...(location ? [`LOCATION:${escape(location)}`] : []),
    `DESCRIPTION:${escape(description)}`,
    `URL:${url}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.map(fold).join("\r\n")}\r\n`;
}