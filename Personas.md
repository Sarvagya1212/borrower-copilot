# Personas: Three Run-Throughs

Below is the execution of the Borrower Copilot against the three personas provided in the brief.

## 1. Priya (29, Bengaluru, Salaried)

**Profile:** Software engineer for 5 years. Net ₹1,10,000/month. One car loan (₹14,000 EMI). Credit score 780. Rents at ₹28,000.
**Goal:** Wants ₹8,00,000 personal loan for a wedding.

### The Inputs (What the app asked)
- **Loan Purpose:** Wedding
- **Amount Wanted:** ₹8,00,000
- **Loan Type:** Personal loan
- **Income Type:** Salaried
- **Net Monthly Income:** ₹1,10,000
- **Existing EMIs:** ₹14,000
- **Essential Expenses:** ₹28,000
- **Age:** 29
- **Credit Score:** I know my score → 750 (the app categorizes anything above 750 as excellent/good depending on bands)
- **Tenure in job:** 5 years

### The Four Outputs
1. **Verdict (O1):** **Borrow.** Her requested EMI easily fits within her safe ceiling and her stability tier is "stable".
2. **Maximum Amount (O2):**
   - *Lender Sanction:* ₹27,50,000–₹33,00,000 (Based on a typical 2.5x to 3x income multiple or 50% FOIR cap)
   - *Safe Borrowing Range:* ₹12,00,000–₹14,00,000 (Based on her *actual* surplus cash flow — ₹1,10,000 - ₹14,000 - ₹28,000 - buffer). 
   - *App recommendation:* The app tells her that while the lender will sanction over ₹25L, she should stick to the safe borrowing range.
3. **Fair Rate (O3):** **10.5% – 14.5%**. She is in the strongest pricing tier lenders commonly offer.
4. **EMI Ceiling (O4):** **~₹35,000/month**. This is her safe monthly outflow limit after essentials and existing debt.

### Negotiation Card
- **Recommended amount:** ₹8,00,000 (Requested amount is safe)
- **Safe EMI ceiling:** ₹35,000
- **Fair rate range:** 10.5% – 14.5%
- **Key point:** "Your requested amount is well within your safe range."
- **Question to ask:** "What's the effective APR including all fees?" and "Is the rate fixed or floating?"

---

## 2. Ravi (42, Mysuru, Self-Employed)

**Profile:** Kirana store for 14 years. Cash income ₹40k-80k; ITR shows ₹4,20,000/yr. Owns shop premises (₹45L, unencumbered). Never taken formal loan.
**Goal:** Wants ₹15,00,000 for stock/delivery vehicle.

### The Inputs (What the app asked)
- **Loan Purpose:** Business stock or equipment
- **Amount Wanted:** ₹15,00,000
- **Loan Type:** Personal loan (What he *asked* for)
- **Income Type:** Self-employed with documented income
- **Documented Annual Income:** ₹4,20,000
- **Net Monthly Cash Income:** ₹60,000
- **Existing EMIs:** ₹0
- **Essential Expenses:** ₹30,000
- **Age:** 42
- **Credit Score:** I've never taken formal credit
- **Tenure in business:** 14 years
- **Has collateral:** Yes
- **Collateral Type:** Property
- **Collateral Value:** ₹45,00,000
- **Collateral Encumbered:** No

### The Four Outputs
1. **Verdict (O1):** **Borrow, but switch to a secured product.** He wants an unsecured loan, but he owns a ₹45L property and has no credit history.
2. **Maximum Amount (O2):**
   - *Lender Sanction (Unsecured):* ₹3,00,000–₹4,00,000 (Capped heavily by his thin documented ITR of ₹4.2L).
   - *Safe Borrowing Range (Secured/LAP):* ₹14,00,000–₹16,00,000 (Based on his real cash flow of ₹60k/month, but capped by the LAP LTV).
   - *App recommendation:* The app explicitly routes him away from unsecured loans and tells him a Loan Against Property (LAP) is the only way to safely reach his ₹15L goal.
3. **Fair Rate (O3):** **9.5% – 12.5%** (The LAP rate band, drastically cheaper than an unsecured loan for a new-to-credit borrower).
4. **EMI Ceiling (O4):** **~₹24,000/month**. 

### Negotiation Card
- **Recommended amount:** ₹14,00,000–₹16,00,000 (via Loan Against Property)
- **Safe EMI ceiling:** ₹24,000
- **Fair rate range:** 9.5% – 12.5%
- **Key point:** "A Loan Against Property is significantly cheaper and larger than what you'll get unsecured."
- **Question to ask:** "Can you offer better pricing since I am bringing property as collateral?"

---

## 3. Anita (35, Hubballi, Informal)

**Profile:** Delivery rider/tailor. ₹28k/month. 3 app loans (₹35k outstanding), one EMI bounced last month.
**Goal:** Wants ₹1,50,000 for an electric scooter.

### The Inputs (What the app asked)
- **Loan Purpose:** Vehicle for income
- **Amount Wanted:** ₹1,50,000
- **Loan Type:** Two-wheeler loan
- **Income Type:** Informal / gig income
- **Net Monthly Income:** ₹28,000
- **Existing EMIs:** ₹8,000
- **Essential Expenses:** ₹16,000
- **Age:** 35
- **Credit Score:** I don't know it
- **Payment Bounce:** Yes

### The Four Outputs
1. **Verdict (O1):** **Don't Borrow Right Now.** Despite her productive goal, her recent bounce on high-cost app debt makes taking on a new formal loan highly risky.
2. **Maximum Amount (O2):**
   - *Lender Sanction:* ₹0–₹50,000 (Lenders will severely discount informal income with a recent bounce).
   - *Safe Borrowing Range:* ₹0–₹35,000 (Her remaining monthly surplus after essentials and existing EMIs is only ₹4,000. She physically cannot carry a ₹1.5L two-wheeler EMI).
   - *App recommendation:* Focus on clearing the high-cost 30% app loans before buying the scooter.
3. **Fair Rate (O3):** **18% – 26%** (She is in the highest risk tier).
4. **EMI Ceiling (O4):** **₹3,000/month**. 

### Negotiation Card
- **Recommended amount:** ₹0 (Don't borrow)
- **Safe EMI ceiling:** ₹3,000
- **Fair rate range:** 18.0% – 26.0%
- **Key point:** "Your recent payment bounce on existing debt means lenders will either reject you or charge punitive rates. Clear existing debt first."
