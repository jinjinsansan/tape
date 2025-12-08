import OpenAI from "openai";

import { MICHELLE_AI_ENABLED } from "@/lib/feature-flags";
import { michelleServerEnv } from "@/lib/michelle/env.server";

let michelleOpenAIClient: OpenAI | null = null;

export const getMichelleOpenAIClient = () => {
  if (!MICHELLE_AI_ENABLED) {
    throw new Error("Michelle AI is disabled");
  }

  if (michelleOpenAIClient) {
    return michelleOpenAIClient;
  }

  michelleOpenAIClient = new OpenAI({ apiKey: michelleServerEnv.openAiApiKey });
  return michelleOpenAIClient;
};

export const getMichelleAssistantId = () => michelleServerEnv.assistantId;
