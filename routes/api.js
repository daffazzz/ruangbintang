const express = require('express');
const router = express.Router();
const robloxService = require('../services/robloxService');

// Static Initial Dataset Snapshot from Game DataStores
const INITIAL_DONATION_DATA = {
  "11240309458": { "DisplayName": "ARIP", "Donated - Experience": 2000, "Name": "Samant26114", "UserId": 11240309458 },
  "10241034051": { "DisplayName": "3PLxasdm", "Donated - Experience": 1600, "Name": "axllytee", "UserId": 10241034051 },
  "9189225812": { "DisplayName": "Lexi", "Donated - Experience": 1030, "Name": "Princescupcakes5", "UserId": 9189225812 },
  "9034203976": { "DisplayName": "Dhamdam", "Donated - Experience": 550, "Name": "Ramdhamdam", "UserId": 9034203976 },
  "9093720545": { "DisplayName": "TezzaSLTR", "Donated - Experience": 200, "Name": "Tikiemmm", "UserId": 9093720545 },
  "10742669655": { "DisplayName": "HExBelin", "Donated - Experience": 140, "Name": "Belin2107", "UserId": 10742669655 },
  "9902873651": { "DisplayName": "SeLa", "Donated - Experience": 110, "Name": "marsss_0001", "UserId": 9902873651 },
  "10936373838": { "DisplayName": "Mikan", "Donated - Experience": 100, "Name": "Mikan2222244", "UserId": 10936373838 },
  "8996614541": { "DisplayName": "milla", "Donated - Experience": 100, "Name": "estrel1a18", "UserId": 8996614541 },
  "9597363595": { "DisplayName": "SecretLiloMLY", "Donated - Experience": 100, "Name": "realnox030", "UserId": 9597363595 },
  "9805561447": { "DisplayName": "AURAWWRRR_UCVRxWSTAR", "Donated - Experience": 100, "Name": "Aura_moonlight01", "UserId": 9805561447 },
  "9037723138": { "DisplayName": "LenaMERC", "Donated - Experience": 100, "Name": "pecintacaberawit", "UserId": 9037723138 },
  "8332412384": { "DisplayName": "hnzo", "Donated - Experience": 100, "Name": "hnzoxr", "UserId": 8332412384 },
  "8946425291": { "DisplayName": "Bila_CeNgLu", "Donated - Experience": 80, "Name": "salsabilaputry_7", "UserId": 8946425291 },
  "9169111832": { "DisplayName": "3PLX_MICHEL", "Donated - Experience": 70, "Name": "heheheheheh3713", "UserId": 9169111832 },
  "9136228177": { "DisplayName": "MUPLIY", "Donated - Experience": 70, "Name": "Nessssssssyyyyyaaaa", "UserId": 9136228177 },
  "9478889633": { "DisplayName": "thanelxPOKE", "Donated - Experience": 70, "Name": "bac0tbetul", "UserId": 9478889633 },
  "10326860751": { "DisplayName": "FlowzsCeNgLu", "Donated - Experience": 50, "Name": "Flowofthesky3", "UserId": 10326860751 },
  "10562536116": { "DisplayName": "Mirai", "Donated - Experience": 50, "Name": "Pickley_58", "UserId": 10562536116 },
  "9118124156": { "DisplayName": "Suwa", "Donated - Experience": 50, "Name": "Mamamuda10722", "UserId": 9118124156 },
  "5160332676": { "DisplayName": "SaiyuriJamet", "Donated - Experience": 40, "Name": "Saiyurkobis", "UserId": 5160332676 },
  "9173526989": { "DisplayName": "Karinaa", "Donated - Experience": 40, "Name": "Halloinaa", "UserId": 9173526989 },
  "9314473648": { "DisplayName": "Kaizeemutt", "Donated - Experience": 40, "Name": "JinxZee4", "UserId": 9314473648 },
  "1229080158": { "DisplayName": "fusuyy", "Donated - Experience": 30, "Name": "akmaly26", "UserId": 1229080158 },
  "5306246025": { "DisplayName": "UCVRxTGZxWSTAR_Panda", "Donated - Experience": 30, "Name": "Arcadicaz", "UserId": 5306246025 },
  "9090630675": { "DisplayName": "Jebee", "Donated - Experience": 30, "Name": "Qoala687", "UserId": 9090630675 },
  "9459972013": { "DisplayName": "Dawndelion", "Donated - Experience": 30, "Name": "bubbleya124", "UserId": 9459972013 },
  "10460001460": { "DisplayName": "MCxBoyy_salvatore", "Donated - Experience": 20, "Name": "bala_mbalawe", "UserId": 10460001460 },
  "7935814666": { "DisplayName": "WSTAR_Rann", "Donated - Experience": 20, "Name": "Ranti1712", "UserId": 7935814666 },
  "8832978954": { "DisplayName": "pawraasyaladu", "Donated - Experience": 20, "Name": "canniaaa_1", "UserId": 8832978954 },
  "10027152774": { "DisplayName": "ArthurCallhan", "Donated - Experience": 10, "Name": "Obokobokan1", "UserId": 10027152774 },
  "11216389334": { "DisplayName": "J1GxPutri_uttiBSF", "Donated - Experience": 10, "Name": "Utti34501", "UserId": 11216389334 },
  "7880830497": { "DisplayName": "FD_TaniaaMERC", "Donated - Experience": 10, "Name": "TANIAAA1907", "UserId": 7880830497 },
  "8782507743": { "DisplayName": "nichaaa", "Donated - Experience": 10, "Name": "nichaa665", "UserId": 8782507743 },
  "8783835998": { "DisplayName": "TPKxKiaa", "Donated - Experience": 10, "Name": "KIIIIIAAA0", "UserId": 8783835998 },
  "9150281703": { "DisplayName": "HExMarxisme", "Donated - Experience": 10, "Name": "NyeriSendi16", "UserId": 9150281703 },
  "9160005948": { "DisplayName": "3PLxayraa", "Donated - Experience": 10, "Name": "beyvahazel", "UserId": 9160005948 },
  "9416331236": { "DisplayName": "Linz_jack", "Donated - Experience": 10, "Name": "LinzAja0", "UserId": 9416331236 },
  "9959256961": { "DisplayName": "HExinivanilla", "Donated - Experience": 10, "Name": "cuwis07", "UserId": 9959256961 }
};

