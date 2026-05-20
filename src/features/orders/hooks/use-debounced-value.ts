"use client";

import * as React from "react";

export function createDebouncedCallback<T>(
  callback: (value: T) => void,
  delayMs: number,
) {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return {
    schedule(value: T) {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        timeoutId = null;
        callback(value);
      }, delayMs);
    },
    cancel() {
      if (!timeoutId) {
        return;
      }

      clearTimeout(timeoutId);
      timeoutId = null;
    },
  };
}

export function useDebouncedValue<T>(value: T, delayMs: number) {
  const [debouncedValue, setDebouncedValue] = React.useState(value);

  React.useEffect(() => {
    const debouncer = createDebouncedCallback(setDebouncedValue, delayMs);

    debouncer.schedule(value);

    return () => {
      debouncer.cancel();
    };
  }, [delayMs, value]);

  return debouncedValue;
}
