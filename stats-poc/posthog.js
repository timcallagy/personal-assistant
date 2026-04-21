/**
 * PostHog funnel analysis for Babblo onboarding.
 * Uses HogQL query API (required for newer PostHog accounts).
 * Usage: node posthog.js
 */

const https = require('https');

const API_KEY = '<your_posthog_api_key>';
const PROJECT_ID = '100831';
const BASE_URL = 'eu.posthog.com';

const EXCLUDE_EMAILS = ['timcallagy@gmail.com', 'androidTest1@test.com'];
const EXCLUDE_FILTER = `AND person.properties.$email NOT IN (${EXCLUDE_EMAILS.map(e => `'${e}'`).join(', ')})`;

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

const FUNNEL_STEPS_LEGACY = [
  'App Opened',
  'Onboarding Started',
  'Native Language Selected',
  'Target Language Selected',
  'Interests Selected',
  'Onboarding Tutorial Completed',
  'call_started',
];

const FUNNEL_STEPS_TOPICS = [
  'App Opened',
  'Onboarding Started',
  'Native Language Selected',
  'Target Language Selected',
  'onboarding_topic_selected',
  'onboarding_completed',
  'call_started',
];

async function getFunnelForPeriod(dateFrom, dateTo, steps = FUNNEL_STEPS_LEGACY) {
  const eventList = steps.map(e => `'${e}'`).join(', ');

  // Count distinct persons per event step
  const rows = await hogql(`
    SELECT event, count(distinct person_id) as users
    FROM events
    WHERE event IN (${eventList})
      AND timestamp >= '${dateFrom}'
      AND timestamp < '${dateTo}'
      ${EXCLUDE_FILTER}
    GROUP BY event
  `);

  const counts = Object.fromEntries(rows.map(r => [r[0], r[1]]));
  return steps.map(name => ({ name, count: counts[name] || 0 }));
}

async function getSkipsForPeriod(dateFrom, dateTo) {
  const rows = await hogql(`
    SELECT
      JSONExtractString(properties, 'skipped_at_screen') as screen,
      count() as skips
    FROM events
    WHERE event = 'Onboarding Skipped'
      AND timestamp >= '${dateFrom}'
      AND timestamp < '${dateTo}'
      ${EXCLUDE_FILTER}
    GROUP BY screen
    ORDER BY skips DESC
  `);
  return rows;
}

async function getLanguageBreakdown(dateFrom, dateTo) {
  const rows = await hogql(`
    SELECT
      JSONExtractString(properties, 'language') as language,
      count(distinct person_id) as selections
    FROM events
    WHERE event = 'Target Language Selected'
      AND timestamp >= '${dateFrom}'
      AND timestamp < '${dateTo}'
      ${EXCLUDE_FILTER}
    GROUP BY language
    ORDER BY selections DESC
    LIMIT 10
  `);
  return rows;
}

async function getDailyFunnel(dateFrom, dateTo) {
  const events = ['App Opened', 'Onboarding Started', 'Onboarding Tutorial Completed', 'onboarding_completed', 'call_started'];
  const eventList = events.map(e => `'${e}'`).join(', ');

  const rows = await hogql(`
    SELECT
      toDate(timestamp) as day,
      event,
      count(distinct person_id) as users
    FROM events
    WHERE event IN (${eventList})
      AND timestamp >= '${dateFrom}'
      AND timestamp < '${dateTo}'
      ${EXCLUDE_FILTER}
    GROUP BY day, event
    ORDER BY day DESC, event
  `);

  const byDay = {};
  for (const [day, event, users] of rows) {
    if (!byDay[day]) byDay[day] = { appOpened: 0, onboardingStarted: 0, onboardingCompleted: 0, callStarted: 0 };
    if (event === 'App Opened') byDay[day].appOpened = users;
    if (event === 'Onboarding Started') byDay[day].onboardingStarted = users;
    if (event === 'Onboarding Tutorial Completed' || event === 'onboarding_completed') byDay[day].onboardingCompleted += users;
    if (event === 'call_started') byDay[day].callStarted = users;
  }
  return byDay;
}

