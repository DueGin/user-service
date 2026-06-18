#!/bin/sh
set -e

if [ -z "${DATABASE_URL:-}" ]; then
  : "${POSTGRES_HOST:?Set POSTGRES_HOST or DATABASE_URL}"
  : "${POSTGRES_USER:?Set POSTGRES_USER or DATABASE_URL}"
  : "${POSTGRES_PASSWORD:?Set POSTGRES_PASSWORD or DATABASE_URL}"
  : "${POSTGRES_DB:?Set POSTGRES_DB or DATABASE_URL}"

  POSTGRES_PORT="${POSTGRES_PORT:-5432}"
  POSTGRES_SCHEMA="${POSTGRES_SCHEMA:-public}"
  POSTGRES_TIMEZONE="${POSTGRES_TIMEZONE:-Asia/Shanghai}"

  DATABASE_URL="$(
    node - "$POSTGRES_HOST" "$POSTGRES_PORT" "$POSTGRES_USER" "$POSTGRES_PASSWORD" "$POSTGRES_DB" "$POSTGRES_SCHEMA" "$POSTGRES_TIMEZONE" "${POSTGRES_SSLMODE:-}" "${POSTGRES_URL_EXTRA_PARAMS:-}" <<'NODE'
const [
  host,
  port,
  user,
  password,
  database,
  schema,
  timezone,
  sslmode,
  extraParams,
] = process.argv.slice(2);

const query = new URLSearchParams({ schema });

if (sslmode) {
  query.set("sslmode", sslmode);
}

if (extraParams) {
  const raw = extraParams.replace(/^[?&]/, "");
  for (const item of raw.split("&")) {
    if (!item) continue;
    const [key, ...valueParts] = item.split("=");
    if (!key) continue;
    query.set(key, valueParts.join("="));
  }
}

if (timezone && !query.has("options")) {
  query.set("options", `-c timezone=${timezone}`);
}

process.stdout.write(
  `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}` +
    `@${host}:${port}/${encodeURIComponent(database)}?${query.toString()}`,
);
NODE
  )"

  export DATABASE_URL
fi

exec "$@"
