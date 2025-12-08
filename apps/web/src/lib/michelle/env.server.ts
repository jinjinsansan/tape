import { getMichelleAssistantId, getOpenAIApiKey, useSinrRag } from "@/lib/env";

export const michelleServerEnv = {
  get openAiApiKey() {
    return getOpenAIApiKey();
  },
  get assistantId() {
    return getMichelleAssistantId();
  },
  get useSinrRag() {
    return useSinrRag();
  }
};
