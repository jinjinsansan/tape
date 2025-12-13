import { performance } from "node:perf_hooks";

type Metadata = Record<string, unknown>;

export const trackApi = async <T>(name: string, handler: () => Promise<T>, metadata?: Metadata): Promise<T> => {
  const start = performance.now();
  try {
    const result = await handler();
    logMetric(name, performance.now() - start, { ...metadata, status: "ok" });
    return result;
  } catch (error) {
    logMetric(name, performance.now() - start, {
      ...metadata,
      status: "error",
      message: error instanceof Error ? error.message : String(error)
    });
    throw error;
  }
};

const logMetric = (name: string, durationMs: number, metadata?: Metadata) => {
  const payload = {
    api: name,
    durationMs: Math.round(durationMs),
    ...metadata
  };

  if (metadata?.status === "error") {
    console.error("[api]", payload);
  } else {
    console.info("[api]", payload);
  }
};
