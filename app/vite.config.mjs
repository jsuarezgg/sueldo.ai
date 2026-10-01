import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { BANXICO_CACHE_CONTROL, fetchBanxicoFix } from "./server/banxico-fix.js";
import { toNodeHandler } from "@modelcontextprotocol/node";
import { createMcpEndpoint, MCP_MAX_BODY_BYTES } from "./server/mcp.js";

const CLEAN_STATIC_ROUTES = new Set([
  "/acerca",
  "/como-usar",
  "/comparar-nomina-contractor-mexico",
  "/metodologia",
  "/privacidad",
  "/terminos",
]);

function rewriteCleanStaticRoute(request) {
  if (!request.url || request.method !== "GET") return;
  const [pathname, query] = request.url.split("?", 2);
  if (!CLEAN_STATIC_ROUTES.has(pathname)) return;
  request.url = `${pathname}.html${query ? `?${query}` : ""}`;
}

const cleanStaticRoutes = {
  name: "clean-static-routes",
  configureServer(server) {
    server.middlewares.use((request, _response, next) => {
      rewriteCleanStaticRoute(request);
      next();
    });
  },
  configurePreviewServer(server) {
    server.middlewares.use((request, _response, next) => {
      rewriteCleanStaticRoute(request);
      next();
    });
  },
};

const banxicoDevApi = {
  name: "banxico-dev-api",
  configureServer(server) {
    server.middlewares.use("/api/fx", async (request, response) => {
      if (request.method !== "GET") {
        response.statusCode = 405;
        response.setHeader("Allow", "GET");
        response.end(JSON.stringify({ error: "Method not allowed" }));
        return;
      }

      response.setHeader("Content-Type", "application/json; charset=utf-8");
      try {
        const fix = await fetchBanxicoFix();
        response.statusCode = 200;
        response.setHeader("Cache-Control", BANXICO_CACHE_CONTROL);
        response.end(JSON.stringify(fix));
      } catch (error) {
        response.statusCode = 503;
        response.end(JSON.stringify({
          error: "Banxico FIX is temporarily unavailable",
          detail: error instanceof Error ? error.message : "Unknown error",
        }));
      }
    });
  },
};

const mcpDevApi = {
  name: "mcp-dev-api",
  configureServer(server) {
    const handle = toNodeHandler({ fetch: createMcpEndpoint({
      allowedHosts: ["localhost", "127.0.0.1", "[::1]", "terminal.local"],
    }) }, { maxRequestBodySize: MCP_MAX_BODY_BYTES, onerror: () => {} });
    server.middlewares.use((request, response, next) => {
      if (request.url?.split("?", 1)[0] !== "/api/mcp") return next();
      void handle(request, response);
    });
  },
};

export default defineConfig({
  build: {
    outDir: "dist/client",
  },
  optimizeDeps: {
    include: ["react", "react-dom/client"],
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: ["terminal.local"],
    warmup: {
      clientFiles: ["./src/main.jsx"],
    },
  },
  plugins: [cleanStaticRoutes, banxicoDevApi, mcpDevApi, react()],
});