async function getTopicBreakdown(dateFrom, dateTo) {
  const rows = await hogql(`
    SELECT
      JSONExtractString(properties, 'topic_slug') as topic,
      count(distinct person_id) as users
    FROM events
    WHERE event = 'onboarding_topic_selected'
      AND timestamp >= '${dateFrom}'
      AND timestamp < '${dateTo}'
      ${EXCLUDE_FILTER}
    GROUP BY topic
    ORDER BY users DESC
    LIMIT 15
  `);
  return rows;
}

async function getOnboardingCompletedStats(dateFrom, dateTo) {
  const rows = await hogql(`
    SELECT
      JSONExtractString(properties, 'action') as action,
      JSONExtractString(properties, 'topic_slug') IN ('', 'null') OR NOT JSONHas(properties, 'topic_slug') as skipped_topic,
      count(distinct person_id) as users
    FROM events
    WHERE event = 'onboarding_completed'
      AND timestamp >= '${dateFrom}'
      AND timestamp < '${dateTo}'
      ${EXCLUDE_FILTER}
    GROUP BY action, skipped_topic
    ORDER BY users DESC
  `);
  return rows;
}

const APP_VERSION_FEATURES = {
  '3.1.29': [
    'Feature: Speech Settings sheet added to call screen',
    'UI: Paywall and Talk Time screen redesign',
  ],
  '3.1.39': [
    'Feature: /paywall deep link support',
    'Feature: display name, email, app language saved to profile on login',
    'Fix: persona name/country overlapping call button on smaller Android devices',
  ],
  '3.1.45': [
    'Feature: call auto-starts immediately after onboarding (no swipe required)',
    'Feature: tapping a language on onboarding auto-advances to the next screen',
    'Feature: email sign-up hidden — Google sign-in only',
    'Feature: paywall_viewed source prop (call_screen, settings_menu, deep_link)',
    'Analytics: Microphone Permission Requested/Denied events',
    'Analytics: app_version added to all PostHog events',
    'Analytics: App Opened event added',
    'Fix: tutorial image oversized on production builds',
    'Fix: flashcard filled full screen on cold start',
    'Fix: Settings menu appeared black due to unhandled render error',
  ],
  '3.1.47': [
    'Feature: Topics screen added to onboarding — users pick a conversation topic before login',
    'Analytics: onboarding_topic_selected event (fires per chip tap, includes topic_slug)',
    'Analytics: onboarding_completed event (fires on Login/Create Account, includes action + topic_slug)',
  ],
  // Add new versions here as they ship
};

function describeVersion(v) {
  const features = APP_VERSION_FEATURES[v];
  if (!features) return '';
  return '\n      ' + features.join('\n      ');
}

async function getAppVersionBreakdown(dateFrom, dateTo) {
  const rows = await hogql(`
    SELECT
      JSONExtractString(properties, 'app_version') AS version,
      count(distinct person_id)                     AS users,
      count()                                       AS events,
      min(toDate(timestamp))                        AS first_seen,
      max(toDate(timestamp))                        AS last_seen
    FROM events
    WHERE timestamp >= '${dateFrom}'
      AND timestamp < '${dateTo}'
      AND JSONExtractString(properties, 'app_version') != ''
      ${EXCLUDE_FILTER}
    GROUP BY version
    ORDER BY last_seen DESC, users DESC
    LIMIT 20
  `);
  return rows;
}

async function getMicPermissionStats(dateFrom, dateTo) {
  const rows = await hogql(`
    SELECT
      event,
      JSONExtractString(properties, 'app_version') AS version,
      count(distinct person_id)                     AS users,
      count()                                       AS occurrences
    FROM events
    WHERE event IN ('Microphone Permission Requested', 'Microphone Permission Denied')
      AND timestamp >= '${dateFrom}'
      AND timestamp < '${dateTo}'
      ${EXCLUDE_FILTER}
    GROUP BY event, version
    ORDER BY event, version DESC
  `);
  return rows;
}

