# LLM Developer Obsidian Log Automation

Creating a privacy-isolated pipeline for logging work tickets and Git commits directly into an Obsidian vault

**Target Audience:** Product Owners, Tech Leads, Tech Teams, QA Teams

**Key Value Proposition:** This document defines the refined technical architecture, installation procedure (via the public GitHub distribution), operational lifecycle, and troubleshooting protocols for the Developer Obsidian Log Automation system—a privacy-isolated pipeline for logging work tickets and Git commits directly into a personal Obsidian vault without external API dependencies.

---

## Technical Architecture, Configuration Guide & Operational Lifecycle

| Metadata Property | Confluence Page Specification |
| --- | --- |
| Document Status | Active |
| Document Owner / SME | Lead Software Engineer / AI Platform Team |
| Target Space | Processes > Studio 5 > AI Initiatives |
| Target Audience | Software Engineers, DevOps Engineers, AI Initiative Leads |
| Last Updated | Sep 28, 2026 |
| Distribution | [github.com/gersontrindade-dev/obsidiam-automation](https://github.com/gersontrindade-dev/obsidiam-automation) |

---

## System Summary & Overview

The Developer Obsidian Log Automation pipeline provides a localized, privacy-first mechanism to record daily development activities. Engineers install a **machine-local CLI** from the shared GitHub repository into `~/.obsidian-story-sync`, bind each work repo with `obsidian-sync enable`, and keep an audit trail inside a personal Obsidian vault.

By automatically generating ticket markdown notes upon story initiation and appending Git commit details via a local `post-commit` hook, engineers maintain complete per-ticket history while keeping vault paths, bindings, and agent rules strictly isolated from remote team repositories.

**Canonical source:** clone and install from  
[https://github.com/gersontrindade-dev/obsidiam-automation](https://github.com/gersontrindade-dev/obsidiam-automation)

---

## Motivation, Audience & Scope

Developers often lose ticket context and commit history across chats, browsers, and memory. Putting personal logging scripts into shared application repos risks leaking private workflows.

**Developer Obsidian Log Automation** creates a local, privacy-first audit trail in Obsidian:

- Create a ticket note when a story starts
- Append Git commits automatically
- Fill PR/merge fields manually at close-out
- Keep tooling off remote application repositories (no Jira/Bitbucket APIs)

### Who this is for

| Audience | Benefit |
| --- | --- |
| Software Engineers | Per-ticket journal without leaving IDE/Git |
| DevOps / Platform | Safe local automation pattern (CLI, hooks, gitignore) |
| AI Initiative Leads | Repeatable agent-assisted logging with clear privacy limits |

**Best fit:** individual contributors who use Obsidian and want commit-level traceability by ticket key.

### Who this is not for

- Teams needing a **shared/central** delivery source of truth
- Workflows that require **live Jira/Bitbucket sync**
- Environments that block local Git hooks or personal tooling

### Guiding principles

1. **Privacy first** — vault paths, rules, and bindings stay on the workstation
2. **Local only** — Git + filesystem; no external APIs
3. **Fail open** — logging never blocks a Git commit
4. **Human close-out** — PR/merge fields and folder moves stay manual
5. **Portable** — one machine install; `enable` per repository

---

## Architectural Design & Privacy Boundaries

The core design objective is to streamline personal work tracking per ticket without coupling developer tooling to shared team repositories or external service APIs.

| System Component | Technical Execution Mechanism | Operational Purpose |
| --- | --- | --- |
| GitHub distribution | Public repo cloned once to `~/.obsidian-story-sync` | Shareable installer, CLI, hook template, and docs — no personal paths |
| Local CLI Utility | `obsidian-sync` → `bin/obsidian-sync.mjs` (`start`, `commit`, `find`, `status`, `projects`, `enable`, `disable`) | Creates notes as `MM.DD - TICKET - Title.md` and appends commit blocks |
| Installer | `install.sh` | Symlink to `~/bin`, creates `config.json` / `env` from examples, updates `~/.zshrc` |
| Local Git Hook | `.git/hooks/post-commit` installed by `enable` | Captures commit metadata and calls the CLI without blocking Git |
| IDE Agent Integration | Optional user rule (e.g. `~/.cursor/rules/obsidian-story-log.mdc`) | Triggers `find` / `start` / `commit` from natural language |
| Privacy Isolation | `.gitignore` + machine-local `env` / `.obsidian-sync.json` | Prevents vault paths and bindings from leaking to remotes |

**API Isolation Boundary:** The system deliberately avoids Jira or Bitbucket APIs. Pull request links, review notes, and merge commit hashes are filled manually at story completion.

### System Component Flow Diagram

```text
Developer clones tooling once
  git clone … → ~/.obsidian-story-sync → ./install.sh
        │
        ▼
Set OBSIDIAN_VAULT_PATH in ~/.obsidian-story-sync/env
        │
        ▼
Per work repo: obsidian-sync enable  (binding + post-commit hook)
        │
        ▼
Developer starts work
        │
        ▼
IDE agent / CLI resolves ticket key
        │
        ▼
obsidian-sync start
        │
        ▼
Create or find ticket note in vault
        │
        ▼
Developer commits code
        │
        ▼
.git/hooks/post-commit
        │
        ▼
obsidian-sync commit
        │
        ▼
Local Obsidian vault markdown note
```

---

## System Prerequisites & Environment Setup

| Prerequisite Element | Required Specification | Configuration Detail |
| --- | --- | --- |
| Runtime Engine | Node.js (ESM `.mjs` CLI) | Required to run `obsidian-sync` |
| Shell Environment | `~/bin` on PATH (installer configures `~/.zshrc`) | Terminal and hooks can resolve `obsidian-sync` / `node` |
| Local Obsidian Vault | Obsidian app + vault directory on disk | Absolute path set in `~/.obsidian-story-sync/env` |
| Git Version Control | Active Git repo with local hooks writable | `enable` writes `.git/hooks/post-commit` |
| Local IDE Settings (optional) | Cursor / VS Code user or workspace rules | Natural-language story logging triggers |

---

## Vault Directory Structure & File Naming Conventions

```text
{vaultPath}/
  {projectRoot}/
    In Progress/                          # Default for newly created ticket notes
    Ready to Tests - 1.1 - in QA/         # Optional workflow folder
    Ready to Tests - 1.2 - Approved in QA/
    Ready to Tests - 1.3 - in STG/
```

**Filename schema:** `MM.DD - TICKET - Title.md`  
Example: `09.28 - CT-101 - Implement Auth Refresh.md`

---

## Step-by-Step Installation & Configuration

Distribution and install are driven by the GitHub repository. Do **not** hand-copy scripts from another developer’s machine (their `env` / `config.json` contain personal paths).

### Step 1: Clone the tool & run the installer

```bash
git clone https://github.com/gersontrindade-dev/obsidiam-automation.git ~/.obsidian-story-sync
cd ~/.obsidian-story-sync
chmod +x install.sh
./install.sh
```

Expected layout after clone:

```text
~/.obsidian-story-sync/
  bin/obsidian-sync.mjs
  hooks/post-commit
  config.example.json
  env.example
  install.sh
  README.md
  INSTALL.md
```

`install.sh` will:

- create the symlink `~/bin/obsidian-sync`
- create `config.json` / `env` from examples (if missing)
- add `~/bin` to PATH and an env-file loader in `~/.zshrc`

### Step 2: Set YOUR Obsidian vault path

Edit the machine-local env file (preferred over editing shared examples):

```bash
nano ~/.obsidian-story-sync/env
```

```bash
OBSIDIAN_VAULT_PATH="/Users/<username>/Documents/Obsidian/WorkVault"
```

Optional overrides (uncomment if needed):

```bash
# OBSIDIAN_JIRA_BASE_URL="https://dvtpt.atlassian.net/browse"
# OBSIDIAN_TICKET_PATTERN="[A-Z][A-Z0-9]+-\\d+"
# OBSIDIAN_SEARCH_FOLDERS="In Progress,Ready to Tests - 1.1 - in QA"
```

Reload the shell:

```bash
source ~/.zshrc
obsidian-sync status
```

**Why `env`?** Each developer has a different vault path. `OBSIDIAN_VAULT_PATH` overrides `config.json`, so personal paths are never shared via Git.

**Precedence:** CLI flag → environment / `env` file → `config.json`

Optional fallback in `~/.obsidian-story-sync/config.json` (created from `config.example.json`):

```json
{
  "vaultPath": "",
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

### Step 3: Enable binding inside each work repository

From the application repository root:

```bash
obsidian-sync enable \
  --project "AI-Initiatives" \
  --root "AI-Initiatives" \
  --create-folders
```

What `enable` does:

1. Registers/updates the project in local `config.json`
2. Creates vault workflow folders when `--create-folders` is passed
3. Writes machine-local `.obsidian-sync.json` (must stay gitignored)
4. **Installs** `.git/hooks/post-commit` with executable permissions (no manual hook editing required)

**Repository binding note:** `.obsidian-sync.json` stores repo-specific defaults. Keep it ignored by Git.

Disable later (optional):

```bash
obsidian-sync disable
```

### Step 4: Smoke-test

```bash
obsidian-sync status
obsidian-sync projects
obsidian-sync start --ticket ABC-123 --title "Setup test"
obsidian-sync commit
obsidian-sync find --ticket ABC-123
```

Confirm in Obsidian under: `{Vault}/{projectRoot}/In Progress/`

### Step 5 (optional): IDE agent rule & Git privacy boundaries

Create a **user-level** Cursor rule, for example `~/.cursor/rules/obsidian-story-log.mdc`, instructing the assistant to run `obsidian-sync find` / `start` / `commit` when a story starts or after commits.

Ensure application repos ignore local binding files:

```gitignore
# Exclude local Obsidian logging tools and repo bindings
.local/
.obsidian-sync.json
.cursor/rules/obsidian-story-log.mdc
```

**After a fresh clone of a work repo:** Git hooks are not cloned. Re-run:

```bash
obsidian-sync enable --project AI-Initiatives
```

---

## Example IDE Agent Rule Files

**Privacy reminder:** Prefer user-level rules (outside the app repo), or explicitly gitignore them unless the team has approved sharing. Do not include secrets, customer data, API tokens, or private vault paths.

### Cursor Rule File: `~/.cursor/rules/obsidian-story-log.mdc` (recommended)

```markdown
---
description: Global Obsidian story logging across all local git projects
alwaysApply: true
---

# Obsidian story sync (global)

Personal tooling: `~/.obsidian-story-sync/`
CLI: `obsidian-sync` or `node ~/.obsidian-story-sync/bin/obsidian-sync.mjs`

## When the user starts a story

If they mention a ticket id (e.g. `ABC-123`), title, and/or Jira link:

1. `obsidian-sync find --ticket <ID>`
2. If missing: `obsidian-sync start --ticket <ID> --title "Exact title"`
3. If the repo is not enabled yet, ask them to run:
   `obsidian-sync enable --project <name> --create-folders`

## When committing

After a successful git commit:

1. Ensure the note exists
2. Run `obsidian-sync commit` (or `commit --all` to backfill)

## Do not

- Commit `.obsidian-sync.json`, `~/.obsidian-story-sync/`, or vault notes into shared repos
- Call Jira/Bitbucket APIs unless asked
- Move notes between workflow folders unless asked
- Overwrite the note body; only append under `### Other Commits`
```

### Cursor Repository Rule File: `.cursorrules` (only if team-approved)

```json
{
  "projectContext": "Developer work logging integrated with a local Obsidian vault",
  "rules": [
    "Identify Jira issue key from active Git branch naming conventions, for example feat/PROJ-123.",
    "Do not log credentials, tokens, private keys, proprietary configuration values, or sensitive production data into markdown notes.",
    "Structure work session summaries with timestamps, linked issue tags, branch names, key decisions, and changed files.",
    "When requested to update the development log, invoke the local obsidian-sync CLI tool or format markdown matching the vault template."
  ]
}
```

### VS Code GitHub Copilot Instructions: `.github/copilot-instructions.md` (only if team-approved)

```markdown
# GitHub Copilot Custom Instructions: Obsidian Log Automation

## Context & Workflow
- We use a local Obsidian vault to track development tasks, daily engineering logs, and technical decisions.
- When generating summaries, commit messages, or PR descriptions, format output so it can be copied into an Obsidian note or parsed by the local logging CLI.

## Note Schema & Conventions
- Issue Reference: format Jira issue keys as Obsidian internal links when generating notes, for example `[[PROJ-1234]]`.
- Timestamping: use ISO format or 24-hour time format, for example `[YYYY-MM-DD HH:mm]`.
- Commit Messages: follow `<type>(<issue-key>): <concise message>`.

## Boundaries
- Never output or persist credentials, proprietary configuration values, private keys, or customer-sensitive data in log templates.
```

### Cline / Roo Code Rules: `.clinerules` (only if team-approved)

```markdown
# Cline / Roo Code Rules for Local Logging

1. When completing a user request or significant milestone:
   - Prefer `obsidian-sync start` / `obsidian-sync commit` when the CLI is available.
   - Do not invent remote API calls for Jira/Bitbucket.

2. Format generated logs with:
   - Timestamp: `YYYY-MM-DD HH:mm`
   - Jira ticket key
   - Active branch name
   - Affected modules or files
   - Main technical decisions
   - Test or verification status

3. Safety rules:
   - Keep all vault interactions local.
   - Do not include secrets, tokens, passwords, private keys, or sensitive customer data.
   - Prefer concise summaries over raw terminal output.
```

---

## Environment Variable Configuration

Use `~/.obsidian-story-sync/env` (loaded by the installer into interactive shells and by the Git hook) so machine-specific paths stay outside application repositories.

| Variable | Purpose | Example |
| --- | --- | --- |
| `OBSIDIAN_VAULT_PATH` | **Required.** Absolute path to the Obsidian vault root | `$HOME/Documents/Obsidian/WorkVault` |
| `OBSIDIAN_PROJECT_ROOT` | Override default project root folder name | `AI-Initiatives` |
| `OBSIDIAN_IN_PROGRESS_FOLDER` | Default folder for new notes | `In Progress` |
| `OBSIDIAN_JIRA_BASE_URL` | Base URL for ticket links in notes | `https://dvtpt.atlassian.net/browse` |
| `OBSIDIAN_SEARCH_FOLDERS` | Comma-separated folders searched before create | `In Progress,Ready to Tests - 1.1 - in QA` |
| `OBSIDIAN_TICKET_PATTERN` | Regex for ticket keys in branch/subject | `[A-Z][A-Z0-9]+-\d+` |
| `OBSIDIAN_STORY_ENV` | Alternate path to the env file | (optional) |
| `OBSIDIAN_STORY_SYNC` | Alternate path to the CLI `.mjs` | (optional) |

### macOS / Linux

Prefer editing `~/.obsidian-story-sync/env` after `./install.sh`. The installer already appends PATH + env loading to `~/.zshrc`.

```bash
source ~/.zshrc
printf 'Vault: %s\n' "$OBSIDIAN_VAULT_PATH"
obsidian-sync status
```

### Windows PowerShell

```powershell
[Environment]::SetEnvironmentVariable('OBSIDIAN_VAULT_PATH', 'C:\Users\<username>\Documents\Obsidian\WorkVault', 'User')
# Restart the terminal / IDE after setting user env vars
```

Clone/install paths on Windows should mirror the same logical layout under the user profile; primary documented path today is macOS/Linux via `install.sh`.

### Config precedence

1. Command-line flags (`--vault`, `--project`, `--ticket`, …)
2. Environment / `~/.obsidian-story-sync/env`
3. Global `~/.obsidian-story-sync/config.json` (including registered `projects`)
4. Built-in CLI defaults

### Git hook environment loading

The hook shipped with the tool (installed by `enable`) loads `~/.obsidian-story-sync/env` directly and extends `PATH` for GUI Git clients. It does **not** require sourcing full shell profiles:

```sh
#!/bin/sh
# Installed by obsidian-sync enable — never commit; lives in .git/hooks

REPO_ROOT="$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0
SYNC="${OBSIDIAN_STORY_SYNC:-$HOME/.obsidian-story-sync/bin/obsidian-sync.mjs}"
ENV_FILE="${OBSIDIAN_STORY_ENV:-$HOME/.obsidian-story-sync/env}"

if [ -f "$ENV_FILE" ]; then
  set -a
  . "$ENV_FILE"
  set +a
fi

export PATH="$HOME/bin:$HOME/.local/bin:/usr/local/bin:/opt/homebrew/bin:$PATH"

[ -f "$SYNC" ] || exit 0
node "$SYNC" commit --cwd "$REPO_ROOT" >/dev/null 2>&1 || true
exit 0
```

---

## Daily Operational Lifecycle

| Lifecycle Stage | Automation Action | Manual Developer Task |
| --- | --- | --- |
| 1. Story Initiation | `obsidian-sync start` finds across workflow folders or creates `MM.DD - TICKET - Title.md` | CLI or IDE prompt: “Start story CT-101 - Auth Flow” |
| 2. Active Development | Local `post-commit` appends under `### Other Commits` | Normal `git commit`; optional `commit --all` backfill |
| 3. Story Finalization | `find` / `status` show note location | Fill PR URL, merge hash, review notes; move note to QA folder if desired |

### CLI quick reference

| Command | Description |
| --- | --- |
| `start` | Create a story note (`--ticket`, `--title`) |
| `commit` | Append the last commit to the matching note |
| `commit --all` | Backfill commits from the current branch |
| `find` | Locate a note by ticket |
| `status` | Tool / project / vault status |
| `projects` | List registered projects |
| `enable` | Map current repo + install local post-commit hook |
| `disable` | Remove local binding / hook for this repo |

---

## Generated Note Skeleton & Commit Schema

When a story starts, the CLI generates a template similar to:

```markdown
https://dvtpt.atlassian.net/browse/CT-101

Branch name: `feat/CT-101-auth-refresh`
Started at: Sep 28, 2026
PR:
PR created at:
PR merged at:
Merge commit:
___
### Other Commits
```

Automated Git commit entries under `### Other Commits`:

```markdown
#### Sep 28, 2026
Commit: `abc1234` (`full-commit-sha-string`)
Branch: `feat/CT-101-auth-refresh`
- feat(auth): CT-101 implement token refresh handler
```

---

## Edge Case Handling & Troubleshooting Protocols

| Edge Case / Failure Mode | System Behavior / Risk | Resolution & Recovery Protocol |
| --- | --- | --- |
| Commits without ticket IDs | `SKIP` logged; Git commit still succeeds | Put ticket in branch name or pass `--ticket` |
| Invalid OS filename characters | Titles with `/ : ? * \|` etc. | CLI sanitizes invalid characters to `-` |
| Multi-ticket branch switching | Wrong note risk if ticket missing from branch | Resolve order: `--ticket` → branch name → commit subject |
| Silent hook failures | Hook uses `\|\| true` and discards output | Run `obsidian-sync status` / `commit` manually in terminal |
| Fresh clone of work repo | Hooks are not cloned | Re-run `obsidian-sync enable --project <name>` |
| `command not found: obsidian-sync` | PATH / shell not reloaded | `source ~/.zshrc` or open a new terminal |
| Wrong / missing vault | Env not set | Edit `~/.obsidian-story-sync/env` → `OBSIDIAN_VAULT_PATH` |
| `No Obsidian project mapped` | Repo not enabled | Run `enable` inside that repo |
| `SKIP No Obsidian note` | Note never created | Run `start --title "..."` first |
| Works in terminal, not GUI Git | `node` missing from GUI PATH | Fix PATH or commit from a shell where `node` works |

### Quick debug

```bash
echo "$OBSIDIAN_VAULT_PATH"
obsidian-sync status
node ~/.obsidian-story-sync/bin/obsidian-sync.mjs status
obsidian-sync find --ticket ABC-123
obsidian-sync commit --ticket ABC-123
```

---

## Privacy Checklist

Never commit or push:

- `~/.obsidian-story-sync/config.json` and `env` (personal paths)
- `.obsidian-sync.json` (per-repo binding)
- `.git/hooks/post-commit` (local hook; not cloned)
- Optional local Cursor / agent rule files with personal workflow details

**Shareable:** the GitHub repository templates, installer, CLI, and documentation only.

---

## Related documentation (in repo)

| Doc | Purpose |
| --- | --- |
| [README.md](https://github.com/gersontrindade-dev/obsidiam-automation/blob/main/README.md) | Quick start |
| [INSTALL.md](https://github.com/gersontrindade-dev/obsidiam-automation/blob/main/INSTALL.md) | Teammate install guide |
| [PASSO_A_PASSO_COLEGA.md](https://github.com/gersontrindade-dev/obsidiam-automation/blob/main/PASSO_A_PASSO_COLEGA.md) | Short PT walkthrough |
| [TECHNICAL_GUIDE.md](https://github.com/gersontrindade-dev/obsidiam-automation/blob/main/TECHNICAL_GUIDE.md) | Under-the-hood reference |

---

## Operational checklist

- [ ] Node.js available in terminal (and ideally for GUI Git clients)
- [ ] Tool cloned to `~/.obsidian-story-sync` from GitHub
- [ ] `./install.sh` completed
- [ ] `OBSIDIAN_VAULT_PATH` set in `~/.obsidian-story-sync/env`
- [ ] `obsidian-sync` on PATH (`source ~/.zshrc`)
- [ ] Each work repo enabled (`enable`) after clone
- [ ] IDE agent rule installed (optional but recommended)
- [ ] Personal files listed in application `.gitignore`
- [ ] PR/merge fields filled manually when closing a ticket
