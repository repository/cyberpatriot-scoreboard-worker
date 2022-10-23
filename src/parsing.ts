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
    const [month, day] = dateString.split("/").map((n) => Number(n).toFixed(0).padStart(2, "0"));
    const [hours, minutes] = timeString.split(":").map((n) => Number(n).toFixed(0).padStart(2, "0"));

    const year = new Date().getFullYear();

    const time = new Date(`${year}-${month}-${day}T${hours}:${minutes}:00.000Z`);

    return {
      time: time,
      images: images.reduce((acc, image, i) => {
        acc[image] = counts[i] as number;
        return acc;
      }, {} as Record<string, number>),
    };
  });
}