async function getPaymentEvents(dateFrom, dateTo) {
  const rows = await hogql(`
    SELECT
      event,
      JSONExtractString(properties, 'app_version') AS version,
      count(distinct person_id)                     AS users,
      count()                                       AS occurrences
    FROM events
    WHERE (
        event ILIKE '%payment%'
        OR event ILIKE '%purchase%'
        OR event ILIKE '%paywall%'
        OR event ILIKE '%subscribe%'
        OR event ILIKE '%checkout%'
      )
      AND timestamp >= '${dateFrom}'
      AND timestamp < '${dateTo}'
      ${EXCLUDE_FILTER}
    GROUP BY event, version
    ORDER BY occurrences DESC
  `);
  return rows;
}

async function getRecentErrors(dateFrom, dateTo) {
  const rows = await hogql(`
    SELECT
      JSONExtractString(properties, '$exception_type')    AS type,
      JSONExtractString(properties, '$exception_message') AS message,
      count()                                             AS occurrences,
      count(distinct person_id)                           AS affected_users
    FROM events
    WHERE event = '$exception'
      AND timestamp >= '${dateFrom}'
      AND timestamp < '${dateTo}'
      ${EXCLUDE_FILTER}
    GROUP BY type, message
    ORDER BY occurrences DESC
    LIMIT 20
  `);
  return rows;
}

const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs');
const path = require('path');

const DEVELOPER_TOKEN = fs.readFileSync(
  path.join(__dirname, '../stats_api_keys/google_ads_token'), 'utf8'
).trim();
const TOKEN_PATH = path.join(__dirname, '../stats_api_keys/google_ads_oauth_token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../stats_api_keys/client_secret_161767820679-8479g58hgvgghniijpdmbmgmmph8ni7h.apps.googleusercontent.com.json');
const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));

const adsClient = new GoogleAdsApi({
  client_id: credentials.installed.client_id,
  client_secret: credentials.installed.client_secret,
  developer_token: DEVELOPER_TOKEN,
});
const adsCustomer = adsClient.Customer({
  customer_id: '3307160609',
  refresh_token: tokens.refresh_token,
});

async function fetchDailyInstalls() {
  const rows = await adsCustomer.query(`
    SELECT segments.date, metrics.conversions
    FROM campaign
    WHERE segments.date DURING LAST_14_DAYS
    ORDER BY segments.date DESC
  `);
  const result = {};
  for (const row of rows) {
    const date = row.segments.date;
    result[date] = (result[date] || 0) + Math.round(row.metrics.conversions);
  }
  return result;
}

function toDateStr(date) {
  return date.toISOString().slice(0, 10);
}

