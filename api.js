import 'dotenv/config';
import { createDecipheriv } from 'node:crypto';

const API_BASE = process.env.API_BASE;
const API_KEY = process.env.API_KEY;

const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
  Accept: 'application/json, text/html;q=0.9, */*;q=0.8',
  Authorization: `Bearer ${API_KEY}`,
};

// InfinityFree (and several other free hosts on the same anti-bot layer)
// serve a "checking your browser" page containing an aes.js challenge to
// requests that don't carry a valid __test cookie yet. A real browser solves
// it automatically by running the embedded script. The algorithm is fixed
// and public (AES-128-CBC, no padding, key/iv/ciphertext given in the page),
// so a plain script can solve it once and reuse the resulting cookie.
let cachedCookie = null;

function isChallengePage(body) {
  return body.includes('aes.js') && body.includes('toNumbers');
}

function solveChallenge(body) {
  const hexStrings = [...body.matchAll(/toNumbers\("([0-9a-fA-F]+)"\)/g)].map((m) => m[1]);
  if (hexStrings.length < 3) {
    throw new Error('Could not parse InfinityFree challenge page (format may have changed)');
  }
  const [keyHex, ivHex, cipherHex] = hexStrings;

  const decipher = createDecipheriv('aes-128-cbc', Buffer.from(keyHex, 'hex'), Buffer.from(ivHex, 'hex'));
  decipher.setAutoPadding(false);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(cipherHex, 'hex')), decipher.final()]);

  return decrypted.toString('hex');
}

async function rawFetch(url, cookie) {
  const res = await fetch(url, {
    headers: cookie ? { ...BROWSER_HEADERS, Cookie: cookie } : BROWSER_HEADERS,
  });
  const body = await res.text();
  return { res, body };
}

async function fetchPastChallenge(url) {
  let { res, body } = await rawFetch(url, cachedCookie);

  if (isChallengePage(body)) {
    const testValue = solveChallenge(body);
    cachedCookie = `__test=${testValue}`;
    ({ res, body } = await rawFetch(url, cachedCookie));

    if (isChallengePage(body)) {
      throw new Error('Still hitting InfinityFree challenge page after solving it once, challenge format may differ from expected');
    }
  }

  return { res, body };
}

async function apiGet(path) {
  const { res, body } = await fetchPastChallenge(`${API_BASE}${path}`);

  if (!res.ok) {
    let detail = '';
    try {
      detail = JSON.parse(body).error || '';
    } catch {
      // ignore parse failure
    }
    throw new Error(`ScratchNews API ${res.status}${detail ? `: ${detail}` : ''} (${path})`);
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(
      `ScratchNews API returned non-JSON for ${path}. First 100 chars: ${body.slice(0, 100)}`,
    );
  }
}

export async function getArticles({ page = 1, perPage = 10, category, sort } = {}) {
  const params = new URLSearchParams({ page: String(page), per_page: String(perPage) });
  if (category) params.set('category', category);
  const endpoint = sort ? `/explore.php?${params}&sort=${sort}` : `/articles.php?${params}`;
  return apiGet(endpoint);
}

export async function getArticle(id) {
  return apiGet(`/articles.php?id=${id}`);
}

export async function getCategories() {
  return apiGet('/categories.php');
}

export async function getRandomArticle() {
  // No dedicated endpoint yet: pull the first page to learn the total, then fetch one random id's page.
  const first = await getArticles({ page: 1, perPage: 1 });
  const total = first.total ?? 1;
  const randomPage = Math.floor(Math.random() * total) + 1;
  const result = await getArticles({ page: randomPage, perPage: 1 });
  return result.data?.[0] ?? null;
}