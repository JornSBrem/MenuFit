import type { IngestRetryPolicy } from "./types";

const sleep = async (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

export const withRetry = async <T>(
  operation: () => Promise<T>,
  retryPolicy: IngestRetryPolicy,
): Promise<T> => {
  let attempt = 0;
  let lastError: unknown;

  while (attempt < retryPolicy.maxAttempts) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      attempt += 1;
      if (attempt >= retryPolicy.maxAttempts) {
        break;
      }

      const delay = retryPolicy.baseDelayMs * retryPolicy.backoffMultiplier ** (attempt - 1);
      await sleep(delay);
    }
  }

  throw lastError;
};
