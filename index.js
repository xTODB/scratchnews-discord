import 'dotenv/config';
import { createServer } from 'node:http';
import { Client, GatewayIntentBits, Events } from 'discord.js';
import { getArticles, getArticle, getCategories, getRandomArticle } from './api.js';
import { articleEmbed, categoriesEmbed, helpEmbed } from './embeds.js';
import { getLastSeenId, setLastSeenId } from './state.js';
import { handleExploreCommand, isExploreComponent, handleExploreComponent } from './explore.js';
import { getAllowedChannel, setAllowedChannel } from './guild-config.js';
import { getArticles, getArticle, getCategories, getRandomArticle, getUser, getUserArticles, getUserGroups, getGroups, getGroup, searchArticles, searchProfiles, searchGroups } from './api.js';
import { articleEmbed, categoriesEmbed, helpEmbed, userEmbed, groupEmbed, groupListEmbed, articleListEmbed, userListEmbed } from './embeds.js';
import { startPager, isPagerComponent, handlePagerComponent } from './pager.js';

const POLL_MS = Number(process.env.POLL_MINUTES || 5) * 60 * 1000;

// Render's free web service needs an open HTTP port to stay "deployed", and
// an external pinger (UptimeRobot, cron-job.org, etc.) needs a URL to hit
// every few minutes to stop the service from sleeping and dropping the
// Discord gateway connection. This server has no other purpose.
const PORT = process.env.PORT || 3000;
createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('ScratchNews bot is alive.');
}).listen(PORT, () => console.log(`Keep-alive server listening on port ${PORT}`));

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once(Events.ClientReady, (c) => {
  console.log(`Logged in as ${c.user.tag}`);
  startPolling();
});

