import { useEffect, useReducer, useRef, useState } from "react";
import { calculateComparison, initialOffers } from "./compensation.js";
import { captureReducer, createCaptureState } from "./capture-state.js";
import { CaptureView } from "./CaptureView.jsx";
import { fetchFixReference } from "./fx-reference.js";
import { ResultsView } from "./ResultsView.jsx";
import { RsuWorkspace } from "./RsuWorkspace.jsx";
import { isSharedComparisonHash, readSharedComparison } from "./share-link.js";

const INITIAL_ASSUMPTIONS = {
  fxRate: 17,
  fxDate: null,
  fxManual: false,
  fxStatus: "loading",
};

// A valid shared link opens straight on its results; anything else starts a new capture.
function createInitialSession() {
  const fallback = {
    captureState: createCaptureState(initialOffers, INITIAL_ASSUMPTIONS),
    horizon: "year",
  };
  const shared = readSharedComparison(window.location.hash);
  if (!shared) return fallback;

  try {
    if (!calculateComparison(shared.offers, shared.assumptions, shared.horizon).valid) return fallback;
    return {
      captureState: {
        ...createCaptureState(shared.offers, shared.assumptions),
        step: 2,
        view: "results",
      },
      horizon: shared.horizon,
    };
  } catch {
    return fallback;
  }
}

// Editing a shared comparison should not leave the old fragment in the address bar.
function clearSharedComparisonFromAddress() {
  if (!isSharedComparisonHash(window.location.hash)) return;
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${window.location.search}`,
  );
}

export function App() {
  const [initialSession] = useState(createInitialSession);
  const [captureState, dispatch] = useReducer(captureReducer, initialSession.captureState);
  const { offers, assumptions, step, view } = captureState;
  const [horizon, setHorizon] = useState(initialSession.horizon);
  const [rsuOfferKey, setRsuOfferKey] = useState("employee");
  const rsuReturnView = useRef("capture");

  const setOffers = (update) => dispatch({ type: "set-offers", update });
  const setAssumptions = (update) => dispatch({ type: "set-assumptions", update });
  const setView = (nextView) => dispatch({ type: "set-view", view: nextView });

  useEffect(() => {
    document.querySelector("#root main h1")?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [view, step]);

  useEffect(() => {
    const controller = new AbortController();
    fetchFixReference({ signal: controller.signal })
      .then((fix) => {
        setAssumptions((current) => current.fxManual ? current : {
          ...current,
          fxRate: fix.rate,
          fxDate: fix.date,
          fxStatus: "ready",
        });
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setAssumptions((current) => current.fxManual ? current : { ...current, fxStatus: "error" });
      });
    return () => controller.abort();
  }, []);

  function openRsuEditor(offerKey, returnView) {
    if (returnView === "results") clearSharedComparisonFromAddress();
    setRsuOfferKey(offerKey);
    rsuReturnView.current = returnView;
    setView("rsu");
  }

  function editOffers() {
    clearSharedComparisonFromAddress();
    dispatch({ type: "edit-offers" });
  }

  if (view === "rsu") {
    return (
      <RsuWorkspace
        offer={offers[rsuOfferKey]}
        assumptions={assumptions}
        onCancel={() => setView(rsuReturnView.current)}
        onSave={(rsu) => {
          setOffers((current) => ({
            ...current,
            [rsuOfferKey]: { ...current[rsuOfferKey], rsu },
          }));
          setView(rsuReturnView.current);
        }}
      />
    );
  }

  if (view === "results") {
    return (
      <ResultsView
        offers={offers}
        assumptions={assumptions}
        horizon={horizon}
        setHorizon={setHorizon}
        onEditOffers={editOffers}
        onEditRsu={(offerKey) => openRsuEditor(offerKey, "results")}
      />
    );
  }

  return (
    <CaptureView
      offers={offers}
      setOffers={setOffers}
      assumptions={assumptions}
      setAssumptions={setAssumptions}
      step={step}
      setStep={(nextStep) => dispatch({ type: "set-step", step: nextStep })}
      onCompare={() => setView("results")}
      onEditRsu={(offerKey) => openRsuEditor(offerKey, "capture")}
    />
  );
}
