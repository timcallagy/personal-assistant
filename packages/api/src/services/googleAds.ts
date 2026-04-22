import { GoogleAdsApi } from 'google-ads-api';
import { prisma } from '../lib/index.js';

const DB_KEY = 'google_ads_refresh_token';

let cachedRefreshToken: string | null = null;
let customer: ReturnType<InstanceType<typeof GoogleAdsApi>['Customer']> | null = null;

export function resetGoogleAdsClient() {
  customer = null;
  cachedRefreshToken = null;
}

async function getCustomer() {
  // Read token from DB first, fall back to env var
  const dbConfig = await prisma.appConfig.findUnique({ where: { key: DB_KEY } });
  const refreshToken = dbConfig?.value ?? process.env['GOOGLE_ADS_REFRESH_TOKEN'];

  if (!refreshToken) throw new Error('No Google Ads refresh token configured');

  // Re-use cached customer if token hasn't changed
  if (customer && cachedRefreshToken === refreshToken) return customer;

  const developerToken = process.env['GOOGLE_ADS_DEVELOPER_TOKEN'];
  const clientId = process.env['GOOGLE_ADS_CLIENT_ID'];
  const clientSecret = process.env['GOOGLE_ADS_CLIENT_SECRET'];
  const customerId = process.env['GOOGLE_ADS_CUSTOMER_ID'] ?? '3307160609';

  if (!developerToken || !clientId || !clientSecret) {
    throw new Error('Missing Google Ads credentials in environment variables');
  }

  const client = new GoogleAdsApi({ client_id: clientId, client_secret: clientSecret, developer_token: developerToken });
  customer = client.Customer({ customer_id: customerId, refresh_token: refreshToken });
  cachedRefreshToken = refreshToken;
  return customer;
}

export async function saveRefreshToken(token: string): Promise<void> {
  await prisma.appConfig.upsert({
    where: { key: DB_KEY },
    create: { key: DB_KEY, value: token },
    update: { value: token },
  });
  resetGoogleAdsClient();
}

export interface GoogleAdsMetrics {
  installs: number | null;
  clicks: number | null;
  impressions: number | null;
}

export async function getAdMetrics(dateFrom: string, dateTo: string): Promise<GoogleAdsMetrics> {
  try {
    const c = await getCustomer();
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
