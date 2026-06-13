Follow the project Constitution and Project Principles strictly.
Run `pnpm check` after each task.

---

## T014 — Final verification: pnpm check + build + 62-test suite

Task: Run the complete verification suite after all 8 domain migrations complete.

1. Run `pnpm check` — zero errors required
2. Run `pnpm build` — zero errors required
3. Run `python testsprite_tests/local_run.py` — 62/62 required
4. If any failures exist, investigate and fix before reporting success

This is the Constitution Principle VII gate for 005. Do not mark the feature complete until all three checks pass.

Report: check result, build result, test result (X/62), any failures investigated.
