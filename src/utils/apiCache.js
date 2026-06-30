const cache = new Map();

function cacheKeyFor(url, options = {}) {
  return url + (options.headers?.Authorization || '');
}

export async function cachedFetch(url, options = {}, ttlMs = 20000, signal) {
  const cacheKey = cacheKeyFor(url, options);
  const cached = cache.get(cacheKey);
  const now = Date.now();

  if (cached && now < cached.expiresAt) {
    return cached.data;
  }

  if (cached && !signal?.aborted) {
    fetch(url, { ...options, signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) cache.set(cacheKey, { data, expiresAt: Date.now() + ttlMs });
      })
      .catch(() => {});

    return cached.data;
  }

  const res = await fetch(url, { ...options, signal });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  const data = await res.json();
  cache.set(cacheKey, { data, expiresAt: now + ttlMs });
  return data;
}

export function getCached(url, options = {}) {
  const cached = cache.get(cacheKeyFor(url, options));
  return cached?.data ?? null;
}

export function invalidateCache(urlPrefix) {
  for (const key of cache.keys()) {
    if (key.startsWith(urlPrefix)) cache.delete(key);
  }
}
