# Campaign round1 re-review package

Scope: verify the three findings from the previous campaign review, plus new breakage in changed files only. Source files: src/game/levels/levels.ts, src/game/types.ts, tests/campaign.test.ts, tests/browser-harness.ts. No Git baseline (empty initial workspace); inspect complete files against prior defect descriptions.

Findings: (1) limited-light16–25 routes did not exercise actual short flashes/energy, (2) missed-wait security timing not proven23–25, (3) late pars too generous. Requirements/controller direction: campaign-fixes.md. Updated evidence: campaign-report.md round1. Preserve dark-only solvability as intentional; no mandatory light gates. Check optional SolutionPoint.flash handling and real Simulation escape/energy/recharge/budget assertions; skipped-wait genuine detection22–25; late pars31–32seconds vs~25–26replays.

Root full suite on these changes:8files85tests passed. Root build initially exposed a missing flash field in browser-harness's local inline target type, which was sent back for a shared-type correction and build verification. Check final report's build correction before approval. No browser rerun (environment URL policy denial), no hidden state/teleport in certificates.

Read-only, no edits/subagents, no broad test reruns without specific unresolved doubt. Return findings ADDRESSED/NOT ADDRESSED and any new Critical/Important breakage, with file:line. Do not expand to whole-project review; that follows separately.