async function main() {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const tomorrow = new Date(today); tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  const tenDaysAgo = new Date(today); tenDaysAgo.setUTCDate(tenDaysAgo.getUTCDate() - 9);

  const windowFrom = toDateStr(tenDaysAgo);
  const windowTo = toDateStr(tomorrow);

  console.log('\n=== Babblo PostHog Funnel Analysis ===\n');

  // Daily install-vs-funnel breakdown (rolling 10-day window)
  console.log('--- Daily Funnel: Installs → Onboarding Started → Onboarding Completed → Call Started ---');
  console.log('  (No PostHog events before Mar 11 — events added alongside onboarding screens)\n');

  const [googleInstalls, daily] = await Promise.all([
    fetchDailyInstalls(),
    getDailyFunnel(windowFrom, windowTo),
  ]);

  // Merge installs into daily data
  for (const [day, installs] of Object.entries(googleInstalls)) {
    if (!daily[day]) daily[day] = { onboardingStarted: 0, onboardingCompleted: 0, callStarted: 0 };
    daily[day].installs = installs;
  }

  console.log(`  ${'Date'.padEnd(12)} ${'Installs'.padStart(9)} ${'App Open'.padStart(9)} ${'Onb Start'.padStart(10)} ${'Onb Done'.padStart(9)} ${'Call Start'.padStart(11)}   ${'Open%'.padStart(6)} ${'Start%'.padStart(7)} ${'Done%'.padStart(7)} ${'Call%'.padStart(7)}`);
  for (const [day, d] of Object.entries(daily).sort((a, b) => b[0].localeCompare(a[0]))) {
    const installs = d.installs ?? 0;
    const appOpened = d.appOpened ?? 0;
    const openPct  = installs ? ((appOpened / installs) * 100).toFixed(1) + '%' : '—';
    const startPct = installs ? ((d.onboardingStarted / installs) * 100).toFixed(1) + '%' : '—';
    const donePct  = installs ? ((d.onboardingCompleted / installs) * 100).toFixed(1) + '%' : '—';
    const callPct  = installs ? ((d.callStarted / installs) * 100).toFixed(1) + '%' : '—';
    const openStr  = appOpened > 0 ? String(appOpened) : '—';
    console.log(`  ${day.padEnd(12)} ${String(installs).padStart(9)} ${openStr.padStart(9)} ${String(d.onboardingStarted).padStart(10)} ${String(d.onboardingCompleted).padStart(9)} ${String(d.callStarted).padStart(11)}   ${openPct.padStart(6)} ${startPct.padStart(7)} ${donePct.padStart(7)} ${callPct.padStart(7)}`);
  }
  console.log('');

  const periods = [
    { label: 'Pre-onboarding  (Mar 5–10)',   from: '2026-03-05', to: '2026-03-11', steps: FUNNEL_STEPS_LEGACY },
    { label: 'Post-onboarding (Mar 11–15)',  from: '2026-03-11', to: '2026-03-16', steps: FUNNEL_STEPS_LEGACY },
    { label: 'No lang screen  (Mar 16–17)',  from: '2026-03-16', to: '2026-03-18', steps: FUNNEL_STEPS_LEGACY },
    { label: 'No interests    (Mar 18–Apr 16)', from: '2026-03-18', to: '2026-04-17', steps: FUNNEL_STEPS_LEGACY },
    { label: 'Topics screen   (Apr 17+)',    from: '2026-04-17', to: windowTo,      steps: FUNNEL_STEPS_TOPICS },
  ];

  for (const period of periods) {
    console.log(`--- ${period.label} ---`);

    const steps = await getFunnelForPeriod(period.from, period.to, period.steps);
    // Use Onboarding Started as baseline (index 1) — App Opened only has partial data
    const top = steps.find(s => s.name === 'Onboarding Started')?.count || steps.find(s => s.count > 0)?.count || 1;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const pct = ((step.count / top) * 100).toFixed(1);
      const drop = i > 0 && steps[i - 1].count > 0
        ? (((steps[i - 1].count - step.count) / steps[i - 1].count) * 100).toFixed(1)
        : null;
      const dropStr = drop !== null ? `  (↓${drop}% from prev)` : '';
      console.log(`  ${i + 1}. ${step.name.padEnd(42)} ${String(step.count).padStart(4)} users  ${pct.padStart(5)}%${dropStr}`);
    }

    // Skips
    const skips = await getSkipsForPeriod(period.from, period.to);
    const totalSkips = skips.reduce((sum, r) => sum + r[1], 0);
    if (totalSkips > 0) {
      console.log(`\n  Skipped onboarding: ${totalSkips} users`);
      for (const [screen, count] of skips) {
        console.log(`    - at "${screen}": ${count}`);
      }
    } else {
      console.log('\n  Skipped onboarding: 0');
    }

    // Target language breakdown
    const langs = await getLanguageBreakdown(period.from, period.to);
    if (langs.length > 0) {
      console.log('\n  Target languages selected:');
      for (const [lang, count] of langs) {
        console.log(`    - ${lang || 'unknown'}: ${count}`);
      }
    }

    // Topics period extras
    if (period.steps === FUNNEL_STEPS_TOPICS) {
      const topics = await getTopicBreakdown(period.from, period.to);
      if (topics.length > 0) {
        console.log('\n  Topics selected (onboarding_topic_selected):');
        for (const [topic, count] of topics) {
          console.log(`    - ${topic || 'unknown'}: ${count}`);
        }
      }

      const completions = await getOnboardingCompletedStats(period.from, period.to);
      if (completions.length > 0) {
        console.log('\n  Onboarding completed (action / topic skipped):');
        for (const [action, skippedTopic, count] of completions) {
          const skipLabel = skippedTopic ? ' (no topic)' : '';
          console.log(`    - ${action || 'unknown'}${skipLabel}: ${count} users`);
        }
      }
    }

    console.log('');
  }

  // Errors
  console.log('--- App Errors (last 10 days) ---');
  const errors = await getRecentErrors(windowFrom, windowTo);
  if (errors.length === 0) {
    console.log('  No $exception events recorded.\n');
  } else {
    console.log(`  ${'Type'.padEnd(20)} ${'Occurrences'.padStart(12)} ${'Users'.padStart(7)}  Message`);
    for (const [type, message, occurrences, users] of errors) {
      const t = (type || 'unknown').padEnd(20);
      const msg = (message || '').length > 60 ? (message || '').slice(0, 57) + '...' : (message || '');
      console.log(`  ${t} ${String(occurrences).padStart(12)} ${String(users).padStart(7)}  ${msg}`);
    }
    console.log('');
  }

  // App version breakdown
  console.log('--- App Versions (last 10 days) ---');
  const versions = await getAppVersionBreakdown(windowFrom, windowTo);
  if (versions.length === 0) {
    console.log('  No app_version data found (property added Apr 3).\n');
  } else {
    console.log(`  ${'Version'.padEnd(15)} ${'Users'.padStart(7)} ${'Events'.padStart(9)}  ${'First seen'.padEnd(12)} ${'Last seen'.padEnd(12)}  Features`);
    for (const [version, users, events, firstSeen, lastSeen] of versions) {
      const v = (version || '(none)').padEnd(15);
      console.log(`  ${v} ${String(users).padStart(7)} ${String(events).padStart(9)}  ${String(firstSeen).padEnd(12)} ${String(lastSeen).padEnd(12)}  ${describeVersion(version)}`);
    }
    console.log('');
  }

  // Microphone permission stats (since Apr 3 when events were added)
  const micFrom = '2026-04-03';
  console.log(`--- Microphone Permission (${micFrom}+) ---`);
  const micRows = await getMicPermissionStats(micFrom, windowTo);
  if (micRows.length === 0) {
    console.log('  No microphone permission events found.\n');
  } else {
    // Summarise: requested vs denied totals, then by version
    const requested = micRows.filter(r => r[0] === 'Microphone Permission Requested');
    const denied    = micRows.filter(r => r[0] === 'Microphone Permission Denied');
    const totalReq  = requested.reduce((s, r) => s + r[2], 0);
    const totalDen  = denied.reduce((s, r) => s + r[2], 0);
    const denyRate  = totalReq > 0 ? ((totalDen / totalReq) * 100).toFixed(1) : '—';
    console.log(`  Requested: ${totalReq} users   Denied: ${totalDen} users   Denial rate: ${denyRate}%\n`);
    if (micRows.length > 0) {
      console.log(`  ${'Event'.padEnd(38)} ${'Version'.padEnd(12)} ${'Users'.padStart(7)} ${'Count'.padStart(7)}`);
      for (const [event, version, users, count] of micRows) {
        console.log(`  ${event.padEnd(38)} ${(version || '—').padEnd(12)} ${String(users).padStart(7)} ${String(count).padStart(7)}`);
      }
    }
    console.log('');
  }

  // Payment / paywall events
  const paywallFrom = '2026-03-26';
  console.log(`--- Payment & Paywall Events (${paywallFrom}+) ---`);
  const paymentRows = await getPaymentEvents(paywallFrom, windowTo);
  if (paymentRows.length === 0) {
    console.log('  No payment-related events found.\n');
  } else {
    console.log(`  ${'Event'.padEnd(38)} ${'Version'.padEnd(12)} ${'Users'.padStart(7)} ${'Count'.padStart(7)}`);
    for (const [event, version, users, count] of paymentRows) {
      console.log(`  ${event.padEnd(38)} ${(version || '—').padEnd(12)} ${String(users).padStart(7)} ${String(count).padStart(7)}`);
    }
    console.log('');
  }
}

function isTokenError(err) {
  return err?.message?.includes('invalid_grant') || err?.code === 'invalid_grant';
}

main().catch((err) => {
  if (isTokenError(err)) {
    process.exit(2);
  } else {
    console.error(err);
    process.exit(1);
  }
});
