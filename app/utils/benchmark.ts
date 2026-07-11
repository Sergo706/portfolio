export async function benchmarkAsync<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const start = performance.now();
  console.log(`[Benchmark] Starting: ${name}...`);
  try {
    const result = await fn();
    return result;
  } finally {
    const end = performance.now();
    const time = end - start;
    console.log(`[Benchmark] Finished: ${name} | Took: ${time.toFixed(2)}ms`);
  }
}

export function benchmarkSync<T>(name: string, fn: () => T): T {
  const start = performance.now();
  console.log(`[Benchmark] Starting: ${name}...`);
  try {
    const result = fn();
    return result;
  } finally {
    const end = performance.now();
    const time = end - start;
    console.log(`[Benchmark] Finished: ${name} | Took: ${time.toFixed(2)}ms`);
  }
}


export function useBenchmarkView(name: string | (() => string), loading: Ref<boolean>) {
  let start = 0;
  
  watch(loading, (isLoading) => {
    if (isLoading) {
      start = performance.now();
      const viewName = typeof name === 'function' ? name() : name;
      console.log(`[Benchmark] View '${viewName}' started loading...`);
    } else if (start > 0) {
      const end = performance.now();
      const time = end - start;
      const viewName = typeof name === 'function' ? name() : name;
      console.log(`[Benchmark] View '${viewName}' loaded in ${time.toFixed(2)}ms`);
      start = 0;
    }
  }, { immediate: true });
}

