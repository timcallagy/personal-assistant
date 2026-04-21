/**
 * Paywall viewed analysis + call duration breakdown (Mar 26+).
 * Usage: node paywall.js
 */

const https = require('https');

const API_KEY = '<your_posthog_api_key>';
const PROJECT_ID = '100831';
const BASE_URL = 'eu.posthog.com';

const FROM_DATE = '2026-03-26';

function request(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: BASE_URL,
      path,
      method,
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error(`Parse error: ${data}`)); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function hogql(query) {
  const result = await request('POST', `/api/projects/${PROJECT_ID}/query/`, {
    query: { kind: 'HogQLQuery', query },
  });
  if (result.error) throw new Error(result.error);
  return result.results || [];
}

async function main() {
  console.log(`\n=== Paywall Analysis (${FROM_DATE}+) ===\n`);

  // Daily paywall views
  const daily = await hogql(`
    SELECT
      toDate(timestamp) AS day,
      count(distinct person_id) AS users,
      count() AS total_views
    FROM events
    WHERE event = 'paywall_viewed'
      AND timestamp >= '${FROM_DATE}'
    GROUP BY day
    ORDER BY day DESC
  `);

  console.log('--- Daily Paywall Views ---');
  if (daily.length === 0) {
    console.log('  No paywall_viewed events found.');
  } else {
    console.log(`  ${'Date'.padEnd(12)} ${'Users'.padStart(7)} ${'Views'.padStart(7)}`);
    for (const [day, users, views] of daily) {
      console.log(`  ${String(day).padEnd(12)} ${String(users).padStart(7)} ${String(views).padStart(7)}`);
    }
  }

  // Paywall source breakdown (what triggered the paywall to show)
  const sources = await hogql(`
    SELECT
      JSONExtractString(properties, 'source') AS source,
      count(distinct person_id) AS users,
      count() AS occurrences
    FROM events
    WHERE event = 'paywall_viewed'
      AND timestamp >= '${FROM_DATE}'
    GROUP BY source
    ORDER BY users DESC
  `);

  console.log('\n--- Paywall Source Breakdown ---');
  if (sources.length === 0) {
    console.log('  No source property found (or no events).');
  } else {
    console.log(`  ${'Source'.padEnd(30)} ${'Users'.padStart(7)} ${'Views'.padStart(7)}`);
    for (const [source, users, views] of sources) {
      console.log(`  ${(source || '(none — pre-3.1.45)').padEnd(30)} ${String(users).padStart(7)} ${String(views).padStart(7)}`);
    }
  }

  // All properties on paywall_viewed (to understand what data is available)
  const sampleProps = await hogql(`
    SELECT properties
    FROM events
    WHERE event = 'paywall_viewed'
      AND timestamp >= '${FROM_DATE}'
    LIMIT 3
  `);

  if (sampleProps.length > 0) {
    console.log('\n--- Sample paywall_viewed Properties ---');
    for (const [props] of sampleProps) {
      console.log(' ', props);
    }
  }

  // Users who viewed paywall — did they start a call first?
  const paywallAfterCall = await hogql(`
    SELECT
      count(distinct person_id) AS users_who_viewed_paywall
    FROM events
    WHERE event = 'paywall_viewed'
      AND timestamp >= '${FROM_DATE}'
      AND person_id IN (
        SELECT distinct person_id
        FROM events
        WHERE event = 'call_started'
          AND timestamp >= '${FROM_DATE}'
      )
  `);

  const paywallTotal = await hogql(`
    SELECT count(distinct person_id)
    FROM events
    WHERE event = 'paywall_viewed'
      AND timestamp >= '${FROM_DATE}'
  `);

  const total = paywallTotal[0]?.[0] ?? 0;
  const afterCall = paywallAfterCall[0]?.[0] ?? 0;
  console.log(`\n--- Paywall Context ---`);
  console.log(`  Total unique users who saw paywall: ${total}`);
  console.log(`  Of those, had a call first:         ${afterCall}`);
  if (total > 0) {
    console.log(`  Hit paywall without a call:         ${total - afterCall}`);
  }
}

main().catch(console.error);
