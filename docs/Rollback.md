# Rollback

## General approach
Each phase is a small, self-contained set of changes (see Decisions.md for
the reasoning behind each). If a phase turns out to be wrong, the intent is
to revert that phase's files, not to hand-edit around the problem.

## Git discipline (to be applied once the repo is initialized)
- One commit per meaningful step (e.g. "Phase 1: types + Constraints/Decisions",
  "Phase 1: Architecture/Flow/RULES docs", "Phase 2: EMI + IRR calculations").
- Commit messages name the phase and the files touched, not just "update".
- Before starting a new phase, confirm the previous phase's tests (if any)
  are green — don't build Phase N+1 on top of an unverified Phase N.

## If a rule-engine change produces wrong persona output
1. Re-run the specific persona (Priya/Ravi/Anita) that broke.
2. Check `RULES.md` first — is the *threshold* wrong, or is the *code*
   misapplying a threshold that's actually fine? These need different fixes.
3. If it's a threshold: edit the value in `src/data/` (never hard-code a
   replacement inline in `src/rules/`) and update the corresponding row in
   `RULES.md` with a dated note.
4. If it's a code bug: fix in `src/rules/` or `src/calculations/`, re-run the
   unit tests for that function, then re-run all three personas before
   moving on — a fix for one persona must not silently break another.

## If a UI change breaks the "no logic in components" boundary
Revert the component to the last version that only called `rules/` functions
and rendered their output. Move whatever logic leaked into a component back
into `src/rules/`, with a test.

## Known-safe rollback point as of this document
Phase 1, foundation step 2 complete: project scaffolded, `src/types/borrower.ts`
in place and typechecking, `Constraints.md`, `Decisions.md`, `Architecture.md`,
`Flow.md`, `RULES.md` (first draft), `Test-Checklist.md` written. No rule-engine
code and no UI beyond the default Vite template exist yet — reverting to this
point means reverting to "types + docs only," which is always safe.
