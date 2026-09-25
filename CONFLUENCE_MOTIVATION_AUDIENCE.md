# Motivation, Audience & Scope

> Paste **after** Metadata and **before** System Summary. Use Confluence `/markdown` or paste into the editor.

## Why this exists

Developers often lose ticket context and commit history across chats, browsers, and memory. Putting personal logging scripts into shared repos risks leaking private workflows.

**Developer Obsidian Log Automation** creates a **local, privacy-first audit trail** in Obsidian:

- Create a ticket note when a story starts
- Append Git commits automatically
- Fill PR/merge fields manually at close-out
- Keep tooling off remote repositories (no Jira/Bitbucket APIs)

## Who this is for

| Audience | Benefit |
| --- | --- |
| Software Engineers | Per-ticket journal without leaving IDE/Git |
| DevOps / Platform | Safe local automation pattern (CLI, hooks, gitignore) |
| AI Initiative Leads | Repeatable agent-assisted logging with clear privacy limits |

Best fit: individual contributors who use Obsidian and want commit-level traceability by ticket key.

## Who this is not for

- Teams needing a **shared/central** delivery source of truth
- Workflows that require **live Jira/Bitbucket sync**
- Environments that block local Git hooks or personal tooling

## Guiding principles

1. **Privacy first** — vault paths, rules, and bindings stay on the workstation  
2. **Local only** — Git + filesystem; no external APIs  
3. **Fail open** — logging never blocks a Git commit  
4. **Human close-out** — PR/merge fields and folder moves stay manual  
5. **Portable** — one machine CLI; enable per repository  

## Success criteria

1. Story start creates/finds a note in under a minute  
2. Commits appear in the note without copy/paste  
3. Closing a ticket = PR/merge fields (+ optional vault folder move)  
4. Nothing from the automation appears in remote PRs  

## Out of scope

Auto Jira/Bitbucket updates, automatic vault folder moves, strict commit-policy enforcement, and team-shared vault sync (unless handled separately in Obsidian).
