import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';

// Generic list paginator (Prev/Next through pages of results), used by any
// command showing a page of items at a time: /groups, /user-articles,
// /user-groups, /search. Keyed by the reply message's ID, same lost-on-restart
// handling as explore.js's sessions.
const sessions = new Map();

function buttonRow(page, hasMore) {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('pager_prev').setLabel('◀ Prev').setStyle(ButtonStyle.Secondary).setDisabled(page <= 1),
    new ButtonBuilder().setCustomId('pager_next').setLabel('Next ▶').setStyle(ButtonStyle.Secondary).setDisabled(!hasMore),
  );
}

// session: { page, perPage, fetchPage(page) => {data, total}, renderPage(data, page, total) => EmbedBuilder }
export async function startPager(interaction, session) {
  await interaction.deferReply();
  const { data, total } = await session.fetchPage(session.page);
  const message = await interaction.editReply({
    embeds: [session.renderPage(data, session.page, total)],
    components: [buttonRow(session.page, session.page * session.perPage < total)],
  });
  sessions.set(message.id, session);
}

export function isPagerComponent(interaction) {
  return interaction.isButton() && (interaction.customId === 'pager_prev' || interaction.customId === 'pager_next');
}

export async function handlePagerComponent(interaction) {
  const session = sessions.get(interaction.message.id);
  if (!session) {
    return interaction.reply({
      content: 'This session expired (the bot may have restarted), run the command again.',
      ephemeral: true,
    });
  }

  if (interaction.customId === 'pager_prev') session.page = Math.max(1, session.page - 1);
  if (interaction.customId === 'pager_next') session.page += 1;

  await interaction.deferUpdate();
  const { data, total } = await session.fetchPage(session.page);
  await interaction.editReply({
    embeds: [session.renderPage(data, session.page, total)],
    components: [buttonRow(session.page, session.page * session.perPage < total)],
  });
}