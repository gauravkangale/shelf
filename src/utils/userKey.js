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
    const token = localStorage.getItem('shelf_auth_token');
    if (!token) return;
    localStorage.setItem(userKey(key), JSON.stringify(value));
  } catch {}
}

export function uRemove(key) {
  try {
    const token = localStorage.getItem('shelf_auth_token');
    if (!token) return;
    localStorage.removeItem(userKey(key));
  } catch {}
}
