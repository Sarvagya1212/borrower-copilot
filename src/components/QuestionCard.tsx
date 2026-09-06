import { useState } from "react";
import type { BorrowerProfile, CreditScoreInfo, Question } from "../types/borrower";

// ---------------------------------------------------------------------------
// Option maps — every select/choice question needs its human-readable labels
// ---------------------------------------------------------------------------

const PURPOSE_OPTIONS: { value: BorrowerProfile["loanPurpose"]; label: string }[] = [
  { value: "wedding", label: "Wedding" },
  { value: "medical", label: "Medical expense" },
  { value: "education", label: "Education" },
  { value: "home_improvement", label: "Home improvement" },
  { value: "debt_consolidation", label: "Consolidating existing debt" },
  { value: "vehicle_for_income", label: "Vehicle for income (e.g. delivery)" },
  { value: "business_stock_or_equipment", label: "Business stock or equipment" },
  { value: "travel_or_discretionary", label: "Travel or discretionary" },
  { value: "other", label: "Other" },
];

const LOAN_TYPE_OPTIONS: { value: BorrowerProfile["loanType"]; label: string }[] = [
  { value: "personal_loan", label: "Personal loan" },
  { value: "gold_loan", label: "Gold loan" },
  { value: "loan_against_property", label: "Loan against property" },
  { value: "home_loan", label: "Home loan" },
  { value: "two_wheeler_loan", label: "Two-wheeler loan" },
  { value: "business_loan", label: "Business loan" },
  { value: "not_sure", label: "Not sure yet" },
];

const INCOME_TYPE_OPTIONS: { value: BorrowerProfile["incomeType"]; label: string }[] = [
  { value: "salaried", label: "Salaried" },
  { value: "self_employed_documented", label: "Self-employed with documented income (ITR)" },
  { value: "informal_or_gig", label: "Informal / gig income" },
];

const COLLATERAL_TYPE_OPTIONS: { value: BorrowerProfile["collateralType"]; label: string }[] = [
  { value: "property", label: "Property" },
  { value: "gold", label: "Gold" },
];

// Which question IDs are money-denominated (show ₹ prefix)
const MONEY_FIELDS: Set<keyof BorrowerProfile> = new Set([
  "amountWanted",
  "netMonthlyIncome",
  "existingMonthlyEmiTotal",
  "essentialMonthlyExpenses",
  "documentedAnnualIncome",
  "collateralEstimatedValue",
  "upcomingLargeExpense",
  "coApplicantMonthlyIncome",
  "expectedMonthlyIncomeFromLoan",
]);

// Which question IDs are percentages
const PERCENT_FIELDS: Set<keyof BorrowerProfile> = new Set([
  "creditCardUtilizationPercent",
  "lenderQuotedRate",
]);

// Which question IDs are booleans rendered as Yes/No
const BOOLEAN_FIELDS: Set<keyof BorrowerProfile> = new Set([
  "hadPaymentBounceRecently",
  "incomeIsSeasonalOrVolatile",
  "hasCollateral",
  "collateralEncumbered",
  "loanExpectedToGenerateIncome",
  "hasCoApplicant",
  "hasCreditCard",
]);

// Which question IDs are select/choice
const SELECT_OPTIONS: Partial<Record<keyof BorrowerProfile, { value: unknown; label: string }[]>> = {
  loanPurpose: PURPOSE_OPTIONS,
  loanType: LOAN_TYPE_OPTIONS,
  incomeType: INCOME_TYPE_OPTIONS,
  collateralType: COLLATERAL_TYPE_OPTIONS,
};

