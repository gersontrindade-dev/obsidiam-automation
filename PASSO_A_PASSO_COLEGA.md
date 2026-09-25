# Passo a passo — instalar Obsidian Story Sync (para o colega)

Guia curto para partilhar (Slack / email / call). Tempo estimado: ~5–10 min.

---

## O que vais receber

O repositório GitHub `obsidiam-automation` (clone para `~/.obsidian-story-sync`).

**Não inclui** paths pessoais de outra pessoa (`config.json` / `env`) — esses ficheiros são locais e estão no `.gitignore`.

---

## Pré-requisitos

No Mac do colega:

1. Node.js instalado → no terminal: `node -v`
2. Git instalado → `git -v`
3. Vault do Obsidian já existente no disco (saber o caminho absoluto)

---

## Passo 1 — Clonar a ferramenta

```bash
git clone https://github.com/gersontrindade-dev/obsidiam-automation.git ~/.obsidian-story-sync
```

Confirma:

```bash
ls ~/.obsidian-story-sync
```

Deves ver: `bin`, `hooks`, `install.sh`, `env.example`, `config.example.json`, `INSTALL.md`, `README.md`

---

## Passo 2 — Correr o instalador

```bash
chmod +x ~/.obsidian-story-sync/install.sh
~/.obsidian-story-sync/install.sh
```

Isto cria:

- comando `obsidian-sync` em `~/bin`
- ficheiros `config.json` e `env` (a partir dos examples)
- entradas no `~/.zshrc` (PATH + load do env)

---

## Passo 3 — Definir o path do TEU Obsidian

```bash
nano ~/.obsidian-story-sync/env
```

Altera para o caminho real do vault (exemplo):

```bash
OBSIDIAN_VAULT_PATH="/Users/SEU_USER/Documents/Obsidian/Devoteam"
```

Guarda o ficheiro (`Ctrl+O`, Enter, `Ctrl+X` no nano).

Recarrega o terminal:

```bash
source ~/.zshrc
```

Testa:

```bash
echo "$OBSIDIAN_VAULT_PATH"
obsidian-sync
```

Se aparecer o help do CLI → OK.

---

## Passo 4 — Ativar num repositório Git

Entra no repo onde vais trabalhar:

```bash
cd ~/path/para/o/teu/repo

obsidian-sync enable \
  --project meu-projeto \
  --root "Nome da Pasta no Vault" \
  --create-folders
```

Exemplos:

```bash
# Projeto Revo
obsidian-sync enable --project revo --root "Revo" --create-folders

# Outro cliente
obsidian-sync enable --project acme --root "Acme" --create-folders
```

Isto:

- cria pastas no vault (`In Progress`, etc.)
- cria `.obsidian-sync.json` no repo (local, gitignored)
- instala o hook `.git/hooks/post-commit`

---

## Passo 5 — Testar

```bash
obsidian-sync status
obsidian-sync projects

obsidian-sync start --ticket ABC-123 --title "Setup test note"
obsidian-sync commit
obsidian-sync find --ticket ABC-123
```

Abre o Obsidian e confirma a nota em:

`{Vault}/Nome da Pasta no Vault/In Progress/`

---

## Uso diário

| Ação | Comando |
| --- | --- |
| Começar story | `obsidian-sync start --ticket KEY-123 --title "Título"` |
| Registar último commit | `obsidian-sync commit` |
| Backfill da branch | `obsidian-sync commit --all` |
| Procurar nota | `obsidian-sync find --ticket KEY-123` |
| Estado | `obsidian-sync status` |

No Cursor/IDE podes dizer:

> Start story ABC-123 - Título da story

Os commits são registados automaticamente pelo hook `post-commit`.

Campos de PR / merge no topo da nota = **manuais** no fecho da story.

---

## Depois de clonar o repo de novo

Hooks não vêm no clone. Volta a correr:

```bash
obsidian-sync enable --project meu-projeto
```

---

## Problemas comuns

| Sintoma | Solução |
| --- | --- |
| `command not found: obsidian-sync` | `source ~/.zshrc` ou abre um terminal novo |
| Vault errado / vazio | Edita `~/.obsidian-story-sync/env` |
| `No Obsidian project mapped` | Corre `enable` dentro do repo |
| `SKIP No ticket found` | Ticket na branch ou `--ticket KEY-123` |
| `SKIP No Obsidian note` | Corre `start --title "..."` primeiro |
| Hook “não faz nada” | Corre `obsidian-sync commit` manualmente |

Debug rápido:

```bash
echo "$OBSIDIAN_VAULT_PATH"
obsidian-sync status
node ~/.obsidian-story-sync/bin/obsidian-sync.mjs status
```

---

## Privacidade (importante)

**Não commits** para o remoto:

- `~/.obsidian-story-sync/`
- `.obsidian-sync.json`
- `.git/hooks/post-commit`

Isto é tooling pessoal local.

---

## Mensagem pronta para colar no Slack

```text
Hey! Segue o Obsidian Story Sync + passos:

1) git clone https://github.com/gersontrindade-dev/obsidiam-automation.git ~/.obsidian-story-sync
2) Correr: ~/.obsidian-story-sync/install.sh
3) Editar ~/.obsidian-story-sync/env → OBSIDIAN_VAULT_PATH="caminho/do/teu/vault"
4) source ~/.zshrc
5) No repo: obsidian-sync enable --project NOME --root "Pasta no Vault" --create-folders
6) Testar: obsidian-sync status && obsidian-sync start --ticket ABC-123 --title "Test"

Guia completo: README.md / INSTALL.md no repo
Qualquer dúvida, chama.
```
