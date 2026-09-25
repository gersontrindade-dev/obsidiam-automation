# Obsidian Story Sync

> Tip (PT): clona para `~/.obsidian-story-sync`, corre `./install.sh`, define o teu `OBSIDIAN_VAULT_PATH` no ficheiro `env`, e faz `enable` em cada repo de trabalho.

Local CLI that logs Jira ticket stories and git commits into a **personal Obsidian vault**. It never calls Jira or Bitbucket APIs — everything stays on your machine. Privacy-first by design: only shareable templates and scripts live in this repo.

## Quick start

```bash
git clone https://github.com/gersontrindade-dev/obsidiam-automation.git ~/.obsidian-story-sync
cd ~/.obsidian-story-sync
chmod +x install.sh
./install.sh
```

Then:

1. Edit `~/.obsidian-story-sync/env` → set `OBSIDIAN_VAULT_PATH` to **your** vault path
2. `source ~/.zshrc`
3. In a git repo:

```bash
obsidian-sync enable --project my-project --root "My Project" --create-folders
```

4. Test:

```bash
obsidian-sync status
obsidian-sync start --ticket ABC-123 --title "Setup test"
obsidian-sync commit
```

## Commands

| Command | Description |
| --- | --- |
| `start` | Create a story note (`--ticket`, `--title`) |
| `commit` | Append the last commit to the matching note |
| `commit --all` | Backfill commits from the current branch |
| `find` | Locate a note by ticket (`--ticket`) |
| `status` | Show tool / project / vault status |
| `projects` | List registered projects |
| `enable` | Map the current repo + install local post-commit hook |
| `disable` | Remove local binding / hook for this repo |

## Env vars

| Variable | Required | Notes |
| --- | --- | --- |
| `OBSIDIAN_VAULT_PATH` | **Yes** (per machine) | Absolute path to your Obsidian vault root |
| `OBSIDIAN_PROJECT_ROOT` | No | Override default project root folder name |
| `OBSIDIAN_IN_PROGRESS_FOLDER` | No | Override “In Progress” folder name |
| `OBSIDIAN_JIRA_BASE_URL` | No | Base URL for ticket links in notes |
| `OBSIDIAN_SEARCH_FOLDERS` | No | Comma-separated folders to search for notes |
| `OBSIDIAN_TICKET_PATTERN` | No | Regex for ticket IDs in branch names |
| `OBSIDIAN_STORY_ENV` | No | Alternate path to the `env` file |

**Precedence:** CLI flag → env → `config.json`

## Privacy

Never commit or push:

- `config.json` / `env` (personal paths — gitignored here)
- `.obsidian-sync.json` (per-repo binding)
- `.git/hooks/post-commit` (local hook; not cloned)

## After clone of a work repo

Git hooks are not cloned. Re-run:

```bash
obsidian-sync enable --project my-project
```

## Troubleshooting

| Problem | Fix |
| --- | --- |
| `command not found: obsidian-sync` | `source ~/.zshrc` or open a new terminal |
| Wrong / missing vault | Check `~/.obsidian-story-sync/env` → `OBSIDIAN_VAULT_PATH` |
| `No Obsidian project mapped` | Run `enable` inside that repo |
| `SKIP No ticket found` | Put ticket in branch name or pass `--ticket` |
| `SKIP No Obsidian note` | Run `start --title "..."` first |
| Hook seems silent | Run `obsidian-sync commit` manually (hook never blocks Git) |

## More docs

- [INSTALL.md](INSTALL.md) — detailed teammate setup
- [TECHNICAL_GUIDE.md](TECHNICAL_GUIDE.md) — how it works under the hood
- [PASSO_A_PASSO_COLEGA.md](PASSO_A_PASSO_COLEGA.md) — short PT walkthrough
- [CONFLUENCE_MOTIVATION_AUDIENCE.md](CONFLUENCE_MOTIVATION_AUDIENCE.md) — motivation / audience notes
