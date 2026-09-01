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

// Asal-usul cache lokal: 'local_file' (berisiko usang, dari snapshot Git)
// atau 'datastore' (baru saja dibaca dari DataStore Roblox)
let musicCacheSource = 'local_file';

// ============================================
// SINGLE SOURCE OF TRUTH: Roblox DataStore
// Semua baca & tulis musik SELALU lewat DataStore Roblox.
// File/cache lokal hanya mirror untuk fallback offline.
// Ini mencegah bug "data kembali ke versi lama" di hosting
// serverless (Vercel) di mana file JSON lokal sering usang.
// ============================================
const MUSIC_DS_NAME = 'GlobalMusicDatabase_v1';
const MUSIC_DS_KEY = 'MusicList';

function formatDsError(dsRes) {
  const raw = dsRes && (dsRes.error || dsRes.message);
  if (!raw) return 'Kesalahan tidak diketahui';
  return typeof raw === 'string' ? raw : JSON.stringify(raw);
}

async function readDatastoreSongs() {
  const dsRes = await robloxService.getOpenCloudDataStoreEntry(MUSIC_DS_NAME, MUSIC_DS_KEY);
  if (dsRes.success && Array.isArray(dsRes.data)) {
    return { ok: true, songs: dsRes.data };
  }
  return { ok: false, error: formatDsError(dsRes) };
}

async function writeDatastoreSongs(songs) {
  const dsRes = await robloxService.setOpenCloudDataStoreEntry(MUSIC_DS_NAME, MUSIC_DS_KEY, songs);
  if (dsRes.success) return { ok: true };
  return { ok: false, error: formatDsError(dsRes) };
}

