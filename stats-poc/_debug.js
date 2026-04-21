const https = require('https');
const API_KEY = '<your_posthog_api_key>';
const PROJECT_ID = '100831';

function hogql(q) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: { kind: 'HogQLQuery', query: q } });
    const req = https.request({
      hostname: 'eu.posthog.com',
      path: `/api/projects/${PROJECT_ID}/query/`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${API_KEY}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) },
    }, res => { let d = ''; res.on('data', c => d += c); res.on('end', () => { const r = JSON.parse(d); if (r.error) reject(new Error(r.error)); else resolve(r.results || []); }); });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

const EXCLUDE = `AND person.properties.$email NOT IN ('timcallagy@gmail.com', 'androidTest1@test.com')`;
const FROM = '2026-04-21', TO = '2026-04-22';

async function main() {
  // Total App Opens vs filtered
  const [total, filtered] = await Promise.all([
    hogql(`SELECT count(distinct person_id) FROM events WHERE event = 'App Opened' AND timestamp >= '${FROM}' AND timestamp < '${TO}'`),
    hogql(`SELECT count(distinct person_id) FROM events WHERE event = 'App Opened' AND timestamp >= '${FROM}' AND timestamp < '${TO}' ${EXCLUDE}`),
  ]);
  console.log(`App Opens — all: ${total[0][0]}  excl test: ${filtered[0][0]}  test accounts: ${total[0][0] - filtered[0][0]}`);

  // All events today unfiltered (to find auth events)
  const allEvents = await hogql(`
    SELECT event, count() as total, count(distinct person_id) as users
    FROM events
    WHERE timestamp >= '${FROM}' AND timestamp < '${TO}'
    GROUP BY event ORDER BY total DESC LIMIT 30
  `);
  console.log('\nAll events today (unfiltered):');
  for (const r of allEvents) console.log(' ', r[0].padEnd(42), 'total:', String(r[1]).padStart(4), ' users:', r[2]);

  // Auth events with email info
  const authFiltered = await hogql(`
    SELECT event, count() as total, count(distinct person_id) as users
    FROM events
    WHERE timestamp >= '${FROM}' AND timestamp < '${TO}'
      AND (event ILIKE '%sign%' OR event ILIKE '%login%' OR event ILIKE '%creat%' OR event ILIKE '%register%')
      ${EXCLUDE}
    GROUP BY event ORDER BY total DESC
  `);
  console.log('\nAuth events today (excl test users):');
  for (const r of authFiltered) console.log(' ', r[0].padEnd(42), 'total:', String(r[1]).padStart(4), ' users:', r[2]);
}

main().catch(console.error);
