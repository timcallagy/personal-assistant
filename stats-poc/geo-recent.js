/**
 * Geographic breakdown since Mar 23 (post-blocklist).
 * Usage: node geo-recent.js
 */

const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs');
const path = require('path');

const DEVELOPER_TOKEN = fs.readFileSync(path.join(__dirname, '../stats_api_keys/google_ads_token'), 'utf8').trim();
const TOKEN_PATH = path.join(__dirname, '../stats_api_keys/google_ads_oauth_token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../stats_api_keys/client_secret_161767820679-8479g58hgvgghniijpdmbmgmmph8ni7h.apps.googleusercontent.com.json');

const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));

const client = new GoogleAdsApi({
  client_id: credentials.installed.client_id,
  client_secret: credentials.installed.client_secret,
  developer_token: DEVELOPER_TOKEN,
});

const customer = client.Customer({
  customer_id: '3307160609',
  refresh_token: tokens.refresh_token,
});

const FROM_DATE = '2026-03-23';
const TODAY = new Date().toISOString().slice(0, 10);

async function main() {
  const rows = await customer.query(`
    SELECT
      geographic_view.country_criterion_id,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM geographic_view
    WHERE segments.date >= '${FROM_DATE}'
      AND segments.date <= '${TODAY}'
      AND metrics.conversions > 0
    ORDER BY metrics.conversions DESC
    LIMIT 30
  `);

  const countryIds = [...new Set(rows.map(r => r.geographic_view.country_criterion_id))];
  let countryNames = {};
  try {
    const geoRows = await customer.query(`
      SELECT geo_target_constant.id, geo_target_constant.name, geo_target_constant.country_code
      FROM geo_target_constant
      WHERE geo_target_constant.id IN (${countryIds.join(',')})
        AND geo_target_constant.target_type = 'Country'
    `);
    for (const r of geoRows) {
      countryNames[r.geo_target_constant.id] = `${r.geo_target_constant.name} (${r.geo_target_constant.country_code})`;
    }
  } catch (e) {
    // fallback to IDs
  }

  console.log(`\n=== Geographic Breakdown (${FROM_DATE} to ${TODAY}) ===\n`);
  console.log(`  ${'Country'.padEnd(35)} ${'Installs'.padStart(9)} ${'Cost'.padStart(8)} ${'CPI'.padStart(8)} ${'CTR'.padStart(7)}`);

  for (const row of rows) {
    const id = row.geographic_view.country_criterion_id;
    const country = countryNames[id] || `ID:${id}`;
    const installs = row.metrics.conversions;
    const cost = (row.metrics.cost_micros / 1_000_000).toFixed(2);
    const cpi = installs > 0 ? (row.metrics.cost_micros / 1_000_000 / installs).toFixed(3) : 'N/A';
    const ctr = row.metrics.impressions > 0
      ? ((row.metrics.clicks / row.metrics.impressions) * 100).toFixed(1) + '%'
      : '—';
    console.log(`  ${country.padEnd(35)} ${String(installs).padStart(9)} ${('€' + cost).padStart(8)} ${('€' + cpi).padStart(8)} ${ctr.padStart(7)}`);
  }
}

main().catch(console.error);
