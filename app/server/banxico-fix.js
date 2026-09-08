const BANXICO_FIX_URL = "https://www.banxico.org.mx/tipcamb/tipCamMIAction.do?idioma=sp";

function toIsoDate(date) {
  const [day, month, year] = date.split("/");
  return `${year}-${month}-${day}`;
}

export function parseBanxicoFix(html) {
  const rowPattern = /<tr\s+class="renglon(?:Non|Par)"[^>]*>[\s\S]*?<td[^>]*>\s*(\d{2}\/\d{2}\/\d{4})\s*<\/td>\s*<td[^>]*>\s*([\d.]+|N\/E)\s*<\/td>[\s\S]*?<\/tr>/gi;

  for (const match of html.matchAll(rowPattern)) {
    const rate = Number(match[2]);
    if (Number.isFinite(rate) && rate > 0) {
      return {
        rate,
        date: toIsoDate(match[1]),
        source: "Banco de México",
        series: "FIX",
      };
    }
  }

  throw new Error("Banxico did not return a current numeric FIX rate");
}

export async function fetchBanxicoFix(fetchImpl = fetch) {
  const response = await fetchImpl(BANXICO_FIX_URL, {
    headers: { accept: "text/html" },
  });

  if (!response.ok) {
    throw new Error(`Banxico request failed with ${response.status}`);
  }

  return parseBanxicoFix(await response.text());
}

export const BANXICO_CACHE_CONTROL = "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400";
