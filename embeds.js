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
      { name: '/user <username>', value: 'View a ScratchNews user profile' },
      { name: '/user-articles <username>', value: "Browse a user's articles" },
      { name: '/user-groups <username>', value: "Browse a user's groups" },
      { name: '/groups', value: 'List all active ScratchNews groups' },
      { name: '/group <id or slug>', value: 'View a ScratchNews group' },
      { name: '/search <category> <query>', value: 'Search articles, profiles, or groups' },
    )
    .setFooter({ text: 'New articles are also auto-posted here as they get published.' });
}

export function userEmbed(user) {
  const bioFirstLine = (user.bio || '').split('\n')[0].trim();
  const badges = [
    user.verified ? '✅ Verified' : null,
    user.is_moderator ? '🛡️ Moderator' : null,
    user.is_fan ? '⭐ Fan' : null,
  ]
    .filter(Boolean)
    .join(' • ');

  const embed = new EmbedBuilder()
    .setTitle(user.username)
    .setURL(`${SITE_BASE}/profile/${user.username}`)
    .setColor(BRAND_COLOR)
    .setDescription(bioFirstLine ? truncate(bioFirstLine, 200) : 'No bio yet.')
    .addFields(
      { name: 'Joined', value: user.created_at || 'Unknown', inline: true },
      { name: 'Articles', value: String(user.article_count ?? 0), inline: true },
      { name: 'Comments', value: String(user.comment_count ?? 0), inline: true },
    );

  if (badges) embed.addFields({ name: 'Badges', value: badges });
  if (user.avatar_url) embed.setThumbnail(`${SITE_BASE}${user.avatar_url}`);
  if (user.banner_url) embed.setImage(`${SITE_BASE}${user.banner_url}`);

  return embed;
}

export function groupEmbed(group) {
  const embed = new EmbedBuilder()
    .setTitle(group.name)
    .setURL(`${SITE_BASE}/group/${group.slug}`)
    .setColor(BRAND_COLOR)
    .setDescription(truncate(stripHtml(group.description || ''), 300) || 'No description yet.')
    .addFields(
      { name: 'Host', value: group.host?.username ?? 'Unknown', inline: true },
      { name: 'Members', value: String(group.member_count ?? 0), inline: true },
    );

  if (group.banner_url) embed.setImage(`${SITE_BASE}${group.banner_url}`);

  return embed;
}

export function groupListEmbed(groups, page, total, title = 'ScratchNews Groups') {
  const lines = groups.length
    ? groups.map(
        (g) =>
          `**[${g.name}](${SITE_BASE}/group/${g.slug})**, ${g.member_count} member${g.member_count === 1 ? '' : 's'}, hosted by ${g.host?.username ?? 'unknown'}`,
      )
    : ['No groups found.'];

  return new EmbedBuilder()
    .setTitle(title)
    .setColor(BRAND_COLOR)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `Page ${page} • ${total} group${total === 1 ? '' : 's'} total` });
}

export function articleListEmbed(title, articles, page, total) {
  const lines = articles.length
    ? articles.map((a) => `**[${a.title}](${SITE_BASE}/article/${a.id})**${a.author ? ` by ${a.author}` : ''}`)
    : ['No articles found.'];

  return new EmbedBuilder()
    .setTitle(title)
    .setColor(BRAND_COLOR)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `Page ${page} • ${total} article${total === 1 ? '' : 's'} total` });
}

export function userListEmbed(title, users, page, total) {
  const lines = users.length
    ? users.map(
        (u) =>
          `**[${u.username}](${SITE_BASE}/profile/${u.username})**${u.is_moderator ? ' 🛡️' : ''}${u.is_fan ? ' ⭐' : ''}`,
      )
    : ['No profiles found.'];

  return new EmbedBuilder()
    .setTitle(title)
    .setColor(BRAND_COLOR)
    .setDescription(lines.join('\n'))
    .setFooter({ text: `Page ${page} • ${total} profile${total === 1 ? '' : 's'} total` });
}