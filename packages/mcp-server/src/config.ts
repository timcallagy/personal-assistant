export const config = {
  apiUrl: process.env['PA_API_URL'] || 'http://localhost:3001/api/v1',
  apiKey: process.env['PA_API_KEY'] || '',
  source: 'Claude Code' as const,
};
