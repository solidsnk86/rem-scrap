import { generateWeatherPrediction } from "./api/groq/route.js";
import { getLastEntries, mapRowToDatos } from "./utils/save-data.js";
import { buildVpsTexto } from "./utils/vpd.js";
import { sendWeatherEmail } from "./utils/email.js";
import { formatHora } from "./utils/format.js";

function buildPredictionInput(rows) {
  const station = rows[rows.length - 1].station;
  const lineas = rows.map(
    (row) =>
      `${formatHora(row.time)} — Temp: ${row.temp}, Máx: ${row.max_temp}, Mín: ${row.min_temp}, Humedad: ${row.humedity}, VPD: ${row.vps ?? "N/A"}, Rad: ${row.radiation}, Lluvia 1h: ${row.rain_1h}`,
  );
  return `Últimas ${rows.length} lecturas horarias de la estación ${station}:\n${lineas.join("\n")}`;
}

async function main() {
  console.log("Obteniendo últimas 24 entradas de Supabase...");
  const rows = await getLastEntries(24);
  if (!rows.length) throw new Error("No hay datos guardados en Supabase");

  const latest = rows[rows.length - 1];
  const datos = mapRowToDatos(latest);
  const vpsTexto = buildVpsTexto(latest.vps);

  console.log("Generando predicción con IA...");
  const prediction = await generateWeatherPrediction(buildPredictionInput(rows));

  console.log("Enviando mail de predicción...");
  await sendWeatherEmail(
    datos,
    vpsTexto,
    prediction,
    `Predicción ${datos.Estacion} • ${datos.Hora}`,
  );
}

main().catch((error) => {
  console.error("Error en el mail de predicción:", error);
  process.exit(1);
});