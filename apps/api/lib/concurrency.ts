const AI_CONCURRENCY = parseInt(process.env.AI_CONCURRENCY ?? '10', 10);
export const GENERATION_TIMEOUT_MS = parseInt(process.env.GENERATION_TIMEOUT_MS ?? '60000', 10);

export function createConcurrencyLimiter(limit: number = AI_CONCURRENCY) {
  let active = 0;
  const queue: Array<() => void> = [];

  function next() {
    if (queue.length > 0 && active < limit) {
      active++;
      const resolve = queue.shift()!;
      resolve();
    }
  }

  return async function <T>(fn: () => Promise<T>): Promise<T> {
    if (active >= limit) {
      await new Promise<void>((resolve) => queue.push(resolve));
    } else {
      active++;
    }
    try {
      return await fn();
    } finally {
      active--;
      next();
    }
  };
}

export function withTimeout<T>(
  promise: Promise<T>,
  ms: number = GENERATION_TIMEOUT_MS,
  label = 'Operation',
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timed out after ${ms}ms`)),
      ms,
    );
    promise
      .then((v) => { clearTimeout(timer); resolve(v); })
      .catch((e) => { clearTimeout(timer); reject(e); });
  });
}