const INITIAL_SAWERIA_DATA = {
  "11240309458": { "Coins": 1475354, "DisplayName": "ARIP", "Name": "Samant26114", "UserId": 11240309458 }
};

const INITIAL_ADMINS_MAP = {
  "11240309458": { "Name": "ARIP", "Username": "Samant26114", "Rank": 4, "Role": "Owner" },
  "9189225812": { "Name": "Lexi", "Username": "Princescupcakes5", "Rank": 2, "Role": "HeadAdmin" },
  "5651348160": { "Name": "STR_MevinWSTAR", "Username": "ryostarboy14", "Rank": 1, "Role": "Admin" },
  "9038995543": { "Name": "XSS_LEADxaL33LOTIM", "Username": "alexxaa1301", "Rank": 1, "Role": "Admin" },
  "9160005948": { "Name": "3PLxayraa", "Username": "beyvahazel", "Rank": 1, "Role": "Admin" },
  "9173526989": { "Name": "Karinaa", "Username": "Halloinaa", "Rank": 1, "Role": "Admin" },
  "9230272311": { "Name": "chells", "Username": "nilaa578", "Rank": 1, "Role": "Admin" },
  "9313869504": { "Name": "novnov0_o", "Username": "sagitarius3434", "Rank": 1, "Role": "Admin" },
  "9902873651": { "Name": "SeLa", "Username": "marsss_0001", "Rank": 1, "Role": "Admin" }
};

