import * as React from 'react';

// Hooks which stores the previous state value so that we can compare the
// current and previous values. Like we do in componentDidUpdate with
// prevProps
export default function usePrevious<T>(value?: T): T | undefined {
  // The ref object is a generic container whose current property is mutable ...
  // ... and can hold any value, similar to an instance property on a class
  const ref = React.useRef<T | undefined>(undefined);

  // Store current value in ref
  React.useEffect(() => {
    ref.current = value;
  }, [value]); // Only re-run if value changes

  // Return previous value (happens before update in useEffect above)
  return ref.current;
}
