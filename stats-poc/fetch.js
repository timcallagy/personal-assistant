/**
 * Step 2: Fetch Babblo Google Ads campaign data.
 * Run auth.js first to generate the OAuth token.
 *
 * Usage: node fetch.js
 */

const { GoogleAdsApi } = require('google-ads-api');
const fs = require('fs');
const path = require('path');

const DEVELOPER_TOKEN = fs.readFileSync(
  path.join(__dirname, '../stats_api_keys/google_ads_token'),
  'utf8'
).trim();

const TOKEN_PATH = path.join(__dirname, '../stats_api_keys/google_ads_oauth_token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../stats_api_keys/client_secret_161767820679-8479g58hgvgghniijpdmbmgmmph8ni7h.apps.googleusercontent.com.json');

const tokens = JSON.parse(fs.readFileSync(TOKEN_PATH));
const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));

const CUSTOMER_ID = '3307160609'; // 330-716-0609 without dashes

const client = new GoogleAdsApi({
  client_id: credentials.installed.client_id,
  client_secret: credentials.installed.client_secret,
  developer_token: DEVELOPER_TOKEN,
});

const customer = client.Customer({
  customer_id: CUSTOMER_ID,
  refresh_token: tokens.refresh_token,
});

const CHANGES = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'changes.json'), 'utf8')
);

function getChangesForDate(date) {
  return CHANGES.filter(c => c.date === date);
}

async function fetchCampaignStats() {
  console.log('\n=== Babblo Google Ads Stats ===\n');

  // Overall campaign performance (last 30 days)
  const campaigns = await customer.query(`
    SELECT
      campaign.name,
      campaign.status,
      metrics.impressions,
      metrics.clicks,
      metrics.ctr,
      metrics.cost_micros,
      metrics.conversions,
      metrics.cost_per_conversion,
      metrics.conversions_from_interactions_rate
    FROM campaign
    WHERE segments.date DURING LAST_30_DAYS
    ORDER BY metrics.cost_micros DESC
  `);

  console.log('--- Campaign Performance (Last 30 days) ---');
  for (const row of campaigns) {
    const cost = (row.metrics.cost_micros / 1_000_000).toFixed(2);
    const cpi = row.metrics.conversions > 0
      ? (row.metrics.cost_micros / 1_000_000 / row.metrics.conversions).toFixed(3)
      : 'N/A';
    console.log(`Campaign: ${row.campaign.name}`);
    console.log(`  Impressions: ${row.metrics.impressions.toLocaleString()}`);
    console.log(`  Clicks:      ${row.metrics.clicks.toLocaleString()}`);
    console.log(`  CTR:         ${(row.metrics.ctr * 100).toFixed(2)}%`);
    console.log(`  Cost:        €${cost}`);
    console.log(`  Installs:    ${row.metrics.conversions}`);
    console.log(`  CPI:         €${cpi}`);
    console.log(`  Conv. Rate:  ${(row.metrics.conversions_from_interactions_rate * 100).toFixed(2)}%`);
    console.log('');
  }

  // Daily breakdown (last 7 days)
  const daily = await customer.query(`
    SELECT
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions
    FROM campaign
    WHERE segments.date DURING LAST_7_DAYS
    ORDER BY segments.date DESC
  `);

  console.log('--- Daily Breakdown (Last 7 days) ---');
  for (const row of daily) {
    const cost = (row.metrics.cost_micros / 1_000_000).toFixed(2);
    const cpi = row.metrics.conversions > 0
      ? (row.metrics.cost_micros / 1_000_000 / row.metrics.conversions).toFixed(3)
      : 'N/A';
    const changes = getChangesForDate(row.segments.date);
    const changeStr = changes.map(c => `  ⚑ [${c.category}] ${c.description}`).join('\n');
    console.log(`${row.segments.date}: ${row.metrics.impressions.toLocaleString()} impr | ${row.metrics.clicks} clicks | €${cost} | ${row.metrics.conversions} installs | CPI €${cpi}`);
    if (changeStr) console.log(changeStr);
  }

  const FIELD_TYPES = {
    1: 'HEADLINE', 2: 'HEADLINE', 3: 'DESCRIPTION', 4: 'DESCRIPTION',
    5: 'IMAGE', 6: 'IMAGE', 7: 'VIDEO', 8: 'HTML5', 9: 'SITELINK',
  };

  // Asset performance
  const assets = await customer.query(`
    SELECT
      ad_group_ad_asset_view.field_type,
      asset.text_asset.text,
      asset.name,
      asset.type,
      asset.youtube_video_asset.youtube_video_id,
      asset.youtube_video_asset.youtube_video_title,
      asset.image_asset.full_size.url,
      metrics.conversions,
      metrics.cost_micros,
      metrics.conversions_from_interactions_rate,
      metrics.impressions
    FROM ad_group_ad_asset_view
    WHERE segments.date DURING LAST_30_DAYS
      AND metrics.impressions > 0
    ORDER BY metrics.conversions DESC
    LIMIT 20
  `);

  console.log('\n--- Top Assets (Last 30 days) ---');
  for (const row of assets) {
    const fieldType = FIELD_TYPES[row.ad_group_ad_asset_view.field_type] || `TYPE_${row.ad_group_ad_asset_view.field_type}`;
    const text = row.asset?.text_asset?.text
      || row.asset?.youtube_video_asset?.youtube_video_title
      || row.asset?.name
      || '(unknown)';
    const cost = (row.metrics.cost_micros / 1_000_000).toFixed(2);
    const cpi = row.metrics.conversions > 0
      ? (row.metrics.cost_micros / 1_000_000 / row.metrics.conversions).toFixed(3)
      : 'N/A';
    const convRate = (row.metrics.conversions_from_interactions_rate * 100).toFixed(1);
    console.log(`[${fieldType}] "${text}"`);
    console.log(`  Installs: ${row.metrics.conversions} | CPI: €${cpi} | Cost: €${cost} | Conv rate: ${convRate}% | Impr: ${row.metrics.impressions.toLocaleString()}`);
  }
}

async function fetchGeoStats() {
  const rows = await customer.query(`
    SELECT
      geographic_view.country_criterion_id,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.cost_per_conversion
    FROM geographic_view
    WHERE segments.date DURING LAST_30_DAYS
      AND metrics.conversions > 0
    ORDER BY metrics.conversions DESC
    LIMIT 30
  `);

  // Fetch country names via constant resource
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
    // Fallback: just use IDs
  }

  console.log('\n--- Geographic Breakdown (Last 30 days, by installs) ---');
  console.log(`  ${'Country'.padEnd(35)} ${'Installs'.padStart(9)} ${'Cost'.padStart(8)} ${'CPI'.padStart(8)} ${'CTR'.padStart(7)}`);
  for (const row of rows) {
    const id = row.geographic_view.country_criterion_id;
    const country = countryNames[id] || `ID:${id}`;
    const installs = row.metrics.conversions;
    const cost = (row.metrics.cost_micros / 1_000_000).toFixed(2);
    const cpi = installs > 0 ? (row.metrics.cost_micros / 1_000_000 / installs).toFixed(3) : 'N/A';
    const ctr = row.metrics.clicks > 0 ? ((row.metrics.clicks / row.metrics.impressions) * 100).toFixed(1) + '%' : '—';
    console.log(`  ${country.padEnd(35)} ${String(installs).padStart(9)} ${('€'+cost).padStart(8)} ${('€'+cpi).padStart(8)} ${ctr.padStart(7)}`);
  }
}

async function main() {
  await fetchCampaignStats();
  await fetchGeoStats();
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
