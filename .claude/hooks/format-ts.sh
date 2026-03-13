#!/bin/bash
# Auto-format TypeScript/TSX files after Edit/Write tool use
# Reads CLAUDE_TOOL_RESULT env var to determine which file was edited

set -euo pipefail

# Get the file path from the tool input
FILE=$(echo "$CLAUDE_TOOL_INPUT" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    path = data.get('file_path', '') or data.get('path', '')
    print(path)
except:
    print('')
" 2>/dev/null || echo "")

# Only process TypeScript files
if [[ -z "$FILE" ]] || [[ ! "$FILE" =~ \.(ts|tsx)$ ]]; then
    exit 0
fi

# Must exist
if [[ ! -f "$FILE" ]]; then
    exit 0
fi

APP_DIR="/Users/ax/work/documents/app"

# Run prettier
if command -v npx &>/dev/null; then
    npx --prefix "$APP_DIR" prettier --write --log-level silent "$FILE" 2>/dev/null || true
fi

# Run eslint fix
if command -v npx &>/dev/null; then
    npx --prefix "$APP_DIR" eslint --fix --quiet "$FILE" 2>/dev/null || true
fi
