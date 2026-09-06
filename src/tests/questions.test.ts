import { describe, it, expect } from "vitest";
import { QUESTIONS } from "../data/questions";
import { getNextQuestion, getApplicableQuestions, getQuestionFlowProgress } from "../rules/questionFlow";
import type { BorrowerProfile } from "../types/borrower";

describe("QUESTIONS registry — structural guarantees", () => {
  it("every question declares at least one output it affects (the 'no generic 30-question form' rule)", () => {
    for (const q of QUESTIONS) {
      expect(q.affects.length, `question '${q.id}' has an empty affects array`).toBeGreaterThan(0);
    }
  });

  it("has exactly 10 must questions, per the brief's 8-10 target", () => {
    const mustCount = QUESTIONS.filter((q) => q.tier === "must").length;
    expect(mustCount).toBe(10);
  });

  it("every question id is unique", () => {
    const ids = QUESTIONS.map((q) => q.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("must questions have no appliesIf gate — they're always shown", () => {
    for (const q of QUESTIONS.filter((q) => q.tier === "must")) {
      expect(q.appliesIf, `must question '${q.id}' should not be gated`).toBeUndefined();
    }
  });
});

describe("getApplicableQuestions — adaptive gating", () => {
  it("a salaried borrower does not see self-employed/informal-only questions", () => {
    const salariedProfile: BorrowerProfile = { incomeType: "salaried" };
    const applicable = getApplicableQuestions(salariedProfile).map((q) => q.id);
    expect(applicable).not.toContain("documentedAnnualIncome");
    expect(applicable).not.toContain("incomeIsSeasonalOrVolatile");
  });

  it("a self-employed borrower DOES see the documented-income and volatility questions", () => {
    const profile: BorrowerProfile = { incomeType: "self_employed_documented" };
    const applicable = getApplicableQuestions(profile).map((q) => q.id);
    expect(applicable).toContain("documentedAnnualIncome");
    expect(applicable).toContain("incomeIsSeasonalOrVolatile");
  });

  it("an informal/gig borrower also sees the documented-income and volatility questions", () => {
    const profile: BorrowerProfile = { incomeType: "informal_or_gig" };
    const applicable = getApplicableQuestions(profile).map((q) => q.id);
    expect(applicable).toContain("documentedAnnualIncome");
    expect(applicable).toContain("incomeIsSeasonalOrVolatile");
  });

  it("collateral follow-ups only appear once hasCollateral is true", () => {
    const noCollateral: BorrowerProfile = { hasCollateral: false };
    const withCollateral: BorrowerProfile = { hasCollateral: true };
    expect(getApplicableQuestions(noCollateral).map((q) => q.id)).not.toContain("collateralType");
    expect(getApplicableQuestions(withCollateral).map((q) => q.id)).toContain("collateralType");
  });

  it("existing-loan-rate question only appears when there's existing EMI", () => {
    const noEmi: BorrowerProfile = { existingMonthlyEmiTotal: 0 };
    const hasEmi: BorrowerProfile = { existingMonthlyEmiTotal: 5000 };
    expect(getApplicableQuestions(noEmi).map((q) => q.id)).not.toContain("existingLoanRatesKnown");
    expect(getApplicableQuestions(hasEmi).map((q) => q.id)).toContain("existingLoanRatesKnown");
  });

  it("the productive-purpose question only appears for productive purposes, not for a wedding loan", () => {
    const wedding: BorrowerProfile = { loanPurpose: "wedding" };
    const vehicle: BorrowerProfile = { loanPurpose: "vehicle_for_income" };
    expect(getApplicableQuestions(wedding).map((q) => q.id)).not.toContain("loanExpectedToGenerateIncome");
    expect(getApplicableQuestions(vehicle).map((q) => q.id)).toContain("loanExpectedToGenerateIncome");
  });

  it("credit-card utilization only appears once hasCreditCard is true", () => {
    const noCard: BorrowerProfile = { hasCreditCard: false };
    const hasCard: BorrowerProfile = { hasCreditCard: true };
    expect(getApplicableQuestions(noCard).map((q) => q.id)).not.toContain("creditCardUtilizationPercent");
    expect(getApplicableQuestions(hasCard).map((q) => q.id)).toContain("creditCardUtilizationPercent");
  });
});

describe("getNextQuestion", () => {
  it("returns the first must question for a completely empty profile", () => {
    const next = getNextQuestion({});
    expect(next?.tier).toBe("must");
    expect(next?.id).toBe("loanPurpose"); // first in registry order
  });

  it("never offers an additional question while any must question is unanswered", () => {
    // Answer everything except one must question, plus an additional
    // question that would otherwise apply — must should still win.
    const profile: BorrowerProfile = {
      loanPurpose: "wedding",
      amountWanted: 100000,
      loanType: "personal_loan",
      incomeType: "salaried",
      // netMonthlyIncome deliberately left unanswered
      existingMonthlyEmiTotal: 0,
      essentialMonthlyExpenses: 20000,
      age: 30,
      creditScore: { status: "known", score: 750 },
      tenureYearsInJobOrBusiness: 3,
      hadPaymentBounceRecently: false, // an additional question, answered early
    };
    const next = getNextQuestion(profile);
    expect(next?.tier).toBe("must");
    expect(next?.id).toBe("netMonthlyIncome");
  });

  it("returns null once every applicable question (must and additional) is answered", () => {
    // A salaried profile with no collateral, no co-applicant, no credit
    // card, existing EMI of 0, and a non-productive purpose — so every
    // gated additional question is inapplicable, and everything
    // applicable is answered.
    const profile: BorrowerProfile = {
      loanPurpose: "wedding",
      amountWanted: 100000,
      loanType: "personal_loan",
      incomeType: "salaried",
      netMonthlyIncome: 80000,
      existingMonthlyEmiTotal: 0,
      essentialMonthlyExpenses: 20000,
      age: 30,
      creditScore: { status: "known", score: 750 },
      tenureYearsInJobOrBusiness: 3,
      hadPaymentBounceRecently: false,
      hasCollateral: false,
      hasCreditCard: false,
      emergencySavingsMonths: 3,
      hasCoApplicant: false,
      upcomingLargeExpense: 0,
      lenderQuotedRate: 12,
    };
    expect(getNextQuestion(profile)).toBeNull();
  });

  it("returning null is actually reachable in practice, not just for a contrived all-fields-filled object", () => {
    // Regression guard: if a future field is added to BorrowerProfile
    // without a matching Question, getNextQuestion could loop forever
    // asking nothing, or (worse) never return null. Confirms the registry
    // and the type stay in sync for at least one full, real path.
    let profile: BorrowerProfile = { loanPurpose: "wedding" };
    let iterations = 0;
    let next = getNextQuestion(profile);
    while (next && iterations < 50) {
      profile = { ...profile, [next.id]: defaultAnswerFor(next.id) } as BorrowerProfile;
      next = getNextQuestion(profile);
      iterations++;
    }
    expect(next).toBeNull();
    expect(iterations).toBeLessThan(50);
  });

  it("skipped additional questions are not re-offered", () => {
    const profile: BorrowerProfile = { hasCollateral: false };
    const skipped = new Set<keyof BorrowerProfile>(["hadPaymentBounceRecently"]);
    const next = getNextQuestion(profile, skipped);
    expect(next?.id).not.toBe("hadPaymentBounceRecently");
  });

  it("must questions cannot be skipped — skippedIds is ignored for the must tier", () => {
    const skipped = new Set<keyof BorrowerProfile>(["loanPurpose"]);
    const next = getNextQuestion({}, skipped);
    expect(next?.id).toBe("loanPurpose");
  });
});

describe("getQuestionFlowProgress", () => {
  it("hasMinimumForOutputs is false until all applicable must questions are answered", () => {
    const partial: BorrowerProfile = { loanPurpose: "wedding" };
    expect(getQuestionFlowProgress(partial).hasMinimumForOutputs).toBe(false);
  });

  it("hasMinimumForOutputs is true once all must questions are answered, regardless of additional questions", () => {
    const profile: BorrowerProfile = {
      loanPurpose: "wedding",
      amountWanted: 100000,
      loanType: "personal_loan",
      incomeType: "salaried",
      netMonthlyIncome: 80000,
      existingMonthlyEmiTotal: 0,
      essentialMonthlyExpenses: 20000,
      age: 30,
      creditScore: { status: "unknown" },
      tenureYearsInJobOrBusiness: 3,
    };
    const progress = getQuestionFlowProgress(profile);
    expect(progress.hasMinimumForOutputs).toBe(true);
    expect(progress.mustAnswered).toBe(progress.mustTotal);
  });
});

/** Minimal stand-in answer per field, used only to drive the
 *  "does the flow ever terminate" regression test above. */
function defaultAnswerFor(id: keyof BorrowerProfile): unknown {
  switch (id) {
    case "creditScore":
      return { status: "unknown" };
    case "incomeType":
      return "salaried";
    case "loanType":
      return "personal_loan";
    case "loanPurpose":
      return "wedding";
    case "collateralType":
      return "gold";
    default:
      return false; // works for booleans; numeric fields just get `false` here too — fine for a termination-only check
  }
}
