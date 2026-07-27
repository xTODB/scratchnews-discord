import { readFile, writeFile } from 'node:fs/promises';

const STATE_FILE = new URL('./state.json', import.meta.url);

async function readState() {
  try {
    const raw = await readFile(STATE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return { lastSeenId: null };
  }
}

async function writeState(state) {
  await writeFile(STATE_FILE, JSON.stringify(state, null, 2));
}

export async function getLastSeenId() {
  const state = await readState();
  return state.lastSeenId;
}

export async function setLastSeenId(id) {
  const state = await readState();
  state.lastSeenId = id;
  await writeState(state);
}
