import { useEffect, useState } from "react";
import { useIsTabVisible } from "@/live-map/useIsTabVisible";

export type PolledJson<T> =
  | { readonly status: "loading" }
  | { readonly status: "error"; readonly message: string }
  | { readonly status: "ready"; readonly data: T };

/**
 * Fetches `url` and keeps it fresh on an interval.
 *
 * A refresh never drops back to `loading`: the previous payload stays on screen
 * so a poll does not blank the view. Pointing the hook at a different resource is
 * a remount — give the consumer a `key` — which is why there is no reset here.
 */
export const usePolledJson = <T>(
  url: string,
  intervalMs: number,
  parse: (payload: unknown) => T
): PolledJson<T> => {
  const [state, setState] = useState<PolledJson<T>>({ status: "loading" });
  const isVisible = useIsTabVisible();

  useEffect(() => {
    const controller = new AbortController();
    // Guards every write below: an in-flight response that lands after the
    // effect was torn down belongs to a url or visibility state that is no
    // longer current, and writing it would resurrect stale data.
    let cancelled = false;

    const load = async (): Promise<void> => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (cancelled) {
          return;
        }
        if (!response.ok) {
          setState({
            status: "error",
            message: `${url} responded ${String(response.status)}`,
          });
          return;
        }
        const data = parse(await response.json());
        if (!cancelled) {
          setState({ status: "ready", data });
        }
      } catch (error: unknown) {
        if (cancelled || controller.signal.aborted) {
          return;
        }
        setState({
          status: "error",
          message: error instanceof Error ? error.message : "request failed",
        });
      }
    };

    // A hidden tab keeps its last payload on screen; it just stops asking for a
    // new one until it comes back to the foreground. The timer itself is
    // unconditional so the cleanup below always owns it.
    const tick = (): void => {
      if (isVisible) {
        void load();
      }
    };

    tick();
    const timer = setInterval(tick, intervalMs);

    return () => {
      cancelled = true;
      controller.abort();
      clearInterval(timer);
    };
  }, [url, intervalMs, isVisible, parse]);

  return state;
};
