import https from 'https';

const API_KEY = process.env['POSTHOG_API_KEY'] ?? '';
const PROJECT_ID = process.env['POSTHOG_PROJECT_ID'] ?? '100831';
const BASE_URL = process.env['POSTHOG_BASE_URL'] ?? 'eu.posthog.com';

export const EXCLUDE_FILTER = `AND person.properties.$email NOT IN ('timcallagy@gmail.com', 'androidTest1@test.com')`;

function hogqlRequest(query: string): Promise<unknown[][]> {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ query: { kind: 'HogQLQuery', query } });
    const options = {
      hostname: BASE_URL,
      path: `/api/projects/${PROJECT_ID}/query/`,
      method: 'POST',
      headers: {
        Authorization: `Bearer ${API_KEY}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
    };
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data) as { results?: unknown[][]; error?: string };
          if (parsed.error) return reject(new Error(parsed.error));
          resolve(parsed.results ?? []);
        } catch (e) {
          reject(new Error(`PostHog parse error: ${data.slice(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

export async function hogql(query: string): Promise<unknown[][]> {
  return hogqlRequest(query);
}

export async function getFunnelCounts(
  dateFrom: string,
  dateTo: string,
  events: string[],
  versionFilter?: string[],
  geoFilter?: string[]
): Promise<Record<string, number>> {
  if (events.length === 0) return {};

  const eventList = events.map((e) => `'${e.replace(/'/g, "''")}'`).join(', ');
  const versionClause =
    versionFilter && versionFilter.length > 0
      ? `AND JSONExtractString(properties, 'app_version') IN (${versionFilter.map((v) => `'${v.replace(/'/g, "''")}'`).join(', ')})`
      : '';
  const geoClause =
    geoFilter && geoFilter.length > 0
      ? `AND JSONExtractString(properties, '$geoip_country_name') IN (${geoFilter.map((g) => `'${g.replace(/'/g, "''")}'`).join(', ')})`
      : '';

  const rows = await hogqlRequest(`
    SELECT event, count(distinct person_id) as users
    FROM events
    WHERE event IN (${eventList})
      AND timestamp >= '${dateFrom}'
      AND timestamp < '${dateTo}'
      ${versionClause}
      ${geoClause}
      ${EXCLUDE_FILTER}
    GROUP BY event
  `);

  const counts: Record<string, number> = {};
  for (const event of events) counts[event] = 0;
  for (const row of rows) {
    const event = row[0] as string;
    const count = row[1] as number;
    counts[event] = count;
  }
  return counts;
}

export async function getDistinctEvents(lookbackDays = 90): Promise<string[]> {
  const rows = await hogqlRequest(`
    SELECT DISTINCT event, count() AS total
    FROM events
    WHERE timestamp >= now() - INTERVAL ${lookbackDays} DAY
      AND event NOT LIKE '$%'
    GROUP BY event
    ORDER BY total DESC
    LIMIT 200
  `);
  return rows.map((r) => r[0] as string).filter(Boolean);
}

export async function getDistinctVersions(lookbackDays = 90): Promise<string[]> {
  const rows = await hogqlRequest(`
    SELECT DISTINCT JSONExtractString(properties, 'app_version') AS version
    FROM events
    WHERE timestamp >= now() - INTERVAL ${lookbackDays} DAY
      AND JSONExtractString(properties, 'app_version') != ''
    ORDER BY version DESC
    LIMIT 50
  `);
  return rows.map((r) => r[0] as string).filter(Boolean);
}

export async function getDistinctCountries(lookbackDays = 90): Promise<string[]> {
  const rows = await hogqlRequest(`
    SELECT DISTINCT JSONExtractString(properties, '$geoip_country_name') AS country
    FROM events
    WHERE timestamp >= now() - INTERVAL ${lookbackDays} DAY
      AND JSONExtractString(properties, '$geoip_country_name') != ''
    ORDER BY country ASC
    LIMIT 200
  `);
  return rows.map((r) => r[0] as string).filter(Boolean);
}
