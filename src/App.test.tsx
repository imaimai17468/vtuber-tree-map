import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { App } from "@/App";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("App shows its title while the first snapshot is still in flight", () => {
  // Never settles, so the render under assertion is the loading one.
  vi.stubGlobal(
    "fetch",
    vi.fn<typeof fetch>().mockReturnValue(new Promise(() => {}))
  );

  render(<App />);

  expect(
    screen.getByRole("heading", { name: "VTuber Tree Map" })
  ).toBeInTheDocument();
});
