/**
 * Check video asset status in Google Ads.
 * Usage: node video-asset.js
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

async function main() {
  const rows = await customer.query(`
    SELECT
      asset.name,
      asset.youtube_video_asset.youtube_video_title,
      asset.youtube_video_asset.youtube_video_id,
      asset_group_asset.status,
      asset_group_asset.field_type,
      asset_group.name
    FROM asset_group_asset
    WHERE asset.type = 'YOUTUBE_VIDEO'
    ORDER BY asset.name
  `);

  if (rows.length === 0) {
    console.log('No video assets found.');
    return;
  }

  console.log('\n=== Video Assets ===\n');
  for (const row of rows) {
    const title = row.asset?.youtube_video_asset?.youtube_video_title
      || row.asset?.name
      || '(unknown)';
    const videoId = row.asset?.youtube_video_asset?.youtube_video_id || '—';
    const status = row.asset_group_asset?.status ?? '—';
    const fieldType = row.asset_group_asset?.field_type ?? '—';
    const groupName = row.asset_group?.name ?? '—';

    console.log(`Title:      ${title}`);
    console.log(`YouTube ID: ${videoId}`);
    console.log(`Status:     ${status}`);
    console.log(`Field type: ${fieldType}`);
    console.log(`Asset group: ${groupName}`);
    console.log('');
  }
}

main().catch(console.error);
