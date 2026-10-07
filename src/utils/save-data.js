import supabase from "../api/supabase/client.js";
import { formatHora } from "./format.js";

export const saveData = async (data) => {
  const dataRem = {
    station: data.station,
    temp: data.temp,
    time: data.time,
    max_temp: data.maxTemp,
    min_temp: data.minTemp,
    humedity: data.humedity,
    radiation: data.radiation,
    rain_1h: data.rain_1h,
    rain_24h: data.rain_24h,
    rain_30d: data.rain_30d,
    sumarize: data.sumarize ?? data.summarize,
    vps: data.vps,
  };
  try {
    const { error } = await supabase.from("datos_rem").insert([dataRem]);
    if (error) throw new Error(error.message);
    console.log("Datos guardados en datos_rem");
  } catch (error) {
    console.log(error);
  }
};

export const getLastEntries = async (limit = 24) => {
  const { data, error } = await supabase
    .from("datos_rem")
    .select("*")
    .order("time", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);
  return (data || []).reverse();
};

export const getEntriesOfDay = async (date = new Date()) => {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const start = new Date(`${day}T00:00:00-03:00`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  const { data, error } = await supabase
    .from("datos_rem")
    .select("*")
    .gte("time", start.toISOString())
    .lt("time", end.toISOString())
    .order("time", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
};

export const mapRowToDatos = (row) => ({
  Estacion: row.station,
  Hora: formatHora(row.time),
  Temperatura: row.temp,
  Humedad: row.humedity,
  "Lluvia (1h)": row.rain_1h,
  "Lluvia (24h)": row.rain_24h,
  "Lluvia (30d)": row.rain_30d,
  "Lluvia (Año)": row.rain_year ?? "N/A",
  "Rad. Solar": row.radiation,
  "Temp Max Hoy": row.max_temp,
  "Temp Min Hoy": row.min_temp,
});