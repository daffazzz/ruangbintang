// State Admin
let adminToken = localStorage.getItem('rb_admin_token') || '';
let selectedExperience = localStorage.getItem('rb_selected_experience') || 'primary';
let allSongs = [];
let filteredSongs = [];
let allPlaylists = [];
let hiddenPlaylists = [];
let playlistCovers = {};
let currentPlaylistFilter = '';
let searchQuery = '';
let currentPage = 1;
const pageSize = 20;

// State Invitations
let allAdminInvitations = [];
let filteredAdminInvitations = [];
let currentInvTypeFilter = '';
let invSearchQuery = '';

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
const selectActiveExperience = document.getElementById('select-active-experience');
const sidebarUniverseText = document.getElementById('sidebar-universe-text');
const musicTbody = document.getElementById('admin-music-tbody');
const statTotalSongs = document.getElementById('stat-total-songs');
const statTotalPlaylists = document.getElementById('stat-total-playlists');
const statTotalAdmins = document.getElementById('stat-total-admins');
const statTotalInvitations = document.getElementById('stat-total-invitations');
const filterPlaylist = document.getElementById('filter-playlist');
const btnManagePlaylists = document.getElementById('btn-manage-playlists');
const btnRenamePlaylist = document.getElementById('btn-rename-playlist');
const btnEditPlaylistCover = document.getElementById('btn-edit-playlist-cover');
const btnToggleHidePlaylist = document.getElementById('btn-toggle-hide-playlist');
const btnDeletePlaylist = document.getElementById('btn-delete-playlist');
const playlistsManagerModal = document.getElementById('playlists-manager-modal');
const btnClosePlaylistsModal = document.getElementById('btn-close-playlists-modal');
const playlistsManagerTbody = document.getElementById('playlists-manager-tbody');
const renamePlaylistModal = document.getElementById('rename-playlist-modal');
const btnCloseRenamePlaylistModal = document.getElementById('btn-close-rename-playlist-modal');
const formRenamePlaylist = document.getElementById('form-rename-playlist');
const renamePlaylistOld = document.getElementById('rename-playlist-old');
const renamePlaylistNew = document.getElementById('rename-playlist-new');
const playlistCoverModal = document.getElementById('playlist-cover-modal');
const btnClosePlaylistCoverModal = document.getElementById('btn-close-playlist-cover-modal');
const formPlaylistCover = document.getElementById('form-playlist-cover');
const modalCoverPlaylistName = document.getElementById('modal-cover-playlist-name');
const playlistCoverInput = document.getElementById('playlist-cover-input');
const playlistCoverTargetExp = document.getElementById('playlist-cover-target-experience');
const playlistCoverPreviewImg = document.getElementById('playlist-cover-preview-img');
const playlistCoverPreviewEmpty = document.getElementById('playlist-cover-preview-empty');
const btnClearPlaylistCover = document.getElementById('btn-clear-playlist-cover');
const searchMusicInput = document.getElementById('search-music-input');
const paginationInfo = document.getElementById('pagination-info');
const paginationControls = document.getElementById('pagination-controls');
const btnSyncRobloxDb = document.getElementById('btn-sync-roblox-db');
const btnPushDataStore = document.getElementById('btn-push-datastore');
const btnAddMusicModal = document.getElementById('btn-add-music-modal');
const musicEditModal = document.getElementById('music-edit-modal');
const btnCloseMusicModal = document.getElementById('btn-close-music-modal');
const formSaveMusic = document.getElementById('form-save-music');
const editSampul = document.getElementById('edit-sampul');
const editSongCoverPreview = document.getElementById('edit-song-cover-preview');
const editSongCoverHint = document.getElementById('edit-song-cover-hint');
const formManageRole = document.getElementById('form-manage-role');
const formManageLevel = document.getElementById('form-manage-level');
const formBroadcast = document.getElementById('form-broadcast');
const navBtns = document.querySelectorAll('.nav-btn');
const contentSections = document.querySelectorAll('.content-section');
const audioPlayer = document.getElementById('audio-preview-player');

// Duplicate Finder Elements
const btnFindDuplicates = document.getElementById('btn-find-duplicates');
const duplicatesModal = document.getElementById('duplicates-modal');
const btnCloseDuplicatesModal = document.getElementById('btn-close-duplicates-modal');
const duplicatesSummary = document.getElementById('duplicates-summary');
const duplicatesList = document.getElementById('duplicates-list');
const duplicatesEmpty = document.getElementById('duplicates-empty');
const duplicatesFooter = document.getElementById('duplicates-footer');
const duplicatesDeleteCount = document.getElementById('duplicates-delete-count');
const duplicatesKeepCount = document.getElementById('duplicates-keep-count');
const btnKeepFirstEach = document.getElementById('btn-keep-first-each');
const btnDeleteDuplicates = document.getElementById('btn-delete-duplicates');

// Invitations Admin Elements
const adminInvStatActive = document.getElementById('admin-inv-stat-active');
const adminInvStatDiInvite = document.getElementById('admin-inv-stat-di-invite');
const adminInvStatMengInvite = document.getElementById('admin-inv-stat-meng-invite');
const adminInvStatExpired = document.getElementById('admin-inv-stat-expired');
const adminInvitationsTbody = document.getElementById('admin-invitations-tbody');
const adminInvPaginationInfo = document.getElementById('admin-inv-pagination-info');
const adminFilterInvType = document.getElementById('admin-filter-inv-type');
const adminSearchInvInput = document.getElementById('admin-search-inv-input');
const btnAddInvitationModal = document.getElementById('btn-add-invitation-modal');
const btnCleanupExpired = document.getElementById('btn-cleanup-expired');

const invitationEditModal = document.getElementById('invitation-edit-modal');
const btnCloseInvModal = document.getElementById('btn-close-inv-modal');
const formSaveInvitation = document.getElementById('form-save-invitation');
const editInvId = document.getElementById('edit-inv-id');
const editInvTargetExp = document.getElementById('edit-inv-target-exp');
const editInvType = document.getElementById('edit-inv-type');
const editInvTargetName = document.getElementById('edit-inv-target-name');
const labelInvTargetName = document.getElementById('label-inv-target-name');
const editInvTitle = document.getElementById('edit-inv-title');
const editInvTime = document.getElementById('edit-inv-time');
const editInvDuration = document.getElementById('edit-inv-duration');
const editInvMapLink = document.getElementById('edit-inv-map-link');
const editInvMapName = document.getElementById('edit-inv-map-name');
const editInvDescription = document.getElementById('edit-inv-description');
const modalInvFormTitle = document.getElementById('modal-inv-form-title');
const btnSubmitInvText = document.getElementById('btn-submit-inv-text');

// Mobile Navigation Elements
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const mobileSidebarClose = document.getElementById('mobile-sidebar-close');
const mobileOverlay = document.getElementById('mobile-overlay');
const appSidebar = document.getElementById('app-sidebar');

function openMobileSidebar(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (appSidebar) {
    appSidebar.classList.add('open');
  }
  if (mobileOverlay) {
    mobileOverlay.classList.add('active');
  }
  document.body.style.overflow = 'hidden';
}

function closeMobileSidebar(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }
  if (appSidebar) {
    appSidebar.classList.remove('open');
  }
  if (mobileOverlay) {
    mobileOverlay.classList.remove('active');
  }
  document.body.style.overflow = '';
}

if (mobileMenuToggle) {
  mobileMenuToggle.addEventListener('click', openMobileSidebar);
}

if (mobileSidebarClose) {
  mobileSidebarClose.addEventListener('click', closeMobileSidebar);
}

if (mobileOverlay) {
  mobileOverlay.addEventListener('click', closeMobileSidebar);
}

