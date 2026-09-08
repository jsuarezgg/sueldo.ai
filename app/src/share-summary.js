const MXN = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function normalizeOfferName(value, fallback) {
  const name = String(value ?? "").trim();
  return name || fallback;
}

function relativeLead(winnerValue, otherValue) {
  const winner = finiteNumber(winnerValue);
  const other = finiteNumber(otherValue);
  const difference = Math.abs(winner - other);
  if (difference < 0.005) return 0;
  if (Math.abs(other) < 0.005) return null;
  return (difference / Math.abs(other)) * 100;
}

function formatPercent(value) {
  if (value === null) return null;
  if (value === 0) return "0%";
  const digits = value < 10 ? 1 : 0;
  return `${value.toFixed(digits)}%`;
}

function compareMetric(entries, metric, includeDetails) {
  const [first, second] = entries;
  const firstValue = finiteNumber(first.calculation[metric]);
  const secondValue = finiteNumber(second.calculation[metric]);
  const tied = Math.abs(firstValue - secondValue) < 0.005;
  const winner = secondValue > firstValue ? second : first;
  const other = winner === first ? second : first;
  const winnerValue = Math.max(firstValue, secondValue);
  const otherValue = Math.min(firstValue, secondValue);
  const difference = Math.abs(firstValue - secondValue);
  const percent = tied ? 0 : relativeLead(winnerValue, otherValue);

  return {
    tied,
    winnerKey: tied ? null : winner.key,
    winnerLabel: tied ? null : winner.label,
    otherLabel: tied ? null : other.label,
    difference,
    differenceLabel: includeDetails ? MXN.format(difference) : null,
    percent,
    percentLabel: formatPercent(percent),
  };
}

export function createShareSummary({ offers, calculations, months, includeDetails = false }) {
  const entries = [
    {
      key: "employee",
      label: includeDetails
        ? normalizeOfferName(offers.employee.name, "Oferta A")
        : "Oferta A",
      calculation: calculations.employee,
    },
    {
      key: "contractor",
      label: includeDetails
        ? normalizeOfferName(offers.contractor.name, "Oferta B")
        : "Oferta B",
      calculation: calculations.contractor,
    },
  ];

  return {
    includeDetails,
    offerALabel: entries[0].label,
    offerBLabel: entries[1].label,
    periodLabel: months === 36 ? "Comparación a 3 años" : "Comparación a 12 meses",
    economic: compareMetric(entries, "economicValue", includeDetails),
    cash: compareMetric(entries, "averageMonthlyCash", includeDetails),
  };
}

function escapeXml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function metricHeadline(metric) {
  if (metric.tied) return "≈";
  return metric.percentLabel ? `+${metric.percentLabel}` : "Mayor";
}

function metricSupport(metric, noun) {
  if (metric.tied) return `${noun}: prácticamente igual`;
  const detail = metric.differenceLabel ? ` · ${metric.differenceLabel}` : "";
  return `${noun}: ${metric.winnerLabel}${detail}`;
}

export function buildShareCardSvg(summary) {
  const economicHeadline = escapeXml(metricHeadline(summary.economic));
  const economicSupport = escapeXml(metricSupport(summary.economic, "Mayor valor económico"));
  const cashSupport = escapeXml(metricSupport(summary.cash, "Más efectivo mensual"));
  const offerLabels = escapeXml(`${summary.offerALabel}  vs.  ${summary.offerBLabel}`);
  const period = escapeXml(summary.periodLabel);

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <rect width="1200" height="630" fill="#f7f7f5"/>
  <rect x="62" y="62" width="1076" height="506" fill="#ffffff" stroke="#d8d8d4" stroke-width="2"/>
  <text x="116" y="142" fill="#161616" font-family="Archivo, Helvetica, Arial, sans-serif" font-size="42" font-weight="700" letter-spacing="-1">sueldo<tspan fill="#9b1b4a" font-size="32">.ai</tspan></text>
  <text x="1084" y="142" text-anchor="end" fill="#5a5a5a" font-family="Archivo, Helvetica, Arial, sans-serif" font-size="22">${period}</text>
  <line x1="116" y1="181" x2="1084" y2="181" stroke="#d8d8d4" stroke-width="2"/>
  <text x="116" y="252" fill="#5a5a5a" font-family="Archivo, Helvetica, Arial, sans-serif" font-size="25">${offerLabels}</text>
  <text x="116" y="379" fill="#9b1b4a" font-family="Archivo, Helvetica, Arial, sans-serif" font-size="104" font-weight="700" letter-spacing="-3">${economicHeadline}</text>
  <text x="116" y="430" fill="#161616" font-family="Archivo, Helvetica, Arial, sans-serif" font-size="31" font-weight="600">${economicSupport}</text>
  <line x1="116" y1="476" x2="1084" y2="476" stroke="#d8d8d4" stroke-width="2"/>
  <text x="116" y="520" fill="#5a5a5a" font-family="Archivo, Helvetica, Arial, sans-serif" font-size="24">${cashSupport}</text>
  <text x="1084" y="520" text-anchor="end" fill="#5a5a5a" font-family="Archivo, Helvetica, Arial, sans-serif" font-size="21">Compara cualquier oferta</text>
</svg>`;
}

export async function createShareCardPng(summary) {
  if (typeof document === "undefined" || typeof Image === "undefined") {
    throw new Error("La imagen solo puede generarse en el navegador.");
  }

  const svgUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(buildShareCardSvg(summary))}`;
  const image = new Image();
  image.decoding = "async";
  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = () => reject(new Error("No pudimos preparar la imagen."));
    image.src = svgUrl;
  });

  const canvas = document.createElement("canvas");
  canvas.width = 1200;
  canvas.height = 630;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("El navegador no permite generar la imagen.");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  return await new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No pudimos exportar la imagen."));
    }, "image/png");
  });
}
