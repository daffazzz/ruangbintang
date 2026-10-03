require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const UNIVERSE_ID = process.env.UNIVERSE_ID || '10552714340';
const PLACE_ID = process.env.PLACE_ID || '86691557621244';
const UNIVERSE_ID_2 = process.env.UNIVERSE_ID_2 || '';
const PLACE_ID_2 = process.env.PLACE_ID_2 || '';
const ROBLOX_API_KEY = process.env.ROBLOX_API_KEY;

// Experience configurations map
function getExperiencesConfig() {
  const experiences = [
    {
      id: UNIVERSE_ID,
      name: process.env.EXPERIENCE_1_NAME || 'Experience 1 (Main Map)',
      universeId: UNIVERSE_ID,
      placeId: PLACE_ID
    }
  ];

  if (UNIVERSE_ID_2) {
    experiences.push({
      id: UNIVERSE_ID_2,
      name: process.env.EXPERIENCE_2_NAME || 'Experience 2 (Secondary Map)',
      universeId: UNIVERSE_ID_2,
      placeId: PLACE_ID_2
    });
  }

  return experiences;
}

const DB_FILE = path.join(__dirname, '..', 'data', 'gamestate.json');
const INVITATIONS_DB_FILE = path.join(__dirname, '..', 'data', 'invitations_database.json');
const DATASTORE_INVITATIONS = process.env.DATASTORE_INVITATIONS || 'GlobalInvitations_v1';
const DATASTORE_INVITATIONS_KEY = process.env.DATASTORE_INVITATIONS_KEY || 'ActiveInvitations';

// Base known admins fallback from Studio script config
const BASE_OWNERS = [
  { userId: 11240309458, username: 'Samant26114', displayName: 'ARIP', rankName: 'Owner', rankLevel: 4 }
];

const KNOWN_ADMINS = [
  { userId: 9189225812, username: 'Princescupcakes5', displayName: 'Lexi', rankName: 'HeadAdmin', rankLevel: 2 },
  { userId: 5651348160, username: 'ryostarboy14', displayName: 'STR_MevinWSTAR', rankName: 'Admin', rankLevel: 1 },
  { userId: 9038995543, username: 'alexxaa1301', displayName: 'XSS_LEADxaL33LOTIM', rankName: 'Admin', rankLevel: 1 },
  { userId: 9160005948, username: 'beyvahazel', displayName: '3PLxayraa', rankName: 'Admin', rankLevel: 1 },
  { userId: 9173526989, username: 'Halloinaa', displayName: 'Karinaa', rankName: 'Admin', rankLevel: 1 },
  { userId: 9230272311, username: 'nilaa578', displayName: 'chells', rankName: 'Admin', rankLevel: 1 },
  { userId: 9313869504, username: 'sagitarius3434', displayName: 'novnov0_o', rankName: 'Admin', rankLevel: 1 },
  { userId: 9902873651, username: 'marsss_0001', displayName: 'SeLa', rankName: 'Admin', rankLevel: 1 }
];

// Persistent state
let gameState = {
  donations: null,
  saweria: null,
  admins: null,
  levels: {},
  roles: {},
  lastUpdate: 0
};

// Load saved state from disk on startup
try {
  if (fs.existsSync(DB_FILE)) {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    gameState = { ...gameState, ...JSON.parse(raw) };
    console.log('[DataStore] Loaded persistent game state from disk successfully.');
  }
} catch (e) {
  console.error('[DataStore] Error loading persistent game state:', e.message);
}

function saveStateToDisk() {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(gameState, null, 2), 'utf8');
  } catch (e) {
    console.error('[DataStore] Error saving game state to disk:', e.message);
  }
}

/**
 * Generic HTTPS Request Promise Helper
 */
function makeHttpsRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const parsed = data ? JSON.parse(data) : {};
          resolve({ statusCode: res.statusCode, headers: res.headers, data: parsed, raw: data });
        } catch (e) {
          resolve({ statusCode: res.statusCode, headers: res.headers, data: null, raw: data });
        }
      });
    });

    req.on('error', (err) => reject(err));
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

/**
 * Convert Username to Roblox User ID via Roblox Users API
 */
async function getUserIdByUsername(username) {
  const cleanUsername = username.trim();
  const options = {
    hostname: 'users.roblox.com',
    path: '/v1/usernames/users',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  };

  const body = {
    usernames: [cleanUsername],
    excludeBannedUsers: false
  };

  try {
    const res = await makeHttpsRequest(options, body);
    if (res.statusCode === 200 && res.data && res.data.data && res.data.data.length > 0) {
      return res.data.data[0]; // { id, name, displayName }
    }
    return null;
  } catch (err) {
    console.error('Error fetching user by username:', err.message);
    return null;
  }
}

/**
 * Get User details by User ID
 */
async function getUserDetailsById(userId) {
  const options = {
    hostname: 'users.roblox.com',
    path: `/v1/users/${userId}`,
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  };

  try {
    const res = await makeHttpsRequest(options);
    if (res.statusCode === 200 && res.data) {
      return res.data; // { id, name, displayName, description, created }
    }
    return null;
  } catch (err) {
    console.error(`Error fetching user details for ${userId}:`, err.message);
    return null;
  }
}