if (appSidebar) {
  appSidebar.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

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

// Load Experience List from Backend
async function loadExperiencesList() {
  if (!selectActiveExperience) return;
  try {
    const res = await fetch('/api/admin/experiences', {
      headers: { 'x-admin-secret': adminToken }
    });
    const data = await res.json();
    if (data.success && data.data && data.data.length > 0) {
      selectActiveExperience.innerHTML = data.data.map((exp, idx) => {
        const val = idx === 0 ? 'primary' : 'secondary';
        return `<option value="${val}">${exp.name} (Uni: ${exp.universeId})</option>`;
      }).join('');

      if (selectedExperience) {
        selectActiveExperience.value = selectedExperience;
      }
      updateSidebarUniverseInfo(data.data);
    }
  } catch (e) {
    console.warn('Gagal memuat daftar experience:', e);
  }
}

function updateSidebarUniverseInfo(experiencesList) {
  if (!sidebarUniverseText) return;
  const activeVal = selectActiveExperience ? selectActiveExperience.value : 'primary';
  const exp = activeVal === 'secondary' && experiencesList && experiencesList[1]
    ? experiencesList[1]
    : (experiencesList ? experiencesList[0] : null);
    
  if (exp) {
    sidebarUniverseText.textContent = `Universe: ${exp.universeId}`;
  }
}

// Experience Selector Change Listener
if (selectActiveExperience) {
  selectActiveExperience.value = selectedExperience;
  selectActiveExperience.addEventListener('change', (e) => {
    selectedExperience = e.target.value;
    localStorage.setItem('rb_selected_experience', selectedExperience);
    loadAllMusic();
    loadAllInvitations();
  });
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
      await loadExperiencesList();
      loadAllMusic();
      loadAllInvitations();
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
    const target = selectActiveExperience ? selectActiveExperience.value : selectedExperience;
    const res = await fetch(`/api/admin/music/list?experience=${encodeURIComponent(target)}`, {
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

      // Update sidebar universe ID display
      if (sidebarUniverseText && data.universeId) {
        sidebarUniverseText.textContent = `Universe: ${data.universeId}`;
      }

      // Populate Playlist Filter
      const playlists = data.playlists || [];
      allPlaylists = playlists;
      hiddenPlaylists = data.hiddenPlaylists || [];
      playlistCovers = data.playlistCovers || {};
      
      const hiddenCount = hiddenPlaylists.length;
      statTotalPlaylists.textContent = playlists.length + (hiddenCount > 0 ? ` (${hiddenCount} Hidden)` : '');

      const previousVal = filterPlaylist.value;
      filterPlaylist.innerHTML = '<option value="">Semua Playlist</option>' +
        playlists.map(p => {
          const isH = hiddenPlaylists.some(h => h.toLowerCase() === p.toLowerCase());
          const hasCover = !!(playlistCovers[p]);
          const coverIcon = hasCover ? ' 🖼️' : '';
          return `<option value="${p}">${p}${coverIcon}${isH ? ' 👁️‍🗨️ [Hidden]' : ''}</option>`;
        }).join('');

      if (previousVal && playlists.includes(previousVal)) {
        filterPlaylist.value = previousVal;
      }
      updatePlaylistButtonsState();

      applyFilters();
    }
  } catch (err) {
    console.error('Error loading songs:', err);
    showToast('Gagal memuat database musik');
  }
}

// Helper untuk URL Cover Asset Roblox / Web Image
function resolveAssetImageUrl(rawCover) {
  if (!rawCover) return '';
  const str = String(rawCover).trim();
  if (!str) return '';
  if (str.startsWith('http://') || str.startsWith('https://') || str.startsWith('data:')) {
    return str;
  }
  const numMatch = str.match(/\d+/);
  if (numMatch) {
    return `/api/asset-thumbnail/${numMatch[0]}`;
  }
  return '';
}

// Helper resolusi cover efektif: Cover Bawaan Lagu > Cover Album Playlist > Default
function getEffectiveSongCover(song) {
  if (!song) return { url: '', raw: '', source: 'none' };
  if (song.sampul && String(song.sampul).trim() !== '') {
    return {
      url: resolveAssetImageUrl(song.sampul),
      raw: song.sampul,
      source: 'song'
    };
  }
  const plName = song.playlist || 'All Music';
  const plCover = playlistCovers[plName];
  if (plCover && String(plCover).trim() !== '') {
    return {
      url: resolveAssetImageUrl(plCover),
      raw: plCover,
      source: 'playlist',
      playlistName: plName
    };
  }
  return {
    url: '',
    raw: '',
    source: 'none',
    playlistName: plName
  };
}

// Helper perbarui tombol aksi playlist di toolbar
function updatePlaylistButtonsState() {
  if (!btnDeletePlaylist || !btnToggleHidePlaylist) return;
  if (currentPlaylistFilter && currentPlaylistFilter !== 'All Music') {
    btnDeletePlaylist.style.display = 'inline-flex';
    btnDeletePlaylist.querySelector('span').textContent = `Hapus Playlist "${currentPlaylistFilter}"`;

    if (btnRenamePlaylist) {
      btnRenamePlaylist.style.display = 'inline-flex';
    }

    if (btnEditPlaylistCover) {
      btnEditPlaylistCover.style.display = 'inline-flex';
      btnEditPlaylistCover.title = `Edit Cover Album Playlist "${currentPlaylistFilter}"`;
    }

    const isHidden = hiddenPlaylists.some(h => h.toLowerCase() === currentPlaylistFilter.toLowerCase());
    btnToggleHidePlaylist.style.display = 'inline-flex';
    if (isHidden) {
      btnToggleHidePlaylist.style.color = '#10b981';
      btnToggleHidePlaylist.style.borderColor = 'rgba(16, 185, 129, 0.4)';
      btnToggleHidePlaylist.innerHTML = '<i class="fa-solid fa-eye"></i> <span>Tampilkan di Roblox</span>';
      btnToggleHidePlaylist.title = 'Tampilkan kembali playlist ini di game Roblox';
    } else {
      btnToggleHidePlaylist.style.color = '#f59e0b';
      btnToggleHidePlaylist.style.borderColor = 'rgba(245, 158, 11, 0.4)';
      btnToggleHidePlaylist.innerHTML = '<i class="fa-solid fa-eye-slash"></i> <span>Sembunyikan di Roblox</span>';
      btnToggleHidePlaylist.title = 'Sembunyikan playlist ini dari game Roblox';
    }
  } else {
    btnDeletePlaylist.style.display = 'none';
    btnToggleHidePlaylist.style.display = 'none';
    if (btnRenamePlaylist) {
      btnRenamePlaylist.style.display = 'none';
    }
    if (btnEditPlaylistCover) {
      btnEditPlaylistCover.style.display = 'none';
    }
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
        <td colspan="8" style="text-align: center; color: var(--text-dim); padding: 30px;">
          Tidak ada lagu yang cocok dengan pencarian / filter.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  pageItems.forEach(item => {
    const isHidden = hiddenPlaylists.some(h => h.toLowerCase() === (item.playlist || '').toLowerCase());
    const playlistBadge = isHidden
      ? `<span class="role-badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border-color: rgba(239, 68, 68, 0.3); font-size: 0.72rem;" title="Playlist ini disembunyikan dari game Roblox"><i class="fa-solid fa-eye-slash"></i> ${item.playlist || 'All Music'} <span style="font-size: 0.65rem; opacity: 0.85;">[Hidden]</span></span>`
      : `<span class="role-badge role-vip" style="font-size: 0.72rem;">${item.playlist || 'All Music'}</span>`;

    const effectiveCover = getEffectiveSongCover(item);
    let coverHtml = '';
    if (effectiveCover.url) {
      const isCustomSong = effectiveCover.source === 'song';
      const tip = isCustomSong ? `Cover Album Bawaan Lagu (${effectiveCover.raw})` : `Cover Album Playlist "${effectiveCover.playlistName}" (${effectiveCover.raw})`;
      const badgeIndicator = isCustomSong
        ? `<span style="position: absolute; bottom: 2px; right: 2px; width: 8px; height: 8px; border-radius: 50%; background: #10b981; border: 1.5px solid #111;" title="Cover bawaan lagu"></span>`
        : `<span style="position: absolute; bottom: 2px; right: 2px; width: 8px; height: 8px; border-radius: 50%; background: #ec4899; border: 1.5px solid #111;" title="Cover album playlist"></span>`;
      coverHtml = `
        <div style="position: relative; width: 38px; height: 38px; margin: 0 auto; border-radius: 6px; overflow: hidden; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);" title="${escapeAdminAttr(tip)}">
          <img src="${effectiveCover.url}" alt="Cover" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; color: var(--text-dim);"><i class="fa-solid fa-compact-disc"></i></div>
          ${badgeIndicator}
        </div>
      `;
    } else {
      coverHtml = `
        <div style="width: 38px; height: 38px; margin: 0 auto; border-radius: 6px; background: rgba(255,255,255,0.04); border: 1px dashed rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: var(--text-dim);" title="Tidak ada cover khusus (Default game)">
          <i class="fa-solid fa-compact-disc" style="font-size: 1.1rem; opacity: 0.35;"></i>
        </div>
      `;
    }

    html += `
      <tr>
        <td style="text-align: center;">${coverHtml}</td>
        <td>
          <button class="audio-preview-btn" onclick="previewAudio('${item.id}', ${item.playbackSpeed || 0.5})" title="Putar Preview">
            <i class="fa-solid fa-play"></i>
          </button>
        </td>
        <td><strong style="color: var(--secondary);">${item.id}</strong></td>
        <td><strong>${item.judul}</strong></td>
        <td style="color: var(--text-muted);">${item.penyanyi || '-'}</td>
        <td>${playlistBadge}</td>
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
  updatePlaylistButtonsState();
  applyFilters();
});

// Toggle Sembunyikan / Tampilkan Playlist
if (btnToggleHidePlaylist) {
  btnToggleHidePlaylist.addEventListener('click', async () => {
    if (!currentPlaylistFilter || currentPlaylistFilter === 'All Music') return;
    const currentExp = selectActiveExperience ? selectActiveExperience.value : selectedExperience;
    const isCurrentlyHidden = hiddenPlaylists.some(h => h.toLowerCase() === currentPlaylistFilter.toLowerCase());
    const actionText = isCurrentlyHidden ? 'menampilkan kembali' : 'menyembunyikan';

    if (!confirm(`Apakah Anda yakin ingin ${actionText} playlist "${currentPlaylistFilter}" di game Roblox?`)) return;

    showToast(`Memproses ${actionText} playlist "${currentPlaylistFilter}"...`);
    try {
      const res = await fetch('/api/admin/music/toggle-hide-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminToken
        },
        body: JSON.stringify({
          playlistName: currentPlaylistFilter,
          targetExperience: currentExp
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        loadAllMusic();
      } else {
        alert(data.error || 'Gagal mengubah status playlist');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi saat mengubah status playlist');
    }
  });
}

// Modal Kelola Visibilitas Playlist
if (btnManagePlaylists) {
  btnManagePlaylists.addEventListener('click', () => {
    openPlaylistsManagerModal();
  });
}

if (btnClosePlaylistsModal) {
  btnClosePlaylistsModal.addEventListener('click', () => {
    playlistsManagerModal.style.display = 'none';
  });
}

window.addEventListener('click', (e) => {
  if (e.target === playlistsManagerModal) {
    playlistsManagerModal.style.display = 'none';
  }
});

function openPlaylistsManagerModal() {
  if (!playlistsManagerTbody) return;

  const counts = {};
  allSongs.forEach(s => {
    const pl = s.playlist || 'All Music';
    counts[pl] = (counts[pl] || 0) + 1;
  });

  const uniquePlaylists = allPlaylists.length > 0 ? allPlaylists : Object.keys(counts);

  let html = '';
  uniquePlaylists.forEach(pl => {
    const count = counts[pl] || 0;
    const isHidden = hiddenPlaylists.some(h => h.toLowerCase() === pl.toLowerCase());
    const isAllMusic = pl.toLowerCase() === 'all music';

    const statusBadge = isHidden
      ? `<span class="role-badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border-color: rgba(239, 68, 68, 0.3); font-size: 0.76rem;"><i class="fa-solid fa-eye-slash"></i> Tersembunyi</span>`
      : `<span class="role-badge role-player" style="background: rgba(16, 185, 129, 0.15); color: #10b981; border-color: rgba(16, 185, 129, 0.3); font-size: 0.76rem;"><i class="fa-solid fa-eye"></i> Tampil</span>`;

    let actionBtn = '';
    if (isAllMusic) {
      actionBtn = `<span style="font-size: 0.75rem; color: var(--text-dim);">Kategori Utama</span>`;
    } else if (isHidden) {
      actionBtn = `
        <div style="display: inline-flex; gap: 6px;">
          <button class="btn btn-glass" style="padding: 5px 10px; font-size: 0.78rem; color: #ec4899; border-color: rgba(236, 72, 153, 0.4);" onclick="openPlaylistCoverModal('${escapeAdminAttr(pl)}')">
            <i class="fa-solid fa-image"></i> Cover
          </button>
          <button class="btn btn-glass" style="padding: 5px 10px; font-size: 0.78rem; color: #00d2ff; border-color: rgba(0, 210, 255, 0.3);" onclick="openRenamePlaylistModal('${escapeAdminAttr(pl)}')">
            <i class="fa-solid fa-pen"></i> Ganti Nama
          </button>
          <button class="btn btn-glass" style="padding: 5px 12px; font-size: 0.78rem; color: #10b981; border-color: rgba(16, 185, 129, 0.4);" onclick="togglePlaylistHide('${escapeAdminAttr(pl)}', false)">
            <i class="fa-solid fa-eye"></i> Tampilkan
          </button>
        </div>
      `;
    } else {
      actionBtn = `
        <div style="display: inline-flex; gap: 6px;">
          <button class="btn btn-glass" style="padding: 5px 10px; font-size: 0.78rem; color: #ec4899; border-color: rgba(236, 72, 153, 0.4);" onclick="openPlaylistCoverModal('${escapeAdminAttr(pl)}')">
            <i class="fa-solid fa-image"></i> Cover
          </button>
          <button class="btn btn-glass" style="padding: 5px 10px; font-size: 0.78rem; color: #00d2ff; border-color: rgba(0, 210, 255, 0.3);" onclick="openRenamePlaylistModal('${escapeAdminAttr(pl)}')">
            <i class="fa-solid fa-pen"></i> Ganti Nama
          </button>
          <button class="btn btn-glass" style="padding: 5px 12px; font-size: 0.78rem; color: #f59e0b; border-color: rgba(245, 158, 11, 0.4);" onclick="togglePlaylistHide('${escapeAdminAttr(pl)}', true)">
            <i class="fa-solid fa-eye-slash"></i> Sembunyikan
          </button>
        </div>
      `;
    }

    const plCover = playlistCovers[pl];
    const plCoverUrl = resolveAssetImageUrl(plCover);
    let plCoverHtml = '';
    if (plCoverUrl) {
      plCoverHtml = `
        <div style="width: 36px; height: 36px; margin: 0 auto; border-radius: 6px; overflow: hidden; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);" title="${escapeAdminAttr(plCover)}">
          <img src="${plCoverUrl}" alt="Cover" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
          <div style="display: none; width: 100%; height: 100%; align-items: center; justify-content: center; color: var(--text-dim);"><i class="fa-solid fa-compact-disc"></i></div>
        </div>
      `;
    } else {
      plCoverHtml = `
        <div style="width: 36px; height: 36px; margin: 0 auto; border-radius: 6px; background: rgba(255,255,255,0.04); border: 1px dashed rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; color: var(--text-dim);" title="Default album (belum ada cover khusus)">
          <i class="fa-solid fa-compact-disc" style="font-size: 1rem; opacity: 0.35;"></i>
        </div>
      `;
    }

    html += `
      <tr>
        <td style="text-align: center;">${plCoverHtml}</td>
        <td><strong style="color: #fff;">${escapeAdminHtml(pl)}</strong></td>
        <td style="text-align: center;"><span class="role-badge role-vip" style="font-size: 0.76rem;">${count} Lagu</span></td>
        <td style="text-align: center;">${statusBadge}</td>
        <td style="text-align: right;">${actionBtn}</td>
      </tr>
    `;
  });

  playlistsManagerTbody.innerHTML = html;
  playlistsManagerModal.style.display = 'flex';
}

window.togglePlaylistHide = async function(playlistName, targetHideState) {
  const currentExp = selectActiveExperience ? selectActiveExperience.value : selectedExperience;
  const actionText = targetHideState ? 'menyembunyikan' : 'menampilkan kembali';
  showToast(`Memproses ${actionText} playlist "${playlistName}"...`);

  try {
    const res = await fetch('/api/admin/music/toggle-hide-playlist', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': adminToken
      },
      body: JSON.stringify({
        playlistName,
        isHidden: targetHideState,
        targetExperience: currentExp
      })
    });
    const data = await res.json();
    if (data.success) {
      showToast(data.message);
      hiddenPlaylists = data.hiddenPlaylists || [];
      openPlaylistsManagerModal();
      loadAllMusic();
    } else {
      alert(data.error || 'Gagal mengubah status playlist');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi');
  }
};

// Rename Playlist
if (btnRenamePlaylist) {
  btnRenamePlaylist.addEventListener('click', () => {
    if (!currentPlaylistFilter || currentPlaylistFilter === 'All Music') return;
    openRenamePlaylistModal(currentPlaylistFilter);
  });
}

window.openRenamePlaylistModal = function(playlistName) {
  if (!renamePlaylistModal) return;
  renamePlaylistOld.value = playlistName;
  renamePlaylistNew.value = playlistName;
  renamePlaylistModal.style.display = 'flex';
  setTimeout(() => {
    if (renamePlaylistNew) {
      renamePlaylistNew.focus();
      renamePlaylistNew.select();
    }
  }, 100);
};

if (btnCloseRenamePlaylistModal) {
  btnCloseRenamePlaylistModal.addEventListener('click', () => {
    renamePlaylistModal.style.display = 'none';
  });
}

window.addEventListener('click', (e) => {
  if (e.target === renamePlaylistModal) {
    renamePlaylistModal.style.display = 'none';
  }
});

if (formRenamePlaylist) {
  formRenamePlaylist.addEventListener('submit', async (e) => {
    e.preventDefault();
    const oldName = renamePlaylistOld.value.trim();
    const newName = renamePlaylistNew.value.trim();
    const currentExp = selectActiveExperience ? selectActiveExperience.value : selectedExperience;

    if (!oldName || !newName) {
      alert('Nama playlist lama dan baru wajib diisi!');
      return;
    }

    if (oldName.toLowerCase() === newName.toLowerCase()) {
      alert('Nama playlist baru sama dengan nama lama. Silakan ketik nama yang berbeda.');
      return;
    }

    showToast(`Mengganti nama playlist "${oldName}" menjadi "${newName}"...`);

    try {
      const res = await fetch('/api/admin/music/rename-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminToken
        },
        body: JSON.stringify({
          oldPlaylistName: oldName,
          newPlaylistName: newName,
          targetExperience: currentExp
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        renamePlaylistModal.style.display = 'none';

        if (currentPlaylistFilter.toLowerCase() === oldName.toLowerCase()) {
          currentPlaylistFilter = newName;
        }

        if (playlistsManagerModal && playlistsManagerModal.style.display === 'flex') {
          openPlaylistsManagerModal();
        }

        loadAllMusic();
      } else {
        alert(data.error || 'Gagal mengubah nama playlist');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi saat mengganti nama playlist');
    }
  });
}

// ============================================
// PLAYLIST COVER MANAGER
// ============================================
if (btnEditPlaylistCover) {
  btnEditPlaylistCover.addEventListener('click', () => {
    if (!currentPlaylistFilter || currentPlaylistFilter === 'All Music') return;
    openPlaylistCoverModal(currentPlaylistFilter);
  });
}

window.openPlaylistCoverModal = function(playlistName) {
  if (!playlistCoverModal) return;
  modalCoverPlaylistName.textContent = playlistName;
  const currentCover = playlistCovers[playlistName] || '';
  if (playlistCoverInput) {
    playlistCoverInput.value = currentCover;
  }
  
  if (playlistCoverTargetExp) {
    playlistCoverTargetExp.value = selectActiveExperience ? selectActiveExperience.value : selectedExperience;
  }
  
  updatePlaylistCoverModalPreview();
  playlistCoverModal.style.display = 'flex';
  setTimeout(() => {
    if (playlistCoverInput) {
      playlistCoverInput.focus();
      playlistCoverInput.select();
    }
  }, 100);
};

function updatePlaylistCoverModalPreview() {
  if (!playlistCoverPreviewImg || !playlistCoverPreviewEmpty) return;
  const raw = playlistCoverInput ? playlistCoverInput.value.trim() : '';
  const url = resolveAssetImageUrl(raw);
  if (url) {
    playlistCoverPreviewImg.src = url;
    playlistCoverPreviewImg.style.display = 'block';
    playlistCoverPreviewEmpty.style.display = 'none';
  } else {
    playlistCoverPreviewImg.style.display = 'none';
    playlistCoverPreviewEmpty.style.display = 'block';
  }
}

if (playlistCoverInput) {
  playlistCoverInput.addEventListener('input', updatePlaylistCoverModalPreview);
}

if (btnClearPlaylistCover) {
  btnClearPlaylistCover.addEventListener('click', () => {
    if (playlistCoverInput) {
      playlistCoverInput.value = '';
      updatePlaylistCoverModalPreview();
    }
  });
}

if (btnClosePlaylistCoverModal) {
  btnClosePlaylistCoverModal.addEventListener('click', () => {
    playlistCoverModal.style.display = 'none';
  });
}

window.addEventListener('click', (e) => {
  if (e.target === playlistCoverModal) {
    playlistCoverModal.style.display = 'none';
  }
});

if (formPlaylistCover) {
  formPlaylistCover.addEventListener('submit', async (e) => {
    e.preventDefault();
    const playlistName = modalCoverPlaylistName.textContent.trim();
    const coverVal = playlistCoverInput.value.trim();
    const targetExp = playlistCoverTargetExp ? playlistCoverTargetExp.value : 'active';
    let target = targetExp === 'active' ? (selectActiveExperience ? selectActiveExperience.value : selectedExperience) : targetExp;

    showToast(`Menyimpan cover album untuk playlist "${playlistName}"...`);

    try {
      const res = await fetch('/api/admin/music/set-playlist-cover', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminToken
        },
        body: JSON.stringify({
          playlistName,
          cover: coverVal,
          targetExperience: target
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        playlistCovers = data.playlistCovers || playlistCovers;
        if (coverVal === '') {
          delete playlistCovers[playlistName];
        } else {
          playlistCovers[playlistName] = data.cover || coverVal;
        }

        playlistCoverModal.style.display = 'none';

        // Re-render modal playlist jika sedang terbuka
        if (playlistsManagerModal && playlistsManagerModal.style.display === 'flex') {
          openPlaylistsManagerModal();
        }

        // Refresh tabel musik dan dropdown
        loadAllMusic();
      } else {
        alert(data.error || 'Gagal menyimpan cover playlist');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi saat menyimpan cover playlist');
    }
  });
}

// Delete Entire Playlist
if (btnDeletePlaylist) {
  btnDeletePlaylist.addEventListener('click', async () => {
    if (!currentPlaylistFilter || currentPlaylistFilter === 'All Music') return;
    const currentExp = selectActiveExperience ? selectActiveExperience.value : selectedExperience;

    const songsInPlaylist = allSongs.filter(s => (s.playlist || 'All Music') === currentPlaylistFilter);
    const count = songsInPlaylist.length;

    const confirmMsg = `⚠️ PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SELURUH playlist "${currentPlaylistFilter}" (${count} lagu) dari Experience (${currentExp})?\n\nTindakan ini tidak dapat dibatalkan.`;
    if (!confirm(confirmMsg)) return;

    showToast(`Menghapus playlist "${currentPlaylistFilter}"...`);
    try {
      const res = await fetch('/api/admin/music/delete-playlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminToken
        },
        body: JSON.stringify({
          playlistName: currentPlaylistFilter,
          targetExperience: currentExp
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        currentPlaylistFilter = '';
        btnDeletePlaylist.style.display = 'none';
        loadAllMusic();
      } else {
        alert(data.error || 'Gagal menghapus playlist');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi saat menghapus playlist');
    }
  });
}

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
function updateSongModalCoverPreview() {
  if (!editSongCoverPreview) return;
  const rawSongCover = editSampul ? editSampul.value.trim() : '';
  const currentPl = document.getElementById('edit-playlist') ? document.getElementById('edit-playlist').value.trim() : '';

  if (rawSongCover) {
    const url = resolveAssetImageUrl(rawSongCover);
    if (url) {
      editSongCoverPreview.innerHTML = `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">`;
      if (editSongCoverHint) editSongCoverHint.textContent = `Menggunakan cover album bawaan lagu (${rawSongCover}).`;
      return;
    }
  }

  // Jika tidak ada cover bawaan, gunakan cover playlist
  const plCover = playlistCovers[currentPl];
  if (plCover && String(plCover).trim() !== '') {
    const url = resolveAssetImageUrl(plCover);
    if (url) {
      editSongCoverPreview.innerHTML = `<img src="${url}" style="width: 100%; height: 100%; object-fit: cover;">`;
      if (editSongCoverHint) editSongCoverHint.textContent = `Cover kosong: Otomatis memakai cover album playlist "${currentPl}".`;
      return;
    }
  }

  editSongCoverPreview.innerHTML = `<i class="fa-solid fa-compact-disc" style="color: var(--text-dim); font-size: 1.2rem;"></i>`;
  if (editSongCoverHint) editSongCoverHint.textContent = `Cover kosong: Playlist belum memiliki cover khusus (menggunakan default game).`;
}

if (editSampul) {
  editSampul.addEventListener('input', updateSongModalCoverPreview);
}
if (document.getElementById('edit-playlist')) {
  document.getElementById('edit-playlist').addEventListener('input', updateSongModalCoverPreview);
}

btnAddMusicModal.addEventListener('click', () => {
  document.getElementById('modal-music-form-title').innerHTML = '<i class="fa-solid fa-plus"></i> Tambah Lagu Baru';
  document.getElementById('edit-sound-id').value = '';
  document.getElementById('edit-sound-id').readOnly = false;
  document.getElementById('edit-judul').value = '';
  document.getElementById('edit-penyanyi').value = '';
  document.getElementById('edit-playlist').value = 'POP/R&B';
  if (editSampul) editSampul.value = '';
  document.getElementById('edit-speed').value = '0.5';
  updateSongModalCoverPreview();
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
  if (editSampul) editSampul.value = song.sampul || '';
  document.getElementById('edit-speed').value = song.playbackSpeed || 0.5;
  updateSongModalCoverPreview();
  musicEditModal.style.display = 'flex';
};

// Form Save Music
formSaveMusic.addEventListener('submit', async (e) => {
  e.preventDefault();
  const targetExpSelect = document.getElementById('edit-target-experience');
  let targetExp = targetExpSelect ? targetExpSelect.value : 'active';
  if (targetExp === 'active') {
    targetExp = selectActiveExperience ? selectActiveExperience.value : selectedExperience;
  }

  const payload = {
    id: document.getElementById('edit-sound-id').value.trim(),
    judul: document.getElementById('edit-judul').value.trim(),
    penyanyi: document.getElementById('edit-penyanyi').value.trim(),
    playlist: document.getElementById('edit-playlist').value.trim(),
    sampul: editSampul ? editSampul.value.trim() : '',
    playbackSpeed: parseFloat(document.getElementById('edit-speed').value) || 0.5,
    targetExperience: targetExp
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

    const targetExpSelect = document.getElementById('bulk-target-experience');
    let targetExp = targetExpSelect ? targetExpSelect.value : 'active';
    if (targetExp === 'active') {
      targetExp = selectActiveExperience ? selectActiveExperience.value : selectedExperience;
    }

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
          mode: bulkImportMode.value,
          targetExperience: targetExp
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
  const currentExp = selectActiveExperience ? selectActiveExperience.value : selectedExperience;
  if (!confirm(`Apakah Anda yakin ingin menghapus lagu "${title}" (${id}) dari Experience aktif (${currentExp})?`)) return;

  try {
    const res = await fetch('/api/admin/music/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': adminToken
      },
      body: JSON.stringify({ 
        id,
        targetExperience: currentExp
      })
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
    const currentExp = selectActiveExperience ? selectActiveExperience.value : selectedExperience;
    if (!confirm(`Sinkronisasi ulang database dengan daftar lagu resmi di DataStore Experience (${currentExp})?`)) return;
    
    showToast('Menyinkronkan data musik Roblox...');
    try {
      const res = await fetch('/api/admin/music/sync-roblox-db', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-secret': adminToken 
        },
        body: JSON.stringify({ targetExperience: currentExp })
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
    const currentExp = selectActiveExperience ? selectActiveExperience.value : selectedExperience;
    window.open(`/api/admin/music/export-json?experience=${encodeURIComponent(currentExp)}&secret=${encodeURIComponent(adminToken)}`, '_blank');
  });
}

// Push DataStore Manual
btnPushDataStore.addEventListener('click', async () => {
  const currentExp = selectActiveExperience ? selectActiveExperience.value : selectedExperience;
  showToast(`Memicu sinkronisasi DataStore untuk Experience (${currentExp})...`);
  try {
    const res = await fetch('/api/admin/music/push-datastore', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'x-admin-secret': adminToken 
      },
      body: JSON.stringify({ targetExperience: currentExp })
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

    // Close mobile sidebar after selecting menu
    if (window.innerWidth <= 992) {
      closeMobileSidebar();
    }

    const pageTitle = document.getElementById('admin-page-title');
    const pageSubtitle = document.getElementById('admin-page-subtitle');
    if (targetId === 'music-manager-section') {
      pageTitle.innerHTML = `<i class="fa-solid fa-music" style="color: var(--accent-gold);"></i> Manajemen Database Musik`;
      pageSubtitle.textContent = `Kelola seluruh daftar musik Roblox DataStore tanpa perlu re-publish game`;
    } else if (targetId === 'invitations-manager-section') {
      pageTitle.innerHTML = `<i class="fa-solid fa-calendar-check" style="color: #00d2ff;"></i> Manajemen Jadwal Undangan (DataStore)`;
      pageSubtitle.textContent = `Kelola agenda undangan yang dihadiri dan daftar tamu yang diundang langsung ke DataStore Roblox`;
      loadAllInvitations();
    } else if (targetId === 'player-manager-section') {
      pageTitle.innerHTML = `<i class="fa-solid fa-user-gear" style="color: var(--secondary);"></i> Kelola Pemain & Role`;
      pageSubtitle.textContent = `Ubah role, rank admin, dan star level pemain secara realtime`;
    } else if (targetId === 'broadcast-section') {
      pageTitle.innerHTML = `<i class="fa-solid fa-bullhorn" style="color: #06d6a0;"></i> In-Game Broadcast`;
      pageSubtitle.textContent = `Siarkan pesan banner penting ke seluruh server aktif`;
    }
  });
});

// ============================================
// MANAJEMEN JADWAL UNDANGAN (ADMIN LOGIC)
// ============================================

// Indonesian Admin Date Formatter (Strictly WIB / Asia/Jakarta UTC+7)
function formatAdminDate(isoString) {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const wib = new Date(d.getTime() + (7 * 3600 * 1000));
    const days = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

    const day = days[wib.getUTCDay()];
    const date = wib.getUTCDate();
    const month = months[wib.getUTCMonth()];
    const year = wib.getUTCFullYear();
    const hours = String(wib.getUTCHours()).padStart(2, '0');
    const mins = String(wib.getUTCMinutes()).padStart(2, '0');

    return `${day}, ${date} ${month} ${year} • ${hours}:${mins} WIB`;
  } catch (e) {
    return isoString;
  }
}

// Convert any ISO timestamp to WIB YYYY-MM-DDTHH:mm for datetime-local input
function toWibInputString(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  const wib = new Date(d.getTime() + (7 * 3600 * 1000));
  const year = wib.getUTCFullYear();
  const month = String(wib.getUTCMonth() + 1).padStart(2, '0');
  const date = String(wib.getUTCDate()).padStart(2, '0');
  const hours = String(wib.getUTCHours()).padStart(2, '0');
  const mins = String(wib.getUTCMinutes()).padStart(2, '0');
  return `${year}-${month}-${date}T${hours}:${mins}`;
}

function escapeAdminHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function escapeAdminAttr(str) {
  if (!str) return '';
  return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

async function loadAllInvitations() {
  const currentExp = selectActiveExperience ? selectActiveExperience.value : selectedExperience;
  try {
    const res = await fetch(`/api/admin/invitations/list?experience=${encodeURIComponent(currentExp)}`, {
      headers: { 'x-admin-secret': adminToken }
    });
    const result = await res.json();
    if (result.success && Array.isArray(result.data)) {
      allAdminInvitations = result.data;
      if (statTotalInvitations) statTotalInvitations.textContent = result.activeCount || 0;
      if (adminInvStatActive) adminInvStatActive.textContent = result.activeCount || 0;
      if (adminInvStatExpired) adminInvStatExpired.textContent = result.expiredCount || 0;

      const diCount = allAdminInvitations.filter(i => i.type === 'di_invite' && !i.isExpired).length;
      const mengCount = allAdminInvitations.filter(i => i.type === 'meng_invite' && !i.isExpired).length;
      if (adminInvStatDiInvite) adminInvStatDiInvite.textContent = diCount;
      if (adminInvStatMengInvite) adminInvStatMengInvite.textContent = mengCount;

      renderAdminInvitations();
    }
  } catch (err) {
    console.error('Error fetching admin invitations:', err);
  }
}

function renderAdminInvitations() {
  if (!adminInvitationsTbody) return;

  let filtered = allAdminInvitations;

  if (currentInvTypeFilter) {
    filtered = filtered.filter(i => i.type === currentInvTypeFilter);
  }

  if (invSearchQuery) {
    const q = invSearchQuery.toLowerCase();
    filtered = filtered.filter(i => 
      (i.title && i.title.toLowerCase().includes(q)) ||
      (i.targetName && i.targetName.toLowerCase().includes(q)) ||
      (i.mapName && i.mapName.toLowerCase().includes(q)) ||
      (i.description && i.description.toLowerCase().includes(q))
    );
  }

  if (adminInvPaginationInfo) {
    adminInvPaginationInfo.textContent = `Menampilkan ${filtered.length} dari ${allAdminInvitations.length} jadwal undangan`;
  }

  if (filtered.length === 0) {
    adminInvitationsTbody.innerHTML = `
      <tr>
        <td colspan="8" style="text-align: center; color: var(--text-dim); padding: 30px;">
          Belum ada jadwal undangan ditemukan. Klik tombol "+ Tambah Jadwal Undangan" untuk menambahkan jadwal baru.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  filtered.forEach(inv => {
    const isDiInvite = inv.type === 'di_invite';
    const typeBadge = isDiInvite
      ? `<span class="inv-type-badge badge-di-invite"><i class="fa-solid fa-envelope-open-text"></i> UNDANGAN</span>`
      : `<span class="inv-type-badge badge-meng-invite"><i class="fa-solid fa-paper-plane"></i> MENGUNDANG</span>`;

    let statusPill = `<span class="role-badge role-player" style="font-size: 0.72rem;">Mendatang</span>`;
    if (inv.isExpired) {
      statusPill = `<span class="role-badge" style="background: rgba(239, 68, 68, 0.15); color: #ef4444; border-color: rgba(239, 68, 68, 0.3); font-size: 0.72rem;">Lewat (Expired)</span>`;
    } else if (inv.isOngoing) {
      statusPill = `<span class="role-badge" style="background: rgba(16, 185, 129, 0.2); color: #10b981; border-color: rgba(16, 185, 129, 0.4); font-size: 0.72rem;">● Berlangsung</span>`;
    }

    const formattedTime = formatAdminDate(inv.eventTime);
    const mapDisplay = inv.mapName || 'Buka Map';
    const safeTitle = escapeAdminHtml(inv.title);
    const safeTarget = escapeAdminHtml(inv.targetName);

    html += `
      <tr style="${inv.isExpired ? 'opacity: 0.6;' : ''}">
        <td>${typeBadge}</td>
        <td>
          <strong style="color: #fff;">${safeTarget}</strong>
        </td>
        <td>
          <div style="font-weight: 600; color: #fff;">${safeTitle}</div>
          ${inv.description ? `<div style="font-size: 0.76rem; color: var(--text-dim); max-width: 240px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeAdminHtml(inv.description)}</div>` : ''}
        </td>
        <td>
          <span style="color: var(--accent-gold); font-size: 0.85rem;"><i class="fa-solid fa-calendar-day" style="margin-right: 4px;"></i>${formattedTime}</span>
        </td>
        <td>
          <span style="font-size: 0.85rem; color: var(--text-muted);">${inv.durationHours || 3} Jam</span>
        </td>
        <td>
          <a href="${inv.mapLink || '#'}" target="_blank" rel="noopener noreferrer" style="color: var(--secondary); text-decoration: none; font-size: 0.85rem; display: inline-flex; align-items: center; gap: 5px;" title="${inv.mapLink}">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
            <span>${escapeAdminHtml(mapDisplay)}</span>
          </a>
        </td>
        <td>${statusPill}</td>
        <td style="text-align: right;">
          <div style="display: inline-flex; gap: 6px;">
            <button class="btn btn-glass" style="padding: 5px 10px; font-size: 0.78rem;" onclick="editInvitation('${inv.id}')" title="Edit">
              <i class="fa-solid fa-pen-to-square"></i>
            </button>
            <button class="btn btn-glass" style="padding: 5px 10px; font-size: 0.78rem; color: #ff0055; border-color: rgba(255, 0, 85, 0.3);" onclick="deleteInvitation('${inv.id}', '${escapeAdminAttr(inv.title)}')" title="Hapus">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </td>
      </tr>
    `;
  });

  adminInvitationsTbody.innerHTML = html;
}

function updateInvTargetLabel(type) {
  if (!labelInvTargetName || !editInvTargetName) return;
  if (type === 'meng_invite') {
    labelInvTargetName.textContent = 'Nama Tamu / Komunitas yang Diundang';
    editInvTargetName.placeholder = 'Contoh: DJ Lexi & Friends, Komunitas X, dsb.';
  } else {
    labelInvTargetName.textContent = 'Nama Penyelenggara / Pengundang';
    editInvTargetName.placeholder = 'Contoh: Komunitas Starlight, DJ Alan, dsb.';
  }
}

if (editInvType) {
  editInvType.addEventListener('change', (e) => {
    updateInvTargetLabel(e.target.value);
  });
}

if (btnAddInvitationModal) {
  btnAddInvitationModal.addEventListener('click', () => {
    if (!formSaveInvitation) return;
    editInvId.value = '';
    formSaveInvitation.reset();
    editInvDuration.value = '3';
    
    // Set default datetime to tomorrow at 20:00 WIB
    const nowWib = new Date(Date.now() + (7 * 3600 * 1000));
    nowWib.setUTCDate(nowWib.getUTCDate() + 1);
    const year = nowWib.getUTCFullYear();
    const month = String(nowWib.getUTCMonth() + 1).padStart(2, '0');
    const date = String(nowWib.getUTCDate()).padStart(2, '0');
    editInvTime.value = `${year}-${month}-${date}T20:00`;

    modalInvFormTitle.innerHTML = `<i class="fa-solid fa-calendar-plus" style="color: #00d2ff;"></i> Tambah Jadwal Undangan Baru`;
    btnSubmitInvText.textContent = 'Simpan ke DataStore Roblox';
    updateInvTargetLabel('di_invite');
    invitationEditModal.style.display = 'flex';
  });
}

if (btnCloseInvModal) {
  btnCloseInvModal.addEventListener('click', () => {
    invitationEditModal.style.display = 'none';
  });
}

window.addEventListener('click', (e) => {
  if (e.target === invitationEditModal) {
    invitationEditModal.style.display = 'none';
  }
});

window.editInvitation = function(id) {
  const inv = allAdminInvitations.find(i => String(i.id) === String(id));
  if (!inv) return;

  editInvId.value = inv.id;
  editInvType.value = inv.type || 'di_invite';
  updateInvTargetLabel(editInvType.value);
  editInvTargetName.value = inv.targetName || '';
  editInvTitle.value = inv.title || '';
  
  if (inv.eventTime) {
    editInvTime.value = toWibInputString(inv.eventTime);
  } else {
    editInvTime.value = '';
  }

  editInvDuration.value = inv.durationHours || 3;
  editInvMapLink.value = inv.mapLink || '';
  editInvMapName.value = inv.mapName || '';
  editInvDescription.value = inv.description || '';

  modalInvFormTitle.innerHTML = `<i class="fa-solid fa-pen-to-square" style="color: var(--accent-gold);"></i> Edit Jadwal Undangan`;
  btnSubmitInvText.textContent = 'Perbarui di DataStore Roblox';
  invitationEditModal.style.display = 'flex';
};

window.deleteInvitation = async function(id, title) {
  const currentExp = selectActiveExperience ? selectActiveExperience.value : selectedExperience;
  if (!confirm(`Hapus jadwal undangan "${title}" dari DataStore Roblox?`)) return;

  try {
    const res = await fetch('/api/admin/invitations/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-secret': adminToken
      },
      body: JSON.stringify({ id, targetExperience: currentExp })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Jadwal undangan berhasil dihapus dari DataStore');
      loadAllInvitations();
    } else {
      alert(data.error || 'Gagal menghapus jadwal');
    }
  } catch (err) {
    alert('Terjadi kesalahan koneksi');
  }
};

if (btnCleanupExpired) {
  btnCleanupExpired.addEventListener('click', async () => {
    const currentExp = selectActiveExperience ? selectActiveExperience.value : selectedExperience;
    if (!confirm('Bersihkan semua jadwal yang sudah lewat secara otomatis dari DataStore Roblox?')) return;

    try {
      showToast('Membersihkan jadwal kedaluwarsa...');
      const res = await fetch('/api/admin/invitations/cleanup-expired', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminToken
        },
        body: JSON.stringify({ targetExperience: currentExp })
      });
      const data = await res.json();
      if (data.success) {
        showToast('DataStore berhasil dibersihkan dari jadwal lama!');
        loadAllInvitations();
      } else {
        alert(data.error || 'Gagal membersihkan jadwal');
      }
    } catch(e) {
      alert('Terjadi kesalahan koneksi');
    }
  });
}

if (formSaveInvitation) {
  formSaveInvitation.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = editInvId.value;
    const type = editInvType.value;
    const targetName = editInvTargetName.value.trim();
    const title = editInvTitle.value.trim();
    let eventTimeVal = editInvTime.value.trim();
    const durationHours = parseFloat(editInvDuration.value) || 3;
    const mapLink = editInvMapLink.value.trim();
    const mapName = editInvMapName.value.trim();
    const description = editInvDescription.value.trim();
    
    let targetExp = editInvTargetExp.value;
    if (targetExp === 'active') {
      targetExp = selectActiveExperience ? selectActiveExperience.value : selectedExperience;
    }

    if (!targetName || !title || !eventTimeVal || !mapLink) {
      alert('Nama pihak/host/guest, judul acara, tanggal/waktu, dan link map wajib diisi!');
      return;
    }

    // Pastikan offset WIB (+07:00) terpasang jika input tanpa timezone
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(eventTimeVal)) {
      eventTimeVal += ':00+07:00';
    }

    btnSubmitInvText.textContent = 'Menyimpan ke DataStore...';

    try {
      const res = await fetch('/api/admin/invitations/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminToken
        },
        body: JSON.stringify({
          id,
          type,
          targetName,
          title,
          eventTime: eventTimeVal,
          durationHours,
          mapLink,
          mapName,
          description,
          targetExperience: targetExp
        })
      });

      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Jadwal undangan berhasil disimpan ke DataStore!');
        invitationEditModal.style.display = 'none';
        loadAllInvitations();
      } else {
        alert(data.error || 'Gagal menyimpan jadwal undangan');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi saat menyimpan jadwal');
    } finally {
      btnSubmitInvText.textContent = id ? 'Perbarui di DataStore Roblox' : 'Simpan ke DataStore Roblox';
    }
  });
}

// Filter Type Listener
if (adminFilterInvType) {
  adminFilterInvType.addEventListener('change', (e) => {
    currentInvTypeFilter = e.target.value;
    renderAdminInvitations();
  });
}

// Search Input Listener
if (adminSearchInvInput) {
  adminSearchInvInput.addEventListener('input', (e) => {
    invSearchQuery = e.target.value.trim();
    renderAdminInvitations();
  });
}

// ============================================
// DETEKSI & BERSIHKAN LAGU DUPLIKAT
// Kelompokkan lagu dengan Penyanyi + Judul SAMA PERSIS,
// lalu admin memilih dari playlist aman mana yang akan dihapus.
// ============================================

// State: daftar grup duplikat yang sedang ditampilkan
let duplicateGroups = [];

// Normalisasi teks untuk perbandingan "sama persis":
// - lowercase, rapikan spasi berlebih, hapus tanda baca umum & fitur "feat."
function normalizeTextKey(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .toLowerCase()
    .replace(/\(feat\.?[^)]*\)/g, '')   // buang (feat. ...)
    .replace(/\[feat\.?[^\]]*\]/g, '')  // buang [feat. ...]
    .replace(/featuring[^,]*/g, '')     // buang "featuring ..."
    .replace(/[^\p{L}\p{N}\s]/gu, '')  // hapus tanda baca / simbol
    .replace(/\s+/g, ' ')              // rapikan spasi berlebih
    .trim();
}

// Kunci unik gabungan penyanyi + judul
function getSongDuplicateKey(song) {
  const penyanyi = normalizeTextKey(song.penyanyi);
  const judul = normalizeTextKey(song.judul);
  if (!penyanyi && !judul) return null; // lewati data kosong
  return `${penyanyi}||${judul}`;
}

// Hitung "skor kualitas" lagu untuk pemilihan otomatis.
// Semakin tinggi skornya, semakin layak dipertahankan.
function scoreSongForKeep(song) {
  let score = 0;
  if (song.sampul && String(song.sampul).trim() !== '') score += 100;        // punya cover bawaan
  if (song.penyanyi && String(song.penyanyi).trim() !== '') score += 20;     // penyanyi terisi
  if (song.judul && String(song.judul).trim() !== '') score += 20;           // judul terisi
  if (song.sampul && String(song.sampul).trim() !== '') score += 0;
  // Judul yang lebih deskriptif (panjang) sedikit diunggulkan
  score += Math.min(String(song.judul || '').length, 30);
  return score;
}

// Cari semua grup lagu yang duplikat (jumlah > 1)
function findDuplicateGroups() {
  const groupsMap = new Map();

  allSongs.forEach(song => {
    const key = getSongDuplicateKey(song);
    if (!key) return;
    if (!groupsMap.has(key)) {
      groupsMap.set(key, {
        key,
        displayPenyanyi: (song.penyanyi || '(Tanpa Penyanyi)').trim(),
        displayJudul: (song.judul || '(Tanpa Judul)').trim(),
        songs: []
      });
    }
    groupsMap.get(key).songs.push(song);
  });

  const groups = [];
  groupsMap.forEach(group => {
    if (group.songs.length > 1) {
      // Urutkan lagu: skor kualitas tertinggi lebih dulu
      group.songs.sort((a, b) => scoreSongForKeep(b) - scoreSongForKeep(a));
      groups.push(group);
    }
  });

  // Urutkan grup: yang paling banyak duplikat lebih dulu, lalu alfabetis
  groups.sort((a, b) => b.songs.length - a.songs.length || a.displayJudul.localeCompare(b.displayJudul));
  return groups;
}

// Buka modal & render hasil deteksi
window.openDuplicatesModal = function() {
  if (!duplicatesModal) return;

  duplicateGroups = findDuplicateGroups();

  const totalExtra = duplicateGroups.reduce((acc, g) => acc + (g.songs.length - 1), 0);

  // Ringkasan
  if (duplicatesSummary) {
    if (duplicateGroups.length === 0) {
      duplicatesSummary.innerHTML = '';
    } else {
      duplicatesSummary.innerHTML = `
        <span class="role-badge" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b; border-color: rgba(245, 158, 11, 0.35); font-size: 0.8rem;">
          <i class="fa-solid fa-clone"></i> ${duplicateGroups.length} Kelompok Duplikat
        </span>
        <span class="role-badge" style="background: rgba(255, 0, 85, 0.15); color: #ff0055; border-color: rgba(255, 0, 85, 0.35); font-size: 0.8rem;">
          <i class="fa-solid fa-trash-can"></i> Maks ${totalExtra} Lagu Berlebih
        </span>
      `;
    }
  }

  // Kosong
  if (duplicateGroups.length === 0) {
    duplicatesList.innerHTML = '';
    duplicatesEmpty.style.display = 'block';
    duplicatesFooter.style.display = 'none';
    duplicatesModal.style.display = 'flex';
    return;
  }

  duplicatesEmpty.style.display = 'none';
  duplicatesFooter.style.display = 'block';

  // Render tiap grup
  let html = '';
  duplicateGroups.forEach((group, gIdx) => {
    let cards = '';
    group.songs.forEach((song, sIdx) => {
      const isDefaultKeep = sIdx === 0; // default: lagu skor terbaik dipertahankan
      const effectiveCover = getEffectiveSongCover(song);
      const isHidden = hiddenPlaylists.some(h => h.toLowerCase() === (song.playlist || '').toLowerCase());
      const playlistLabel = escapeAdminHtml(song.playlist || 'All Music') + (isHidden ? ' [Hidden]' : '');

      const coverSrc = effectiveCover.url
        ? `<img src="${effectiveCover.url}" alt="Cover" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.style.display='none'; this.parentElement.style.display='none';">`
        : `<i class="fa-solid fa-compact-disc" style="color: var(--text-dim); opacity: 0.35;"></i>`;

      cards += `
        <label class="dup-song-card" data-group="${gIdx}" style="display: flex; align-items: center; gap: 10px; padding: 10px; border-radius: 10px; cursor: pointer; border: 1px solid ${isDefaultKeep ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255,255,255,0.1)'}; background: ${isDefaultKeep ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255,255,255,0.03)'}; margin-bottom: 6px; transition: all 0.15s ease;">
          <input type="radio" name="dup-keep-${gIdx}" value="${song.id}" ${isDefaultKeep ? 'checked' : ''} onchange="onDuplicateKeepChange(${gIdx}, '${song.id}')" style="flex-shrink: 0; width: 16px; height: 16px; accent-color: #10b981; cursor: pointer;">
          <div style="width: 40px; height: 40px; flex-shrink: 0; border-radius: 8px; overflow: hidden; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center;">
            ${coverSrc}
          </div>
          <div style="flex: 1; min-width: 0;">
            <div style="font-size: 0.85rem; color: #fff; font-weight: 600; display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span class="dup-keep-label" data-group="${gIdx}" style="font-size: 0.66rem; padding: 2px 7px; border-radius: 20px; background: rgba(16,185,129,0.18); color: #10b981; border: 1px solid rgba(16,185,129,0.35); display: ${isDefaultKeep ? 'inline-block' : 'none'};">DIPERTAHANKAN</span>
              <span class="dup-del-label" data-group="${gIdx}" style="font-size: 0.66rem; padding: 2px 7px; border-radius: 20px; background: rgba(255,0,85,0.15); color: #ff0055; border: 1px solid rgba(255,0,85,0.35); display: ${isDefaultKeep ? 'none' : 'inline-block'};">AKAN DIHAPUS</span>
            </div>
            <div style="font-size: 0.78rem; color: var(--text-muted); margin-top: 3px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              <i class="fa-solid fa-microphone" style="opacity: 0.5;"></i> ${escapeAdminHtml(song.penyanyi || '-')}
            </div>
            <div style="font-size: 0.74rem; color: var(--text-dim); margin-top: 2px;">
              ID: <strong style="color: var(--secondary);">${escapeAdminHtml(String(song.id))}</strong>
              &nbsp;•&nbsp; <i class="fa-solid fa-layer-group" style="opacity: 0.5;"></i> ${playlistLabel}
              &nbsp;•&nbsp; ${song.playbackSpeed || 0.5}x
              ${(song.sampul && String(song.sampul).trim() !== '') ? '&nbsp;•&nbsp; <span style="color:#10b981;"><i class="fa-solid fa-image"></i> Ada Cover</span>' : ''}
            </div>
          </div>
        </label>
      `;
    });

    html += `
      <div style="margin-bottom: 18px; padding: 12px; border-radius: 12px; background: rgba(255,255,255,0.02); border: 1px solid rgba(245, 158, 11, 0.2);">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 10px; flex-wrap: wrap;">
          <span class="role-badge" style="background: rgba(245, 158, 11, 0.2); color: #f59e0b; border-color: rgba(245, 158, 11, 0.4); font-size: 0.74rem;">#${gIdx + 1}</span>
          <strong style="color: #fff; font-size: 0.92rem;">${escapeAdminHtml(group.displayJudul)}</strong>
          <span style="color: var(--text-dim); font-size: 0.82rem;">— ${escapeAdminHtml(group.displayPenyanyi)}</span>
          <span class="role-badge" style="background: rgba(255,0,85,0.15); color: #ff0055; border-color: rgba(255,0,85,0.3); font-size: 0.72rem; margin-left: auto;">${group.songs.length} Salinan</span>
        </div>
        ${cards}
      </div>
    `;
  });

  duplicatesList.innerHTML = html;
  updateDuplicateCounts();
  duplicatesModal.style.display = 'flex';
};

// Dipanggil saat radio (lagu yang dipertahankan) dalam satu grup berubah
window.onDuplicateKeepChange = function(groupIdx, keepId) {
  const group = duplicateGroups[groupIdx];
  if (!group) return;

  const cards = duplicatesList.querySelectorAll(`.dup-song-card[data-group="${groupIdx}"]`);
  cards.forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    const keepLabel = card.querySelector('.dup-keep-label');
    const delLabel = card.querySelector('.dup-del-label');
    const isKept = radio && String(radio.value) === String(keepId);

    if (isKept) {
      card.style.border = '1px solid rgba(16, 185, 129, 0.5)';
      card.style.background = 'rgba(16, 185, 129, 0.08)';
      if (keepLabel) keepLabel.style.display = 'inline-block';
      if (delLabel) delLabel.style.display = 'none';
    } else {
      card.style.border = '1px solid rgba(255, 0, 85, 0.35)';
      card.style.background = 'rgba(255, 0, 85, 0.05)';
      if (keepLabel) keepLabel.style.display = 'none';
      if (delLabel) delLabel.style.display = 'inline-block';
    }
  });

  updateDuplicateCounts();
};

