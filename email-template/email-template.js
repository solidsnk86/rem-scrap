const VPD_TONES = {
  bajo: { border: "#84cc16", bg: "#f7fee7", text: "#4d7c0f" },
  ideal: { border: "#22c55e", bg: "#f0fdf4", text: "#15803d" },
  alto: { border: "#f59e0b", bg: "#fffbeb", text: "#b45309" },
};

function getVpsTone(vpsTexto) {
  const match = String(vpsTexto ?? "").match(/\(([^)]+)\)/);
  const status = match ? match[1].trim().toLowerCase() : "";
  return VPD_TONES[status] || null;
}

function weatherCard(title, value, tone) {
  const frame = tone
    ? `border:1.5px solid ${tone.border};background:${tone.bg};`
    : "border:1px solid #e5e7eb;background:#f9fafb;";
  const valueColor = tone ? `color:${tone.text};` : "";

  return `
    <div style="${frame}border-radius:16px;padding:16px;margin:4px 0;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;margin-bottom:6px;">${title}</div>
      <div style="font-size:20px;font-weight:700;color:#111827;${valueColor}">${value}</div>
    </div>
  `;
}

function cardSection(title, cards) {
  return `
    <div style="margin-top:22px;">
      <p style="margin:0 0 10px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6b7280;">${title}</p>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;">
        ${cards}
      </div>
    </div>
  `;
}

function getTemperatureEmoji(rawValue) {
  const numericValue = Number.parseFloat(
    String(rawValue).replace("ºC", "").replace("°C", "").replace(",", "."),
  );

  if (Number.isNaN(numericValue)) {
    return "❓";
  }

  if (numericValue <= -5) {
    return "❄️";
  }

  if (numericValue <= 0) {
    return "🥶";
  }

  if (numericValue <= 12) {
    return "🧥";
  }

  if (numericValue <= 24) {
    return "☀️";
  }

  return "🔥";
}

export function buildEmailHtml(datos, vpsTexto = "N/A", summarize = "") {
  const temperatureEmoji = getTemperatureEmoji(datos.Temperatura);
  const vpsTone = getVpsTone(vpsTexto);

  return `
    <div style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;color:#111827;">
      <div style="max-width:640px;margin:0 auto;padding:32px 16px;">
        <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:20px;padding:28px;box-shadow:0 10px 30px rgba(0,0,0,0.06);">
          <p style="margin:0 0 8px;font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#6b7280;">Reporte climático</p>
          <h1 style="margin:0 0 6px;font-size:28px;line-height:1.1;">${temperatureEmoji} ${datos.Estacion}</h1>
          <p style="margin:0 0 4px;color:#6b7280;">Actualizado a las ${datos.Hora}</p>

          ${cardSection(
            "Temperatura",
            weatherCard("Temperatura actual", datos.Temperatura) +
              weatherCard("Temp. Máx. Hoy", datos["Temp Max Hoy"]) +
              weatherCard("Temp. Mín. Hoy", datos["Temp Min Hoy"]),
          )}

          ${cardSection(
            "Humedad y VPD",
            weatherCard("Humedad", datos.Humedad) +
              weatherCard("VPD (vps)", vpsTexto, vpsTone),
          )}

          ${cardSection(
            "Precipitación",
            weatherCard("Lluvia 1h", datos["Lluvia (1h)"]) +
              weatherCard("Lluvia 24h", datos["Lluvia (24h)"]) +
              weatherCard("Lluvia 30d", datos["Lluvia (30d)"]) +
              weatherCard("Lluvia Año", datos["Lluvia (Año)"]),
          )}

          ${cardSection(
            "Energía solar",
            weatherCard("Radiación", datos["Rad. Solar"]),
          )}

          ${
            summarize
              ? `
          <div style="margin:26px 0 0;padding:16px 18px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;">
            <p style="margin:0 0 8px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#6366f1;">Resumen del análisis</p>
            <p style="margin:0;font-size:13px;line-height:1.7;color:#334155;">${summarize}</p>
          </div>`
              : ""
          }
          <p>
            Podés ver el resumen a cada hora acá: <a style="text-decoration: underline; color: #3167d3" href="https://github.com/solidsnk86/rem-scrap" target="_blank">https://github.com/solidsnk86/rem-scrap</a>
          </p>

          <div style="display: grid; justify-content: center; margin-top:28px;padding-top:18px;border-top:1px solid #e5e7eb;color:#6b7280;font-size:10px;line-height:1.6;">
            <p style="margin:0 0 6px;font-weight:700;color:#111827;text-align: center;">SolidSnk86 • ${new Date().getFullYear()}</p>
            <p style="margin:0 0 4px; text-align: center;">Estos datos han sido extraídos de fuentes públicas del gobierno.</p>
            <p style="margin:0; text-align: center;">Este reporte fue generado automáticamente.</p>
          </div>
        </div>
      </div>
    </div>
`;
}

function parseTime(time) {
  const [hours, minutes] = time.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

export function timeAgo(date) {
  const rtf = new Intl.RelativeTimeFormat();
  const diff = parseTime(date).getTime() - Date.now();
  const abs = Math.abs(diff);

  const units = [
    { unit: "year", ms: 1000 * 60 * 60 * 24 * 365 },
    { unit: "month", ms: 1000 * 60 * 60 * 24 * 30 },
    { unit: "day", ms: 1000 * 60 * 60 * 24 },
    { unit: "hour", ms: 1000 * 60 * 60 },
    { unit: "minute", ms: 1000 * 60 },
    { unit: "second", ms: 1000 },
  ];

  for (const { unit, ms } of units) {
    const value = Math.round(diff / ms);
    if (abs >= ms || unit === "seconds") {
      return rtf.format(value, unit);
    }
  }
}
