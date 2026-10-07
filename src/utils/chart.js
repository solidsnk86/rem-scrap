import { parseNumber } from "./format.js";

export function buildTempChartMd(rows) {
  const points = rows
    .map((row) => ({
      hora: new Intl.DateTimeFormat("es-AR", {
        hour: "2-digit",
        hour12: false,
        timeZone: "America/Buenos_Aires",
      }).format(new Date(row.time)),
      temp: parseNumber(row.temp),
    }))
    .filter((point) => point.temp !== null);

  if (points.length < 2) return "";

  const temps = points.map((point) => point.temp);
  const min = Math.floor(Math.min(...temps));
  let max = Math.ceil(Math.max(...temps));
  if (max === min) max = min + 1;

  return [
    "```mermaid",
    "xychart-beta",
    '    title "Temperatura últimas 24 horas (ºC)"',
    `    x-axis [${points.map((p) => `"${p.hora}"`).join(", ")}]`,
    `    y-axis "ºC" ${min} --> ${max}`,
    `    line [${temps.join(", ")}]`,
    "```",
  ].join("\n");
}