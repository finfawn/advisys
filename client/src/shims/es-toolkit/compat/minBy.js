export default function minBy(array, iteratee) {
  let minItem = undefined;
  let minVal = Infinity;
  for (const item of Array.isArray(array) ? array : []) {
    const val = iteratee ? iteratee(item) : item;
    if (val < minVal) {
      minVal = val;
      minItem = item;
    }
  }
  return minItem;
}
