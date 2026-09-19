import { BANXICO_CACHE_CONTROL, fetchBanxicoFix } from "../server/banxico-fix.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/fx") {
      if (request.method !== "GET") {
        return Response.json({ error: "Method not allowed" }, {
          status: 405,
          headers: { Allow: "GET" },
        });
      }

      try {
        const fix = await fetchBanxicoFix(env.BANXICO_FETCH ?? fetch);
        return Response.json(fix, { headers: { "Cache-Control": BANXICO_CACHE_CONTROL } });
      } catch (error) {
        return Response.json({
          error: "Banxico FIX is temporarily unavailable",
          detail: error instanceof Error ? error.message : "Unknown error",
        }, { status: 503, headers: { "Cache-Control": "no-store" } });
      }
    }

    return env.ASSETS.fetch(request);
  },
};
