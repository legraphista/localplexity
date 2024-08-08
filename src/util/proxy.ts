export async function proxy(url: string, opts: RequestInit) {
  return await fetch(`https://libreplexity-passthrough.legraphista.workers.dev/`, {
    signal: opts.signal,
    method: 'POST',
    body: JSON.stringify({
      url,
      method: opts.method,
      headers: opts.headers,
      body: opts.body,
    }),
  });
}