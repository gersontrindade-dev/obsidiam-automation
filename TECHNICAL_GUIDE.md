# Obsidian Story Sync — Technical Guide

Local automation to log work tickets and Git commits into an Obsidian vault. Designed for personal use across multiple repositories, with no Jira or Bitbucket API integration.

---

## 1. System Overview & Privacy Architecture

### Purpose

- Create a markdown note when a story/ticket starts.
- Append each related Git commit under `### Other Commits`.
- Keep PR/merge metadata as a **manual** section (no remote APIs).

### Design choices

| Choice | Reason |
| --- | --- |
| No Jira/Bitbucket APIs | Avoid tokens, rate limits, and client coupling |
| Tool lives in the developer home directory | Not shared via the application repository |
| Local Git hook only | Hooks are never pushed; each clone opts in |
| Optional IDE agent rule | Natural-language triggers (`start` / `commit`) without APIs |

### Privacy / isolation

Never commit to a shared remote:

- `~/.obsidian-story-sync/` (CLI + machine-specific config)
- `.obsidian-sync.json` (repo ↔ project binding)
- `.git/hooks/post-commit` (already untracked)
- Personal vault paths or credentials

Suggested `.gitignore` entries in application repos:

```gitignore
.local/
.obsidian-sync.json
.cursor/rules/obsidian-story-log.mdc
```

---

## 2. Prerequisites & Environment

| Requirement | Notes |
| --- | --- |
| Node.js | Runtime for the CLI (ESM `.mjs`) |
| Git | Commit/branch metadata is read via Git commands |
| Obsidian vault | Local folder on disk |
| Shell PATH | So `obsidian-sync` (and `node`) are available in terminal and hooks |
| Optional: Cursor (or similar) | User rule to drive `start` / `commit` from chat |

### Vault layout expected by the tool

```text
{vaultPath}/
  {projectRoot}/
    In Progress/
    Ready to Tests - 1.1 - in QA/          # optional workflow folders
    Ready to Tests - 1.2 - Approved in QA/
    Ready to Tests - 1.3 - in STG/
```

- **New notes** are created under `In Progress/`.
- **Lookup** (`find` / `commit`) searches all folders listed in `searchFolders`.

### Note filename convention

```text
MM.DD - TICKET - Title.md
```

Example: `09.18 - ABC-123 - Improve checkout validation.md`

---

## 3. Step-by-Step Installation

### 3.1 Install the CLI (once per machine)

1. Place the tool under:

   ```text
   ~/.obsidian-story-sync/
     bin/obsidian-sync.mjs
     hooks/post-commit
     config.json
   ```

2. Make binaries executable and add a PATH symlink:

   ```bash
   chmod +x ~/.obsidian-story-sync/bin/obsidian-sync.mjs
   chmod +x ~/.obsidian-story-sync/hooks/post-commit

   mkdir -p ~/bin
   ln -sf ~/.obsidian-story-sync/bin/obsidian-sync.mjs ~/bin/obsidian-sync
   ```

3. Ensure `~/bin` is on your PATH (e.g. in `~/.zshrc`):

   ```bash
   export PATH="$HOME/bin:$PATH"
   ```

4. Open a new terminal and verify:

   ```bash
   obsidian-sync
   # prints help / available commands
   ```

### 3.2 Configure the Obsidian vault path

Edit `~/.obsidian-story-sync/config.json`:

```json
{
  "vaultPath": "/absolute/path/to/YourObsidianVault",
  "defaults": {
    "inProgressFolder": "In Progress",
    "searchFolders": [
      "In Progress",
      "Ready to Tests - 1.1 - in QA",
      "Ready to Tests - 1.2 - Approved in QA",
      "Ready to Tests - 1.3 - in STG"
    ],
    "ticketPattern": "[A-Z][A-Z0-9]+-\\d+",
    "jiraBaseUrl": "https://your.atlassian.net/browse"
  },
  "projects": {}
}
```

