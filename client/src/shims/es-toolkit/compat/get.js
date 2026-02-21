function toPath(path) {
  if (Array.isArray(path)) return path;
  return String(path)
    .replace(/\[(\d+)\]/g, '.$1')
    .split('.')
    .filter(Boolean);
}

export default function get(obj, path, defaultValue) {
  let cur = obj;
  for (const key of toPath(path)) {
    if (cur == null) return defaultValue;
    cur = cur[key];
  }
  return cur === undefined ? defaultValue : cur;
}
