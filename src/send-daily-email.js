import { generateWeatherSummary } from "./api/groq/route.js";
import { getEntriesOfDay, mapRowToDatos } from "./utils/save-data.js";
import { buildVpsTexto } from "./utils/vpd.js";
import { sendWeatherEmail } from "./utils/email.js";
import { parseNumber } from "./utils/format.js";

const avg = (values) =>
  values.length
    ? Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 10) / 10
    : null;

function buildDayStats(rows) {
  const temps = rows.map((row) => parseNumber(row.temp)).filter((n) => n !== null);
  const humedades = rows
    .map((row) => parseNumber(row.humedity))
    .filter((n) => n !== null);
  const vpsList = rows.map((row) => parseNumber(row.vps)).filter((n) => n !== null);
  const rads = rows.map((row) => parseNumber(row.radiation)).filter((n) => n !== null);
  const maxTemp = Math.max(
    ...rows.map((row) => parseNumber(row.max_temp)).filter((n) => n !== null),
    ...temps,
  );
  const minTemp = Math.min(
    ...rows.map((row) => parseNumber(row.min_temp)).filter((n) => n !== null),
    ...temps,
  );

  return {
    count: rows.length,
    maxTemp,
    minTemp,
    avgTemp: avg(temps),
    avgHum: avg(humedades),
    maxVps: vpsList.length ? Math.max(...vpsList) : null,
    maxRad: rads.length ? Math.max(...rads) : null,
  };
}

function buildDailyInput(rows, stats) {
  const fecha = new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Buenos_Aires",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(rows[0].time));

  const lineas = [
    `Estación: ${rows[0].station}`,
    `Fecha: ${fecha}`,
    `Lecturas del día: ${stats.count}`,
    `Temperatura máxima del día: ${stats.maxTemp} ºC`,
    `Temperatura mínima del día: ${stats.minTemp} ºC`,
  ];

  if (stats.avgTemp !== null) lineas.push(`Temperatura promedio: ${stats.avgTemp} ºC`);
  if (stats.avgHum !== null) lineas.push(`Humedad promedio: ${stats.avgHum} %`);
  if (stats.maxVps !== null) lineas.push(`VPD máximo del día: ${stats.maxVps} kPa`);
  if (stats.maxRad !== null) lineas.push(`Radiación máxima: ${stats.maxRad} W/m2`);

  lineas.push(
    `Lluvia (24h): ${rows[rows.length - 1].rain_24h}`,
    `Lluvia (30d): ${rows[rows.length - 1].rain_30d}`,
  );

  return lineas.join("\n");
}

async function main() {
  console.log("Obteniendo datos del día desde Supabase...");
  const rows = await getEntriesOfDay();
  if (!rows.length) throw new Error("No hay datos del día en Supabase");

  const stats = buildDayStats(rows);
  const latest = rows[rows.length - 1];

  console.log("Generando resumen diario con IA...");
  const resumen = await generateWeatherSummary(buildDailyInput(rows, stats));

  const datos = {
    ...mapRowToDatos(latest),
    "Temp Max Hoy": `${stats.maxTemp} ºC`,
    "Temp Min Hoy": `${stats.minTemp} ºC`,
  };

  const vpsTexto =
    stats.maxVps !== null ? buildVpsTexto(String(stats.maxVps)) : buildVpsTexto(latest.vps);

  console.log("Enviando mail del resumen diario...");
  await sendWeatherEmail(
    datos,
    vpsTexto,
    resumen,
    `Resumen diario ${datos.Estacion} • ${datos.Hora}`,
  );
}

main().catch((error) => {
  console.error("Error en el mail del resumen diario:", error);
  process.exit(1);
});