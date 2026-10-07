import dotenv from "dotenv";
import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
import { generateWeatherSummary } from "./api/groq/route.js";
import { saveData, getLastEntries } from "./utils/save-data.js";
import { buildTempChartMd } from "./utils/chart.js";
import { parseNumber } from "./utils/format.js";
import { calculateVPD, getVPDStatus } from "./utils/vpd.js";

dotenv.config();

const url = "https://clima.sanluis.gob.ar/Estacion.aspx?estacion=8";

function buildReadmeMarkdown(datos, vpsTexto, summarize, chartMd = "") {
  return `# rem-scrap

Actualización automática del clima para la estación ${datos.Estacion}.

## Últimos datos

| Campo | Valor |
| --- | --- |
| Estación | ${datos.Estacion} |
| Hora | ${datos.Hora} |
| Temperatura | ${datos.Temperatura} |
| Humedad | ${datos.Humedad} |
| Lluvia (1h) | ${datos["Lluvia (1h)"]} |
| Lluvia (24h) | ${datos["Lluvia (24h)"]} |
| Lluvia (30d) | ${datos["Lluvia (30d)"]} |
| Lluvia (Año) | ${datos["Lluvia (Año)"]} |
| Rad. Solar | ${datos["Rad. Solar"]} |
| Temp Max Hoy | ${datos["Temp Max Hoy"]} |
| Temp Min Hoy | ${datos["Temp Min Hoy"]} |
| VPS (VPD) | ${vpsTexto} |

## Resumen IA

${summarize || "Sin resumen disponible."}

## Tendencia últimas 24 h

${chartMd || "Sin datos suficientes para el gráfico."}

## Fuente

Datos extraídos de [clima.sanluis.gob.ar](https://clima.sanluis.gob.ar/Estacion.aspx?estacion=8).

## Generado automáticamente

Este archivo fue actualizado el ${new Date().toLocaleString("es-AR", { year: "numeric", month: "long", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric", timezone: "America/Buenos_Aires" })}.
`;
}

function buildSummaryInput(datos, vps, vpsStatus) {
  const lineas = [
    `Estación: ${datos.Estacion}`,
    `Hora: ${datos.Hora}`,
    `Temperatura actual: ${datos.Temperatura}`,
    `Temp Max Hoy: ${datos["Temp Max Hoy"]}`,
    `Temp Min Hoy: ${datos["Temp Min Hoy"]}`,
    `Humedad: ${datos.Humedad}`,
  ];

  if (vps !== null) {
    lineas.push(`VPD (vps): ${vps} kPa (${vpsStatus})`);
  }

  lineas.push(
    `Lluvia (1h): ${datos["Lluvia (1h)"]}`,
    `Lluvia (24h): ${datos["Lluvia (24h)"]}`,
    `Lluvia (30d): ${datos["Lluvia (30d)"]}`,
    `Lluvia (Año): ${datos["Lluvia (Año)"]}`,
    `Rad. Solar: ${datos["Rad. Solar"]}`,
  );

  return lineas.join("\n");
}

async function writeReadme(datos, vpsTexto, summarize, chartMd) {
  const readmePath = new URL("../README.md", import.meta.url);
  await writeFile(
    readmePath,
    buildReadmeMarkdown(datos, vpsTexto, summarize, chartMd),
    "utf8",
  );
  console.log("README.md actualizado con los últimos datos del clima.");
}

async function main() {
  console.log("Iniciando navegador...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ ignoreHTTPSErrors: true });
  const page = await context.newPage();

  try {
    console.log("Navegando a la web del clima...");
    await page.goto(url, { waitUntil: "domcontentloaded" });

    console.log("Esperando los datos de la estación...");
    await page
      .locator("#ContentPlaceHolder1_lblTemperatura")
      .waitFor({ state: "visible", timeout: 15000 });

    const datosClima = await page.evaluate(() => {
      const getText = (id) =>
        document.getElementById(id)?.textContent?.trim() || "N/A";
      const estacionBruta =
        document
          .getElementById("ContentPlaceHolder1_Titulo")
          ?.textContent?.trim() || "";

      return {
        Estacion: estacionBruta.replace("Datos de la estación: ", ""),
        Hora: getText("ContentPlaceHolder1_lblHora"),
        Temperatura: `${getText("ContentPlaceHolder1_lblTemperatura")} ºC`,
        Humedad: `${getText("ContentPlaceHolder1_lblHumedad")} %`,
        "Lluvia (1h)": `${getText("ContentPlaceHolder1_lblPrecipitacion")} mm`,
        "Lluvia (24h)": `${getText("ContentPlaceHolder1_lblPrecipitacion24h")} mm`,
        "Lluvia (30d)": `${getText("ContentPlaceHolder1_lblPrecipitacion30d")} mm`,
        "Lluvia (Año)": `${getText("ContentPlaceHolder1_lblPrecipitacionAnio")} mm`,
        "Rad. Solar": `${getText("ContentPlaceHolder1_lblRadiacionSolar")} W/m2`,
        "Temp Max Hoy": getText("ContentPlaceHolder1_lblTempMaxHoy"),
        "Temp Min Hoy": getText("ContentPlaceHolder1_lblTempMinHoy"),
      };
    });

    console.log("\n📊 Datos extraídos:");
    console.table(datosClima);

    const temp = parseNumber(datosClima.Temperatura);
    const humedity = parseNumber(datosClima.Humedad);
    const vps =
      temp !== null && humedity !== null ? calculateVPD(temp, humedity) : null;
    const vpsStatus = vps !== null ? getVPDStatus(vps) : null;
    const vpsTexto = vps !== null ? `${vps} kPa (${vpsStatus})` : "N/A";

    console.log(`VPD: ${vpsTexto}`);

    console.log("Generando resumen con IA...");
    let summarize = "";
    try {
      summarize = await generateWeatherSummary(
        buildSummaryInput(datosClima, vps, vpsStatus),
      );
    } catch (error) {
      console.error("No se pudo generar el resumen con IA:", error.message);
    }

    await saveData({
      station: datosClima.Estacion,
      temp: datosClima.Temperatura,
      time: new Date().toISOString(),
      maxTemp: datosClima["Temp Max Hoy"],
      minTemp: datosClima["Temp Min Hoy"],
      humedity: datosClima.Humedad,
      radiation: datosClima["Rad. Solar"],
      rain_1h: datosClima["Lluvia (1h)"],
      rain_24h: datosClima["Lluvia (24h)"],
      rain_30d: datosClima["Lluvia (30d)"],
      summarize,
      vps: vps !== null ? String(vps) : null,
    });

    let chartMd = "";
    try {
      const lastRows = await getLastEntries(24);
      chartMd = buildTempChartMd(lastRows);
    } catch (error) {
      console.error("No se pudo generar el gráfico:", error.message);
    }

    await writeReadme(datosClima, vpsTexto, summarize, chartMd);
  } catch (error) {
    console.error("Error al extraer o enviar la información:", error);
  } finally {
    console.log("Cerrando navegador...");
    await browser.close();
  }
}

main();