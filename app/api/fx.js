import { BANXICO_CACHE_CONTROL, fetchBanxicoFix } from "../server/banxico-fix.js";

export default async function handler(request, response) {
  if (request.method !== "GET") {
    response.setHeader("Allow", "GET");
    return response.status(405).json({ error: "Method not allowed" });
  }

  try {
    const fix = await fetchBanxicoFix();
    response.setHeader("Cache-Control", BANXICO_CACHE_CONTROL);
    return response.status(200).json(fix);
  } catch (error) {
    response.setHeader("Cache-Control", "no-store");
    return response.status(503).json({
      error: "Banxico FIX is temporarily unavailable",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
