# Walkthrough & Next Steps

This document serves as the written 5-minute walkthrough of the Borrower Copilot required for the Lokta challenge.

## What was built

Borrower Copilot is a completely local, client-side React application. It captures the complex domain logic of Indian consumer lending and distils it into a self-assessment tool. 

The application architecture is strictly separated into:
- **Rules Engine (`src/rules`)**: Pure functions that hold all domain logic, thresholds, and calculations (FOIR, LTV, IRR/APR, risk bands). 
- **User Interface (`src/components` & `src/pages`)**: A thin presentation layer that never calculates a threshold or makes a lending decision on its own.

### Key Features
- **Adaptive Question Flow**: The engine asks a set of "must" questions, then dynamically determines which "additional" questions apply based on previous answers (e.g., only asking about collateral if the borrower claims to own some).
- **Honesty about limits**: The app explicitly tells the user when it lacks data (via a "Confidence" tag) and dynamically widens rate and amount bands to account for missing information.
- **Diverging Sanction vs. Safe Amount**: The app correctly calculates both the *Lender's likely sanction* (based on strict FOIR and ITR multiples) and the *Borrower's safe limit* (based on real surplus cash flow).
- **The Negotiation Card**: A summary screen designed to be held up in a branch, arming the borrower with their fair rate range and the right questions to ask about fees and APR.

## What I would build next

1. **A Visual EMI vs. Tenure Slider**
   Right now, the safe borrowing amount implies a standard tenure for the chosen product. I would build an interactive slider in the Results page allowing the borrower to adjust the tenure (e.g., 36 vs 60 months) and instantly see the trade-off between monthly EMI outflow and total interest paid.
2. **True Amortization Schedules**
   We currently calculate an effective APR and a static EMI. The next step is a micro-tool to show the amortization schedule, visually highlighting how much of early EMIs go purely to interest (a common blindspot for borrowers).
3. **Save & Compare Options**
   Allowing a borrower to save their "Negotiation Card" to local storage and actively input real quotes from 2-3 different lenders to side-by-side compare APRs and fees in real time.

## What I would cut

1. **Some specific rate bands for niche edge cases**
   The `RULES.md` and thresholds file currently maintain highly specific rate bands for a variety of products. In a real-world V1, I would cut down the product list to just Personal Loans, Home Loans, and Two-Wheeler loans to simplify the maintenance overhead, ignoring Gold Loans or complex Business Loans until we have live data.
2. **Granular 'Income Type' segmentation**
   The split between `self_employed_documented` and `informal_or_gig` adds significant complexity to the routing engine. Lenders often treat them identically (as "non-salaried without standard payslips") unless the ITR is exceptionally strong. I would consider combining these into a single "Self-Employed / Freelance" track that relies purely on declared cash flow and ITR status.
