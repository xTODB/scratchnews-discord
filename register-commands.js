import 'dotenv/config';
import { REST, Routes, SlashCommandBuilder } from 'discord.js';

const commands = [
  new SlashCommandBuilder().setName('latest').setDescription('Show the most recent ScratchNews article'),
  new SlashCommandBuilder().setName('random').setDescription('Show a random ScratchNews article'),
  new SlashCommandBuilder().setName('categories').setDescription('List ScratchNews categories'),
  new SlashCommandBuilder()
    .setName('article')
    .setDescription('Fetch a ScratchNews article by ID')
    .addIntegerOption((opt) =>
      opt.setName('id').setDescription('Article ID').setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName('explore')
    .setDescription('Browse ScratchNews articles with category and sort filters'),
  new SlashCommandBuilder().setName('cmds').setDescription('Welcome message and list of what ScratchNews Bot can do'),
  new SlashCommandBuilder()
    .setName('init')
    .setDescription('Server owner only: set which channel commands work in')
    .addSubcommand((sub) =>
      sub
        .setName('channel')
        .setDescription('Restrict commands to one channel')
        .addChannelOption((opt) => opt.setName('channel').setDescription('The channel to restrict to').setRequired(true)),
    )
    .addSubcommand((sub) => sub.setName('all').setDescription('Allow commands in any channel')),
].map((c) => c.toJSON());

const rest = new REST().setToken(process.env.DISCORD_TOKEN);

async function main() {
  const { CLIENT_ID, GUILD_ID } = process.env;
  if (!CLIENT_ID) throw new Error('CLIENT_ID missing from .env');

  const route = GUILD_ID
    ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
    : Routes.applicationCommands(CLIENT_ID);

  await rest.put(route, { body: commands });
  console.log(
    `Registered ${commands.length} commands ${GUILD_ID ? `to guild ${GUILD_ID} (instant)` : 'globally (can take up to 1hr)'}.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});