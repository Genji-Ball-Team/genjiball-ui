import { defineConfig } from "vitest/config";

// Components are custom elements, so tests run in a DOM.
export default defineConfig({
  test: { environment: "happy-dom" },
});