/**
 * Get User Avatar Headshot URL from Roblox Thumbnails API
 */
async function getUserAvatarHeadshot(userId, size = '150x150') {
  const options = {
    hostname: 'thumbnails.roblox.com',
    path: `/v1/users/avatar-headshot?userIds=${userId}&size=${size}&format=Png&isCircular=false`,
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  };

  try {
    const res = await makeHttpsRequest(options);
    if (res.statusCode === 200 && res.data && res.data.data && res.data.data.length > 0) {
      return res.data.data[0].imageUrl;
    }
    return `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150&format=png`;
  } catch (err) {
    return `https://www.roblox.com/headshot-thumbnail/image?userId=${userId}&width=150&height=150&format=png`;
  }
}

/**
 * Batch get User Avatar Headshots
 */
async function getBatchUserAvatarHeadshots(userIds, size = '150x150') {
  if (!userIds || userIds.length === 0) return {};
  const uniqueIds = Array.from(new Set(userIds)).slice(0, 100);
  const options = {
    hostname: 'thumbnails.roblox.com',
    path: `/v1/users/avatar-headshot?userIds=${uniqueIds.join(',')}&size=${size}&format=Png&isCircular=false`,
    method: 'GET',
    headers: { 'Accept': 'application/json' }
  };

  const map = {};
  try {
    const res = await makeHttpsRequest(options);
    if (res.statusCode === 200 && res.data && res.data.data) {
      res.data.data.forEach(item => {
        map[item.targetId] = item.imageUrl;
      });
    }
  } catch (err) {
    console.error('Error fetching batch thumbnails:', err.message);
  }
  return map;
}

/**
 * Fetch DataStore Entry from Roblox Open Cloud API
 */