// Known Roles Map from Game Role System
const KNOWN_ROLES_MAP = {
  "11240309458": "Owner",
  "9189225812": "HeadAdmin",
  "5651348160": "Admin",
  "9038995543": "Admin",
  "9160005948": "Admin",
  "9173526989": "Admin",
  "9230272311": "Admin",
  "9313869504": "Admin",
  "9902873651": "Admin",
  "10241034051": "VVIP",
  "9034203976": "VVIP",
  "9093720545": "VVIP",
  "10742669655": "VVIP",
  "10027152774": "VVIP",
  "10460001460": "VVIP",
  "1229080158": "VVIP",
  "8332412384": "VVIP",
  "8832978954": "VVIP",
  "9090630675": "VVIP",
  "9136228177": "VVIP",
  "9150281703": "VVIP",
  "9169111832": "VVIP",
  "9478889633": "VVIP",
  "9959256961": "VVIP",
  "10326860751": "VIP",
  "10562536116": "VIP",
  "10936373838": "VIP",
  "11216389334": "VIP",
  "5160332676": "VIP",
  "5306246025": "VIP",
  "7880830497": "VIP",
  "7935814666": "VIP",
  "8782507743": "VIP",
  "8783835998": "VIP",
  "8946425291": "VIP",
  "8996614541": "VIP",
  "9037723138": "VIP",
  "9118124156": "VIP",
  "9314473648": "VIP",
  "9416331236": "VIP",
  "9459972013": "VIP",
  "9597363595": "VIP",
  "9805561447": "VIP"
};

function resolvePlayerRole(userId, cachedRoles = {}, adminMap = {}) {
  const uidStr = userId.toString();
  if (uidStr === "11240309458") return { role: "Owner", level: 4 };
  if (cachedRoles[uidStr]) {
    const r = cachedRoles[uidStr];
    let lvl = 1;
    if (r === "Owner") lvl = 4;
    else if (r === "Co-Owner") lvl = 3;
    else if (r === "HeadAdmin") lvl = 2;
    else if (r === "Admin") lvl = 1;
    else if (r === "VVIP") lvl = 0.5;
    else if (r === "VIP") lvl = 0.2;
    return { role: r, level: lvl };
  }
  if (adminMap[uidStr]) {
    const r = adminMap[uidStr].Role || adminMap[uidStr].roleName || "Admin";
    const lvl = adminMap[uidStr].Rank || adminMap[uidStr].rankLevel || 1;
    return { role: r, level: lvl };
  }
  if (KNOWN_ROLES_MAP[uidStr]) {
    const r = KNOWN_ROLES_MAP[uidStr];
    let lvl = 0;
    if (r === "Owner") lvl = 4;
    else if (r === "HeadAdmin") lvl = 2;
    else if (r === "Admin") lvl = 1;
    else if (r === "VVIP") lvl = 0.5;
    else if (r === "VIP") lvl = 0.2;
    return { role: r, level: lvl };
  }
  return { role: "Player", level: 0 };
}

/**
 * Helper to calculate star title by level
 */
function getStarTitle(level) {
  const lvl = Number(level) || 1;
  if (lvl >= 500) return 'Star Longue Legend';
  if (lvl >= 350) return 'Lunar Star';
  if (lvl >= 200) return 'Star Veteran';
  if (lvl >= 100) return 'Star Resident';
  if (lvl >= 50) return 'Star Dancer';
  if (lvl >= 25) return 'Star Explorer';
  if (lvl >= 10) return 'Star Guest';
  return 'Star Visitor';
}

/**
 * GET /api/leaderboard/donations
 * Leaderboard Donasi Robux (Top Donators)
 */
