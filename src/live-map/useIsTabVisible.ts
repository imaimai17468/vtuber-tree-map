import { useSyncExternalStore } from "react";

const subscribe = (onChange: () => void): (() => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => {
    document.removeEventListener("visibilitychange", onChange);
  };
};

const getSnapshot = (): boolean => document.visibilityState === "visible";

/** No document to read on the server, so assume visible and let hydration correct it. */
const getServerSnapshot = (): boolean => true;

/**
 * Whether the tab is in the foreground. Polling is gated on this so a pile of
 * background tabs costs nothing.
 */
export const useIsTabVisible = (): boolean =>
  useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
