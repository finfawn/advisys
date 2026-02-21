export default function omit(obj, keys) {
  const set = new Set(keys || []);
  const out = {};
  for (const k in obj) {
    if (!set.has(k)) out[k] = obj[k];
  }
  return out;
}
