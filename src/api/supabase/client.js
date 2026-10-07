import { createClient } from "@supabase/supabase-js";
import WebSocket from "ws";
import "dotenv/config";

const supabaseUrl = process.env.SUPABASE_URL;
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
const secretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !publishableKey) {
  throw new Error(
    "Faltan SUPABASE_URL o SUPABASE_PUBLISHABLE_KEY en las variables de entorno",
  );
}

export const supabase = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
  realtime: { transport: WebSocket },
});

export const supabaseAdmin = secretKey
  ? createClient(supabaseUrl, secretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { transport: WebSocket },
    })
  : supabase;

export default supabase;
