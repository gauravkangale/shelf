export function userKey(key) {
  try {
    const user = JSON.parse(localStorage.getItem('shelf_current_user') || 'null');
    const prefix = user?.id
      ? user.id
      : user?.email
        ? encodeURIComponent(user.email)
        : 'guest';

    return `${prefix}__${key}`;
  } catch {
    return `guest__${key}`;
  }
}

export function uGet(key, fallback = null) {
  try {
    const raw = localStorage.getItem(userKey(key));
    if (raw === null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function uSet(key, value) {
  try {
    localStorage.setItem(userKey(key), JSON.stringify(value));
  } catch { /* ignore */ }
}

export function uRemove(key) {
  try {
    localStorage.removeItem(userKey(key));
  } catch { /* ignore */ }
}
