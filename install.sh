#!/usr/bin/env bash
# Install Obsidian Story Sync on this machine.
set -euo pipefail

TOOL_DIR="${HOME}/.obsidian-story-sync"
BIN_DIR="${HOME}/bin"

echo "==> Installing Obsidian Story Sync"

if [[ ! -f "${TOOL_DIR}/bin/obsidian-sync.mjs" ]]; then
  echo "ERROR: Missing ${TOOL_DIR}/bin/obsidian-sync.mjs"
  echo "Copy/unzip the tool into ${TOOL_DIR} first, then re-run this script."
  exit 1
fi

chmod +x "${TOOL_DIR}/bin/obsidian-sync.mjs" "${TOOL_DIR}/hooks/post-commit" "${TOOL_DIR}/install.sh"

mkdir -p "${BIN_DIR}"
ln -sf "${TOOL_DIR}/bin/obsidian-sync.mjs" "${BIN_DIR}/obsidian-sync"

if [[ ! -f "${TOOL_DIR}/config.json" ]]; then
  cp "${TOOL_DIR}/config.example.json" "${TOOL_DIR}/config.json"
  echo "Created ${TOOL_DIR}/config.json from example"
fi

if [[ ! -f "${TOOL_DIR}/env" ]]; then
  cp "${TOOL_DIR}/env.example" "${TOOL_DIR}/env"
  echo "Created ${TOOL_DIR}/env — EDIT OBSIDIAN_VAULT_PATH inside this file"
fi

if ! grep -q 'export PATH="$HOME/bin:$PATH"' "${HOME}/.zshrc" 2>/dev/null; then
  printf '\n# Obsidian story sync\nexport PATH="$HOME/bin:$PATH"\n' >> "${HOME}/.zshrc"
  echo "Added ~/bin to PATH in ~/.zshrc"
fi

# Prefer env file for vault path (also load in interactive shells)
if ! grep -q 'obsidian-story-sync/env' "${HOME}/.zshrc" 2>/dev/null; then
  cat >> "${HOME}/.zshrc" <<'EOF'

# Obsidian story sync env (vault path, etc.)
if [ -f "$HOME/.obsidian-story-sync/env" ]; then
  set -a
  # shellcheck disable=SC1090
  . "$HOME/.obsidian-story-sync/env"
  set +a
fi
EOF
  echo "Added env loader to ~/.zshrc"
fi

echo
echo "Next steps:"
echo "  1. Edit vault path:  nano ~/.obsidian-story-sync/env"
echo "  2. Reload shell:     source ~/.zshrc"
echo "  3. Check CLI:        obsidian-sync"
echo "  4. In a git repo:    obsidian-sync enable --project my-project --root \"My Project\" --create-folders"
echo "  5. Test:             obsidian-sync status"
echo
echo "Done."
