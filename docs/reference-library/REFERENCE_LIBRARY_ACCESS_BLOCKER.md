# Reference Library Access Blocker

**Step 2.5 — Reference Library Bridge: BLOCKED**
**Date:** 2026-06-13
**Branch:** `docs/reference-library-bridge`

---

## Status: Cannot Proceed

The `stuffs225-ui/FT-Ops-Reference-Library` repository was **not accessible** in this Claude Code session. Step 2.5 cannot be completed until access is restored.

---

## What Was Checked

| Access Path | Result |
|-------------|--------|
| Local path `../FT-Ops-Reference-Library/` | Not found on disk |
| Local path `../FT-Ops-reference-library/` | Not found on disk |
| GitHub MCP: `stuffs225-ui/FT-Ops-Reference-Library` | **Access denied** — session is scoped only to `stuffs225-ui/ft-operations-portal` |
| GitHub MCP: `stuffs225-ui/FT-Ops-reference-library` | Same — access denied |
| `mcp__claude-code-remote__list_repos` / `add_repo` | Tools not available in this session |

---

## Why This Happened

Claude Code on the web runs in an isolated container. Each session has an explicit list of repositories it may access. This session was started with only the production repository (`ft-operations-portal`) in scope. The reference library (`FT-Ops-Reference-Library`) is a separate repository that was **not added** to this session's allowed repository list.

---

## What Must Be Done to Unblock Step 2.5

### Option A — Add the Reference Library to the Session (Recommended)

When starting a new Claude Code session on [code.claude.com](https://code.claude.com):

1. Open the session settings or repository selector.
2. Add `stuffs225-ui/FT-Ops-Reference-Library` as a second connected repository alongside `stuffs225-ui/ft-operations-portal`.
3. Both repositories must be **simultaneously accessible** in the same session.
4. Re-run Step 2.5 in that session.

This is the cleanest path: Claude Code can then read the actual analysis files from the reference library and create an accurate bridge.

### Option B — Clone the Reference Library into the Container

If the reference library is not available as a connected GitHub repository, it can be cloned locally into the session container before running Step 2.5:

```bash
git clone https://github.com/stuffs225-ui/FT-Ops-Reference-Library.git \
  /home/user/FT-Ops-Reference-Library
```

Once cloned, re-run Step 2.5 — the session will find it at `../FT-Ops-Reference-Library/`.

### Option C — Paste Reference Library Files Directly into This Session

If neither option above is feasible, you can copy-paste the contents of the reference library analysis files into the chat before running Step 2.5. The required files are:

```
README.md
docs/research-rules.md
docs/ft-ops-playbook-summary.md
analysis/01-reference-repositories-evaluation.md
analysis/02-ft-ops-module-to-reference-mapping.md
analysis/03-design-system-recommendation.md
analysis/04-implementation-opportunities-backlog.md
analysis/05-license-risk-notes.md
analysis/06-next-step-system-audit-brief.md
references/repository-index.md
```

---

## What Step 2.5 Was Supposed to Create

Once the reference library is accessible, Step 2.5 will create the following files inside the production repository:

```
docs/reference-library/
  README.md
  research-rules.md
  ft-ops-playbook-summary.md
  01-reference-repositories-evaluation.md
  02-ft-ops-module-to-reference-mapping.md
  03-design-system-recommendation.md
  04-implementation-opportunities-backlog.md
  05-license-risk-notes.md
  06-next-step-system-audit-brief.md
  repository-index.md
  REFERENCE_LIBRARY_SYNC.md

docs/CLAUDE_PROJECT_RULES.md
```

These files create a **documentation-only bridge** so that all future Claude Code sessions working on `ft-operations-portal` can consult the reference library recommendations without needing to access the external repository each time.

---

## Do Not Proceed to Step 3

**Step 3 (Playbook-to-System Mapping) should NOT start** until:

1. Step 2.5 is completed (reference library bridge files are in place), OR
2. The user explicitly decides to skip Step 2.5 and acknowledges that Step 3 will proceed without the reference library bridge.

The reference library bridge ensures that every module mapping in Step 3 includes the correct recommended reference pattern, license risk, and usage category. Without it, Step 3 would be incomplete.

---

## What Was NOT Done

- No incomplete bridge files were created.
- No external source code was copied.
- No production application code was changed.
- No database schema was changed.
- No migrations were changed.
- No RLS policies were changed.
- No UI was changed.
- The Step 2 audit (`docs/system-audit/`) was not modified.

---

## Contact / Next Session Prompt

When you are ready to retry Step 2.5 with the reference library accessible, use this prompt to Claude Code:

```
You are working on the FT Operations Portal production repository.

Task: Step 2.5 — Reference Library Bridge (Retry)

The reference library is now accessible at:
  ../FT-Ops-Reference-Library/        (if cloned locally)
  OR via GitHub as stuffs225-ui/FT-Ops-Reference-Library

Branch: docs/reference-library-bridge

This branch already exists from a previous attempt. Check it out and continue
from where the blocker left off. Read the full task brief from the previous
Step 2.5 prompt and create all required files in docs/reference-library/.

Do NOT redo the Step 2 system audit (docs/system-audit/ is already complete).
Do NOT change any production code, schema, migrations, RLS, or UI.
Documentation only.
```
