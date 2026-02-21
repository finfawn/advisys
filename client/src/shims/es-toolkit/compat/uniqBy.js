export default function uniqBy(array, iteratee) {
  const seen = new Set();
  const out = [];
  for (const item of Array.isArray(array) ? array : []) {
    const key = iteratee ? iteratee(item) : item;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}
