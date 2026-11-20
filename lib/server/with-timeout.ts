export class WriteTimeout extends Error {
  constructor() {
    super('database write timed out');
    this.name = 'WriteTimeout';
  }
}

/** Races a write against a timer that is always cleared, so it never keeps the process alive. */
export async function withTimeout<T>(work: PromiseLike<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new WriteTimeout()), ms);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}
