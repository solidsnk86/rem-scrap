import { parseNumber } from "./format.js";

export function calculateVPD(temperature, humidity) {
  // Presión de vapor de saturación (kPa)
  const svp = 0.6108 * Math.exp((17.27 * temperature) / (temperature + 237.3));

  // Presión de vapor real
  const avp = svp * (humidity / 100);

  // Déficit de presión de vapor
  const vpd = svp - avp;

  return Number(vpd.toFixed(2));
}

export function getVPDStatus(vpd, min = 0.8, max = 1.2) {
  if (vpd < min) return "bajo";
  if (vpd > max) return "alto";
  return "ideal";
}

export function buildVpsTexto(vps) {
  const n = parseNumber(vps);
  if (n === null || Number.isNaN(n)) return "N/A";
  return `${n} kPa (${getVPDStatus(n)})`;
}