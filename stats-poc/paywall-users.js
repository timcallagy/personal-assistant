/**
 * Show all paywall_viewed events with user IDs, dates, and has_ever_purchased.
 * Usage: node paywall-users.js
 */

const https = require('https');

const API_KEY = '<your_posthog_api_key>';
const PROJECT_ID = '100831';

function request(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const options = {
      hostname: 'eu.posthog.com',
      path: `/api/projects/${PROJECT_ID}/query/`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    };
    const req = https.request(options, (res) => {
      let s = '';
      res.on('data', c => s += c);
      res.on('end', () => {
        try { resolve(JSON.parse(s)); }
        catch (e) { reject(new Error(`Parse error: ${s}`)); }
      });
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function hogql(query) {
  const result = await request({ query: { kind: 'HogQLQuery', query } });
  if (result.error) throw new Error(result.error);
  return result.results || [];
}

async function main() {
  const rows = await hogql(`
    SELECT
      distinct_id,
      toDate(timestamp) AS day,
      JSONExtractString(properties, 'has_ever_purchased') AS has_ever_purchased,
      JSONExtractString(properties, '$geoip_country_name') AS country,
      JSONExtractString(properties, '$locale') AS locale,
      JSONExtractString(properties, '$app_version') AS app_version
    FROM events
    WHERE event = 'paywall_viewed'
      AND timestamp >= '2026-03-26'
    ORDER BY timestamp DESC
  `);

  console.log('\n=== Paywall Viewed Events ===\n');
  console.log(`${'distinct_id'.padEnd(40)} ${'Day'.padEnd(12)} ${'Purchased'.padEnd(12)} ${'Country'.padEnd(15)} ${'Locale'.padEnd(8)} ${'Version'}`);
  for (const [id, day, purchased, country, locale, version] of rows) {
    console.log(`${String(id).padEnd(40)} ${String(day).padEnd(12)} ${String(purchased).padEnd(12)} ${String(country || '—').padEnd(15)} ${String(locale || '—').padEnd(8)} ${version || '—'}`);
  }
}

main().catch(console.error);
