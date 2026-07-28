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

export function helpEmbed() {
  return new EmbedBuilder()
    .setTitle('👋 Welcome to ScratchNews Bot!')
    .setColor(BRAND_COLOR)
    .setDescription(
      `I bring articles from [ScratchNews](${SITE_BASE}), a community news site for the Scratch platform, right into Discord.`,
    )
    .addFields(
      { name: '/latest', value: 'Show the most recent article' },
      { name: '/random', value: 'Show a random article' },
      { name: '/article <id>', value: 'Fetch a specific article by its ID' },
      { name: '/categories', value: 'List all ScratchNews categories' },
      { name: '/explore', value: 'Browse articles interactively: pick a category and sort order with dropdowns, page through results' },
      { name: '/cmds', value: 'Show this message again' },
      { name: '/init channel <#channel> or /init all', value: 'Server owner only: restrict which channel commands can be used in (defaults to any channel)' },
    )
    .setFooter({ text: 'New articles are also auto-posted here as they get published.' });
}