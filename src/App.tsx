import { useReducer, useMemo } from "react";
import type { BorrowerProfile } from "./types/borrower";
import { runFullAssessment } from "./rules/assemble";
import { IntroPage } from "./pages/IntroPage";
import { QuestionFlowPage } from "./pages/QuestionFlowPage";
import { ResultsPage } from "./pages/ResultsPage";
import { NegotiationCardPage } from "./pages/NegotiationCardPage";

// ---------------------------------------------------------------------------
// State + reducer
// ---------------------------------------------------------------------------

type Screen = "intro" | "questions" | "results" | "negotiation";

interface AppState {
  profile: BorrowerProfile;
  skippedIds: Set<keyof BorrowerProfile>;
  screen: Screen;
}

type AppAction =
  | { type: "SET_SCREEN"; screen: Screen }
  | { type: "ANSWER"; key: keyof BorrowerProfile; value: unknown }
  | { type: "SKIP"; key: keyof BorrowerProfile }
  | { type: "RESET" };

const INITIAL_STATE: AppState = {
  profile: {},
  skippedIds: new Set(),
  screen: "intro",
};

function reducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_SCREEN":
      return { ...state, screen: action.screen };
    case "ANSWER": {
      const nextProfile = { ...state.profile, [action.key]: action.value };
      const nextSkipped = new Set(state.skippedIds);
      nextSkipped.delete(action.key);
      return { ...state, profile: nextProfile, skippedIds: nextSkipped };
    }
    case "SKIP": {
      const nextSkipped = new Set(state.skippedIds);
      nextSkipped.add(action.key);
      return { ...state, skippedIds: nextSkipped };
    }
    case "RESET":
      return { ...INITIAL_STATE, skippedIds: new Set() };
    default:
      return state;
  }
}

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);

  // Compute the full assessment once per render when on a results screen.
  // This is the ONLY place runFullAssessment is called in the UI — pages
  // receive the result as a prop (Architecture.md boundary rule).
  const assessment = useMemo(
    () =>
      state.screen === "results" || state.screen === "negotiation"
        ? runFullAssessment(state.profile)
        : null,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state.screen, state.profile],
  );

  switch (state.screen) {
    case "intro":
      return (
        <IntroPage
          onStart={() => dispatch({ type: "SET_SCREEN", screen: "questions" })}
        />
      );
    case "questions":
      return (
        <QuestionFlowPage
          profile={state.profile}
          skippedIds={state.skippedIds}
          onAnswer={(key, value) => dispatch({ type: "ANSWER", key, value })}
          onSkip={(key) => dispatch({ type: "SKIP", key })}
          onSeeResults={() => dispatch({ type: "SET_SCREEN", screen: "results" })}
        />
      );
    case "results":
      return assessment ? (
        <ResultsPage
          assessment={assessment}
          onGoToNegotiationCard={() =>
            dispatch({ type: "SET_SCREEN", screen: "negotiation" })
          }
          onStartOver={() => dispatch({ type: "RESET" })}
        />
      ) : null;
    case "negotiation":
      return assessment ? (
        <NegotiationCardPage
          assessment={assessment}
          onBackToResults={() =>
            dispatch({ type: "SET_SCREEN", screen: "results" })
          }
          onStartOver={() => dispatch({ type: "RESET" })}
        />
      ) : null;
  }
}

export default App;
