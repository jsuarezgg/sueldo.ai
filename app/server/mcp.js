import { createMcpHandler, McpServer, validateHostHeader, validateOriginHeader } from "@modelcontextprotocol/server";
import { compareOffers, compareOffersInputSchema } from "./compare-offers.js";

export const MCP_MAX_BODY_BYTES = 64 * 1024;
export const MCP_HOSTS = ["sueldo.ai", "www.sueldo.ai"];

function createServer() {
  const server = new McpServer({ name: "sueldo.ai", version: "1.0.0", websiteUrl: "https://sueldo.ai" }, {
    instructions: "Compara dos ofertas para residentes fiscales en México. Pregunta por datos faltantes, costos y prestaciones antes de calcular; no inventes valores ni confirmes RESICO por la persona. Usa etiquetas genéricas y sólo datos necesarios, nunca documentos ni identificadores personales. Presenta supuestos, límites y enlace editable. El enlace revela los datos a cualquiera que lo reciba.",
  });
  server.registerTool("compare_offers", {
    title: "Comparar ofertas en México",
    description: "Calcula dos ofertas de nómina o contractor (MXN/USD) con el mismo motor de sueldo.ai y devuelve efectivo, impuestos, prestaciones, costos, RSUs, supuestos y enlace editable. No guarda comparaciones. Pregunta por información faltante: 0, [] y null deben ser elecciones explícitas, no supuestos silenciosos. Contractor sólo con elegibilidad RESICO confirmada. Consulta https://sueldo.ai/mcp.md para unidades y un ejemplo.",
    inputSchema: compareOffersInputSchema,
    annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
  }, compareOffers);
  return server;
}

export function createMcpEndpoint({ allowedHosts = MCP_HOSTS } = {}) {
  const handler = createMcpHandler(createServer, {
    maxRequestBodySize: MCP_MAX_BODY_BYTES, maxSubscriptions: 0, keepAliveMs: 0,
    // Do not log protocol errors: they may contain supplied compensation data.
    onerror: () => {},
  });
  return async (request) => {
    let response;
    try {
      const url = new URL(request.url);
      const host = request.headers.get("host") ?? url.host;
      if (!validateHostHeader(host, allowedHosts).ok
        || !validateHostHeader(url.host, allowedHosts).ok
        || !validateOriginHeader(request.headers.get("origin"), allowedHosts).ok) {
        response = Response.json({ error: "Host or Origin not allowed" }, { status: 403 });
      } else if (url.search) {
        response = Response.json({ error: "Send MCP parameters in the POST body, never in the URL" }, { status: 400 });
      } else if (request.method !== "POST") {
        response = Response.json({ error: "Use Streamable HTTP POST; no sessions or subscription stream" }, {
          status: 405, headers: { Allow: "POST" },
        });
      } else {
        response = await handler.fetch(request);
      }
    } catch {
      response = Response.json({ error: "Unable to process MCP request" }, { status: 500 });
    }
    response.headers.set("Cache-Control", "no-store");
    response.headers.set("X-Content-Type-Options", "nosniff");
    return response;
  };
}