router.get('/leaderboard/donations', async (req, res) => {
  try {
    let sourceData = INITIAL_DONATION_DATA;
    const cache = robloxService.getGameCache();

    // Check Open Cloud first if available
    const openCloudRes = await robloxService.getOpenCloudDataStoreEntry('Donation Board // V3 - Data', 'Donations');
    if (openCloudRes.success && openCloudRes.data) {
      sourceData = openCloudRes.data;
    } else if (cache.donations) {
      sourceData = cache.donations;
    }

    const leaderboard = [];
    for (const [key, value] of Object.entries(sourceData)) {
      if (typeof value === 'object' && value !== null) {
        const userId = Number(value.UserId || key);
        const amount = Number(value['Donated - Experience'] || value.Donated || value.totalDonated || 0);
        if (userId && amount > 0) {
          leaderboard.push({
            userId,
            username: value.Name || value.Username || `User_${userId}`,
            displayName: value.DisplayName || value.Name || `Player ${userId}`,
            donated: amount,
            historyCount: Array.isArray(value.History) ? value.History.length : 0
          });
        }
      }
    }

    leaderboard.sort((a, b) => b.donated - a.donated);
    const top50 = leaderboard.slice(0, 50);

    // Fetch avatar headshots for top donors
    const userIds = top50.map(p => p.userId);
    const avatars = await robloxService.getBatchUserAvatarHeadshots(userIds, '150x150');

    top50.forEach((item, index) => {
      item.rank = index + 1;
      item.avatarUrl = avatars[item.userId] || `https://www.roblox.com/headshot-thumbnail/image?userId=${item.userId}&width=150&height=150&format=png`;
      const resolved = resolvePlayerRole(item.userId, cache.roles || {}, INITIAL_ADMINS_MAP);
      item.role = resolved.role;
      item.rankLevel = resolved.level;
    });

    res.json({
      success: true,
      count: top50.length,
      totalDonated: leaderboard.reduce((acc, curr) => acc + curr.donated, 0),
      data: top50
    });
  } catch (error) {
    console.error('Error fetching donation leaderboard:', error);
    res.status(500).json({ success: false, error: 'Internal server error while fetching leaderboard' });
  }
});

/**
 * GET /api/leaderboard/saweria
 * Leaderboard Saweria Coins
 */
router.get('/leaderboard/saweria', async (req, res) => {
  try {
    let sourceData = INITIAL_SAWERIA_DATA;
    const cache = robloxService.getGameCache();

    const openCloudRes = await robloxService.getOpenCloudDataStoreEntry('SaweriaCoinBoard_Data', 'CoinDonations');
    if (openCloudRes.success && openCloudRes.data) {
      sourceData = openCloudRes.data;
    } else if (cache.saweria) {
      sourceData = cache.saweria;
    }

    const leaderboard = [];
    for (const [key, value] of Object.entries(sourceData)) {
      if (typeof value === 'object' && value !== null) {
        const userId = Number(value.UserId || key);
        const coins = Number(value.Coins || value.coins || 0);
        if (userId && coins > 0) {
          leaderboard.push({
            userId,
            username: value.Name || value.Username || `User_${userId}`,
            displayName: value.DisplayName || value.Name || `Player ${userId}`,
            coins: coins,
            historyCount: Array.isArray(value.History) ? value.History.length : 0
          });
        }
      }
    }

    leaderboard.sort((a, b) => b.coins - a.coins);
    const top50 = leaderboard.slice(0, 50);

    const userIds = top50.map(p => p.userId);
    const avatars = await robloxService.getBatchUserAvatarHeadshots(userIds, '150x150');

    top50.forEach((item, index) => {
      item.rank = index + 1;
      item.avatarUrl = avatars[item.userId] || `https://www.roblox.com/headshot-thumbnail/image?userId=${item.userId}&width=150&height=150&format=png`;
      const resolved = resolvePlayerRole(item.userId, cache.roles || {}, INITIAL_ADMINS_MAP);
      item.role = resolved.role;
      item.rankLevel = resolved.level;
    });

    res.json({
      success: true,
      count: top50.length,
      data: top50
    });
  } catch (error) {
    console.error('Error fetching saweria leaderboard:', error);
    res.status(500).json({ success: false, error: 'Internal server error while fetching saweria leaderboard' });
  }
});

/**
 * GET /api/admins
 * List of Admins, HeadAdmins, and Owners
 */
