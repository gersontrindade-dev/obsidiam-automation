# Obsidian Story Sync — Install Guide (for a teammate)

Simple setup on a new Mac. Takes ~5 minutes.

## Prerequisites

- Node.js (`node -v`)
- Git
- Obsidian vault already on disk

---

## 1) Clone the tool to your machine

```bash
git clone https://github.com/gersontrindade-dev/obsidiam-automation.git ~/.obsidian-story-sync
```

You should have at least:

```text
~/.obsidian-story-sync/
  bin/obsidian-sync.mjs
  hooks/post-commit
  config.example.json
  env.example
  install.sh
```

> Tip: do **not** copy someone else’s `config.json` with their absolute paths. The installer creates `config.json` / `env` from examples — set your own vault path.

---

## 2) Run the installer

```bash
chmod +x ~/.obsidian-story-sync/install.sh
~/.obsidian-story-sync/install.sh
```

This will:

- create `~/bin/obsidian-sync`
- create `config.json` / `env` from examples (if missing)
- add `~/bin` + env loader to `~/.zshrc`

---

## 3) Set YOUR Obsidian vault path

Edit:

```bash
nano ~/.obsidian-story-sync/env
```

Set the absolute path to **your** vault:

```bash
OBSIDIAN_VAULT_PATH="/Users/YOUR_USER/Documents/Obsidian/YourVault"
```

Optional (usually not needed):

```bash
# OBSIDIAN_JIRA_BASE_URL="https://your.atlassian.net/browse"
# OBSIDIAN_TICKET_PATTERN="[A-Z][A-Z0-9]+-\\d+"
```

Reload:

```bash
source ~/.zshrc
```

### Why env?

Each developer has a different vault path.  
`OBSIDIAN_VAULT_PATH` overrides `config.json`, so you don’t need to share personal paths.

**Precedence:** CLI flag → env → `config.json`

---

## 4) Enable inside a Git repo

```bash
cd /path/to/your/repo

obsidian-sync enable \
  --project my-project \
  --root "My Project" \
  --create-folders
```

What this does:

- registers the project
- creates vault folders under `{vault}/{My Project}/...`
- writes local `.obsidian-sync.json` (gitignored)
- installs local `.git/hooks/post-commit`

---

## 5) Test

```bash
obsidian-sync status
obsidian-sync projects

# create a note
obsidian-sync start --ticket ABC-123 --title "Test note from setup"

# after any commit on a branch that includes ABC-123
obsidian-sync commit

# find the note
obsidian-sync find --ticket ABC-123
```

Open Obsidian and confirm the file exists under:

`{YourVault}/My Project/In Progress/`

---

## Daily commands

| Action | Command |
| --- | --- |
| Start story | `obsidian-sync start --ticket KEY-123 --title "Title"` |
| Log last commit | `obsidian-sync commit` |
| Backfill branch commits | `obsidian-sync commit --all` |
| Find note | `obsidian-sync find --ticket KEY-123` |
| Status | `obsidian-sync status` |
| List projects | `obsidian-sync projects` |

Or ask your IDE agent:

> Start story ABC-123 - Title here

Commits are logged automatically by the local `post-commit` hook.

---

## After cloning a repo again

Hooks are not cloned. Re-run:

```bash
obsidian-sync enable --project my-project
```

---

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `command not found: obsidian-sync` | `source ~/.zshrc` or open a new terminal |
| Wrong / missing vault | Check `~/.obsidian-story-sync/env` → `OBSIDIAN_VAULT_PATH` |
| `No Obsidian project mapped` | Run `enable` in that repo |
| `SKIP No ticket found` | Put ticket in branch name or pass `--ticket` |
| `SKIP No Obsidian note` | Run `start --title "..."` first |
| Hook seems silent | Run `obsidian-sync commit` manually (hook never blocks Git) |

Quick debug:

```bash
echo "$OBSIDIAN_VAULT_PATH"
obsidian-sync status
node ~/.obsidian-story-sync/bin/obsidian-sync.mjs status
```

---

## Privacy checklist

Keep these **local only** (gitignore / never push):

- `~/.obsidian-story-sync/`
- `.obsidian-sync.json`
- `.git/hooks/post-commit`
- optional local Cursor rule files
