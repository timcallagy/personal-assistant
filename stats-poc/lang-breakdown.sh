#!/bin/bash
curl -s 'https://eu.posthog.com/api/projects/100831/query/' \
  -H 'Authorization: Bearer <your_posthog_api_key>' \
  -H 'Content-Type: application/json' \
  -d '{"query":{"kind":"HogQLQuery","query":"SELECT toDate(timestamp) as day, JSONExtractString(properties, '\''language'\'') as language, count(distinct person_id) as users FROM events WHERE event = '\''Target Language Selected'\'' AND timestamp >= '\''2026-03-18'\'' GROUP BY day, language ORDER BY day DESC, users DESC"}}' \
  | python3 -c "import sys,json; rows=json.load(sys.stdin)['results']; [print(r) for r in rows]"
