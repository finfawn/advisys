export default function sortBy(array, iteratee) {
  const arr = Array.isArray(array) ? array.slice() : [];
  return arr.sort((a, b) => {
    const va = iteratee ? iteratee(a) : a;
    const vb = iteratee ? iteratee(b) : b;
    if (va < vb) return -1;
    if (va > vb) return 1;
    return 0;
  });
}