router.get('/admins', async (req, res) => {
  try {
    const adminMap = { ...INITIAL_ADMINS_MAP };
    const cache = robloxService.getGameCache();

    // Check Open Cloud for admin registry
    const openCloudRes = await robloxService.getOpenCloudDataStoreEntry('GlobalAdminList_v2', 'AllAdmins');
    if (openCloudRes.success && openCloudRes.data) {
      for (const [uid, info] of Object.entries(openCloudRes.data)) {
        adminMap[uid] = info;
      }
    } else if (cache.admins) {
      for (const [uid, info] of Object.entries(cache.admins)) {
        adminMap[uid] = info;
      }
    }

    const rankLabels = {
      4: 'Owner',
      3: 'Co-Owner',
      2: 'HeadAdmin',
      1: 'Admin'
    };

    const adminsList = Object.entries(adminMap).map(([userIdStr, data]) => {
      const rankLvl = Number(data.Rank || data.rankLevel || 1);
      return {
        userId: Number(userIdStr),
        displayName: data.Name || data.displayName || `Admin_${userIdStr}`,
        username: data.Username || data.Name || `User_${userIdStr}`,
        rankLevel: rankLvl,
        roleName: data.Role || rankLabels[rankLvl] || 'Staff'
      };
    });

    // Sort by rank level descending (Owner -> HeadAdmin -> Admin)
    adminsList.sort((a, b) => b.rankLevel - a.rankLevel || a.displayName.localeCompare(b.displayName));

    // Get Avatar images
    const userIds = adminsList.map(a => a.userId);
    const avatars = await robloxService.getBatchUserAvatarHeadshots(userIds, '150x150');

    adminsList.forEach(item => {
      item.avatarUrl = avatars[item.userId] || `https://www.roblox.com/headshot-thumbnail/image?userId=${item.userId}&width=150&height=150&format=png`;
    });

    res.json({
      success: true,
      totalAdmins: adminsList.length,
      ownersCount: adminsList.filter(a => a.rankLevel >= 3).length,
      headAdminsCount: adminsList.filter(a => a.rankLevel === 2).length,
      adminsCount: adminsList.filter(a => a.rankLevel === 1).length,
      data: adminsList
    });
  } catch (error) {
    console.error('Error fetching admins:', error);
    res.status(500).json({ success: false, error: 'Internal server error while fetching admin list' });
  }
});

/**
 * GET /api/player/search?query=...
 * Search player by Username or Roblox User ID
 */
