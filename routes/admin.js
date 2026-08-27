const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const robloxService = require('../services/robloxService');

// File paths
const MUSIC_DB_FILE = path.join(__dirname, '..', 'data', 'music_database.json');
const AUTO_EDM_DB_FILE = 'C:\\Users\\Administrator\\Documents\\AutoEdmCutter\\music_database.json';

// In-Memory & Local Disk Music Cache
let musicCache = [];

function loadLocalMusicDb() {
  try {
    if (fs.existsSync(MUSIC_DB_FILE)) {
      const raw = fs.readFileSync(MUSIC_DB_FILE, 'utf8');
      musicCache = JSON.parse(raw);
    }
  } catch (err) {
    console.error('Error loading local music db:', err.message);
  }
}

function saveLocalMusicDb() {
  try {
    fs.writeFileSync(MUSIC_DB_FILE, JSON.stringify(musicCache, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving local music db:', err.message);
  }
}

// Initial Load
loadLocalMusicDb();

// Middleware: Admin PIN / Secret Auth
function requireAdminAuth(req, res, next) {
  const adminSecret = req.headers['x-admin-secret'] || req.headers['authorization'] || req.query.secret;
  const configuredSecret = process.env.ADMIN_SECRET_KEY || process.env.SYNC_SECRET_KEY || 'ruangbintang2026';
  
  if (!adminSecret || adminSecret !== configuredSecret) {
    return res.status(401).json({ success: false, error: 'Akses ditolak: PIN / Secret Admin tidak valid' });
  }
  next();
}

/**
 * GET /api/admin/auth/verify
 * Verifikasi PIN Admin
 */
router.post('/auth/verify', (req, res) => {
  const { pin } = req.body;
  const configuredSecret = process.env.ADMIN_SECRET_KEY || process.env.SYNC_SECRET_KEY || 'ruangbintang2026';
  
  if (pin === configuredSecret) {
    return res.json({ success: true, message: 'Autentikasi berhasil', token: configuredSecret });
  }
  return res.status(401).json({ success: false, error: 'PIN Admin salah' });
});

/**
 * GET /api/admin/music/list
 * Dapatkan semua daftar musik
 */
router.get('/music/list', async (req, res) => {
  try {
    // 1. Coba ambil dari DataStore Roblox jika ada
    let datastoreSongs = null;
    const dsRes = await robloxService.getOpenCloudDataStoreEntry('GlobalMusicDatabase_v1', 'MusicList');
    if (dsRes.success && Array.isArray(dsRes.data)) {
      datastoreSongs = dsRes.data;
    }

    const songs = datastoreSongs || musicCache;
    const playlists = [...new Set(songs.map(s => s.playlist || 'All Music'))].filter(Boolean);

    res.json({
      success: true,
      total: songs.length,
      playlists,
      source: datastoreSongs ? 'datastore' : 'local_cache',
      data: songs
    });
  } catch (err) {
    console.error('Error fetching admin music list:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/music/save
 * Simpan lagu baru atau update lagu yang ada
 */
router.post('/music/save', requireAdminAuth, async (req, res) => {
  try {
    const { id, judul, penyanyi, playlist, sampul, playbackSpeed } = req.body;
    
    if (!id || !judul) {
      return res.status(400).json({ success: false, error: 'Sound ID dan Judul wajib diisi' });
    }

    const songId = String(id).replace(/\D/g, '');
    const cleanJudul = String(judul).trim();
    const cleanPenyanyi = String(penyanyi || '').trim();
    const cleanPlaylist = String(playlist || 'POP/R&B').trim();
    const speed = parseFloat(playbackSpeed) || 1.0;

    const newSong = {
      id: songId,
      judul: cleanJudul,
      penyanyi: cleanPenyanyi,
      playlist: cleanPlaylist,
      sampul: String(sampul || '').trim(),
      playbackSpeed: speed
    };

    // Update in local cache
    const existingIdx = musicCache.findIndex(s => s.id === songId);
    if (existingIdx >= 0) {
      musicCache[existingIdx] = newSong;
    } else {
      musicCache.push(newSong);
    }
    saveLocalMusicDb();

    // Push ke DataStore Roblox
    const dsRes = await robloxService.setOpenCloudDataStoreEntry('GlobalMusicDatabase_v1', 'MusicList', musicCache);

    // Notify connected game clients via Socket.IO
    if (req.app.get('io')) {
      req.app.get('io').emit('music_database_updated', {
        action: 'save',
        song: newSong,
        total: musicCache.length,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: `Lagu "${cleanJudul}" berhasil disimpan`,
      datastoreSynced: dsRes.success,
      song: newSong
    });
  } catch (err) {
    console.error('Error saving music:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/music/delete
 * Hapus lagu dari database & DataStore
 */
router.post('/music/delete', requireAdminAuth, async (req, res) => {
  try {
    const { id } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Sound ID wajib diisi' });
    }

    const songId = String(id).replace(/\D/g, '');
    const initialLen = musicCache.length;
    musicCache = musicCache.filter(s => s.id !== songId);

    if (musicCache.length === initialLen) {
      return res.status(404).json({ success: false, error: 'Lagu tidak ditemukan' });
    }

    saveLocalMusicDb();

    // Push ke DataStore Roblox
    const dsRes = await robloxService.setOpenCloudDataStoreEntry('GlobalMusicDatabase_v1', 'MusicList', musicCache);

    if (req.app.get('io')) {
      req.app.get('io').emit('music_database_updated', {
        action: 'delete',
        songId,
        total: musicCache.length,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: 'Lagu berhasil dihapus',
      datastoreSynced: dsRes.success,
      total: musicCache.length
    });
  } catch (err) {
    console.error('Error deleting music:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/music/bulk-import
 * Bulk import lagu menggunakan raw JSON (Array of objects)
 * Mendukung mode: 'append' (tambahkan ke database) atau 'replace' (timpa seluruh database)
 */
router.post('/music/bulk-import', requireAdminAuth, async (req, res) => {
  try {
    const { jsonData, mode } = req.body;
    if (!jsonData) {
      return res.status(400).json({ success: false, error: 'Data JSON tidak boleh kosong' });
    }

    let parsed = null;
    if (typeof jsonData === 'string') {
      try {
        parsed = JSON.parse(jsonData);
      } catch (e) {
        return res.status(400).json({ success: false, error: `Format JSON tidak valid: ${e.message}` });
      }
    } else if (Array.isArray(jsonData) || typeof jsonData === 'object') {
      parsed = jsonData;
    }

    // Handle format AutoEdmCutter { tracks: [...] } atau format array murni [ {...}, {...} ]
    const rawList = Array.isArray(parsed) ? parsed : (parsed.tracks || []);
    if (!Array.isArray(rawList) || rawList.length === 0) {
      return res.status(400).json({ success: false, error: 'JSON harus berisi array daftar lagu' });
    }

    const cleanSongs = [];
    const seenIds = new Set();
    let invalidCount = 0;

    for (const item of rawList) {
      const soundId = String(item.id || item.Id || item.asset_id || item.SoundId || '').replace(/\D/g, '');
      if (!soundId) {
        invalidCount++;
        continue;
      }

      if (seenIds.has(soundId)) continue;
      seenIds.add(soundId);

      let judul = item.judul || item.title || item.Title || item.roblox_name || item.Name || 'Unknown Song';
      let penyanyi = item.penyanyi || item.artist || item.Artist || '';
      
      // Auto split jika format masih 'Artist - Title'
      if (!penyanyi && judul.includes(' - ')) {
        const parts = judul.split(' - ');
        penyanyi = parts[0].trim();
        judul = parts.slice(1).join(' - ').trim();
      }

      const songEntry = {
        id: soundId,
        judul: String(judul).trim(),
        penyanyi: String(penyanyi).trim(),
        playlist: String(item.playlist || item.Playlist || 'POP/R&B').trim(),
        sampul: String(item.sampul || item.Cover || item.CoverImage || '').trim(),
        playbackSpeed: parseFloat(item.playbackSpeed || item.PlaybackSpeed || item.playback_speed) || 0.5
      };

      cleanSongs.push(songEntry);
    }

    const isReplace = mode === 'replace';
    if (isReplace) {
      musicCache = cleanSongs;
    } else {
      // Append mode (merge tanpa duplikasi ID)
      const existingMap = new Map();
      musicCache.forEach(s => existingMap.set(String(s.id), s));
      for (const cs of cleanSongs) {
        existingMap.set(String(cs.id), cs); // Update / Insert
      }
      musicCache = Array.from(existingMap.values());
    }

    saveLocalMusicDb();

    // Push ke DataStore Roblox
    const dsRes = await robloxService.setOpenCloudDataStoreEntry('GlobalMusicDatabase_v1', 'MusicList', musicCache);

    if (req.app.get('io')) {
      req.app.get('io').emit('music_database_updated', {
        action: 'bulk_import',
        total: musicCache.length,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: `Berhasil mengimpor ${cleanSongs.length} lagu (${isReplace ? 'Mode Timpa Total' : 'Mode Tambahkan'})`,
      importedCount: cleanSongs.length,
      invalidCount,
      totalInDatabase: musicCache.length,
      datastoreSynced: dsRes.success
    });
  } catch (err) {
    console.error('Error during bulk import:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/admin/music/export-json
 * Export seluruh database musik ke format JSON
 */
router.get('/music/export-json', requireAdminAuth, (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="ruang_bintang_music_database.json"');
  res.send(JSON.stringify(musicCache, null, 2));
});

/**
 * POST /api/admin/music/sync-roblox-db
 * Reset / Sinkronisasi ulang database dengan persis isi MusicDatabase bawaan Roblox (1.102 Lagu Asli)
 */
router.post('/music/sync-roblox-db', requireAdminAuth, async (req, res) => {
  try {
    const dsRes = await robloxService.getOpenCloudDataStoreEntry('GlobalMusicDatabase_v1', 'MusicList');
    if (dsRes.success && Array.isArray(dsRes.data)) {
      musicCache = dsRes.data;
      saveLocalMusicDb();
      return res.json({
        success: true,
        message: `Database berhasil disinkronisasi ke ${musicCache.length} lagu asli Roblox`,
        total: musicCache.length
      });
    }
    return res.status(500).json({ success: false, error: 'Gagal mengambil data dari DataStore' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/music/push-datastore
 * Push manual seluruh cache musik ke Roblox Open Cloud DataStore
 */
router.post('/music/push-datastore', requireAdminAuth, async (req, res) => {
  try {
    const dsRes = await robloxService.setOpenCloudDataStoreEntry('GlobalMusicDatabase_v1', 'MusicList', musicCache);
    if (!dsRes.success) {
      return res.status(500).json({ success: false, error: dsRes.error || 'Gagal menyimpan ke DataStore Roblox' });
    }

    res.json({
      success: true,
      message: `Sukses menyimpan ${musicCache.length} lagu ke DataStore Roblox!`,
      data: dsRes.data
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/player/role
 * Atur atau update Role pemain (Owner, HeadAdmin, Admin, VVIP, VIP, Player)
 */
router.post('/player/role', requireAdminAuth, async (req, res) => {
  try {
    const { userId, username, displayName, role } = req.body;
    if (!userId || !role) {
      return res.status(400).json({ success: false, error: 'User ID dan Role wajib diisi' });
    }

    const uidStr = String(userId).trim();
    let rankLvl = 0;
    if (role === 'Owner') rankLvl = 4;
    else if (role === 'Co-Owner') rankLvl = 3;
    else if (role === 'HeadAdmin') rankLvl = 2;
    else if (role === 'Admin') rankLvl = 1;
    else if (role === 'VVIP') rankLvl = 0.5;
    else if (role === 'VIP') rankLvl = 0.2;

    const cache = robloxService.getGameCache();
    const rolesMap = cache.roles || {};
    const adminsMap = cache.admins || {};

    if (role === 'Player') {
      delete rolesMap[uidStr];
      delete adminsMap[uidStr];
    } else {
      rolesMap[uidStr] = role;
      if (rankLvl >= 1) {
        adminsMap[uidStr] = {
          Name: displayName || username || `Admin_${uidStr}`,
          Username: username || `User_${uidStr}`,
          Rank: rankLvl,
          Role: role
        };
      } else {
        delete adminsMap[uidStr];
      }
    }

    robloxService.setGameCache('roles', rolesMap);
    robloxService.setGameCache('admins', adminsMap);

    // Push ke DataStore GamePasses / Admin Registry
    const dsAdminRes = await robloxService.setOpenCloudDataStoreEntry('GlobalAdminList_v2', 'AllAdmins', adminsMap);
    const dsRoleRes = await robloxService.setOpenCloudDataStoreEntry('PlayerGiveGamePasses_v1', `givenpass_${uidStr}`, {
      passType: role,
      updatedAt: Date.now()
    });

    res.json({
      success: true,
      message: `Role untuk user ID ${uidStr} berhasil diubah menjadi ${role}`,
      role,
      rankLevel: rankLvl,
      datastoreSynced: dsAdminRes.success && dsRoleRes.success
    });
  } catch (err) {
    console.error('Error updating player role:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/player/level
 * Atur Star Level pemain
 */
router.post('/player/level', requireAdminAuth, async (req, res) => {
  try {
    const { userId, level } = req.body;
    if (!userId || level === undefined) {
      return res.status(400).json({ success: false, error: 'User ID dan Level wajib diisi' });
    }

    const uidStr = String(userId).trim();
    const targetLevel = Math.max(1, parseInt(level) || 1);

    const cache = robloxService.getGameCache();
    const levelsMap = cache.levels || {};
    levelsMap[uidStr] = targetLevel;
    robloxService.setGameCache('levels', levelsMap);

    // Push ke DataStore StarPlayerProgression_v1
    const dsRes = await robloxService.setOpenCloudDataStoreEntry('StarPlayerProgression_v1', `Player_${uidStr}`, {
      level: targetLevel,
      updatedAt: Date.now()
    });

    res.json({
      success: true,
      message: `Star Level untuk User ID ${uidStr} berhasil diubah ke Lvl ${targetLevel}`,
      level: targetLevel,
      datastoreSynced: dsRes.success
    });
  } catch (err) {
    console.error('Error setting player level:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/broadcast
 * Kirim live broadcast announcement ke game server via MessagingService & DataStore
 */
router.post('/broadcast', requireAdminAuth, async (req, res) => {
  const { message, author, duration } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, error: 'Pesan broadcast wajib diisi' });
  }

  const broadcastPayload = {
    id: 'bc_' + Date.now(),
    message: String(message).trim(),
    author: String(author || 'SISTEM RUANG BINTANG').trim(),
    duration: parseInt(duration) || 10,
    timestamp: Date.now()
  };

  // 1. Kirim Instan lewat MessagingService (Realtime 0 detik ke semua live game server)
  const msgRes = await robloxService.publishOpenCloudMessage('GlobalAdminBroadcast', broadcastPayload);

  // 2. Simpan juga ke DataStore sebagai fallback cadangan
  const dsRes = await robloxService.setOpenCloudDataStoreEntry('GlobalBroadcast_v1', 'LatestAnnouncement', broadcastPayload);

  // 3. Emit WebSocket ke browser clients
  if (req.app.get('io')) {
    req.app.get('io').emit('admin_broadcast', broadcastPayload);
  }

  if (!msgRes.success && !dsRes.success) {
    return res.status(403).json({
      success: false,
      error: `Gagal kirim ke Roblox: API Key belum memiliki izin Messaging Service / DataStore Write di Universe ${robloxService.UNIVERSE_ID}.`,
      details: msgRes.error || dsRes.error
    });
  }

  res.json({
    success: true,
    message: 'Pengumuman broadcast berhasil disiarkan ke seluruh server live Roblox!',
    messagingService: msgRes.success,
    datastore: dsRes.success,
    data: broadcastPayload
  });
});

module.exports = router;
