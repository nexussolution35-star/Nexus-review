export const iso = (d: Date): string => d.toISOString().slice(0, 10);

export const fmtDate = (isoDate: string): string =>
  new Date(isoDate + "T00:00:00").toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const fmtDateShort = (isoDate: string): string =>
  new Date(isoDate + "T00:00:00").toLocaleDateString("en-ZA", {
    day: "numeric",
    month: "short",
  });

export const addDays = (isoDate: string, days: number): string => {
  const d = new Date(isoDate + "T00:00:00");
  d.setDate(d.getDate() + days);
  return iso(d);
};

export const daysBetween = (fromIso: string, toIso: string): number =>
  Math.round(
    (new Date(toIso + "T00:00:00").getTime() - new Date(fromIso + "T00:00:00").getTime()) /
      86400000
  );

export const normalizePhone = (raw: string): string => raw.replace(/[^\d+]/g, "");

export const initials = (name: string): string =>
  name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const plural = (n: number, one: string, many: string): string =>
  `${n} ${n === 1 ? one : many}`;
