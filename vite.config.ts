import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "lucide-react": path.resolve(__dirname, "./src/components/icons.tsx"),
    },
    dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
  },
  // Chunk-size splitting is handled by route-level React.lazy() in App.tsx
  // instead of a hand-written manualChunks map — a prior attempt at
  // regex-grouping vendor code by library broke Rollup's module init
  // ordering (a "Cannot access 'X' before initialization" crash in
  // production, invisible in dev since `vite dev` doesn't do this chunking
  // at all). Dynamic-import-based splitting doesn't have that failure mode:
  // it follows the real dependency graph instead of an arbitrary regex.
}));
