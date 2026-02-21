export default function range(start, end, step = 1) {
  let s = start, e = end;
  if (e == null) {
    e = s;
    s = 0;
  }
  const out = [];
  if (step === 0) return out;
  if (s <= e) {
    for (let i = s; i < e; i += Math.abs(step)) out.push(i);
  } else {
    for (let i = s; i > e; i -= Math.abs(step)) out.push(i);
  }
  return out;
}
