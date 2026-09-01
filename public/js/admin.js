// State Admin
let adminToken = localStorage.getItem('rb_admin_token') || '';
let allSongs = [];
let filteredSongs = [];
let currentPlaylistFilter = '';
let searchQuery = '';
let currentPage = 1;
const pageSize = 20;

// Socket.IO
let socket = null;
try {
  if (typeof io !== 'undefined') {
    socket = io();
  }
} catch (e) {}

// DOM Elements
const authOverlay = document.getElementById('admin-auth-overlay');
const loginForm = document.getElementById('admin-login-form');
const pinInput = document.getElementById('admin-pin-input');
const musicTbody = document.getElementById('admin-music-tbody');
const statTotalSongs = document.getElementById('stat-total-songs');
const statTotalPlaylists = document.getElementById('stat-total-playlists');
const statTotalAdmins = document.getElementById('stat-total-admins');
const filterPlaylist = document.getElementById('filter-playlist');
const searchMusicInput = document.getElementById('search-music-input');
const paginationInfo = document.getElementById('pagination-info');
const paginationControls = document.getElementById('pagination-controls');
const btnSyncRobloxDb = document.getElementById('btn-sync-roblox-db');
const btnPushDataStore = document.getElementById('btn-push-datastore');
const btnAddMusicModal = document.getElementById('btn-add-music-modal');
const musicEditModal = document.getElementById('music-edit-modal');
const btnCloseMusicModal = document.getElementById('btn-close-music-modal');
const formSaveMusic = document.getElementById('form-save-music');
const formManageRole = document.getElementById('form-manage-role');
const formManageLevel = document.getElementById('form-manage-level');
const formBroadcast = document.getElementById('form-broadcast');
const navBtns = document.querySelectorAll('.nav-btn');
const contentSections = document.querySelectorAll('.content-section');
const audioPlayer = document.getElementById('audio-preview-player');

// Notification Toast
function showToast(message) {
  const banner = document.getElementById('notification-banner');
  const text = document.getElementById('notification-text');
  if (banner && text) {
    text.textContent = message;
    banner.classList.add('show');
    setTimeout(() => banner.classList.remove('show'), 4000);
  }
}

// Check saved token on startup
if (adminToken) {
  verifyToken(adminToken);
}

// Login PIN Submit
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pin = pinInput.value.trim();
  if (!pin) return;
  await verifyToken(pin);
});

async function verifyToken(token) {
  try {
    const res = await fetch('/api/admin/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin: token })
    });
    const data = await res.json();
    if (data.success && data.token) {
      adminToken = data.token;
      localStorage.setItem('rb_admin_token', adminToken);
      authOverlay.style.display = 'none';
      loadAllMusic();
      loadAdminStats();
      showToast('Login berhasil sebagai Administrator');
    } else {
      localStorage.removeItem('rb_admin_token');
      alert(data.error || 'PIN Admin Salah');
    }
  } catch (err) {
    alert('Terjadi kesalahan saat autentikasi');
  }
}

// Fetch Admin Stats
async function loadAdminStats() {
  try {
    const res = await fetch('/api/admins');
    const data = await res.json();
    if (data.success) {
      statTotalAdmins.textContent = data.totalAdmins || 0;
    }
  } catch (e) {}
}

// Load All Music from API
async function loadAllMusic() {
  try {
    const res = await fetch('/api/admin/music/list', {
      headers: { 'x-admin-secret': adminToken }
    });
    const data = await res.json();
    if (data.success) {
      allSongs = data.data || [];
      statTotalSongs.textContent = allSongs.length;

      // Peringatkan admin jika data berasal dari cache lokal yang mungkin usang
      if (data.source === 'local_cache' || data.stale) {
        showToast('⚠️ DataStore Roblox tidak terjangkau. Menampilkan cache lokal (mungkin usang). Edit dinonaktifkan sementara oleh server.');
        statTotalSongs.style.color = '#ff0055';
      } else {
        statTotalSongs.style.color = '';
      }

      // Populate Playlist Filter
      const playlists = data.playlists || [];
      statTotalPlaylists.textContent = playlists.length;
      filterPlaylist.innerHTML = '<option value="">Semua Playlist</option>' +
        playlists.map(p => `<option value="${p}">${p}</option>`).join('');

      applyFilters();
    }
  } catch (err) {
    console.error('Error loading songs:', err);
    showToast('Gagal memuat database musik');
  }
}

