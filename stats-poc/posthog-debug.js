/**
 * Debug script - check what PostHog data exists
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
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch (e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  // 1. Check most recent events (any type) to confirm API is working
  console.log('--- Most recent events (any type) ---');
  const recent = await request('GET', `/api/projects/${PROJECT_ID}/events/?limit=5`);
  console.log('Status:', recent.status);
  if (recent.body.results) {
    for (const e of recent.body.results) {
      console.log(` - ${e.timestamp} | ${e.event} | ${JSON.stringify(e.properties).slice(0, 80)}`);
    }
  } else {
    console.log(JSON.stringify(recent.body).slice(0, 500));
  }

  // 2. Check raw funnel API response
  console.log('\n--- Raw funnel API response ---');
  const funnelBody = {
    insight: 'FUNNELS',
    date_from: '2026-03-05',
    date_to: '2026-03-12',
    events: [
      { id: 'Onboarding Started', name: 'Onboarding Started', type: 'events', order: 0 },
      { id: 'call_started', name: 'call_started', type: 'events', order: 1 },
    ],
    funnel_window_interval: 7,
    funnel_window_interval_unit: 'day',
  };
  const funnel = await request('POST', `/api/projects/${PROJECT_ID}/insights/funnel/`, funnelBody);
  console.log('Status:', funnel.status);
  console.log(JSON.stringify(funnel.body).slice(0, 1000));
}

main().catch(console.error);