async function getOpenCloudDataStoreEntry(datastoreName, entryKey, scope = 'global', universeId = null) {
  if (!ROBLOX_API_KEY) {
    return { success: false, error: 'ROBLOX_API_KEY is not configured in .env' };
  }

  const targetUniverse = universeId || UNIVERSE_ID;
  const encodedStore = encodeURIComponent(datastoreName);
  const encodedKey = encodeURIComponent(entryKey);
  const path = `/datastores/v1/universes/${targetUniverse}/standard-datastores/datastore/entries/entry?datastoreName=${encodedStore}&entryKey=${encodedKey}&scope=${scope}`;

  const options = {
    hostname: 'apis.roblox.com',
    path: path,
    method: 'GET',
    headers: {
      'x-api-key': ROBLOX_API_KEY,
      'Accept': 'application/json'
    }
  };

  try {
    const res = await makeHttpsRequest(options);
    if (res.statusCode === 200) {
      return { success: true, data: res.data };
    } else if (res.statusCode === 404) {
      return { success: false, notFound: true, message: 'Data not found' };
    } else {
      return { success: false, statusCode: res.statusCode, error: res.data || res.raw };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Set / Write DataStore Entry to Roblox Open Cloud API
 */
async function setOpenCloudDataStoreEntry(datastoreName, entryKey, entryData, scope = 'global', universeId = null) {
  if (!ROBLOX_API_KEY) {
    return { success: false, error: 'ROBLOX_API_KEY is not configured in .env' };
  }

  const targetUniverse = universeId || UNIVERSE_ID;
  const encodedStore = encodeURIComponent(datastoreName);
  const encodedKey = encodeURIComponent(entryKey);
  const path = `/datastores/v1/universes/${targetUniverse}/standard-datastores/datastore/entries/entry?datastoreName=${encodedStore}&entryKey=${encodedKey}&scope=${scope}`;

  const postData = typeof entryData === 'string' ? entryData : JSON.stringify(entryData);

  const options = {
    hostname: 'apis.roblox.com',
    path: path,
    method: 'POST',
    headers: {
      'x-api-key': ROBLOX_API_KEY,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  try {
    const res = await makeHttpsRequest(options, postData);
    if (res.statusCode === 200 || res.statusCode === 201) {
      return { success: true, data: res.data };
    } else {
      return { success: false, statusCode: res.statusCode, error: res.data || res.raw };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Set Ordered DataStore Entry to Roblox Open Cloud API
 */
async function setOpenCloudOrderedDataStoreEntry(datastoreName, entryKey, entryValue, scope = 'global', universeId = null) {
  if (!ROBLOX_API_KEY) {
    return { success: false, error: 'ROBLOX_API_KEY is not configured in .env' };
  }

  const targetUniverse = universeId || UNIVERSE_ID;
  const encodedStore = encodeURIComponent(datastoreName);
  const encodedKey = encodeURIComponent(entryKey);
  const path = `/ordered-data-stores/v1/universes/${targetUniverse}/ordered-data-stores/${encodedStore}/scopes/${scope}/entries/${encodedKey}`;

  const postData = JSON.stringify({ value: Number(entryValue) || 0 });

  const options = {
    hostname: 'apis.roblox.com',
    path: path,
    method: 'PATCH',
    headers: {
      'x-api-key': ROBLOX_API_KEY,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  try {
    const res = await makeHttpsRequest(options, postData);
    if (res.statusCode === 200 || res.statusCode === 201) {
      return { success: true, data: res.data };
    } else {
      return { success: false, statusCode: res.statusCode, error: res.data || res.raw };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Publish message to Roblox MessagingService via Open Cloud API (Instan 0 detik)
 */
async function publishOpenCloudMessage(topic, messageData, universeId = null) {
  if (!ROBLOX_API_KEY) {
    return { success: false, error: 'ROBLOX_API_KEY is not configured in .env' };
  }

  const targetUniverse = universeId || UNIVERSE_ID;
  const encodedTopic = encodeURIComponent(topic);
  const path = `/messaging-service/v1/universes/${targetUniverse}/topics/${encodedTopic}`;

  const payload = {
    message: typeof messageData === 'string' ? messageData : JSON.stringify(messageData)
  };
  const postData = JSON.stringify(payload);

  const options = {
    hostname: 'apis.roblox.com',
    path: path,
    method: 'POST',
    headers: {
      'x-api-key': ROBLOX_API_KEY,
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  try {
    const res = await makeHttpsRequest(options, postData);
    if (res.statusCode === 200 || res.statusCode === 201) {
      return { success: true, data: res.data };
    } else {
      return { success: false, statusCode: res.statusCode, error: res.data || res.raw };
    }
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Sync / Ingest In-Memory Datastore from Game Server & Persist to disk
 */
function setGameCache(type, data) {
  if (type === 'donations') {
    gameState.donations = data;
  } else if (type === 'saweria') {
    gameState.saweria = data;
  } else if (type === 'admins') {
    gameState.admins = data;
  } else if (type === 'levels') {
    gameState.levels = { ...gameState.levels, ...data };
  } else if (type === 'roles') {
    gameState.roles = { ...gameState.roles, ...data };
  }
  gameState.lastUpdate = Date.now();
  saveStateToDisk();
}

function getGameCache() {
  return gameState;
}

function readInvitationsFromDisk() {
  try {
    if (fs.existsSync(INVITATIONS_DB_FILE)) {
      const raw = fs.readFileSync(INVITATIONS_DB_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    }
  } catch (e) {
    console.error('[Invitations] Error reading local invitations db:', e.message);
  }
  return [];
}

function saveInvitationsToDisk(invitations) {
  try {
    fs.writeFileSync(INVITATIONS_DB_FILE, JSON.stringify(invitations, null, 2), 'utf8');
  } catch (e) {
    console.error('[Invitations] Error saving local invitations db:', e.message);
  }
}

function isInvitationExpired(item, now = Date.now()) {
  try {
    const eventTimestamp = new Date(item.eventTime).getTime();
    if (isNaN(eventTimestamp)) return false;
    const durationMs = (Number(item.durationHours) || 3) * 3600 * 1000;
    return (eventTimestamp + durationMs) < now;
  } catch (e) {
    return false;
  }
}

function filterActiveInvitations(invitations, now = Date.now()) {
  if (!Array.isArray(invitations)) return [];
  return invitations.filter(inv => !isInvitationExpired(inv, now));
}

async function getInvitations(universeId = null, filterExpired = true) {
  let invitations = [];
  let source = 'local';
  
  const dsRes = await getOpenCloudDataStoreEntry(DATASTORE_INVITATIONS, DATASTORE_INVITATIONS_KEY, 'global', universeId);
  if (dsRes.success && Array.isArray(dsRes.data)) {
    invitations = dsRes.data;
    source = 'datastore';
    saveInvitationsToDisk(invitations);
  } else {
    invitations = readInvitationsFromDisk();
    source = 'local_file';
  }

  const now = Date.now();
  if (filterExpired) {
    invitations = filterActiveInvitations(invitations, now);
  }

  invitations.sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());

  return {
    success: true,
    source,
    data: invitations
  };
}

async function saveInvitations(invitations, universeId = null) {
  saveInvitationsToDisk(invitations);
  const dsRes = await setOpenCloudDataStoreEntry(DATASTORE_INVITATIONS, DATASTORE_INVITATIONS_KEY, invitations, 'global', universeId);
  return dsRes;
}

module.exports = {
  UNIVERSE_ID,
  PLACE_ID,
  UNIVERSE_ID_2,
  PLACE_ID_2,
  getExperiencesConfig,
  BASE_OWNERS,
  KNOWN_ADMINS,
  getUserIdByUsername,
  getUserDetailsById,
  getUserAvatarHeadshot,
  getBatchUserAvatarHeadshots,
  getOpenCloudDataStoreEntry,
  setOpenCloudDataStoreEntry,
  setOpenCloudOrderedDataStoreEntry,
  publishOpenCloudMessage,
  setGameCache,
  getGameCache,
  DATASTORE_INVITATIONS,
  DATASTORE_INVITATIONS_KEY,
  getInvitations,
  saveInvitations,
  isInvitationExpired,
  filterActiveInvitations,
  readInvitationsFromDisk,
  saveInvitationsToDisk
};