router.get('/player/search', async (req, res) => {
  const query = req.query.query ? req.query.query.trim() : '';
  if (!query) {
    return res.status(400).json({ success: false, error: 'Parameter query diperlukan (Username atau User ID)' });
  }

  try {
    let targetUserId = null;
    let userInfo = null;

    // Check if query is numeric User ID
    if (/^\d+$/.test(query)) {
      targetUserId = Number(query);
      userInfo = await robloxService.getUserDetailsById(targetUserId);
    } else {
      // Lookup username via Roblox Users API
      const userLookup = await robloxService.getUserIdByUsername(query);
      if (userLookup) {
        targetUserId = userLookup.id;
        userInfo = {
          id: userLookup.id,
          name: userLookup.name,
          displayName: userLookup.displayName
        };
      }
    }

    if (!targetUserId || !userInfo) {
      return res.status(404).json({
        success: false,
        error: `Pemain Roblox dengan query "${query}" tidak ditemukan.`
      });
    }

    // Avatar Headshot URL
    const avatarUrl = await robloxService.getUserAvatarHeadshot(targetUserId, '352x352');
    const cache = robloxService.getGameCache();

    let donationRobux = 0;
    let donationCoins = 0;
    let starLevel = 1;
    let starTitle = 'Star Visitor';
    let role = 'Player';
    let rankLevel = 0;
    let donationHistory = [];

    // Parallel fetch from Open Cloud DataStores
    const [donationEntry, saweriaEntry, likeEntry, levelEntry, roleEntry] = await Promise.allSettled([
      robloxService.getOpenCloudDataStoreEntry('Donation Board // V3 - Data', 'Donations'),
      robloxService.getOpenCloudDataStoreEntry('SaweriaCoinBoard_Data', 'CoinDonations'),
      robloxService.getOpenCloudDataStoreEntry('PlayerLikes_v1', `player_${targetUserId}`),
      robloxService.getOpenCloudDataStoreEntry('StarPlayerProgression_v1', `Player_${targetUserId}`),
      robloxService.getOpenCloudDataStoreEntry('PlayerGiveGamePasses_v1', `givenpass_${targetUserId}`)
    ]);

    // 1. Process Donations
    if (donationEntry.status === 'fulfilled' && donationEntry.value.success && donationEntry.value.data) {
      const userDonation = donationEntry.value.data[targetUserId.toString()];
      if (userDonation) {
        donationRobux = Number(userDonation['Donated - Experience'] || userDonation.Donated || 0);
        if (Array.isArray(userDonation.History)) {
          donationHistory = userDonation.History;
        }
      }
    } else if (INITIAL_DONATION_DATA[targetUserId.toString()]) {
      donationRobux = INITIAL_DONATION_DATA[targetUserId.toString()]['Donated - Experience'] || 0;
    }

    // 2. Process Saweria Coins
    if (saweriaEntry.status === 'fulfilled' && saweriaEntry.value.success && saweriaEntry.value.data) {
      const userCoin = saweriaEntry.value.data[targetUserId.toString()];
      if (userCoin) {
        donationCoins = Number(userCoin.Coins || userCoin.coins || 0);
      }
    } else if (INITIAL_SAWERIA_DATA[targetUserId.toString()]) {
      donationCoins = INITIAL_SAWERIA_DATA[targetUserId.toString()].Coins || 0;
    }

    // 3. Process Likes
    let likesReceived = 0;
    if (likeEntry.status === 'fulfilled' && likeEntry.value.success && likeEntry.value.data) {
      likesReceived = Number(likeEntry.value.data.count || 0);
    }

    // 4. Process Role & Permissions
    const resolvedRole = resolvePlayerRole(targetUserId, cache.roles || {}, INITIAL_ADMINS_MAP);
    role = resolvedRole.role;
    rankLevel = resolvedRole.level;
    if (resolvedRole.level === 0 && roleEntry.status === 'fulfilled' && roleEntry.value.success && roleEntry.value.data && roleEntry.value.data.passType) {
      role = roleEntry.value.data.passType;
      rankLevel = role === 'VVIP' ? 0.5 : 0.2;
    }

    // 5. Process Star Level Progression
    if (cache.levels && cache.levels[targetUserId.toString()]) {
      starLevel = Number(cache.levels[targetUserId.toString()]);
    } else if (levelEntry.status === 'fulfilled' && levelEntry.value.success && levelEntry.value.data) {
      if (typeof levelEntry.value.data === 'number') {
        starLevel = levelEntry.value.data;
      } else if (levelEntry.value.data.level) {
        starLevel = Number(levelEntry.value.data.level);
      }
    }

    // Format safe level (avoid astronomical float display if any)
    if (isNaN(starLevel) || starLevel > 1000000) {
      starLevel = 999;
    } else {
      starLevel = Math.max(1, Math.floor(starLevel));
    }

    const isSponsor = donationRobux >= 1000;
    starTitle = isSponsor ? 'Star Sponsor' : getStarTitle(starLevel);

    res.json({
      success: true,
      player: {
        userId: targetUserId,
        username: userInfo.name,
        displayName: userInfo.displayName,
        description: userInfo.description || '',
        avatarUrl,
        stats: {
          role,
          rankLevel,
          starLevel,
          starTitle,
          isSponsor,
          donatedRobux: donationRobux,
          saweriaCoins: donationCoins,
          likesCount: likesReceived,
          donationHistoryCount: donationHistory.length
        },
        robloxProfileUrl: `https://www.roblox.com/users/${targetUserId}/profile`
      }
    });
  } catch (error) {
    console.error('Error searching player:', error);
    res.status(500).json({ success: false, error: 'Internal server error saat mencari pemain' });
  }
});

/**
 * POST /api/sync/ingest
 * Sync endpoint called from Roblox game server to update live DataStore caches & trigger Realtime WebSockets
 */
router.post('/sync/ingest', (req, res) => {
  const secret = req.headers['x-sync-secret'];
  if (secret !== (process.env.SYNC_SECRET_KEY || 'rb_party_secret_sync_2026')) {
    return res.status(401).json({ success: false, error: 'Unauthorized secret key' });
  }

  const { type, data, event } = req.body;
  if (!type || !data) {
    return res.status(400).json({ success: false, error: 'Missing type or data' });
  }

  robloxService.setGameCache(type, data);

  // Emit WebSocket event to connected browsers if io instance is attached
  if (req.app.get('io')) {
    const io = req.app.get('io');
    io.emit('game_update', {
      type,
      data,
      event: event || 'update',
      timestamp: Date.now()
    });
  }

  res.json({ success: true, message: `Successfully synced ${type} data` });
});

