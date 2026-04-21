/**
 * Step 1: Run this script to get your OAuth2 refresh token.
 * It will print a URL — open it in your browser, approve access,
 * then paste the code back here.
 *
 * Usage: node auth.js
 */

const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');
const path = require('path');

const CREDENTIALS_PATH = path.join(__dirname, '../stats_api_keys/client_secret_161767820679-8479g58hgvgghniijpdmbmgmmph8ni7h.apps.googleusercontent.com.json');
const TOKEN_PATH = path.join(__dirname, '../stats_api_keys/google_ads_oauth_token.json');

const credentials = JSON.parse(fs.readFileSync(CREDENTIALS_PATH));
const { client_id, client_secret, redirect_uris } = credentials.installed;

const oauth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

const SCOPES = ['https://www.googleapis.com/auth/adwords'];

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES,
  prompt: 'consent', // force refresh token to be returned
});

console.log('\n=== Google Ads OAuth2 Setup ===\n');
console.log('1. Open this URL in your browser:\n');
console.log(authUrl);
console.log('\n2. Approve access, then paste the full redirect URL below.\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Enter the full redirect URL: ', async (input) => {
  rl.close();
  let code;
  try {
    const url = new URL(input.trim());
    code = url.searchParams.get('code') ?? input.trim();
  } catch {
    code = input.trim();
  }
  try {
    const { tokens } = await oauth2Client.getToken(code);
    fs.writeFileSync(TOKEN_PATH, JSON.stringify(tokens, null, 2));
    console.log('\n✓ Refresh token saved to:', TOKEN_PATH);
    console.log('\nRefresh token:', tokens.refresh_token);
    console.log('\nYou can now run: node fetch.js');
  } catch (err) {
    console.error('Error exchanging code:', err.message);
  }
});