// Apply Filter & Search
function applyFilters() {
  filteredSongs = allSongs.filter(song => {
    const matchPlaylist = !currentPlaylistFilter || song.playlist === currentPlaylistFilter;
    const query = searchQuery.toLowerCase();
    const matchQuery = !query || 
      (song.judul && song.judul.toLowerCase().includes(query)) ||
      (song.penyanyi && song.penyanyi.toLowerCase().includes(query)) ||
      (song.id && String(song.id).includes(query));
    return matchPlaylist && matchQuery;
  });

  currentPage = 1;
  renderTable();
}

// Render Table
function renderTable() {
  const total = filteredSongs.length;
  const startIdx = (currentPage - 1) * pageSize;
  const endIdx = Math.min(startIdx + pageSize, total);
  const pageItems = filteredSongs.slice(startIdx, endIdx);

  paginationInfo.textContent = total > 0 
    ? `Menampilkan ${startIdx + 1} - ${endIdx} dari ${total} lagu`
    : `Tidak ada data lagu`;

  renderPaginationControls(total);

  if (pageItems.length === 0) {
    musicTbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; color: var(--text-dim); padding: 30px;">
          Tidak ada lagu yang cocok dengan pencarian / filter.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  pageItems.forEach(item => {
    html += `
      <tr>
        <td>
          <button class="audio-preview-btn" onclick="previewAudio('${item.id}', ${item.playbackSpeed || 0.5})" title="Putar Preview">
            <i class="fa-solid fa-play"></i>
          </button>
        </td>
        <td><strong style="color: var(--secondary);">${item.id}</strong></td>
        <td><strong>${item.judul}</strong></td>
        <td style="color: var(--text-muted);">${item.penyanyi || '-'}</td>
        <td><span class="role-badge role-vip" style="font-size: 0.72rem;">${item.playlist || 'All Music'}</span></td>
        <td><span style="color: var(--accent-gold); font-weight: 700;">${item.playbackSpeed || 0.5}x</span></td>
        <td style="text-align: right;">
          <button class="btn btn-glass" style="padding: 4px 8px; font-size: 0.75rem;" onclick='openEditSongModal(${JSON.stringify(item)})'>
            <i class="fa-solid fa-pen"></i>
          </button>
          <button class="btn btn-glass" style="padding: 4px 8px; font-size: 0.75rem; color: #ff0055;" onclick="deleteSong('${item.id}', '${item.judul}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </td>
      </tr>
    `;
  });

  musicTbody.innerHTML = html;
}

// Render Pagination
function renderPaginationControls(total) {
  const totalPages = Math.ceil(total / pageSize) || 1;
  let html = '';

  if (totalPages > 1) {
    html += `<button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})"><i class="fa-solid fa-chevron-left"></i></button>`;
    
    for (let i = 1; i <= Math.min(5, totalPages); i++) {
      html += `<button class="page-btn ${currentPage === i ? 'active' : ''}" onclick="changePage(${i})">${i}</button>`;
    }
    if (totalPages > 5) {
      html += `<span style="padding: 4px;">...</span>`;
      html += `<button class="page-btn ${currentPage === totalPages ? 'active' : ''}" onclick="changePage(${totalPages})">${totalPages}</button>`;
    }

    html += `<button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})"><i class="fa-solid fa-chevron-right"></i></button>`;
  }

  paginationControls.innerHTML = html;
}

window.changePage = function(page) {
  currentPage = page;
  renderTable();
};

// Filter & Search Event Listeners
filterPlaylist.addEventListener('change', (e) => {
  currentPlaylistFilter = e.target.value;
  applyFilters();
});

searchMusicInput.addEventListener('input', (e) => {
  searchQuery = e.target.value.trim();
  applyFilters();
});

// Audio Preview
window.previewAudio = function(soundId, speed) {
  const url = `https://www.roblox.com/asset-media?id=${soundId}`;
  audioPlayer.src = url;
  audioPlayer.playbackRate = speed || 1.0;
  audioPlayer.play().catch(() => {
    window.open(`https://www.roblox.com/library/${soundId}`, '_blank');
  });
};

// Modal Operations
btnAddMusicModal.addEventListener('click', () => {
  document.getElementById('modal-music-form-title').innerHTML = '<i class="fa-solid fa-plus"></i> Tambah Lagu Baru';
  document.getElementById('edit-sound-id').value = '';
  document.getElementById('edit-sound-id').readOnly = false;
  document.getElementById('edit-judul').value = '';
  document.getElementById('edit-penyanyi').value = '';
  document.getElementById('edit-playlist').value = 'POP/R&B';
  document.getElementById('edit-speed').value = '0.5';
  musicEditModal.style.display = 'flex';
});

btnCloseMusicModal.addEventListener('click', () => {
  musicEditModal.style.display = 'none';
});

window.openEditSongModal = function(song) {
  document.getElementById('modal-music-form-title').innerHTML = '<i class="fa-solid fa-pen"></i> Edit Lagu';
  document.getElementById('edit-sound-id').value = song.id;
  document.getElementById('edit-sound-id').readOnly = true;
  document.getElementById('edit-judul').value = song.judul;
  document.getElementById('edit-penyanyi').value = song.penyanyi || '';
  document.getElementById('edit-playlist').value = song.playlist || 'All Music';
  document.getElementById('edit-speed').value = song.playbackSpeed || 0.5;
  musicEditModal.style.display = 'flex';
};

// Form Save Music
formSaveMusic.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    id: document.getElementById('edit-sound-id').value.trim(),
    judul: document.getElementById('edit-judul').value.trim(),
    penyanyi: document.getElementById('edit-penyanyi').value.trim(),
    playlist: document.getElementById('edit-playlist').value.trim(),
    playbackSpeed: parseFloat(document.getElementById('edit-speed').value) || 0.5
  };

  try {
    const res = await fetch('/api/admin/music/save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': adminToken
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      musicEditModal.style.display = 'none';
      loadAllMusic();
    } else {
      alert(data.error || 'Gagal menyimpan lagu');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi');
  }
});