| Field | Meaning |
| --- | --- |
| `vaultPath` | Absolute path to the Obsidian vault root |
| `defaults.*` | Shared defaults for all projects |
| `projects.<name>` | Per-client/per-repo overrides (`projectRoot`, ticket regex, path/remote matchers) |

### 3.3 Enable the tool inside a Git repository

From the repository root:

```bash
# Existing project key already in config.json
obsidian-sync enable --project my-project --create-folders

# Or register a new project and create vault folders
obsidian-sync enable --project acme \
  --root "Acme" \
  --ticket-pattern 'ACME-\\d+' \
  --jira-base 'https://company.atlassian.net/browse' \
  --create-folders
```

What `enable` does:

1. Registers/updates the project in `config.json` (including a path matcher for this repo).
2. Creates vault folders when `--create-folders` is passed.
3. Writes `.obsidian-sync.json` in the repo (**gitignored**).
4. Installs `.git/hooks/post-commit` with executable permissions.

Verify:

```bash
obsidian-sync status
obsidian-sync projects
```

Disable later (optional):

```bash
obsidian-sync disable
```

### 3.4 Smoke-test CLI commands

```bash
obsidian-sync start --ticket ABC-123 --title "Improve checkout validation"
obsidian-sync commit
obsidian-sync commit --all
obsidian-sync find --ticket ABC-123
obsidian-sync status
```

| Command | Behavior |
| --- | --- |
| `start` | Creates the note if missing; prints `EXISTS` if already present |
| `commit` | Appends the latest commit (or `--hash`) under `### Other Commits` |
| `commit --all` | Backfills all commits since merge-base (`dev` / `main` / `master`) |
| `find` | Locates the note by ticket across workflow folders |
| `status` | Shows vault mapping, folder counts, current branch/ticket |

### 3.5 Deploy the local Git hook (details)

Installed automatically by `enable`. Hook behavior:

1. Resolve repo root.
2. Call `node ~/.obsidian-story-sync/bin/obsidian-sync.mjs commit --cwd <repo>`.
3. On any failure: **do not block the Git commit** (`|| true`, output discarded).

Important:

- After a **fresh clone**, run `enable` again (hooks are not cloned).
- Override script path if needed: `OBSIDIAN_STORY_SYNC=/path/to/obsidian-sync.mjs`.

The hook does **not** pass Git env vars. The CLI reads hash, branch, and subject via:

- `git rev-parse --abbrev-ref HEAD`
- `git log -1 --format=%H%n%h%n%cI%n%s`

### 3.6 Configure the IDE agent rule

Create a user-level rule (example for Cursor):

`~/.cursor/rules/obsidian-story-log.mdc`

```markdown
---
description: Global Obsidian story logging across all local git projects
alwaysApply: true
---

# Obsidian story sync (global)

CLI: `obsidian-sync` or `node ~/.obsidian-story-sync/bin/obsidian-sync.mjs`

## When the user starts a story
If they mention a ticket id, title, and/or Jira link:
1. `obsidian-sync find --ticket <ID>`
2. If missing: `obsidian-sync start --ticket <ID> --title "Exact title"`
3. If repo not enabled: ask them to run `obsidian-sync enable --project <name> --create-folders`

## When committing
After a successful git commit:
1. Ensure the note exists
2. Run `obsidian-sync commit` (or `commit --all` to backfill)

## Do not
- Commit personal sync files to shared remotes
- Call Jira/Bitbucket APIs unless asked
- Overwrite note body content; only append under ### Other Commits
```

---

## 4. Daily Workflow Guide

### Lifecycle

```text
Start story → Work & commit → (optional) backfill → Fill PR/merge fields → Move note in vault
```

### 4.1 Start a story

**Via IDE agent** (examples of trigger phrases):

- `Start story ABC-123 - Improve checkout validation`
- `Vou começar ABC-123 - Improve checkout validation`
- Jira URL + title in the same message

**Via CLI:**

```bash
obsidian-sync start --ticket ABC-123 --title "Improve checkout validation"
```

Created note skeleton:

