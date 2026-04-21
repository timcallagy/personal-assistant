import { GoogleAdsApi } from 'google-ads-api';

let customer: ReturnType<InstanceType<typeof GoogleAdsApi>['Customer']> | null = null;

function getCustomer() {
  if (customer) return customer;

  const developerToken = process.env['GOOGLE_ADS_DEVELOPER_TOKEN'];
  const clientId = process.env['GOOGLE_ADS_CLIENT_ID'];
  const clientSecret = process.env['GOOGLE_ADS_CLIENT_SECRET'];
  const refreshToken = process.env['GOOGLE_ADS_REFRESH_TOKEN'];
  const customerId = process.env['GOOGLE_ADS_CUSTOMER_ID'] ?? '3307160609';

  if (!developerToken || !clientId || !clientSecret || !refreshToken) {
    throw new Error('Missing Google Ads credentials in environment variables');
  }

  const client = new GoogleAdsApi({ client_id: clientId, client_secret: clientSecret, developer_token: developerToken });
  customer = client.Customer({ customer_id: customerId, refresh_token: refreshToken });
  return customer;
}

export interface GoogleAdsMetrics {
  installs: number | null;
  clicks: number | null;
  impressions: number | null;
}

export async function getAdMetrics(dateFrom: string, dateTo: string): Promise<GoogleAdsMetrics> {
  try {
    const c = getCustomer();
    const rows = await c.query(`
      SELECT segments.date, metrics.conversions, metrics.clicks, metrics.impressions
      FROM campaign
      WHERE segments.date BETWEEN '${dateFrom}' AND '${dateTo}'
      ORDER BY segments.date DESC
    `);
    let installs = 0, clicks = 0, impressions = 0;
    for (const row of rows) {
      installs    += Math.round((row.metrics?.conversions as number) ?? 0);
      clicks      += Math.round((row.metrics?.clicks as number) ?? 0);
      impressions += Math.round((row.metrics?.impressions as number) ?? 0);
    }
    return { installs, clicks, impressions };
  } catch (err) {
    console.error('[GoogleAds] getAdMetrics error:', err);
    return { installs: null, clicks: null, impressions: null };
  }
}