const btnOpenBulkModal = document.getElementById('btn-open-bulk-modal');
const btnExportJson = document.getElementById('btn-export-json');
const bulkImportModal = document.getElementById('bulk-import-modal');
const btnCloseBulkModal = document.getElementById('btn-close-bulk-modal');
const formBulkImport = document.getElementById('form-bulk-import');
const bulkJsonContent = document.getElementById('bulk-json-content');
const bulkImportMode = document.getElementById('bulk-import-mode');
const btnUploadJsonFile = document.getElementById('btn-upload-json-file');
const bulkFileInput = document.getElementById('bulk-file-input');

// Open / Close Bulk Modal
if (btnOpenBulkModal) {
  btnOpenBulkModal.addEventListener('click', () => {
    bulkImportModal.style.display = 'flex';
  });
}

if (btnCloseBulkModal) {
  btnCloseBulkModal.addEventListener('click', () => {
    bulkImportModal.style.display = 'none';
  });
}

// File Upload Handler
if (btnUploadJsonFile && bulkFileInput) {
  btnUploadJsonFile.addEventListener('click', () => bulkFileInput.click());
  bulkFileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        bulkJsonContent.value = event.target.result;
      };
      reader.readAsText(file);
    }
  });
}

// Submit Bulk Import
if (formBulkImport) {
  formBulkImport.addEventListener('submit', async (e) => {
    e.preventDefault();
    const rawVal = bulkJsonContent.value.trim();
    if (!rawVal) return;

    showToast('Memproses Bulk Import...');
    try {
      const res = await fetch('/api/admin/music/bulk-import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminToken
        },
        body: JSON.stringify({
          jsonData: rawVal,
          mode: bulkImportMode.value
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        bulkImportModal.style.display = 'none';
        bulkJsonContent.value = '';
        loadAllMusic();
      } else {
        alert(data.error || 'Gagal bulk import');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi saat bulk import');
    }
  });
}

// Delete Song
window.deleteSong = async function(id, title) {
  if (!confirm(`Apakah Anda yakin ingin menghapus lagu "${title}" (${id})?`)) return;

  try {
    const res = await fetch('/api/admin/music/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': adminToken
      },
      body: JSON.stringify({ id })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Lagu berhasil dihapus');
      loadAllMusic();
    } else {
      alert(data.error || 'Gagal menghapus lagu');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi');
  }
};

// Sync with exact Roblox MusicDatabase
if (btnSyncRobloxDb) {
  btnSyncRobloxDb.addEventListener('click', async () => {
    if (!confirm('Sinkronisasi ulang database dengan daftar lagu resmi di Roblox MusicDatabase?')) return;
    
    showToast('Menyinkronkan data musik Roblox...');
    try {
      const res = await fetch('/api/admin/music/sync-roblox-db', {
        method: 'POST',
        headers: { 'x-admin-secret': adminToken }
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        loadAllMusic();
      } else {
        alert(data.error || 'Gagal sinkron data');
      }
    } catch (err) {
      alert('Terjadi kesalahan server saat sinkron');
    }
  });
}

// Export JSON
if (btnExportJson) {
  btnExportJson.addEventListener('click', () => {
    window.open(`/api/admin/music/export-json?secret=${encodeURIComponent(adminToken)}`, '_blank');
  });
}

// Push DataStore Manual
btnPushDataStore.addEventListener('click', async () => {
  showToast('Menyimpan database musik ke DataStore Roblox...');
  try {
    const res = await fetch('/api/admin/music/push-datastore', {
      method: 'POST',
      headers: { 'x-admin-secret': adminToken }
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
    } else {
      alert(data.error || 'Gagal push ke DataStore');
    }
  } catch (err) {
    alert('Terjadi kesalahan');
  }
});

// Form Manage Role
formManageRole.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    userId: document.getElementById('role-user-id').value.trim(),
    username: document.getElementById('role-username').value.trim(),
    role: document.getElementById('role-select').value
  };

  try {
    const res = await fetch('/api/admin/player/role', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': adminToken
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      loadAdminStats();
    } else {
      alert(data.error || 'Gagal mengubah role');
    }
  } catch (err) {
    alert('Terjadi kesalahan');
  }
});

// Form Manage Level
formManageLevel.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    userId: document.getElementById('level-user-id').value.trim(),
    level: document.getElementById('level-input').value
  };

  try {
    const res = await fetch('/api/admin/player/level', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': adminToken
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
    } else {
      alert(data.error || 'Gagal memperbarui star level');
    }
  } catch (err) {
    alert('Terjadi kesalahan');
  }
});

