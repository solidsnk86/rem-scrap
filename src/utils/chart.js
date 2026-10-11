import { parseNumber } from "./format.js";

export function buildTempChartMd(rows) {
  const points = rows
    .map((row) => ({
      ts: new Date(row.time).getTime(),
      hora: new Intl.DateTimeFormat("es-AR", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
        timeZone: "America/Buenos_Aires",
      }).format(new Date(row.time)),
      temp: parseNumber(row.temp),
    }))
    .filter((point) => Number.isFinite(point.ts) && point.temp !== null)
    .sort((a, b) => a.ts - b.ts);

  if (points.length < 2) return "";

  const maxPoints = 12;
  const sampledPoints =
    points.length <= maxPoints
      ? points
      : points.filter((_, index) => index % Math.ceil(points.length / maxPoints) === 0);

  if (sampledPoints[sampledPoints.length - 1]?.ts !== points[points.length - 1]?.ts) {
    sampledPoints.push(points[points.length - 1]);
  }

  const temps = sampledPoints.map((point) => Number(point.temp.toFixed(1)));
  const min = Math.floor(Math.min(...temps)) - 1;
  let max = Math.ceil(Math.max(...temps)) + 1;
  if (max === min) max = min + 1;

  return [
    "```mermaid",
    "xychart-beta",
    '    title "Temperatura últimas 24 horas (ºC)"',
    `    x-axis [${sampledPoints.map((point) => `"${point.hora}"`).join(", ")}]`,
    `    y-axis "ºC" ${min} --> ${max}`,
    `    line [${temps.join(", ")}]`,
    "```",
  ].join("\n");
}