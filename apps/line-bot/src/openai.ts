import OpenAI from "openai";
import { env } from "./env.js";

let client: OpenAI | null = null;

export const getOpenAI = (): OpenAI => {
  if (!client) {
    client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  }
  return client;
};
