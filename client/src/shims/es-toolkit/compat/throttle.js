export default function throttle(fn, wait = 0, options = {}) {
  let lastCallTime = 0;
  let timeoutId = null;
  let lastArgs;
  const leading = options.leading !== false;
  const trailing = options.trailing !== false;
  return function throttled(...args) {
    const now = Date.now();
    if (!lastCallTime && !leading) {
      lastCallTime = now;
    }
    const remaining = wait - (now - lastCallTime);
    lastArgs = args;
    if (remaining <= 0 || remaining > wait) {
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      lastCallTime = now;
      fn.apply(this, args);
    } else if (trailing && !timeoutId) {
      timeoutId = setTimeout(() => {
        lastCallTime = leading === false ? 0 : Date.now();
        timeoutId = null;
        fn.apply(this, lastArgs);
        lastArgs = undefined;
      }, remaining);
    }
  };
}
