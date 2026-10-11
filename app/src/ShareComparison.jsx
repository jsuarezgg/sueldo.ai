import { useMemo, useState } from "react";
import { CaretDown, Copy, DownloadSimple, ShareNetwork } from "@phosphor-icons/react";
import { createShareCardPng, createShareSummary, metricHeadline, metricSupport } from "./share-summary.js";
import { buildUrlShareData, createShareUrl } from "./share-link.js";

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export function ShareComparison({ offers, assumptions, horizon, calculations }) {
  const [includeDetails, setIncludeDetails] = useState(false);
  const [status, setStatus] = useState("");
  const [downloading, setDownloading] = useState(false);
  const summary = useMemo(() => createShareSummary({
    offers,
    calculations,
    months: calculations.months,
    includeDetails,
  }), [offers, calculations, includeDetails]);

  const shareUrl = () => createShareUrl({ offers, assumptions, horizon });

  async function copyShareLink(successMessage = "Enlace copiado. Ya puedes pegarlo donde quieras.") {
    if (!navigator.clipboard?.writeText) {
      setStatus("Tu navegador no permite copiar el enlace automáticamente.");
      return;
    }
    try {
      await navigator.clipboard.writeText(shareUrl());
      setStatus(successMessage);
    } catch {
      setStatus("No pudimos copiar el enlace. Descarga la imagen para compartirla.");
    }
  }

  async function handleShare() {
    if (!navigator.share) {
      await copyShareLink("Tu navegador no abre el menú de compartir; copiamos el enlace.");
      return;
    }
    try {
      await navigator.share(buildUrlShareData(shareUrl()));
      setStatus("Comparación compartida.");
    } catch (error) {
      setStatus(error?.name === "AbortError"
        ? "No se compartió nada."
        : "No pudimos abrir el menú de compartir. Puedes copiar el enlace o descargar la imagen.");
    }
  }

  async function handleDownload() {
    setDownloading(true);
    setStatus("Preparando la imagen…");
    try {
      downloadBlob(await createShareCardPng(summary), "comparacion-sueldo-ai.png");
      setStatus("Imagen descargada.");
    } catch {
      setStatus("No pudimos generar la imagen en este navegador. Copia el enlace para compartirlo.");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <details className="share-disclosure">
      <summary>
        <ShareNetwork size={19} aria-hidden="true" />
        <span>Guardar o compartir</span>
        <CaretDown size={17} aria-hidden="true" />
      </summary>
      <section className="share-comparison" aria-labelledby="share-comparison-title">
        <div className="share-comparison-copy">
          <h2 id="share-comparison-title">Llévate la comparación.</h2>
          <p>
            El enlace incluye todos los montos y supuestos. Cualquiera que lo reciba podrá verlos.
          </p>
          <label className="share-detail-choice">
            <input
              type="checkbox"
              checked={includeDetails}
              onChange={(event) => {
                setIncludeDetails(event.target.checked);
                setStatus("");
              }}
            />
            <span>
              <strong>Mostrar detalles en la imagen</strong>
              <small>Actívalo para poner nombres y montos en la vista previa y el PNG.</small>
            </span>
          </label>
          <div className="share-actions">
            <button type="button" className="share-primary" onClick={handleShare}>
              <ShareNetwork size={18} weight="bold" aria-hidden="true" />
              Compartir enlace
            </button>
            <button type="button" className="share-secondary" onClick={() => copyShareLink()}>
              <Copy size={18} weight="bold" aria-hidden="true" />
              Copiar enlace
            </button>
            <button type="button" className="share-secondary" onClick={handleDownload} disabled={downloading}>
              <DownloadSimple size={18} weight="bold" aria-hidden="true" />
              {downloading ? "Preparando…" : "Descargar PNG"}
            </button>
          </div>
          <p className="share-status" role="status" aria-live="polite">{status}</p>
        </div>

        <div className="share-preview-shell">
          <span className="share-preview-label">Vista previa</span>
          <div className="share-preview" aria-label="Vista previa de la tarjeta para compartir">
            <div className="share-preview-brand">
              <strong>sueldo<span>.ai</span></strong>
              <small>{summary.periodLabel}</small>
            </div>
            <p className="share-preview-offers">{summary.offerALabel} <span>vs.</span> {summary.offerBLabel}</p>
            <strong className="share-preview-value">{metricHeadline(summary.economic)}</strong>
            <p className="share-preview-result">{metricSupport(summary.economic, "Mayor valor económico")}</p>
            <div className="share-preview-footer">
              <span>{metricSupport(summary.cash, "Más efectivo mensual")}</span>
              <small>Compara cualquier oferta</small>
            </div>
          </div>
        </div>
      </section>
    </details>
  );
}
