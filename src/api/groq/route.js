import OpenAI from "openai";
import { system, systemPredict } from "./const.js";
import "dotenv/config";

const baseURL = "https://api.groq.com/openai/v1";

const buildClients = () => {
  const keys = [
    process.env.STUDIO_NEO_API_KEY,
  ].filter((key) => key && String(key).trim() !== "");

  return [...new Set(keys)].map(
    (apiKey) =>
      new OpenAI({
        apiKey,
        baseURL,
      }),
  );
};

const tryCreate = async (clients, params) => {
  let lastError = null;

  for (const client of clients) {
    try {
      const response = await client.chat.completions.create(params);
      return response.choices[0].message.content;
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError;
};

const getClients = () => buildClients();

export const generateWeatherSummary = async (content) => {
  const clients = getClients();
  const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];

  for (const model of models) {
    try {
      return await tryCreate(clients, {
        model,
        messages: [
          { role: "system", content: system },
          { role: "user", content: String(content).trim() },
        ],
      });
    } catch (err) {
      continue;
    }
  }

  throw new Error("La IA no devolvió un resumen para el mail");
};

export const generateWeatherPrediction = async (content) => {
  const clients = getClients();
  const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];

  for (const model of models) {
    try {
      return await tryCreate(clients, {
        model,
        messages: [
          { role: "system", content: systemPredict },
          { role: "user", content: String(content).trim() },
        ],
      });
    } catch (err) {
      continue;
    }
  }

  throw new Error("La IA no devolvió la predicción para el mail");
};

export const summarizeFallosToJSON = async (content) => {
  const clients = getClients();
  const models = ["openai/gpt-oss-120b", "openai/gpt-oss-20b"];

  for (const model of models) {
    try {
      return await tryCreate(clients, {
        model,
        messages: [
          { role: "system", content: system_fallos },
          { role: "user", content: String(content).trim() },
        ],
      });
    } catch (err) {
      continue;
    }
  }

  throw new Error("La IA no devolvió un JSON para los fallos");
};

export const agentThoughts = async (content) => {
  return tryCreate(getClients(), {
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: system_1 },
      { role: "user", content: String(content).trim() },
    ],
  });
};

export const agentSummarize = async (content) => {
  return tryCreate(getClients(), {
    model: "openai/gpt-oss-120b",
    messages: [
      { role: "system", content: system_3 },
      { role: "user", content: String(content).trim() },
    ],
  });
};
