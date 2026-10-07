export function parseNumber(value) {
  const match = String(value ?? "")
    .replace(",", ".")
    .match(/-?\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : null;
}

export function formatHora(time) {
  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Buenos_Aires",
  }).format(new Date(time));
}