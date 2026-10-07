const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const robloxService = require('../services/robloxService');

// File paths
const MUSIC_DB_FILE = path.join(__dirname, '..', 'data', 'music_database.json');
const AUTO_EDM_DB_FILE = 'C:\\Users\\Administrator\\Documents\\AutoEdmCutter\\music_database.json';
const HIDDEN_PLAYLISTS_FILE = path.join(__dirname, '..', 'data', 'hidden_playlists.json');

// In-Memory & Local Disk Music Cache
let musicCache = [];
let hiddenPlaylistsCache = [];

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

function loadLocalHiddenPlaylists() {
  try {
    if (fs.existsSync(HIDDEN_PLAYLISTS_FILE)) {
      const raw = fs.readFileSync(HIDDEN_PLAYLISTS_FILE, 'utf8');
      hiddenPlaylistsCache = JSON.parse(raw);
      if (!Array.isArray(hiddenPlaylistsCache)) hiddenPlaylistsCache = [];
    }
  } catch (err) {
    console.error('Error loading local hidden playlists:', err.message);
  }
}

function saveLocalHiddenPlaylists() {
  try {
    fs.writeFileSync(HIDDEN_PLAYLISTS_FILE, JSON.stringify(hiddenPlaylistsCache, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving local hidden playlists:', err.message);
  }
}

// Initial Load
loadLocalMusicDb();
loadLocalHiddenPlaylists();

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
const MUSIC_DS_KEY_HIDDEN = 'HiddenPlaylists';

function formatDsError(dsRes) {
  const raw = dsRes && (dsRes.error || dsRes.message);
  if (!raw) return 'Kesalahan tidak diketahui';
  return typeof raw === 'string' ? raw : JSON.stringify(raw);
}

async function readDatastoreSongs(universeId = null) {
  const dsRes = await robloxService.getOpenCloudDataStoreEntry(MUSIC_DS_NAME, MUSIC_DS_KEY, 'global', universeId);
  if (dsRes.success && Array.isArray(dsRes.data)) {
    return { ok: true, songs: dsRes.data };
  }
  return { ok: false, error: formatDsError(dsRes) };
}

async function writeDatastoreSongs(songs, universeId = null) {
  const dsRes = await robloxService.setOpenCloudDataStoreEntry(MUSIC_DS_NAME, MUSIC_DS_KEY, songs, 'global', universeId);
  if (dsRes.success) return { ok: true };
  return { ok: false, error: formatDsError(dsRes) };
}

async function readDatastoreHiddenPlaylists(universeId = null) {
  const dsRes = await robloxService.getOpenCloudDataStoreEntry(MUSIC_DS_NAME, MUSIC_DS_KEY_HIDDEN, 'global', universeId);
  if (dsRes.success && Array.isArray(dsRes.data)) {
    return { ok: true, hiddenPlaylists: dsRes.data };
  }
  if (dsRes.notFound) {
    return { ok: true, hiddenPlaylists: [] };
  }
  return { ok: false, error: formatDsError(dsRes) };
}

async function writeDatastoreHiddenPlaylists(hiddenPlaylists, universeId = null) {
  const dsRes = await robloxService.setOpenCloudDataStoreEntry(MUSIC_DS_NAME, MUSIC_DS_KEY_HIDDEN, hiddenPlaylists, 'global', universeId);
  if (dsRes.success) return { ok: true };
  return { ok: false, error: formatDsError(dsRes) };
}

// Helper untuk mendapatkan daftar universe target (bisa 1 universe atau ['all'])
function resolveTargetUniverses(targetExp) {
  const defaultUni = robloxService.UNIVERSE_ID;
  const secondUni = robloxService.UNIVERSE_ID_2;
  
  if (!targetExp || targetExp === 'primary' || targetExp === defaultUni) {
    return [defaultUni];
  }
  if (targetExp === 'secondary' || targetExp === secondUni) {
    return secondUni ? [secondUni] : [defaultUni];
  }
  if (targetExp === 'all' || targetExp === 'both') {
    const list = [defaultUni];
    if (secondUni) list.push(secondUni);
    return list;
  }
  // Jika mengirimkan universeId langsung
  return [targetExp];
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
 * GET /api/admin/experiences
 * Dapatkan daftar experience / universe yang terdaftar
 */
router.get('/experiences', requireAdminAuth, (req, res) => {
  const configs = robloxService.getExperiencesConfig();
  res.json({
    success: true,
    data: configs
  });
});

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
 * Dapatkan semua daftar musik dari target experience tertentu
 */
router.get('/music/list', async (req, res) => {
  try {
    const targetExp = req.query.experience || req.headers['x-target-experience'];
    const targetUniverses = resolveTargetUniverses(targetExp);
    const readUni = targetUniverses[0]; // Universe untuk baca

    // 1. Selalu utamakan membaca langsung dari DataStore Roblox
    const readRes = await readDatastoreSongs(readUni);
    const hiddenRes = await readDatastoreHiddenPlaylists(readUni);

    let hiddenList = [];
    if (hiddenRes.ok) {
      hiddenList = hiddenRes.hiddenPlaylists;
      if (readUni === robloxService.UNIVERSE_ID) {
        hiddenPlaylistsCache = hiddenList;
        saveLocalHiddenPlaylists();
      }
    } else {
      hiddenList = hiddenPlaylistsCache;
    }

    if (readRes.ok) {
      if (readUni === robloxService.UNIVERSE_ID) {
        updateLocalMirror(readRes.songs);
      }
      const playlists = [...new Set(readRes.songs.map(s => s.playlist || 'All Music'))].filter(Boolean);
      return res.json({
        success: true,
        total: readRes.songs.length,
        playlists,
        hiddenPlaylists: hiddenList,
        source: 'datastore',
        universeId: readUni,
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
      hiddenPlaylists: hiddenPlaylistsCache,
      source: 'local_cache',
      stale: true,
      universeId: readUni,
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
 * Simpan lagu baru atau update lagu yang ada (mendukung target experience: primary, secondary, all)
 */
router.post('/music/save', requireAdminAuth, async (req, res) => {
  try {
    const { id, judul, penyanyi, playlist, sampul, playbackSpeed, targetExperience } = req.body;
    
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

    const targetUniverses = resolveTargetUniverses(targetExperience);
    const saveResults = [];

    for (const uniId of targetUniverses) {
      const readRes = await readDatastoreSongs(uniId);
      if (!readRes.ok) {
        saveResults.push({ universeId: uniId, success: false, error: readRes.error });
        continue;
      }

      const songs = readRes.songs;
      const existingIdx = songs.findIndex(s => String(s.id) === songId);
      if (existingIdx >= 0) {
        songs[existingIdx] = newSong;
      } else {
        songs.push(newSong);
      }

      const writeRes = await writeDatastoreSongs(songs, uniId);
      if (writeRes.ok) {
        if (uniId === robloxService.UNIVERSE_ID) {
          updateLocalMirror(songs);
        }
        await robloxService.publishOpenCloudMessage('GlobalMusicSync', {
          action: 'save',
          total: songs.length,
          timestamp: Date.now()
        }, uniId);

        saveResults.push({ universeId: uniId, success: true, total: songs.length });
      } else {
        saveResults.push({ universeId: uniId, success: false, error: writeRes.error });
      }
    }

    const allFailed = saveResults.every(r => !r.success);
    if (allFailed) {
      return res.status(502).json({
        success: false,
        error: 'Gagal menyimpan ke DataStore Roblox pada Universe yang dipilih.',
        details: saveResults
      });
    }

    // Notify connected game clients via Socket.IO
    if (req.app.get('io')) {
      req.app.get('io').emit('music_database_updated', {
        action: 'save',
        song: newSong,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: `Lagu "${cleanJudul}" berhasil disimpan ke ${saveResults.filter(r=>r.success).length} Experience.`,
      datastoreSynced: true,
      saveResults,
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
    const { id, targetExperience } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Sound ID wajib diisi' });
    }

    const songId = String(id).replace(/\D/g, '');
    const targetUniverses = resolveTargetUniverses(targetExperience);
    const deleteResults = [];

    for (const uniId of targetUniverses) {
      const readRes = await readDatastoreSongs(uniId);
      if (!readRes.ok) {
        deleteResults.push({ universeId: uniId, success: false, error: readRes.error });
        continue;
      }

      const songs = readRes.songs.filter(s => String(s.id) !== songId);
      const writeRes = await writeDatastoreSongs(songs, uniId);

      if (writeRes.ok) {
        if (uniId === robloxService.UNIVERSE_ID) {
          updateLocalMirror(songs);
        }
        await robloxService.publishOpenCloudMessage('GlobalMusicSync', {
          action: 'delete',
          songId,
          total: songs.length,
          timestamp: Date.now()
        }, uniId);

        deleteResults.push({ universeId: uniId, success: true, total: songs.length });
      } else {
        deleteResults.push({ universeId: uniId, success: false, error: writeRes.error });
      }
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('music_database_updated', {
        action: 'delete',
        songId,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: `Lagu berhasil dihapus dari ${deleteResults.filter(r=>r.success).length} Experience.`,
      datastoreSynced: true,
      deleteResults
    });
  } catch (err) {
    console.error('Error deleting music:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/music/delete-playlist
 * Hapus seluruh lagu di dalam satu playlist tertentu
 */
router.post('/music/delete-playlist', requireAdminAuth, async (req, res) => {
  try {
    const { playlistName, targetExperience } = req.body;
    if (!playlistName) {
      return res.status(400).json({ success: false, error: 'Nama playlist wajib diisi' });
    }

    const cleanPlaylist = String(playlistName).trim();
    if (cleanPlaylist === 'All Music' || cleanPlaylist === '') {
      return res.status(400).json({ success: false, error: 'Playlist "All Music" tidak dapat dihapus sekaligus demi keamanan.' });
    }

    const targetUniverses = resolveTargetUniverses(targetExperience);
    const results = [];

    for (const uniId of targetUniverses) {
      const readRes = await readDatastoreSongs(uniId);
      if (!readRes.ok) {
        results.push({ universeId: uniId, success: false, error: readRes.error });
        continue;
      }

      const initialCount = readRes.songs.length;
      const songs = readRes.songs.filter(s => (s.playlist || 'All Music').toLowerCase() !== cleanPlaylist.toLowerCase());
      const deletedCount = initialCount - songs.length;

      const writeRes = await writeDatastoreSongs(songs, uniId);
      if (writeRes.ok) {
        if (uniId === robloxService.UNIVERSE_ID) {
          updateLocalMirror(songs);
        }

        // Hapus juga dari HiddenPlaylists jika playlist tersebut tersembunyi
        const readHidden = await readDatastoreHiddenPlaylists(uniId);
        if (readHidden.ok && Array.isArray(readHidden.hiddenPlaylists)) {
          const updatedHidden = readHidden.hiddenPlaylists.filter(p => p.toLowerCase() !== cleanPlaylist.toLowerCase());
          if (updatedHidden.length !== readHidden.hiddenPlaylists.length) {
            await writeDatastoreHiddenPlaylists(updatedHidden, uniId);
            if (uniId === robloxService.UNIVERSE_ID) {
              hiddenPlaylistsCache = updatedHidden;
              saveLocalHiddenPlaylists();
            }
          }
        }

        await robloxService.publishOpenCloudMessage('GlobalMusicSync', {
          action: 'delete_playlist',
          playlist: cleanPlaylist,
          deletedCount,
          total: songs.length,
          timestamp: Date.now()
        }, uniId);

        results.push({ universeId: uniId, success: true, deletedCount, remainingTotal: songs.length });
      } else {
        results.push({ universeId: uniId, success: false, error: writeRes.error });
      }
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('music_database_updated', {
        action: 'delete_playlist',
        playlist: cleanPlaylist,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: `Playlist "${cleanPlaylist}" berhasil dihapus dari ${results.filter(r=>r.success).length} Experience.`,
      datastoreSynced: true,
      results
    });
  } catch (err) {
    console.error('Error deleting playlist:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/music/toggle-hide-playlist
 * Sembunyikan atau tampilkan kembali playlist dari game Roblox
 */
router.post('/music/toggle-hide-playlist', requireAdminAuth, async (req, res) => {
  try {
    const { playlistName, isHidden, targetExperience } = req.body;
    if (!playlistName) {
      return res.status(400).json({ success: false, error: 'Nama playlist wajib diisi' });
    }

    const cleanPlaylist = String(playlistName).trim();
    if (cleanPlaylist.toLowerCase() === 'all music' || cleanPlaylist === '') {
      return res.status(400).json({ success: false, error: 'Playlist "All Music" adalah kategori utama dan tidak dapat disembunyikan.' });
    }

    const targetUniverses = resolveTargetUniverses(targetExperience);
    const results = [];

    for (const uniId of targetUniverses) {
      const readHidden = await readDatastoreHiddenPlaylists(uniId);
      let currentHidden = readHidden.ok ? [...readHidden.hiddenPlaylists] : [...hiddenPlaylistsCache];

      const existsIdx = currentHidden.findIndex(p => p.toLowerCase() === cleanPlaylist.toLowerCase());
      let willBeHidden;

      if (typeof isHidden === 'boolean') {
        willBeHidden = isHidden;
      } else {
        // Otomatis toggle jika tidak dispesifikasi
        willBeHidden = existsIdx < 0;
      }

      if (willBeHidden && existsIdx < 0) {
        currentHidden.push(cleanPlaylist);
      } else if (!willBeHidden && existsIdx >= 0) {
        currentHidden.splice(existsIdx, 1);
      }

      const writeRes = await writeDatastoreHiddenPlaylists(currentHidden, uniId);
      if (writeRes.ok) {
        if (uniId === robloxService.UNIVERSE_ID) {
          hiddenPlaylistsCache = currentHidden;
          saveLocalHiddenPlaylists();
        }

        await robloxService.publishOpenCloudMessage('GlobalMusicSync', {
          action: 'toggle_hide_playlist',
          playlist: cleanPlaylist,
          isHidden: willBeHidden,
          hiddenPlaylists: currentHidden,
          timestamp: Date.now()
        }, uniId);

        results.push({ universeId: uniId, success: true, isHidden: willBeHidden, hiddenPlaylists: currentHidden });
      } else {
        results.push({ universeId: uniId, success: false, error: writeRes.error });
      }
    }

    const anySuccess = results.some(r => r.success);
    if (!anySuccess) {
      return res.status(502).json({
        success: false,
        error: 'Gagal memperbarui status playlist di DataStore Roblox.',
        details: results
      });
    }

    const finalStatus = results.find(r => r.success);
    const isNowHidden = finalStatus ? finalStatus.isHidden : false;
    const finalHiddenList = finalStatus ? finalStatus.hiddenPlaylists : hiddenPlaylistsCache;

    if (req.app.get('io')) {
      req.app.get('io').emit('music_database_updated', {
        action: 'toggle_hide_playlist',
        playlist: cleanPlaylist,
        isHidden: isNowHidden,
        hiddenPlaylists: finalHiddenList,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: `Playlist "${cleanPlaylist}" berhasil ${isNowHidden ? 'disembunyikan dari' : 'ditampilkan kembali di'} game Roblox!`,
      playlist: cleanPlaylist,
      isHidden: isNowHidden,
      hiddenPlaylists: finalHiddenList,
      results
    });
  } catch (err) {
    console.error('Error toggling hide playlist:', err);
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
 * Mendukung target experience: primary, secondary, all
 */
router.post('/music/bulk-import', requireAdminAuth, async (req, res) => {
  try {
    const { jsonData, mode, targetExperience } = req.body;
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

    const targetUniverses = resolveTargetUniverses(targetExperience);
    const isReplace = mode === 'replace';
    const importResults = [];

    for (const uniId of targetUniverses) {
      const readRes = await readDatastoreSongs(uniId);
      if (!readRes.ok) {
        importResults.push({ universeId: uniId, success: false, error: readRes.error });
        continue;
      }

      let finalSongs;
      if (isReplace) {
        finalSongs = cleanSongs;
      } else {
        const existingMap = new Map();
        readRes.songs.forEach(s => existingMap.set(String(s.id), s));
        for (const cs of cleanSongs) {
          existingMap.set(String(cs.id), cs);
        }
        finalSongs = Array.from(existingMap.values());
      }

      const writeRes = await writeDatastoreSongs(finalSongs, uniId);
      if (writeRes.ok) {
        if (uniId === robloxService.UNIVERSE_ID) {
          updateLocalMirror(finalSongs);
        }
        await robloxService.publishOpenCloudMessage('GlobalMusicSync', {
          action: 'bulk_import',
          mode: isReplace ? 'replace' : 'append',
          importedCount: cleanSongs.length,
          total: finalSongs.length,
          timestamp: Date.now()
        }, uniId);

        importResults.push({ universeId: uniId, success: true, total: finalSongs.length });
      } else {
        importResults.push({ universeId: uniId, success: false, error: writeRes.error });
      }
    }

    const allFailed = importResults.every(r => !r.success);
    if (allFailed) {
      return res.status(502).json({
        success: false,
        error: 'Gagal melakukan bulk import ke DataStore Universe yang dipilih.',
        details: importResults
      });
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('music_database_updated', {
        action: 'bulk_import',
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: `Berhasil mengimpor ${cleanSongs.length} lagu ke ${importResults.filter(r=>r.success).length} Experience (${isReplace ? 'Mode Timpa Total' : 'Mode Tambahkan'})`,
      importedCount: cleanSongs.length,
      invalidCount,
      importResults,
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
  const targetExp = req.query.experience;
  const targetUniverses = resolveTargetUniverses(targetExp);
  const readUni = targetUniverses[0];

  const readRes = await readDatastoreSongs(readUni);
  const songs = readRes.ok ? readRes.songs : musicCache;
  if (readRes.ok && readUni === robloxService.UNIVERSE_ID) updateLocalMirror(songs);

  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="ruang_bintang_music_database_${readUni}.json"`);
  res.send(JSON.stringify(songs, null, 2));
});

/**
 * POST /api/admin/music/sync-roblox-db
 * Reset / Sinkronisasi ulang database dari DataStore Roblox
 */
router.post('/music/sync-roblox-db', requireAdminAuth, async (req, res) => {
  try {
    const targetExp = req.body.targetExperience;
    const targetUniverses = resolveTargetUniverses(targetExp);
    const readUni = targetUniverses[0];

    const readRes = await readDatastoreSongs(readUni);
    if (readRes.ok) {
      if (readUni === robloxService.UNIVERSE_ID) {
        updateLocalMirror(readRes.songs);
      }
      return res.json({
        success: true,
        message: `Database berhasil disinkronisasi ke ${readRes.songs.length} lagu dari DataStore Experience (${readUni})`,
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
 * Push manual / pemicu re-sync MessagingService ke game servers
 */
router.post('/music/push-datastore', requireAdminAuth, async (req, res) => {
  try {
    const targetExp = req.body.targetExperience;
    const targetUniverses = resolveTargetUniverses(targetExp);
    const results = [];

    for (const uniId of targetUniverses) {
      const readRes = await readDatastoreSongs(uniId);
      if (!readRes.ok) {
        results.push({ universeId: uniId, success: false, error: readRes.error });
        continue;
      }

      const writeRes = await writeDatastoreSongs(readRes.songs, uniId);
      if (writeRes.ok) {
        await robloxService.publishOpenCloudMessage('GlobalMusicSync', {
          action: 'push',
          total: readRes.songs.length,
          timestamp: Date.now()
        }, uniId);
        results.push({ universeId: uniId, success: true, total: readRes.songs.length });
      } else {
        results.push({ universeId: uniId, success: false, error: writeRes.error });
      }
    }

    res.json({
      success: true,
      message: `Sinkronisasi dipicu ulang ke ${results.filter(r=>r.success).length} Experience.`,
      datastoreSynced: true,
      results
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

/**
 * ============================================
 * MANAJEMEN JADWAL UNDANGAN (INVITATIONS)
 * Menggunakan Roblox DataStore GlobalInvitations_v1
 * ============================================
 */

/**
 * GET /api/admin/invitations/list
 * Dapatkan semua jadwal undangan (aktif + expired) untuk dikelola admin
 */
router.get('/invitations/list', requireAdminAuth, async (req, res) => {
  try {
    const targetExp = req.query.experience || req.headers['x-target-experience'];
    const targetUniverses = resolveTargetUniverses(targetExp);
    const readUni = targetUniverses[0];

    // Ambil data (termasuk yang expired untuk admin)
    const result = await robloxService.getInvitations(readUni, false);
    const now = Date.now();
    const items = (result.data || []).map(inv => {
      const isExpired = robloxService.isInvitationExpired(inv, now);
      const eventTimestamp = new Date(inv.eventTime).getTime();
      const isOngoing = !isExpired && (eventTimestamp <= now);
      return {
        ...inv,
        isExpired,
        isOngoing,
        status: isExpired ? 'expired' : (isOngoing ? 'ongoing' : 'upcoming')
      };
    });

    res.json({
      success: true,
      total: items.length,
      activeCount: items.filter(i => !i.isExpired).length,
      expiredCount: items.filter(i => i.isExpired).length,
      source: result.source,
      universeId: readUni,
      data: items
    });
  } catch (err) {
    console.error('Error fetching admin invitations:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/invitations/save
 * Simpan atau perbarui jadwal undangan ke Roblox DataStore
 */
router.post('/invitations/save', requireAdminAuth, async (req, res) => {
  try {
    const { id, type, targetName, title, eventTime, durationHours, mapLink, mapName, description, targetExperience } = req.body;

    if (!targetName || !title || !eventTime || !mapLink) {
      return res.status(400).json({
        success: false,
        error: 'Nama pihak/host/guest, judul acara, tanggal/waktu, dan link map wajib diisi'
      });
    }

    const invitationType = (type === 'meng_invite') ? 'meng_invite' : 'di_invite';
    const cleanTargetName = String(targetName).trim();
    const cleanTitle = String(title).trim();
    const cleanMapLink = String(mapLink).trim();
    const cleanMapName = String(mapName || '').trim();
    const cleanDescription = String(description || '').trim();
    const cleanDuration = parseFloat(durationHours) || 3;

    // Validasi dan normalisasi format tanggal & waktu (Preservasi tepat WIB UTC+7)
    let parsedTimeIso = '';
    const cleanTimeStr = String(eventTime).trim();
    if (cleanTimeStr.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(cleanTimeStr)) {
      const p = new Date(cleanTimeStr);
      if (isNaN(p.getTime())) {
        return res.status(400).json({ success: false, error: 'Format tanggal & waktu tidak valid' });
      }
      parsedTimeIso = p.toISOString();
    } else if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/.test(cleanTimeStr)) {
      const withSec = cleanTimeStr.length === 16 ? `${cleanTimeStr}:00` : cleanTimeStr;
      const p = new Date(`${withSec}+07:00`);
      if (isNaN(p.getTime())) {
        return res.status(400).json({ success: false, error: 'Format tanggal & waktu tidak valid' });
      }
      parsedTimeIso = p.toISOString();
    } else {
      const p = new Date(cleanTimeStr);
      if (isNaN(p.getTime())) {
        return res.status(400).json({ success: false, error: 'Format tanggal & waktu tidak valid' });
      }
      parsedTimeIso = p.toISOString();
    }

    const invitationId = id ? String(id) : `inv_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const invitationEntry = {
      id: invitationId,
      type: invitationType,
      targetName: cleanTargetName,
      title: cleanTitle,
      eventTime: parsedTimeIso,
      durationHours: cleanDuration,
      mapLink: cleanMapLink,
      mapName: cleanMapName,
      description: cleanDescription,
      updatedAt: Date.now()
    };

    const targetUniverses = resolveTargetUniverses(targetExperience);
    const saveResults = [];

    for (const uniId of targetUniverses) {
      // Baca semua data lama dari DataStore (tanpa filter expired)
      const currentRes = await robloxService.getInvitations(uniId, false);
      let list = currentRes.data || [];

      const existingIndex = list.findIndex(item => String(item.id) === invitationId);
      if (existingIndex >= 0) {
        invitationEntry.createdAt = list[existingIndex].createdAt || Date.now();
        list[existingIndex] = invitationEntry;
      } else {
        invitationEntry.createdAt = Date.now();
        list.push(invitationEntry);
      }

      // Urutkan berdasarkan waktu acara
      list.sort((a, b) => new Date(a.eventTime).getTime() - new Date(b.eventTime).getTime());

      const writeRes = await robloxService.saveInvitations(list, uniId);
      if (writeRes.success) {
        await robloxService.publishOpenCloudMessage('GlobalInvitationSync', {
          action: 'save',
          invitationId,
          total: list.length,
          timestamp: Date.now()
        }, uniId);

        saveResults.push({ universeId: uniId, success: true, total: list.length });
      } else {
        saveResults.push({ universeId: uniId, success: false, error: writeRes.error });
      }
    }

    // Broadcast ke browser clients
    if (req.app.get('io')) {
      req.app.get('io').emit('invitations_updated', {
        action: 'save',
        invitation: invitationEntry,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: `Jadwal undangan "${cleanTitle}" berhasil disimpan ke DataStore Roblox!`,
      data: invitationEntry,
      saveResults
    });
  } catch (err) {
    console.error('Error saving invitation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/invitations/delete
 * Hapus jadwal undangan dari Roblox DataStore
 */
router.post('/invitations/delete', requireAdminAuth, async (req, res) => {
  try {
    const { id, targetExperience } = req.body;
    if (!id) {
      return res.status(400).json({ success: false, error: 'ID jadwal undangan wajib disertakan' });
    }

    const invitationId = String(id);
    const targetUniverses = resolveTargetUniverses(targetExperience);
    const deleteResults = [];

    for (const uniId of targetUniverses) {
      const currentRes = await robloxService.getInvitations(uniId, false);
      let list = currentRes.data || [];
      const initialCount = list.length;
      list = list.filter(item => String(item.id) !== invitationId);

      const writeRes = await robloxService.saveInvitations(list, uniId);
      if (writeRes.success) {
        await robloxService.publishOpenCloudMessage('GlobalInvitationSync', {
          action: 'delete',
          invitationId,
          total: list.length,
          timestamp: Date.now()
        }, uniId);

        deleteResults.push({ universeId: uniId, success: true, deleted: initialCount - list.length });
      } else {
        deleteResults.push({ universeId: uniId, success: false, error: writeRes.error });
      }
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('invitations_updated', {
        action: 'delete',
        invitationId,
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: 'Jadwal undangan berhasil dihapus dari DataStore Roblox.',
      deleteResults
    });
  } catch (err) {
    console.error('Error deleting invitation:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/admin/invitations/cleanup-expired
 * Bersihkan seluruh jadwal yang sudah lewat secara otomatis dari DataStore
 */
router.post('/invitations/cleanup-expired', requireAdminAuth, async (req, res) => {
  try {
    const { targetExperience } = req.body;
    const targetUniverses = resolveTargetUniverses(targetExperience);
    const cleanupResults = [];
    const now = Date.now();

    for (const uniId of targetUniverses) {
      const currentRes = await robloxService.getInvitations(uniId, false);
      let list = currentRes.data || [];
      const beforeCount = list.length;
      list = robloxService.filterActiveInvitations(list, now);
      const cleanedCount = beforeCount - list.length;

      const writeRes = await robloxService.saveInvitations(list, uniId);
      if (writeRes.success) {
        await robloxService.publishOpenCloudMessage('GlobalInvitationSync', {
          action: 'cleanup',
          cleanedCount,
          total: list.length,
          timestamp: Date.now()
        }, uniId);

        cleanupResults.push({ universeId: uniId, success: true, cleanedCount, remainingTotal: list.length });
      } else {
        cleanupResults.push({ universeId: uniId, success: false, error: writeRes.error });
      }
    }

    if (req.app.get('io')) {
      req.app.get('io').emit('invitations_updated', {
        action: 'cleanup',
        timestamp: Date.now()
      });
    }

    res.json({
      success: true,
      message: 'Pembersihan jadwal kedaluwarsa berhasil diproses ke DataStore Roblox.',
      cleanupResults
    });
  } catch (err) {
    console.error('Error cleaning up invitations:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
