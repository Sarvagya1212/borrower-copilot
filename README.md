# Borrower Copilot

A self-assessment tool that makes the borrower the best-informed person in the room. It takes in basic profile details and outputs a safe borrowing limit, likely sanction, fair interest rate, and a safe EMI ceiling — alongside a Negotiation Card to take to the lender.

## Running Locally

This is a pure client-side React app. No backend, no database, no personal data stored.

### Prerequisites
- Node.js (v18+)

### Setup in under 2 minutes
```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev
```

Open `http://localhost:5173` in your browser.

## Testing

The rule engine has 128 tests covering domain logic, boundary conditions, and the three personas (Priya, Ravi, Anita).

```bash
# Run the test suite
npm test
```

## Architecture & Rules

The core domain logic is strictly decoupled from the UI.
- `RULES.md`: Every rule, threshold, band, and assumption detailed (what, value, why, source).
- `docs/Handover.md`: Project phases and decisions.
- `docs/Architecture.md`: System design and boundary rules.
- `docs/Decisions.md`: Key trade-offs and design decisions.

## Deliverables for Lokta Challenge

1. **The working app**: Run `npm run dev` as shown above.
2. **RULES.md**: Included in the root directory.
3. **Three run-throughs**: See `Personas.md`.
4. **Walkthrough**: See `Walkthrough.md`.