```markdown
https://your.atlassian.net/browse/ABC-123

Branch name: `feat/ABC-123`
Started at: Sep 18, 2026
PR:
PR created at:
PR merged at:
Merge commit:
___
### Other Commits
```

### 4.2 Commit while working

Prefer branch names that include the ticket (`feat/ABC-123-...`).

Automated path:

1. `git commit ...`
2. Local `post-commit` runs `obsidian-sync commit`

Manual / agent path:

```bash
obsidian-sync commit
obsidian-sync commit --all
```

Appended block example:

```markdown
#### Sep 18, 2026
Commit: `abc1234` (`full-sha...`)
Branch: `feat/ABC-123-improve-checkout`
- feat(checkout): [ABC-123] improve validation messages
```

### 4.3 Finalize PR / merge (manual)

Before closing the ticket, complete the header fields:

```markdown
PR: https://bitbucket.example/project/repo/pull-requests/123
PR created at: Sep 18, 2026 - 10:00 am
PR merged at: Sep 18, 2026 - 2:30 pm
Merge commit: <full-sha>
```

Then move the note between workflow folders if your team uses that convention (In Progress → QA → …). The tool does **not** move files automatically.

---

## 5. Edge Case Handling & Troubleshooting

### Non-standard commits / invalid title characters

| Situation | Behavior |
| --- | --- |
| No ticket in branch **and** commit subject | `commit` prints `SKIP` — Git commit still succeeds; no orphan note |
| Hotfix without ticket | Not logged unless you pass `--ticket KEY-123` |
| Title contains `\ / : * ? " < > \|` | Sanitized to `-` before creating the filename |
| Duplicate commit hash already in the note | `SKIP already logged` |

### Branch switching & multi-ticket work

Ticket resolution order for `commit`:

1. `--ticket` flag (explicit)
2. Current branch name
3. Latest commit subject

Note lookup is by **ticket id across all `searchFolders`**, not by current branch alone.

Recommendations:

- Keep the ticket id in the branch name.
- When unsure, run `obsidian-sync commit --ticket KEY-123`.
- After switching tickets, run `obsidian-sync find --ticket ...` / `status` to confirm the target note.

### Silent failures in `post-commit`

By design the hook never fails the Git commit and discards hook output.

If Obsidian is not updating:

```bash
obsidian-sync status
obsidian-sync commit
```

| Symptom | Likely cause | Fix |
| --- | --- | --- |
| `No Obsidian project mapped` | Repo not enabled / no binding | `obsidian-sync enable --project <name>` |
| `SKIP No ticket found` | Branch/message without ticket | Rename branch or use `--ticket` |
| `SKIP No Obsidian note` | `start` never ran | `obsidian-sync start --ticket … --title "…"` |
| Hook does nothing after clone | Hooks are local-only | Re-run `enable` |
| Works in terminal, not in GUI Git client | `node` not on that app’s PATH | Fix PATH or commit from a shell where `node` works |

### Useful debug commands

```bash
obsidian-sync projects
obsidian-sync status
obsidian-sync find --ticket ABC-123
obsidian-sync commit --ticket ABC-123
obsidian-sync commit --all
```

---

## 6. Command Reference (quick)

```bash
obsidian-sync enable  --project <name> [--root "Folder"] [--create-folders]
                      [--ticket-pattern 'ABC-\\d+'] [--jira-base URL]
obsidian-sync disable
obsidian-sync start   --ticket KEY-123 --title "Story title" [--branch name]
obsidian-sync commit  [--hash HEAD] [--ticket KEY-123] [--title "..."] [--all]
obsidian-sync find    --ticket KEY-123
obsidian-sync status
obsidian-sync projects
```

---

## 7. Operational checklist

- [ ] Node.js available in terminal (and ideally in Git GUI environment)
- [ ] `vaultPath` set in `~/.obsidian-story-sync/config.json`
- [ ] `obsidian-sync` on PATH
- [ ] Repo enabled (`enable`) after each fresh clone
- [ ] IDE agent rule installed (optional but recommended)
- [ ] Personal files listed in `.gitignore`
- [ ] PR/merge fields filled manually when closing a ticket