// Hitung & tampilkan berapa lagu yang akan dihapus vs dipertahankan
function updateDuplicateCounts() {
  if (!duplicatesDeleteCount || !duplicatesKeepCount) return;

  let delCount = 0;
  let keepCount = 0;

  duplicateGroups.forEach((group, gIdx) => {
    const checked = duplicatesList.querySelector(`input[name="dup-keep-${gIdx}"]:checked`);
    const keepId = checked ? checked.value : null;
    group.songs.forEach(song => {
      if (keepId && String(song.id) === String(keepId)) {
        keepCount++;
      } else {
        delCount++;
      }
    });
  });

  duplicatesDeleteCount.textContent = delCount;
  duplicatesKeepCount.textContent = keepCount;
}

// Kumpulkan daftar Sound ID yang harus dihapus (semua yang tidak dipilih "keep")
function getDuplicateIdsToDelete() {
  const toDelete = [];
  duplicateGroups.forEach((group, gIdx) => {
    const checked = duplicatesList.querySelector(`input[name="dup-keep-${gIdx}"]:checked`);
    const keepId = checked ? checked.value : null;
    group.songs.forEach(song => {
      if (!keepId || String(song.id) !== String(keepId)) {
        toDelete.push(String(song.id));
      }
    });
  });
  return toDelete;
}

