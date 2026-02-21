export default function maxBy(array, iteratee) {
  let maxItem = undefined;
  let maxVal = -Infinity;
  for (const item of Array.isArray(array) ? array : []) {
    const val = iteratee ? iteratee(item) : item;
    if (val > maxVal) {
      maxVal = val;
      maxItem = item;
    }
  }
  return maxItem;
}
