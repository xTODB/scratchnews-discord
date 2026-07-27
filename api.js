import 'dotenv/config';

const API_BASE = process.env.API_BASE;

async function apiGet(path) {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) {
    let detail = '';
    try {
      const body = await res.json();
      detail = body.error || '';
    } catch {
      // ignore parse failure
    }
    throw new Error(`ScratchNews API ${res.status}${detail ? `: ${detail}` : ''} (${path})`);
  }
  return res.json();
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
