export default function debounce(fn: Function, delay: number) {
  let setTimeoutHandle: any;

  return function(...args: Array<any>) {
    // if the function is called again, cancel the timeout and start over again
    clearTimeout(setTimeoutHandle);
    setTimeoutHandle = setTimeout(() => {
      fn.apply(null, args);
    }, delay);
  };
}
