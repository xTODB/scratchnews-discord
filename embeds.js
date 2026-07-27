import { EmbedBuilder } from 'discord.js';

const SITE_BASE = 'https://scratchnews.freedev.app';
const BRAND_COLOR = 0x3b82f6;

function stripHtml(html = '') {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function truncate(text, max = 300) {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

export function articleEmbed(article) {
  const categories = (article.categories || []).map((c) => c.name).join(', ');
  const imageUrl = article.image_url ? `${SITE_BASE}${article.image_url}` : null;

  const embed = new EmbedBuilder()
    .setTitle(article.title)
    .setURL(`${SITE_BASE}/article/${article.id}`)
    .setDescription(truncate(stripHtml(article.summary || '')))
    .setColor(BRAND_COLOR)
    .setFooter({
      text: [article.author, article.created_at].filter(Boolean).join(' • '),
    });

  if (imageUrl) embed.setImage(imageUrl);
  if (categories) embed.addFields({ name: 'Categories', value: categories });

  return embed;
}

export function categoriesEmbed(categories) {
  return new EmbedBuilder()
    .setTitle('ScratchNews Categories')
    .setColor(BRAND_COLOR)
    .setDescription(categories.map((c) => `• ${c.name}`).join('\n') || 'No categories yet.');
}