// ---------------------------------------------------------------------------
// Helper text for specific questions
// ---------------------------------------------------------------------------
const HELPER_TEXT: Partial<Record<keyof BorrowerProfile, string>> = {
  netMonthlyIncome: "Your take-home pay after tax and deductions",
  essentialMonthlyExpenses: "Rent, food, utilities, transport — not counting EMIs",
  existingMonthlyEmiTotal: "All current EMIs and credit-card minimums combined. Enter 0 if none.",
  documentedAnnualIncome: "The income figure on your last ITR or tax return",
  creditCardUtilizationPercent: "Roughly what share of your total credit limit you're using right now",
  lenderQuotedRate: "The annual interest rate the lender offered, e.g. 14.5",
  existingLoanRatesKnown: "Enter the rates separated by commas, e.g. 12, 18.5, 24",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function QuestionCard({
  question,
  onAnswer,
  onSkip,
}: {
  question: Question;
  onAnswer: (key: keyof BorrowerProfile, value: unknown) => void;
  onSkip?: () => void;
}) {
  const { id, prompt, tier } = question;
  const canSkip = tier === "additional" && onSkip;

  // --- Credit score: special 3-way input ---
  if (id === "creditScore") {
    return (
      <CreditScoreInput
        prompt={prompt}
        onAnswer={(v) => onAnswer(id, v)}
        onSkip={canSkip ? onSkip : undefined}
      />
    );
  }

  // --- Existing loan rates: comma-separated numbers ---
  if (id === "existingLoanRatesKnown") {
    return (
      <LoanRatesInput
        prompt={prompt}
        onAnswer={(v) => onAnswer(id, v)}
        onSkip={canSkip ? onSkip : undefined}
      />
    );
  }

  // --- Select/choice questions ---
  const options = SELECT_OPTIONS[id];
  if (options) {
    return (
      <SelectInput
        prompt={prompt}
        options={options}
        onAnswer={(v) => onAnswer(id, v)}
        onSkip={canSkip ? onSkip : undefined}
      />
    );
  }

  // --- Boolean (Yes / No) ---
  if (BOOLEAN_FIELDS.has(id)) {
    return (
      <BooleanInput
        prompt={prompt}
        onAnswer={(v) => onAnswer(id, v)}
        onSkip={canSkip ? onSkip : undefined}
      />
    );
  }

  // --- Number input (money, percent, or plain) ---
  const isMoney = MONEY_FIELDS.has(id);
  const isPercent = PERCENT_FIELDS.has(id);
  return (
    <NumberInput
      prompt={prompt}
      prefix={isMoney ? "₹" : undefined}
      suffix={isPercent ? "%" : undefined}
      helperText={HELPER_TEXT[id]}
      onAnswer={(v) => onAnswer(id, v)}
      onSkip={canSkip ? onSkip : undefined}
      allowZero={id === "existingMonthlyEmiTotal"}
    />
  );
}

// ---------------------------------------------------------------------------
// Sub-widgets
// ---------------------------------------------------------------------------

function SelectInput({
  prompt,
  options,
  onAnswer,
  onSkip,
}: {
  prompt: string;
  options: { value: unknown; label: string }[];
  onAnswer: (v: unknown) => void;
  onSkip?: () => void;
}) {
  const [selected, setSelected] = useState<unknown>(null);

  return (
    <div className="question-card">
      <h2>{prompt}</h2>
      <div className="options-list">
        {options.map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            className="btn-choice"
            data-selected={selected === opt.value ? "true" : "false"}
            onClick={() => setSelected(opt.value)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="btn-primary"
        disabled={selected === null}
        onClick={() => onAnswer(selected)}
      >
        Next
      </button>
      {onSkip && (
        <button type="button" className="btn-secondary" onClick={onSkip}>
          Skip this question
        </button>
      )}
    </div>
  );
}

function BooleanInput({
  prompt,
  onAnswer,
  onSkip,
}: {
  prompt: string;
  onAnswer: (v: boolean) => void;
  onSkip?: () => void;
}) {
  const [selected, setSelected] = useState<boolean | null>(null);

  return (
    <div className="question-card">
      <h2>{prompt}</h2>
      <div className="options-list">
        <button
          type="button"
          className="btn-choice"
          data-selected={selected === true ? "true" : "false"}
          onClick={() => setSelected(true)}
        >
          Yes
        </button>
        <button
          type="button"
          className="btn-choice"
          data-selected={selected === false ? "true" : "false"}
          onClick={() => setSelected(false)}
        >
          No
        </button>
      </div>
      <button
        type="button"
        className="btn-primary"
        disabled={selected === null}
        onClick={() => onAnswer(selected!)}
      >
        Next
      </button>
      {onSkip && (
        <button type="button" className="btn-secondary" onClick={onSkip}>
          Skip this question
        </button>
      )}
    </div>
  );
}

function NumberInput({
  prompt,
  prefix,
  suffix,
  helperText,
  onAnswer,
  onSkip,
  allowZero = false,
}: {
  prompt: string;
  prefix?: string;
  suffix?: string;
  helperText?: string;
  onAnswer: (v: number) => void;
  onSkip?: () => void;
  allowZero?: boolean;
}) {
  const [raw, setRaw] = useState("");
  const parsed = parseFloat(raw.replace(/,/g, ""));
  const isValid = raw.trim() !== "" && !isNaN(parsed) && (allowZero ? parsed >= 0 : parsed > 0);

  return (
    <div className="question-card">
      <h2>{prompt}</h2>
      <div className="number-input-wrapper">
        {prefix && <span className="input-affix prefix">{prefix}</span>}
        <input
          type="text"
          inputMode="decimal"
          value={raw}
          onChange={(e) => setRaw(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && isValid) onAnswer(parsed);
          }}
          placeholder={prefix ? "0" : ""}
          autoFocus
        />
        {suffix && <span className="input-affix suffix">{suffix}</span>}
      </div>
      {helperText && <p className="helper-text">{helperText}</p>}
      <button
        type="button"
        className="btn-primary"
        disabled={!isValid}
        onClick={() => onAnswer(parsed)}
      >
        Next
      </button>
      {onSkip && (
        <button type="button" className="btn-secondary" onClick={onSkip}>
          Skip this question
        </button>
      )}
    </div>
  );
}

function CreditScoreInput({
  prompt,
  onAnswer,
  onSkip,
}: {
  prompt: string;
  onAnswer: (v: CreditScoreInfo) => void;
  onSkip?: () => void;
}) {
  const [mode, setMode] = useState<"known" | "unknown" | "never" | null>(null);
  const [scoreRaw, setScoreRaw] = useState("");
  const scoreParsed = parseInt(scoreRaw, 10);
  const scoreValid = !isNaN(scoreParsed) && scoreParsed >= 300 && scoreParsed <= 900;

  const canSubmit =
    mode === "unknown" || mode === "never" || (mode === "known" && scoreValid);

  function submit() {
    if (mode === "unknown") onAnswer({ status: "unknown" });
    else if (mode === "never") onAnswer({ status: "never_taken_formal_credit" });
    else if (mode === "known" && scoreValid) onAnswer({ status: "known", score: scoreParsed });
  }

  return (
    <div className="question-card">
      <h2>{prompt}</h2>
      <div className="options-list">
        <button
          type="button"
          className="btn-choice"
          data-selected={mode === "known" ? "true" : "false"}
          onClick={() => setMode("known")}
        >
          I know my score
        </button>
        <button
          type="button"
          className="btn-choice"
          data-selected={mode === "unknown" ? "true" : "false"}
          onClick={() => setMode("unknown")}
        >
          I don't know it
        </button>
        <button
          type="button"
          className="btn-choice"
          data-selected={mode === "never" ? "true" : "false"}
          onClick={() => setMode("never")}
        >
          I've never taken formal credit
        </button>
      </div>
      {mode === "known" && (
        <div style={{ marginTop: "0.6rem" }}>
          <label className="field-label">Your credit score (300–900)</label>
          <input
            type="text"
            inputMode="numeric"
            value={scoreRaw}
            onChange={(e) => setScoreRaw(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSubmit) submit();
            }}
            placeholder="e.g. 740"
            autoFocus
          />
        </div>
      )}
      <button
        type="button"
        className="btn-primary"
        disabled={!canSubmit}
        onClick={submit}
      >
        Next
      </button>
      {onSkip && (
        <button type="button" className="btn-secondary" onClick={onSkip}>
          Skip this question
        </button>
      )}
    </div>
  );
}

function LoanRatesInput({
  prompt,
  onAnswer,
  onSkip,
}: {
  prompt: string;
  onAnswer: (v: number[]) => void;
  onSkip?: () => void;
}) {
  const [raw, setRaw] = useState("");
  const parsed = raw
    .split(",")
    .map((s) => parseFloat(s.trim()))
    .filter((n) => !isNaN(n) && n > 0);
  const isValid = raw.trim() !== "" && parsed.length > 0;

  return (
    <div className="question-card">
      <h2>{prompt}</h2>
      <input
        type="text"
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && isValid) onAnswer(parsed);
        }}
        placeholder="e.g. 12, 18.5, 24"
        autoFocus
      />
      <p className="helper-text">
        {HELPER_TEXT.existingLoanRatesKnown}
      </p>
      <button
        type="button"
        className="btn-primary"
        disabled={!isValid}
        onClick={() => onAnswer(parsed)}
      >
        Next
      </button>
      {onSkip && (
        <button type="button" className="btn-secondary" onClick={onSkip}>
          Skip this question
        </button>
      )}
    </div>
  );
}