/**
 * GET /api/features
 * Info Fitur-fitur Game Ruang Bintang Party
 */
router.get('/features', (req, res) => {
  res.json({
    success: true,
    game: {
      name: "RUANG BINTANG PARTY",
      placeId: 86691557621244,
      universeId: 10552714340,
      saweriaUrl: process.env.SAWERIA_URL || "https://saweria.co/ruangbintang",
      discordUrl: process.env.DISCORD_URL || "https://discord.gg/EXjWT6Qhn",
      tiktokUrl: process.env.TIKTOK_URL || "https://www.tiktok.com/@ruangbintang"
    },
    features: [
      {
        title: "Papan Peringkat Robux & Saweria",
        desc: "Leaderboard realtime untuk donasi Robux & Saweria Coins dengan podium fisik 3D dan live board."
      },
      {
        title: "Role & Permission System",
        desc: "Sistem hierarki jabatan komprehensif: Owner (Lvl 4), Co-Owner (Lvl 3), HeadAdmin (Lvl 2), Admin (Lvl 1), VVIP, VIP, dan Player."
      },
      {
        title: "Interactive Party & Dance Battle",
        desc: "Sinkronisasi dance massal (SyncController), Dance Battle Service, Carry System, dan Animasi Khusus."
      },
      {
        title: "Music Audio Engine & Skip Vote",
        desc: "Sistem pemutar musik DJ/Party interaktif, antrean lagu (Queue), Playlist personal, dan voting lewati lagu."
      },
      {
        title: "Star Progression & Overhead Titles",
        desc: "Sistem level bintang otomatis berdasarkan waktu bermain dan donasi (Star Longue Legend, Lunar Star, Star Sponsor, dsb)."
      },
      {
        title: "Player Like & Social Stats",
        desc: "Sistem saling memberi Like antar-pemain dengan cooldown 12 jam dan Global OrderedDataStore Leaderboard."
      },
      {
        title: "LED Screen Video System",
        desc: "Layar panggung LED besar dengan teknologi Flipbook playback visual dinamis di dalam arena pesta."
      },
      {
        title: "Donation Effects & Giant VFX",
        desc: "Efek visual spektakuler (Meteor, Giant Hammer, Whitehole, Orb, Screen Shake) saat pemain melakukan donasi."
      },
      {
        title: "Advanced Admin Moderation Panel",
        desc: "Panel moderasi lengkap dengan 50+ perintah (Control, Troll, Server Lighting/Music/Weather, Anti-Cheat Detect, & Role Assignment)."
      }
    ]
  });
});

/**
 * GET /api/invitations
 * Ambil jadwal invitation aktif (otomatis menyaring yang sudah lewat)
 */
router.get('/invitations', async (req, res) => {
  try {
    const includeExpired = req.query.includeExpired === 'true';
    const filterType = req.query.type; // 'di_invite' | 'meng_invite' | undefined
    
    const result = await robloxService.getInvitations(null, !includeExpired);
    let items = result.data || [];

    const totalActive = items.length;
    const diInviteTotal = items.filter(i => i.type === 'di_invite').length;
    const mengInviteTotal = items.filter(i => i.type === 'meng_invite').length;

    if (filterType && (filterType === 'di_invite' || filterType === 'meng_invite')) {
      items = items.filter(i => i.type === filterType);
    }

    res.json({
      success: true,
      serverTime: Date.now(),
      total: items.length,
      counts: {
        total: totalActive,
        diInvite: diInviteTotal,
        mengInvite: mengInviteTotal
      },
      source: result.source,
      data: items
    });
  } catch (error) {
    console.error('Error fetching invitations:', error);
    res.status(500).json({ success: false, error: 'Internal server error saat mengambil jadwal undangan' });
  }
});

module.exports = router;
