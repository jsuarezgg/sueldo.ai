const OFFER_KEYS = ["employee", "contractor"];
const OFFER_LABELS = {
  employee: "Oferta A",
  contractor: "Oferta B",
};

const SUPPORTED_CURRENCIES = new Set(["MXN", "USD"]);
const SUPPORTED_RELATIONSHIPS = new Set(["Nómina", "Contratista independiente"]);

function clone(value) {
  return structuredClone(value);
}

function isPositiveNumber(value) {
  return value !== ""
    && value !== null
    && value !== undefined
    && Number.isFinite(Number(value))
    && Number(value) > 0;
}

export function createCaptureState(initialOffers, initialAssumptions) {
  return {
    offers: clone(initialOffers),
    assumptions: { ...initialAssumptions },
    step: 0,
    view: "capture",
  };
}

export function patchOfferState(offers, key, patch) {
  if (!offers[key]) return offers;
  return {
    ...offers,
    [key]: {
      ...offers[key],
      ...patch,
    },
  };
}

export function captureReducer(state, action) {
  switch (action.type) {
    case "set-offers":
      return {
        ...state,
        offers: typeof action.update === "function"
          ? action.update(state.offers)
          : action.update,
      };
    case "set-assumptions":
      return {
        ...state,
        assumptions: typeof action.update === "function"
          ? action.update(state.assumptions)
          : action.update,
      };
    case "set-step":
      return { ...state, step: action.step };
    case "set-view":
      return { ...state, view: action.view };
    case "edit-offers":
      return { ...state, step: 0, view: "capture" };
    default:
      return state;
  }
}

export function getBaseCaptureIssues(offers) {
  return OFFER_KEYS.flatMap((offerKey) => {
    const offer = offers?.[offerKey];
    const offerLabel = OFFER_LABELS[offerKey];
    const issues = [];

    if (!isPositiveNumber(offer?.monthlyPay)) {
      issues.push({
        offerKey,
        field: "monthlyPay",
        message: `El pago mensual de ${offerLabel} debe ser mayor a cero.`,
        action: `Ingresa el pago de ${offerLabel}`,
      });
    }
    if (!SUPPORTED_CURRENCIES.has(offer?.currency)) {
      issues.push({
        offerKey,
        field: "currency",
        message: `Selecciona la moneda de ${offerLabel}.`,
        action: `Selecciona la moneda de ${offerLabel}`,
      });
    }
    if (!SUPPORTED_RELATIONSHIPS.has(offer?.relationship)) {
      issues.push({
        offerKey,
        field: "relationship",
        message: `Selecciona la relación de ${offerLabel}.`,
        action: `Selecciona la relación de ${offerLabel}`,
      });
    }

    return issues;
  });
}

function roundInputAmount(value) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function convertOfferCurrency(offer, nextCurrency, fxRate) {
  if (offer.currency === nextCurrency) {
    return { patch: { currency: nextCurrency }, notice: null };
  }

  const amount = Number(offer.monthlyPay);
  const rate = Number(fxRate);
  const canConvert = offer.monthlyPay !== ""
    && Number.isFinite(amount)
    && Number.isFinite(rate)
    && rate > 0;

  if (!canConvert) {
    return {
      patch: { currency: nextCurrency },
      notice: offer.monthlyPay === "" ? null : {
        kind: "warning",
        fromCurrency: offer.currency,
        toCurrency: nextCurrency,
      },
    };
  }

  const convertedAmount = offer.currency === "USD" && nextCurrency === "MXN"
    ? amount * rate
    : amount / rate;

  return {
    patch: {
      currency: nextCurrency,
      monthlyPay: roundInputAmount(convertedAmount),
    },
    notice: {
      kind: "converted",
      fromCurrency: offer.currency,
      toCurrency: nextCurrency,
      originalAmount: amount,
      convertedAmount: roundInputAmount(convertedAmount),
      fxRate: rate,
    },
  };
}
