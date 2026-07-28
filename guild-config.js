import { readFile, writeFile } from 'node:fs/promises';

const CONFIG_FILE = new URL('./guild-config.json', import.meta.url);

async function readConfig() {
  try {
    const raw = await readFile(CONFIG_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeConfig(config) {
  await writeFile(CONFIG_FILE, JSON.stringify(config, null, 2));
}

// Returns the restricted channel ID for a guild, or null if commands are
// allowed in any channel (the default until /init is run).
export async function getAllowedChannel(guildId) {
  const config = await readConfig();
  return config[guildId]?.allowedChannelId ?? null;
}

export async function setAllowedChannel(guildId, channelId) {
  const config = await readConfig();
  config[guildId] = { allowedChannelId: channelId };
  await writeConfig(config);
}