// Otomatis: pertahankan tepat 1 lagu terbaik per kelompok (radio pertama tiap grup)
if (btnKeepFirstEach) {
  btnKeepFirstEach.addEventListener('click', () => {
    duplicateGroups.forEach((group, gIdx) => {
      const radios = duplicatesList.querySelectorAll(`input[name="dup-keep-${gIdx}"]`);
      if (radios.length > 0) {
        radios[0].checked = true;
        window.onDuplicateKeepChange(gIdx, radios[0].value);
      }
    });
    showToast('Dipilih 1 lagu terbaik untuk dipertahankan di tiap kelompok. Tinjau lalu klik "Hapus Lagu Terpilih".');
  });
}

// Eksekusi hapus
if (btnDeleteDuplicates) {
  btnDeleteDuplicates.addEventListener('click', async () => {
    const idsToDelete = getDuplicateIdsToDelete();
    if (idsToDelete.length === 0) {
      alert('Tidak ada lagu yang perlu dihapus (semua lagu sudah dipertahankan).');
      return;
    }

    const currentExp = selectActiveExperience ? selectActiveExperience.value : selectedExperience;

    if (!confirm(`Hapus ${idsToDelete.length} lagu duplikat dari Experience aktif (${currentExp})?\n\nLagu yang Anda pilih "DIPERTAHANKAN" akan tetap aman. Tindakan ini tidak bisa dibatalkan.`)) {
      return;
    }

    btnDeleteDuplicates.disabled = true;
    const originalHtml = btnDeleteDuplicates.innerHTML;
    btnDeleteDuplicates.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Menghapus...';

    try {
      const res = await fetch('/api/admin/music/delete-multiple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-secret': adminToken
        },
        body: JSON.stringify({
          ids: idsToDelete,
          targetExperience: currentExp
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Lagu duplikat berhasil dihapus');
        duplicatesModal.style.display = 'none';
        loadAllMusic();
      } else {
        alert(data.error || 'Gagal menghapus lagu duplikat');
      }
    } catch (err) {
      alert('Terjadi kesalahan koneksi saat menghapus lagu duplikat');
    } finally {
      btnDeleteDuplicates.disabled = false;
      btnDeleteDuplicates.innerHTML = originalHtml;
    }
  });
}

// Open button
if (btnFindDuplicates) {
  btnFindDuplicates.addEventListener('click', () => {
    openDuplicatesModal();
  });
}

// Close modal
if (btnCloseDuplicatesModal) {
  btnCloseDuplicatesModal.addEventListener('click', () => {
    duplicatesModal.style.display = 'none';
  });
}

window.addEventListener('click', (e) => {
  if (e.target === duplicatesModal) {
    duplicatesModal.style.display = 'none';
  }
});

// Socket listener
if (socket) {
  socket.on('invitations_updated', () => {
    loadAllInvitations();
  });
  socket.on('music_database_updated', () => {
    loadAllMusic();
  });
  socket.on('playlist_covers_updated', (data) => {
    if (data && data.playlistCovers) {
      playlistCovers = data.playlistCovers;
      renderTable();
    } else {
      loadAllMusic();
    }
  });
}