// Form Broadcast
formBroadcast.addEventListener('submit', async (e) => {
  e.preventDefault();
  const payload = {
    author: document.getElementById('broadcast-author').value.trim(),
    message: document.getElementById('broadcast-message').value.trim(),
    duration: document.getElementById('broadcast-duration').value
  };

  try {
    const res = await fetch('/api/admin/broadcast', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': adminToken
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (data.success) {
      showToast('Pengumuman broadcast berhasil disiarkan!');
      document.getElementById('broadcast-message').value = '';
    } else {
      alert(data.error || 'Gagal mengirim broadcast');
    }
  } catch (err) {
    alert('Terjadi kesalahan');
  }
});

// Navigation Switcher
navBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    navBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const targetId = btn.getAttribute('data-target');

    contentSections.forEach(sec => {
      sec.classList.remove('active');
      if (sec.id === targetId) sec.classList.add('active');
    });

    const pageTitle = document.getElementById('admin-page-title');
    const pageSubtitle = document.getElementById('admin-page-subtitle');
    if (targetId === 'music-manager-section') {
      pageTitle.innerHTML = `<i class="fa-solid fa-music" style="color: var(--accent-gold);"></i> Manajemen Database Musik`;
      pageSubtitle.textContent = `Kelola seluruh daftar musik Roblox DataStore tanpa perlu re-publish game`;
    } else if (targetId === 'player-manager-section') {
      pageTitle.innerHTML = `<i class="fa-solid fa-user-gear" style="color: var(--secondary);"></i> Kelola Pemain & Role`;
      pageSubtitle.textContent = `Ubah role, rank admin, dan star level pemain secara realtime`;
    } else if (targetId === 'broadcast-section') {
      pageTitle.innerHTML = `<i class="fa-solid fa-bullhorn" style="color: #06d6a0;"></i> In-Game Broadcast`;
      pageSubtitle.textContent = `Siarkan pesan banner penting ke seluruh server aktif`;
    }
  });
});
