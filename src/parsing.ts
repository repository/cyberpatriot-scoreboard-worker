import { HistoryElement } from ".";

export function parseRawTime(time: string) {
  time = time.trim();

  const [hours, minutes] = time.trim().split(":").map(Number);
  return hours * 60 + minutes;
}

export function parseRawHistory(rawHistory: unknown): HistoryElement[] {
  if (!Array.isArray(rawHistory) && (rawHistory as Array<unknown>).every(Array.isArray)) {
    return [];
  }

  const guarded = rawHistory as Array<Array<string | number>>;

  const images = guarded
    .shift()
    ?.slice(1)
    .map((e) => e.toString());

  if (!images) {
    return [];
  }

  return guarded.map((e) => {
    const [rawTime, ...counts] = e;

    const [dateString, timeString] = rawTime.toString().split(" ");
    const [month, day] = dateString.split("/").map((n) => Number(n));
    const [hours, minutes] = timeString.split(":").map((n) => Number(n));

    const year = new Date().getFullYear();

    const time = new Date(Date.UTC(year, month - 1, day, hours, minutes));

    return {
      time,
      images: images.reduce((acc, image, i) => {
        acc[image] = counts[i] as number;
        return acc;
      }, {} as Record<string, number>),
    };
  });
}

export function parseRawDateTime(raw: string) {
  const [date, time] = raw.split(" ");
  const [year, month, day] = date.split("-").map(Number);
  const [hours, minutes, seconds] = time.split(":").map(Number);

  return new Date(Date.UTC(year, month - 1, day, hours, minutes, seconds));
}
