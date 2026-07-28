import { ActionRowBuilder, StringSelectMenuBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { getArticles, getCategories } from './api.js';
import { articleEmbed } from './embeds.js';

const SORT_OPTIONS = [
  { value: 'recent', label: 'Most Recent' },
  { value: 'popular', label: 'Most Popular' },
  { value: 'most_liked', label: 'Most Liked' },
  { value: 'most_disliked', label: 'Most Disliked' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'metrics', label: 'Best Overall (Metrics)' },
];

// Keyed by the reply message's ID. Lost on a restart — a component interaction
// against a session we no longer know about just tells the person to re-run
// /explore, rather than erroring confusingly.
const sessions = new Map();

function buildComponents(session) {
  const categoryOptions = [
    { label: 'All Categories', value: 'all', default: session.category === 'all' },
    ...session.categories.map((c) => ({
      label: c.name,
      value: c.slug,
      default: c.slug === session.category,
    })),
  ].slice(0, 25); // Discord select menu limit

  const categoryRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('explore_category')
      .setPlaceholder('Category')
      .addOptions(categoryOptions),
  );

  const sortRow = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId('explore_sort')
      .setPlaceholder('Sort by')
      .addOptions(SORT_OPTIONS.map((s) => ({ ...s, default: s.value === session.sort }))),
  );

  const buttonRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('explore_prev')
      .setLabel('◀ Prev')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(session.page <= 1),
    new ButtonBuilder()
      .setCustomId('explore_next')
      .setLabel('Next ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(session.total !== undefined && session.page >= session.total),
  );

  return [categoryRow, sortRow, buttonRow];
}

async function fetchResult(session) {
  const category = session.category === 'all' ? undefined : session.category;
  const result = await getArticles({ page: session.page, perPage: 1, category, sort: session.sort });
  session.total = result.total ?? 0;
  return result.data?.[0] ?? null;
}

function resultEmbed(article, session) {
  const categoryLabel =
    session.category === 'all'
      ? 'All categories'
      : session.categories.find((c) => c.slug === session.category)?.name ?? session.category;
  const sortLabel = SORT_OPTIONS.find((s) => s.value === session.sort)?.label ?? session.sort;
  const filterLine = `${categoryLabel} • ${sortLabel} • Result ${session.page} of ${session.total || 0}`;

  if (!article) {
    return new EmbedBuilder()
      .setTitle('No articles found')
      .setDescription('No articles match these filters.')
      .setColor(0x3b82f6)
      .setFooter({ text: filterLine });
  }

  const embed = articleEmbed(article);
  const baseFooter = embed.data.footer?.text ?? '';
  embed.setFooter({ text: baseFooter ? `${baseFooter} • ${filterLine}` : filterLine });
  return embed;
}

export async function handleExploreCommand(interaction) {
  await interaction.deferReply();
  const categories = await getCategories();
  const session = { categories, category: 'all', sort: 'recent', page: 1, total: undefined };
  const article = await fetchResult(session);
  const message = await interaction.editReply({
    embeds: [resultEmbed(article, session)],
    components: buildComponents(session),
  });
  sessions.set(message.id, session);
}

export function isExploreComponent(interaction) {
  return (interaction.isStringSelectMenu() || interaction.isButton()) && interaction.customId.startsWith('explore_');
}

export async function handleExploreComponent(interaction) {
  const session = sessions.get(interaction.message.id);
  if (!session) {
    return interaction.reply({
      content: 'This /explore session expired (the bot may have restarted) — run /explore again.',
      ephemeral: true,
    });
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId === 'explore_category') session.category = interaction.values[0];
    if (interaction.customId === 'explore_sort') session.sort = interaction.values[0];
    session.page = 1;
  } else if (interaction.isButton()) {
    if (interaction.customId === 'explore_prev') session.page = Math.max(1, session.page - 1);
    if (interaction.customId === 'explore_next') session.page += 1;
  }

  await interaction.deferUpdate();
  const article = await fetchResult(session);
  await interaction.editReply({
    embeds: [resultEmbed(article, session)],
    components: buildComponents(session),
  });
}