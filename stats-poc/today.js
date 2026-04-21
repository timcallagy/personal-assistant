/**
 * Today's funnel for all new users.
 * Usage: node today.js
 */

const https = require('https');

const API_KEY = '<your_posthog_api_key>';
const PROJECT_ID = '100831';
const BASE_URL = 'eu.posthog.com';

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

const FROM = '2026-04-21';
const TO   = '2026-04-22';

const EXCLUDE_EMAILS = ['timcallagy@gmail.com', 'androidTest1@test.com'];
const EXCLUDE_FILTER = `AND person.properties.$email NOT IN (${EXCLUDE_EMAILS.map(e => `'${e}'`).join(', ')})`;

// Topics-era funnel steps (app launched Apr 17+)
const FUNNEL_STEPS = [
  'App Opened',
  'Onboarding Started',
  'Native Language Selected',
  'Target Language Selected',
  'onboarding_topic_selected',
  'onboarding_completed',
  'call_started',
];

async function main() {
  console.log(`\n=== Today's Funnel (${FROM}) — All New Users ===\n`);

  // --- Funnel steps ---
  const eventList = FUNNEL_STEPS.map(e => `'${e}'`).join(', ');
  const funnelRows = await hogql(`
    SELECT event, count(distinct person_id) as users
    FROM events
    WHERE event IN (${eventList})
      AND timestamp >= '${FROM}'
      AND timestamp < '${TO}'
      ${EXCLUDE_FILTER}
    GROUP BY event
  `);
  const counts = Object.fromEntries(funnelRows.map(r => [r[0], r[1]]));
  const steps = FUNNEL_STEPS.map(name => ({ name, count: counts[name] || 0 }));
  const top = steps.find(s => s.name === 'Onboarding Started')?.count || steps.find(s => s.count > 0)?.count || 1;

  console.log('--- Onboarding Funnel ---');
  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const pct = ((step.count / top) * 100).toFixed(1);
    const drop = i > 0 && steps[i - 1].count > 0
      ? (((steps[i - 1].count - step.count) / steps[i - 1].count) * 100).toFixed(1)
      : null;
    const dropStr = drop !== null ? `  (↓${drop}% from prev)` : '';
    console.log(`  ${i + 1}. ${step.name.padEnd(42)} ${String(step.count).padStart(4)} users  ${pct.padStart(5)}%${dropStr}`);
  }

  // --- Skips ---
  const skipRows = await hogql(`
    SELECT
      JSONExtractString(properties, 'skipped_at_screen') as screen,
      count() as skips
    FROM events
    WHERE event = 'Onboarding Skipped'
      AND timestamp >= '${FROM}'
      AND timestamp < '${TO}'
      ${EXCLUDE_FILTER}
    GROUP BY screen
    ORDER BY skips DESC
  `);
  const totalSkips = skipRows.reduce((s, r) => s + r[1], 0);
  console.log(`\n  Skipped onboarding: ${totalSkips}`);
  for (const [screen, count] of skipRows) {
    console.log(`    - at "${screen}": ${count}`);
  }

  // --- Native language breakdown ---
  const nativeLangRows = await hogql(`
    SELECT
      JSONExtractString(properties, 'language') as language,
      count(distinct person_id) as users
    FROM events
    WHERE event = 'Native Language Selected'
      AND timestamp >= '${FROM}'
      AND timestamp < '${TO}'
      ${EXCLUDE_FILTER}
    GROUP BY language
    ORDER BY users DESC
    LIMIT 15
  `);
  console.log('\n--- Native Languages ---');
  for (const [lang, count] of nativeLangRows) {
    console.log(`  - ${lang || 'unknown'}: ${count}`);
  }

  // --- Target language breakdown ---
  const targetLangRows = await hogql(`
    SELECT
      JSONExtractString(properties, 'language') as language,
      count(distinct person_id) as users
    FROM events
    WHERE event = 'Target Language Selected'
      AND timestamp >= '${FROM}'
      AND timestamp < '${TO}'
      ${EXCLUDE_FILTER}
    GROUP BY language
    ORDER BY users DESC
    LIMIT 15
  `);
  console.log('\n--- Target Languages ---');
  for (const [lang, count] of targetLangRows) {
    console.log(`  - ${lang || 'unknown'}: ${count}`);
  }

  // --- Topics selected ---
  const topicRows = await hogql(`
    SELECT
      JSONExtractString(properties, 'topic_slug') as topic,
      count(distinct person_id) as users
    FROM events
    WHERE event = 'onboarding_topic_selected'
      AND timestamp >= '${FROM}'
      AND timestamp < '${TO}'
      ${EXCLUDE_FILTER}
    GROUP BY topic
    ORDER BY users DESC
    LIMIT 15
  `);
  console.log('\n--- Topics Selected ---');
  for (const [topic, count] of topicRows) {
    console.log(`  - ${topic || 'unknown'}: ${count}`);
  }

  // --- Onboarding completed breakdown ---
  const completionRows = await hogql(`
    SELECT
      JSONExtractString(properties, 'action') as action,
      JSONExtractString(properties, 'topic_slug') IN ('', 'null') OR NOT JSONHas(properties, 'topic_slug') as skipped_topic,
      count(distinct person_id) as users
    FROM events
    WHERE event = 'onboarding_completed'
      AND timestamp >= '${FROM}'
      AND timestamp < '${TO}'
      ${EXCLUDE_FILTER}
    GROUP BY action, skipped_topic
    ORDER BY users DESC
  `);
  console.log('\n--- Onboarding Completed (action / topic) ---');
  for (const [action, skippedTopic, count] of completionRows) {
    console.log(`  - ${action || 'unknown'}${skippedTopic ? ' (no topic)' : ''}: ${count}`);
  }

  // --- Geo breakdown (PostHog IP-based) ---
  const geoRows = await hogql(`
    SELECT
      JSONExtractString(properties, '$geoip_country_name') as country,
      count(distinct person_id) as users
    FROM events
    WHERE event = 'App Opened'
      AND timestamp >= '${FROM}'
      AND timestamp < '${TO}'
      ${EXCLUDE_FILTER}
    GROUP BY country
    ORDER BY users DESC
    LIMIT 15
  `);
  console.log('\n--- Countries (App Opened, PostHog geoip) ---');
  for (const [country, count] of geoRows) {
    console.log(`  - ${country || 'unknown'}: ${count}`);
  }

  // --- App version ---
  const versionRows = await hogql(`
    SELECT
      JSONExtractString(properties, 'app_version') AS version,
      count(distinct person_id) AS users
    FROM events
    WHERE timestamp >= '${FROM}'
      AND timestamp < '${TO}'
      AND JSONExtractString(properties, 'app_version') != ''
      ${EXCLUDE_FILTER}
    GROUP BY version
    ORDER BY users DESC
    LIMIT 10
  `);
  console.log('\n--- App Versions ---');
  for (const [version, users] of versionRows) {
    console.log(`  - ${version || '(none)'}: ${users}`);
  }

  console.log('');
}

main().catch(console.error);
