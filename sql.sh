#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_DIR="$ROOT_DIR/sql"
ENV_FILE="$ROOT_DIR/.env"

if [[ ! -f "$ENV_FILE" ]]; then
    echo "Missing .env at $ENV_FILE" >&2
    exit 1
fi

if [[ ! -d "$SQL_DIR" ]]; then
    echo "Missing sql directory at $SQL_DIR" >&2
    exit 1
fi

if ! command -v mysql >/dev/null 2>&1; then
    echo "mysql client is not installed or not in PATH" >&2
    exit 1
fi

get_env() {
    local key="$1"
    local line value

    line="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 || true)"

    if [[ -z "$line" ]]; then
        echo ""
        return
    fi

    value="${line#*=}"
    value="${value%$'\r'}"

    if [[ "$value" =~ ^\".*\"$ ]]; then
        value="${value:1:${#value}-2}"
    elif [[ "$value" =~ ^\'.*\'$ ]]; then
        value="${value:1:${#value}-2}"
    fi

    printf '%s' "$value"
}

DB_HOST="$(get_env DB_HOST)"
DB_USER="$(get_env DB_USER)"
DB_PASS="$(get_env DB_PASS)"
DB_NAME="$(get_env DB_NAME)"

if [[ -z "$DB_HOST" || -z "$DB_USER" || -z "$DB_NAME" ]]; then
    echo "DB_HOST, DB_USER and DB_NAME must be set in .env" >&2
    exit 1
fi

mapfile -t SQL_FILES < <(find "$SQL_DIR" -maxdepth 1 -type f -name '*.sql' | sort)

if [[ ${#SQL_FILES[@]} -eq 0 ]]; then
    echo "No .sql files found in ./sql" >&2
    exit 1
fi

echo "SQL files in ./sql:"
echo

for i in "${!SQL_FILES[@]}"; do
    printf "  %d) %s\n" "$((i + 1))" "$(basename "${SQL_FILES[$i]}")"
done

echo
read -r -p "Enter number to execute: " CHOICE

if ! [[ "$CHOICE" =~ ^[0-9]+$ ]]; then
    echo "Invalid selection" >&2
    exit 1
fi

INDEX=$((CHOICE - 1))

if [[ "$INDEX" -lt 0 || "$INDEX" -ge ${#SQL_FILES[@]} ]]; then
    echo "Selection out of range" >&2
    exit 1
fi

SELECTED="${SQL_FILES[$INDEX]}"

echo
echo "Executing $(basename "$SELECTED")..."

# init.sql creates the database itself; other scripts can USE DB_NAME.
MYSQL_ARGS=(--host="$DB_HOST" --user="$DB_USER")

if MYSQL_PWD="$DB_PASS" mysql --host="$DB_HOST" --user="$DB_USER" -e "USE \`$DB_NAME\`" >/dev/null 2>&1; then
    MYSQL_ARGS+=(--database="$DB_NAME")
fi

MYSQL_PWD="$DB_PASS" mysql "${MYSQL_ARGS[@]}" < "$SELECTED"

echo "Done."
