// One-time helper to obtain a Pinterest refresh token for the auto-poster.
//
// Prereqs: create an app at https://developers.pinterest.com/apps/ , add a redirect
// URI (default below) under the app's settings, then set:
//   PINTEREST_APP_ID, PINTEREST_APP_SECRET
//   PINTEREST_REDIRECT_URI   (optional; default https://datelore.com/ — must match the app)
//
// Step 1 — print the authorize URL:
//   npx tsx scripts/pinterest-auth.ts
// Open it, approve, then copy the `code` query param from the redirected URL.
//
// Step 2 — exchange the code for tokens:
//   npx tsx scripts/pinterest-auth.ts <code>
// Copy the printed refresh_token into the GitHub secret PINTEREST_REFRESH_TOKEN.
const APP_ID = process.env.PINTEREST_APP_ID;
const APP_SECRET = process.env.PINTEREST_APP_SECRET;
const REDIRECT = process.env.PINTEREST_REDIRECT_URI ?? 'https://datelore.com/';
const SCOPES = 'boards:read,boards:write,pins:read,pins:write';
const TOKEN_URL = 'https://api.pinterest.com/v5/oauth/token';

function requireApp() {
  if (!APP_ID || !APP_SECRET) throw new Error('Set PINTEREST_APP_ID and PINTEREST_APP_SECRET first.');
}

function authorizeUrl(): string {
  const u = new URL('https://www.pinterest.com/oauth/');
  u.searchParams.set('client_id', APP_ID!);
  u.searchParams.set('redirect_uri', REDIRECT);
  u.searchParams.set('response_type', 'code');
  u.searchParams.set('scope', SCOPES);
  return u.toString();
}

async function exchange(code: string): Promise<void> {
  const basic = Buffer.from(`${APP_ID}:${APP_SECRET}`).toString('base64');
  const body = new URLSearchParams({ grant_type: 'authorization_code', code, redirect_uri: REDIRECT });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok || !json.refresh_token) throw new Error(`Token exchange failed (${res.status}): ${JSON.stringify(json)}`);
  console.log('\n✅ Success. Add this as a GitHub repository secret:\n');
  console.log('  PINTEREST_REFRESH_TOKEN =', json.refresh_token);
  console.log('\n(The short-lived access_token is fetched automatically each run.)');
}

async function main() {
  requireApp();
  const code = process.argv[2];
  if (!code) {
    console.log('Step 1 — open this URL, approve, then copy the `code` param from the redirect:\n');
    console.log(authorizeUrl());
    console.log('\nStep 2 — run: npx tsx scripts/pinterest-auth.ts <code>');
    return;
  }
  await exchange(code);
}

main().catch((e) => { console.error(e); process.exit(1); });