function updateLocalMirror(songs) {
  musicCache = songs;
  musicCacheSource = 'datastore';
  saveLocalMusicDb();
}

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
    // 1. Selalu utamakan membaca langsung dari DataStore Roblox
    const readRes = await readDatastoreSongs();
    if (readRes.ok) {
      updateLocalMirror(readRes.songs);
      const playlists = [...new Set(readRes.songs.map(s => s.playlist || 'All Music'))].filter(Boolean);
      return res.json({
        success: true,
        total: readRes.songs.length,
        playlists,
        source: 'datastore',
        data: readRes.songs
      });
    }

    // 2. DataStore tidak terjangkau -> fallback cache lokal (ditandai jelas)
    console.warn('[Music] DataStore tidak terjangkau, pakai cache lokal:', readRes.error);
    const playlists = [...new Set(musicCache.map(s => s.playlist || 'All Music'))].filter(Boolean);
    res.json({
      success: true,
      total: musicCache.length,
      playlists,
      source: 'local_cache',
      stale: true,
      warning: 'Data dari cache lokal (mungkin usang). DataStore Roblox tidak terjangkau.',
      data: musicCache
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

    // BACA DULU dari DataStore supaya tidak menimpa data baru dengan cache lokal yang usang
    const readRes = await readDatastoreSongs();
    if (!readRes.ok) {
      return res.status(503).json({
        success: false,
        error: 'DataStore Roblox tidak terjangkau. Edit dibatalkan agar data tidak tertimpa versi lama. Coba lagi beberapa saat.',
        datastoreError: readRes.error
      });
    }

    const songs = readRes.songs;
    const existingIdx = songs.findIndex(s => String(s.id) === songId);
    if (existingIdx >= 0) {
      songs[existingIdx] = newSong;
    } else {
      songs.push(newSong);
    }

    // Tulis balik ke DataStore. Gagal = edit dibatalkan & dilaporkan jujur.
    const writeRes = await writeDatastoreSongs(songs);
    if (!writeRes.ok) {
      return res.status(502).json({
        success: false,
        error: 'Gagal menyimpan ke DataStore Roblox. Data TIDAK berubah.',
        datastoreError: writeRes.error,
        datastoreSynced: false
      });
    }

    // Sukses -> perbarui mirror lokal
    updateLocalMirror(songs);

    // Instant sync ke live Roblox game servers via Open Cloud MessagingService (0 detik)
    await robloxService.publishOpenCloudMessage('GlobalMusicSync', {
      action: 'save',
      total: songs.length,
      timestamp: Date.now()
    });

    // Notify connected game clients via Socket.IO
    if (req.app.get('io')) {
      req.app.get('io').emit('music_database_updated', {
        action: 'save',
        song: newSong,
        total: songs.length,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: `Lagu "${cleanJudul}" berhasil disimpan`,
      datastoreSynced: true,
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

    // BACA DULU dari DataStore
    const readRes = await readDatastoreSongs();
    if (!readRes.ok) {
      return res.status(503).json({
        success: false,
        error: 'DataStore Roblox tidak terjangkau. Hapus dibatalkan agar data tidak tertimpa versi lama.',
        datastoreError: readRes.error
      });
    }

    const initialLen = readRes.songs.length;
    const songs = readRes.songs.filter(s => String(s.id) !== songId);

    if (songs.length === initialLen) {
      return res.status(404).json({ success: false, error: 'Lagu tidak ditemukan di DataStore' });
    }

    const writeRes = await writeDatastoreSongs(songs);
    if (!writeRes.ok) {
      return res.status(502).json({
        success: false,
        error: 'Gagal menulis ke DataStore Roblox. Data TIDAK berubah.',
        datastoreError: writeRes.error,
        datastoreSynced: false
      });
    }

    updateLocalMirror(songs);

    // Instant sync ke live Roblox game servers via Open Cloud MessagingService (0 detik)
    await robloxService.publishOpenCloudMessage('GlobalMusicSync', {
      action: 'delete',
      songId,
      total: songs.length,
      timestamp: Date.now()
    });

    if (req.app.get('io')) {
      req.app.get('io').emit('music_database_updated', {
        action: 'delete',
        songId,
        total: songs.length,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: 'Lagu berhasil dihapus',
      datastoreSynced: true,
      total: songs.length
    });
  } catch (err) {
    console.error('Error deleting music:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Helper untuk mem-parse input teks serba bisa:
 * 1. Format Standar JSON (Array / Object)
 * 2. Format Tabel Lua / Luau dari Roblox Studio:
 *    { id = "98152517192630", penyanyi = "Midnight Blu", judul = "Receipts", ... }
 */
function parseMusicInput(rawInput) {
  if (!rawInput) return [];
  if (Array.isArray(rawInput)) return rawInput;
  if (typeof rawInput === 'object') return rawInput.tracks || [rawInput];

  const trimmed = String(rawInput).trim();

  // 1. Coba parse sebagai JSON biasa
  try {
    const jsonParsed = JSON.parse(trimmed);
    if (Array.isArray(jsonParsed)) return jsonParsed;
    if (typeof jsonParsed === 'object') return jsonParsed.tracks || [jsonParsed];
  } catch (e) {
    // Lanjut ke parser format Lua jika bukan JSON murni
  }

  // 2. Parser Cerdas untuk Format Lua Table Roblox Studio
  const songs = [];
  const tableRegex = /\{([^{}]+)\}/g;
  let match;

  while ((match = tableRegex.exec(trimmed)) !== null) {
    const body = match[1];
    const item = {};
    
    // Tangkap pasangan key = "value" atau key: "value" atau key = 0.5
    const kvRegex = /([a-zA-Z0-9_]+)\s*[:=]\s*(?:"([^"]*)"|'([^']*)'|([0-9.]+)|([a-zA-Z0-9_]+))/g;
    let kvMatch;
    let found = false;

    while ((kvMatch = kvRegex.exec(body)) !== null) {
      const key = kvMatch[1];
      let val = '';
      if (kvMatch[2] !== undefined) val = kvMatch[2];
      else if (kvMatch[3] !== undefined) val = kvMatch[3];
      else if (kvMatch[4] !== undefined) val = parseFloat(kvMatch[4]);
      else if (kvMatch[5] !== undefined) val = kvMatch[5];

      item[key] = val;
      found = true;
    }

    if (found && (item.id || item.Id || item.SoundId || item.judul || item.title || item.Title)) {
      songs.push(item);
    }
  }

  return songs;
}

/**
 * POST /api/admin/music/bulk-import
 * Bulk import lagu menggunakan raw JSON atau Format Tabel Lua Studio
 * Mendukung mode: 'append' (tambahkan ke database) atau 'replace' (timpa seluruh database)
 */
router.post('/music/bulk-import', requireAdminAuth, async (req, res) => {
  try {
    const { jsonData, mode } = req.body;
    if (!jsonData) {
      return res.status(400).json({ success: false, error: 'Data input tidak boleh kosong' });
    }

    const rawList = parseMusicInput(jsonData);
    if (!Array.isArray(rawList) || rawList.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Format data tidak dikenali. Anda bisa memasukkan format JSON atau format tabel Lua Roblox Studio { id = "...", judul = "..." }'
      });
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

    // BACA DULU dari DataStore (wajib untuk kedua mode, supaya tidak menimpa data baru)
    const readRes = await readDatastoreSongs();
    if (!readRes.ok) {
      return res.status(503).json({
        success: false,
        error: 'DataStore Roblox tidak terjangkau. Import dibatalkan agar data tidak tertimpa versi lama.',
        datastoreError: readRes.error
      });
    }

    let finalSongs;
    const isReplace = mode === 'replace';
    if (isReplace) {
      finalSongs = cleanSongs;
    } else {
      // Append mode (merge tanpa duplikasi ID), berdasarkan data TERBARU dari DataStore
      const existingMap = new Map();
      readRes.songs.forEach(s => existingMap.set(String(s.id), s));
      for (const cs of cleanSongs) {
        existingMap.set(String(cs.id), cs); // Update / Insert
      }
      finalSongs = Array.from(existingMap.values());
    }

    const writeRes = await writeDatastoreSongs(finalSongs);
    if (!writeRes.ok) {
      return res.status(502).json({
        success: false,
        error: 'Gagal menulis ke DataStore Roblox. Data TIDAK berubah.',
        datastoreError: writeRes.error,
        datastoreSynced: false
      });
    }

    updateLocalMirror(finalSongs);

    // Instant sync ke live Roblox game servers via Open Cloud MessagingService (0 detik)
    await robloxService.publishOpenCloudMessage('GlobalMusicSync', {
      action: 'bulk_import',
      mode: isReplace ? 'replace' : 'append',
      importedCount: cleanSongs.length,
      total: finalSongs.length,
      timestamp: Date.now()
    });

    if (req.app.get('io')) {
      req.app.get('io').emit('music_database_updated', {
        action: 'bulk_import',
        total: finalSongs.length,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: `Berhasil mengimpor ${cleanSongs.length} lagu (${isReplace ? 'Mode Timpa Total' : 'Mode Tambahkan'})`,
      importedCount: cleanSongs.length,
      invalidCount,
      totalInDatabase: finalSongs.length,
      datastoreSynced: true
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
router.get('/music/export-json', requireAdminAuth, async (req, res) => {
  // Export langsung dari DataStore (sumber kebenaran), fallback cache lokal
  const readRes = await readDatastoreSongs();
  const songs = readRes.ok ? readRes.songs : musicCache;
  if (readRes.ok) updateLocalMirror(songs);
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', 'attachment; filename="ruang_bintang_music_database.json"');
  res.send(JSON.stringify(songs, null, 2));
});

/**
 * POST /api/admin/music/sync-roblox-db
 * Reset / Sinkronisasi ulang database dengan persis isi MusicDatabase bawaan Roblox (1.102 Lagu Asli)
 */
router.post('/music/sync-roblox-db', requireAdminAuth, async (req, res) => {
  try {
    const readRes = await readDatastoreSongs();
    if (readRes.ok) {
      updateLocalMirror(readRes.songs);
      return res.json({
        success: true,
        message: `Database berhasil disinkronisasi ke ${readRes.songs.length} lagu dari DataStore Roblox`,
        total: readRes.songs.length
      });
    }
    return res.status(502).json({
      success: false,
      error: 'Gagal mengambil data dari DataStore Roblox',
      datastoreError: readRes.error
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/music/push-datastore
 * Push manual: baca data TERBARU dari DataStore lalu tulis balik (no-op aman).
 * Berguna untuk memaksa re-sync MessagingService ke game servers.
 * TIDAK menimpa DataStore dengan cache lokal yang berpotensi usang.
 */
router.post('/music/push-datastore', requireAdminAuth, async (req, res) => {
  try {
    const readRes = await readDatastoreSongs();
    if (!readRes.ok) {
      return res.status(502).json({ success: false, error: 'Gagal membaca DataStore Roblox', datastoreError: readRes.error });
    }

    const writeRes = await writeDatastoreSongs(readRes.songs);
    if (!writeRes.ok) {
      return res.status(502).json({ success: false, error: 'Gagal menyimpan ke DataStore Roblox', datastoreError: writeRes.error });
    }

    updateLocalMirror(readRes.songs);

    await robloxService.publishOpenCloudMessage('GlobalMusicSync', {
      action: 'push',
      total: readRes.songs.length,
      timestamp: Date.now()
    });

    res.json({
      success: true,
      message: `DataStore berisi ${readRes.songs.length} lagu. Sinkronisasi ke game server dipicu ulang.`,
      datastoreSynced: true
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
