import { useSyncExternalStore } from "react";

const PARAM = "agency";

const listeners = new Set<() => void>();

const readAgencyId = (): string | null =>
  new URLSearchParams(window.location.search).get(PARAM);

const subscribe = (onChange: () => void): (() => void) => {
  listeners.add(onChange);
  window.addEventListener("popstate", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("popstate", onChange);
  };
};

/**
 * The URL is the only record of which agency is open, so a reload keeps it, a
 * link carries it, and the browser's back button leaves it.
 */
export const selectAgency = (agencyId: string | null): void => {
  const url = new URL(window.location.href);
  if (agencyId === null) {
    url.searchParams.delete(PARAM);
  } else {
    url.searchParams.set(PARAM, agencyId);
  }
  window.history.pushState(null, "", url);
  for (const notify of listeners) {
    notify();
  }
};

export const useSelectedAgencyId = (): string | null =>
  useSyncExternalStore(subscribe, readAgencyId, () => null);
