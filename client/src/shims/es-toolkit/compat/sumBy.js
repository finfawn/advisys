export default function sumBy(array, iteratee) {
  let total = 0;
  for (const item of Array.isArray(array) ? array : []) {
    const val = iteratee ? iteratee(item) : item;
    total += Number(val) || 0;
  }
  return total;
}
