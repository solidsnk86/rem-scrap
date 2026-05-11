import "dotenv/config";
import { chromium } from "playwright-chromium";
import { writeFile } from "node:fs/promises";
import nodemailer from "nodemailer";
import { buildEmailHtml } from "./email-template.js";

const url = "https://clima.sanluis.gob.ar/Estacion.aspx?estacion=8";

function parseEmailList(value) {
  return String(value || "")
    .split(/[;,]/)
    .map((email) => email.trim())
    .filter(Boolean);
}

function formatDate(date) {
  return new Date(date).toLocaleDateString("es-AR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    minute: "numeric",
    second: "numeric",
  });
}

function buildReadmeMarkdown(datos) {
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

## Fuente

Datos extraídos de [clima.sanluis.gob.ar](https://clima.sanluis.gob.ar/Estacion.aspx?estacion=8).

## Generado automáticamente

Este archivo fue actualizado el ${formatDate(new Date().toISOString())}.
`;
}

async function writeReadme(datos) {
  const readmePath = new URL("./README.md", import.meta.url);
  await writeFile(readmePath, buildReadmeMarkdown(datos), "utf8");
  console.log("README.md actualizado con los últimos datos del clima.");
}

async function sendWeatherEmail(datos) {
  const smtpHost = process.env.SMTP_HOST || "smtp.gmail.com";
  const smtpPort = Number(process.env.SMTP_PORT || 587);
  const smtpSecure = String(process.env.SMTP_SECURE || "false") === "true";
  const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER;
  const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_USER_PASSWORD;
  const mailFrom = process.env.MAIL_FROM || smtpUser;
  const mailTo = process.env.MAIL_TO || mailFrom;
  const mailCc = parseEmailList(process.env.MAIL_CC);

  if (!smtpHost || !smtpUser || !smtpPass || !mailFrom || !mailTo) {
    console.log("Variables SMTP incompletas. Se omite el envío de correo.");
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpSecure,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  const subject = `Clima ${datos.Estacion} • Temperatura actual: ${datos.Temperatura}`;

  await transporter.sendMail({
    from: mailFrom,
    to: mailTo,
    cc: mailCc.length ? mailCc : undefined,
    subject,
    text: [
      `Estación: ${datos.Estacion}`,
      `Hora: ${datos.Hora}`,
      `Temperatura: ${datos.Temperatura}`,
      `Humedad: ${datos.Humedad}`,
      `Lluvia (1h): ${datos["Lluvia (1h)"]}`,
      `Lluvia (24h): ${datos["Lluvia (24h)"]}`,
      `Lluvia (30d): ${datos["Lluvia (30d)"]}`,
      `Radiación: ${datos["Rad. Solar"]}`,
      `Temp Max Hoy: ${datos["Temp Max Hoy"]}`,
      `Temp Min Hoy: ${datos["Temp Min Hoy"]}`,
      "",
      "SolidSnk",
      "Estos datos han sido extraídos de fuentes públicas del gobierno.",
      "Este reporte fue generado automáticamente.",
    ].join("\n"),
    html: buildEmailHtml(datos),
  });

  console.log(
    `Correo enviado a ${mailTo}${mailCc.length ? ` con CC a ${mailCc.join(", ")}` : ""}`,
  );
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

    await writeReadme(datosClima);
    await sendWeatherEmail(datosClima);
  } catch (error) {
    console.error("Error al extraer o enviar la información:", error);
  } finally {
    console.log("Cerrando navegador...");
    await browser.close();
  }
}

main();