client.on(Events.InteractionCreate, async (interaction) => {
  try {
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName !== 'init' && interaction.guildId) {
        const allowedChannelId = await getAllowedChannel(interaction.guildId);
        if (allowedChannelId && interaction.channelId !== allowedChannelId) {
          return interaction.reply({
            content: `Commands only work in <#${allowedChannelId}>.`,
            ephemeral: true,
          });
        }
      }

      switch (interaction.commandName) {
        case 'latest': {
          const { data } = await getArticles({ page: 1, perPage: 1 });
          if (!data?.length) return interaction.reply('No articles yet.');
          return interaction.reply({ embeds: [articleEmbed(data[0])] });
        }
        case 'random': {
          const article = await getRandomArticle();
          if (!article) return interaction.reply('No articles yet.');
          return interaction.reply({ embeds: [articleEmbed(article)] });
        }
        case 'categories': {
          const categories = await getCategories();
          return interaction.reply({ embeds: [categoriesEmbed(categories)] });
        }
        case 'article': {
          const id = interaction.options.getInteger('id', true);
          try {
            const article = await getArticle(id);
            return interaction.reply({ embeds: [articleEmbed(article)] });
          } catch {
            return interaction.reply({ content: `No published article found with ID ${id}.`, ephemeral: true });
          }
        }
        case 'user': {
          const username = interaction.options.getString('username', true);
          try {
            const user = await getUser(username);
            return interaction.reply({ embeds: [userEmbed(user)] });
          } catch {
            return interaction.reply({ content: `No ScratchNews user found with username "${username}".`, ephemeral: true });
          }
        }
        case 'user-articles': {
          const username = interaction.options.getString('username', true);
          return startPager(interaction, {
            page: 1,
            perPage: 5,
            fetchPage: (page) => getUserArticles(username, { page, perPage: 5 }),
            renderPage: (data, page, total) => articleListEmbed(`${username}'s Articles`, data, page, total),
          });
        }
        case 'user-groups': {
          const username = interaction.options.getString('username', true);
          return startPager(interaction, {
            page: 1,
            perPage: 5,
            fetchPage: (page) => getUserGroups(username, { page, perPage: 5 }),
            renderPage: (data, page, total) => groupListEmbed(data, page, total, `${username}'s Groups`),
          });
        }
        case 'groups': {
          return startPager(interaction, {
            page: 1,
            perPage: 5,
            fetchPage: (page) => getGroups({ page, perPage: 5 }),
            renderPage: (data, page, total) => groupListEmbed(data, page, total),
          });
        }
        case 'group': {
          const query = interaction.options.getString('group', true);
          try {
            const group = await getGroup(query);
            return interaction.reply({ embeds: [groupEmbed(group)] });
          } catch {
            return interaction.reply({ content: `No group found for "${query}".`, ephemeral: true });
          }
        }
        case 'search': {
          const category = interaction.options.getString('category', true);
          const query = interaction.options.getString('query', true);
          const fetchers = {
            articles: (page) => searchArticles(query, { page, perPage: 5 }),
            profiles: (page) => searchProfiles(query, { page, perPage: 5 }),
            groups: (page) => searchGroups(query, { page, perPage: 5 }),
          };
          const renderers = {
            articles: (data, page, total) => articleListEmbed(`Article search: "${query}"`, data, page, total),
            profiles: (data, page, total) => userListEmbed(`Profile search: "${query}"`, data, page, total),
            groups: (data, page, total) => groupListEmbed(data, page, total, `Group search: "${query}"`),
          };
          return startPager(interaction, { page: 1, perPage: 5, fetchPage: fetchers[category], renderPage: renderers[category] });
        }
        case 'explore':
          return handleExploreCommand(interaction);
        case 'cmds':
          return interaction.reply({ embeds: [helpEmbed()] });
        case 'init': {
          if (interaction.guild.ownerId !== interaction.user.id) {
            return interaction.reply({ content: 'Only the server owner can use this command.', ephemeral: true });
          }
          const sub = interaction.options.getSubcommand();
          if (sub === 'channel') {
            const channel = interaction.options.getChannel('channel', true);
            await setAllowedChannel(interaction.guildId, channel.id);
            return interaction.reply({ content: `Commands are now restricted to <#${channel.id}>.`, ephemeral: true });
          }
          if (sub === 'all') {
            await setAllowedChannel(interaction.guildId, null);
            return interaction.reply({ content: 'Commands can now be used in any channel.', ephemeral: true });
          }
          return;
        }
      }
      return;
    }

    if (isExploreComponent(interaction)) {
      return handleExploreComponent(interaction);
    }
    if (isPagerComponent(interaction)) {
      return handlePagerComponent(interaction);
    }
  } catch (err) {
    console.error(err);
    const message = 'Something went wrong reaching ScratchNews. Try again in a bit.';
    if (interaction.deferred || interaction.replied) {
      await interaction.followUp({ content: message, ephemeral: true });
    } else {
      await interaction.reply({ content: message, ephemeral: true });
    }
  }
});

async function checkForNewArticles() {
  try {
    const { data } = await getArticles({ page: 1, perPage: 10, sort: 'recent' });
    if (!data?.length) return;

    let lastSeenId = await getLastSeenId();

    // First run ever: seed to current max, don't backfill-spam.
    if (lastSeenId === null) {
      const maxId = Math.max(...data.map((a) => a.id));
      await setLastSeenId(maxId);
      console.log(`First run: seeded lastSeenId to ${maxId}`);
      return;
    }

    const newArticles = data.filter((a) => a.id > lastSeenId).sort((a, b) => a.id - b.id);
    if (!newArticles.length) return;

    const channel = await client.channels.fetch(process.env.ANNOUNCE_CHANNEL_ID);
    for (const article of newArticles) {
      await channel.send({ embeds: [articleEmbed(article)] });
      lastSeenId = article.id;
      await setLastSeenId(lastSeenId);
    }
  } catch (err) {
    console.error('Poll failed:', err.message);
  }
}

function startPolling() {
  checkForNewArticles();
  setInterval(checkForNewArticles, POLL_MS);
}

client.login(process.env.DISCORD_TOKEN);