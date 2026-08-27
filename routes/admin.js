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
 * Kirim live broadcast announcement ke game server via WebSockets
 */
router.post('/broadcast', requireAdminAuth, (req, res) => {
  const { message, author, duration } = req.body;
  if (!message) {
    return res.status(400).json({ success: false, error: 'Pesan broadcast wajib diisi' });
  }

  if (req.app.get('io')) {
    req.app.get('io').emit('admin_broadcast', {
      message: String(message).trim(),
      author: String(author || 'Web Admin').trim(),
      duration: parseInt(duration) || 10,
      timestamp: Date.now()
    });
  }

  res.json({
    success: true,
    message: 'Pengumuman broadcast berhasil dikirim ke semua server live!'
  });
});

module.exports = router;
