(() => {
  // Keep local development, Vercel previews, and Sites previews out of analytics.
  if (!["https://sueldo.ai", "https://www.sueldo.ai"].includes(window.location.origin)) return;

  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };

  // Register before loading Vercel's script so the first page view is sanitized too.
  window.va("beforeSend", (event) => {
    if (event.type !== "pageview") return null;

    try {
      const url = new URL(event.url);
      url.search = "";
      url.hash = "";
      return { ...event, url: url.href };
    } catch {
      return null;
    }
  });

  const script = document.createElement("script");
  script.defer = true;
  script.src = "/_vercel/insights/script.js";
  document.head.appendChild(script);
})();
