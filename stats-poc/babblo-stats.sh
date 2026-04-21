#!/bin/bash
DIR="/home/muwawa/workspace/persAssistant/stats-poc"
ENV_FILE="/home/muwawa/workspace/persAssistant/packages/api/.env"

# Load .env — but don't let it overwrite vars already set in the shell
# (so BABBLO_DATABASE_URL and PA_DATABASE_URL set in shell take precedence)
if [ -f "$ENV_FILE" ]; then
  while IFS= read -r line || [ -n "$line" ]; do
    # Skip comments and blank lines
    [[ "$line" =~ ^[[:space:]]*# ]] && continue
    [[ -z "${line// }" ]] && continue
    key="${line%%=*}"
    # Only set if not already set in the environment
    if [ -z "${!key+x}" ]; then
      val="${line#*=}"
      # Strip surrounding quotes
      val="${val%\"}"
      val="${val#\"}"
      export "$key=$val"
    fi
  done < "$ENV_FILE"
fi

# ─── DB stats ────────────────────────────────────────────────────────────────

run_db_stats() {
  echo ""
  echo "=== Babblo DB Stats ==="
  echo ""

  if [ -z "$BABBLO_DATABASE_URL" ]; then
    echo "⚠️  BABBLO_DATABASE_URL not set — skipping Babblo DB stats."
  else
    psql "$BABBLO_DATABASE_URL" --no-psqlrc -q <<'SQL'
SET search_path TO public;
\echo '--- Signups ---'
SELECT
  COUNT(*) FILTER (WHERE DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE)  AS today,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')      AS last_7_days,
  COUNT(*)                                                                      AS all_time
FROM profiles;

\echo ''
\echo '--- Calls ---'
SELECT
  COUNT(*) FILTER (WHERE DATE(started_at AT TIME ZONE 'UTC') = CURRENT_DATE) AS today,
  COUNT(*) FILTER (WHERE started_at >= CURRENT_DATE - INTERVAL '7 days')     AS last_7_days,
  COUNT(*)                                                                     AS all_time
FROM conversation_sessions;

\echo ''
\echo '--- New Purchases ---'
SELECT
  COUNT(*) FILTER (WHERE DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE) AS today,
  COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days')     AS last_7_days,
  COUNT(*)                                                                     AS all_time
FROM transactions
WHERE transaction_type = 'purchase';

\echo ''
\echo '--- Lifecycle Stage Breakdown ---'
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM transactions t
      WHERE t.user_id = p.user_id AND t.transaction_type = 'purchase'
    )                                                    THEN 'purchased'
    WHEN (ub.free_trial_used IS NOT TRUE)
      AND COALESCE(ub.balance_seconds, 0) = 0            THEN 'email_not_verified'
    WHEN ub.balance_seconds = 0                          THEN 'trial_exhausted'
    WHEN ub.balance_seconds BETWEEN 1 AND 599            THEN 'trial_active'
    ELSE                                                      'trial_not_started'
  END AS stage,
  COUNT(*) AS users
FROM profiles p
LEFT JOIN user_balance ub ON ub.user_id = p.user_id
GROUP BY 1
ORDER BY 2 DESC;
SQL
  fi

  echo ""
  echo "=== PA DB Stats (Email Automation) ==="
  echo ""

  if [ -z "$PA_DATABASE_URL" ]; then
    echo "⚠️  PA_DATABASE_URL not set — skipping PA DB stats."
    echo "   Set it in your shell: export PA_DATABASE_URL=\"postgresql://...\""
  else
    psql "$PA_DATABASE_URL" --no-psqlrc -q <<'SQL'
\echo '--- Emails Sent Today (by type) ---'
SELECT
  email_type,
  COUNT(*) AS sent_today
FROM sent_emails
WHERE DATE(sent_at AT TIME ZONE 'UTC') = CURRENT_DATE
GROUP BY email_type
ORDER BY sent_today DESC;

\echo ''
\echo '--- Emails Sent All Time (by type) ---'
SELECT
  email_type,
  COUNT(*) AS total
FROM sent_emails
GROUP BY email_type
ORDER BY total DESC;

\echo ''
\echo '--- Newsletter Subscribers ---'
SELECT
  COUNT(*) FILTER (WHERE unsubscribed_at IS NULL) AS active,
  COUNT(*) FILTER (WHERE unsubscribed_at IS NOT NULL) AS unsubscribed,
  COUNT(*) AS total
FROM newsletter_subscribers;
SQL
  fi
}

# ─── Google Ads + PostHog stats ───────────────────────────────────────────────

run_api_stats() {
  node "$DIR/fetch.js"
  if [ $? -eq 2 ]; then return 2; fi
  node "$DIR/posthog.js"
  if [ $? -eq 2 ]; then return 2; fi
  node "$DIR/paywall.js"
}

# ─── Main ─────────────────────────────────────────────────────────────────────

run_db_stats

run_api_stats
if [ $? -eq 2 ]; then
  echo ""
  echo "⚠️  Google Ads token has expired. Launching auth.js to refresh it..."
  echo ""
  node "$DIR/auth.js"
  echo ""
  echo "Token refreshed — re-running API stats..."
  echo ""
  run_api_stats
fi
