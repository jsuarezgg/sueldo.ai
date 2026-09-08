// Bound both the request and body read so a stalled reference cannot leave the
// comparison waiting indefinitely. Manual edits remain owned by capture state.
export async function fetchFixReference({ signal, fetchImpl = fetch, timeoutMs = 10000 } = {}) {
  const controller = new AbortController();
  const abort = () => controller.abort(signal.reason);
  if (signal?.aborted) abort();
  else signal?.addEventListener("abort", abort, { once: true });
  const timeout = setTimeout(() => {
    controller.abort(new DOMException("FIX request timed out", "TimeoutError"));
  }, timeoutMs);

  try {
    const response = await fetchImpl("/api/fx", { signal: controller.signal });
    if (!response.ok) throw new Error(`FIX request failed with ${response.status}`);
    const fix = await response.json();
    const date = typeof fix?.date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(fix.date)
      ? new Date(`${fix.date}T00:00:00Z`)
      : null;
    if (typeof fix?.rate !== "number" || !Number.isFinite(fix.rate) || fix.rate <= 0
      || !date || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== fix.date) {
      throw new Error("FIX response contains an invalid rate or source date");
    }
    return { rate: fix.rate, date: fix.date };
  } catch (error) {
    // Aborting native response.json() can produce AbortError even when our
    // timeout caused it. Preserve that reason so the UI can show a failure.
    if (controller.signal.aborted) throw controller.signal.reason;
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
