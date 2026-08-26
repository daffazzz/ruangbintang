// Initialize Socket.IO connection (with graceful fallback for serverless)
let socket = null;
try {
  if (typeof io !== 'undefined') {
    socket = io({ transports: ['polling', 'websocket'] });
  }
} catch (e) {
  console.log('Running in standard HTTP mode');
}

// State
let currentLeaderboardType = 'donations';
let currentDonationsData = [];
let currentSaweriaData = [];
let currentAdminsData = [];

// DOM Elements
const podiumContainer = document.getElementById('podium-container');
const leaderboardTbody = document.getElementById('leaderboard-tbody');
const adminGrid = document.getElementById('admin-grid');
const featuresGrid = document.getElementById('features-grid');
const searchForm = document.getElementById('search-form');
const searchQuery = document.getElementById('search-query');
const profileModal = document.getElementById('profile-modal');
const btnCloseProfile = document.getElementById('btn-close-profile');
const btnRefresh = document.getElementById('btn-refresh');
const navBtns = document.querySelectorAll('.nav-btn');
const contentSections = document.querySelectorAll('.content-section');
const tabBtns = document.querySelectorAll('.tab-btn');
const notificationBanner = document.getElementById('notification-banner');
const notificationText = document.getElementById('notification-text');

// Mobile Navigation Elements
const mobileMenuToggle = document.getElementById('mobile-menu-toggle');
const mobileSidebarClose = document.getElementById('mobile-sidebar-close');
const mobileOverlay = document.getElementById('mobile-overlay');
const appSidebar = document.getElementById('app-sidebar');

// Mobile Menu Functions
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

// Stop clicks inside sidebar from closing the sidebar or triggering overlay
if (appSidebar) {
  appSidebar.addEventListener('click', (e) => {
    e.stopPropagation();
  });
}

// Format Number with Comma Separators
function formatNumber(num) {
  return Number(num || 0).toLocaleString('id-ID');
}

// Show Toast Notification
function showNotification(text) {
  notificationText.textContent = text;
  notificationBanner.classList.add('show');
  setTimeout(() => {
    notificationBanner.classList.remove('show');
  }, 4000);
}

// Fetch and Render Donasi Robux Leaderboard
async function loadDonationLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard/donations');
    const result = await res.json();
    if (result.success && result.data) {
      currentDonationsData = result.data;
      if (currentLeaderboardType === 'donations') {
        renderPodium(currentDonationsData.slice(0, 3));
        renderTable(currentDonationsData, 'robux');
      }
    }
  } catch (err) {
    console.error('Error fetching donation leaderboard:', err);
  }
}

// Fetch and Render Saweria Leaderboard
async function loadSaweriaLeaderboard() {
  try {
    const res = await fetch('/api/leaderboard/saweria');
    const result = await res.json();
    if (result.success && result.data) {
      currentSaweriaData = result.data;
      if (currentLeaderboardType === 'saweria') {
        renderPodium(currentSaweriaData.slice(0, 3), 'coins');
        renderTable(currentSaweriaData, 'coins');
      }
    }
  } catch (err) {
    console.error('Error fetching saweria leaderboard:', err);
  }
}

// Fetch and Render Admin List
async function loadAdmins() {
  try {
    const res = await fetch('/api/admins');
    const result = await res.json();
    if (result.success && result.data) {
      currentAdminsData = result.data;
      renderAdmins(currentAdminsData);
    }
  } catch (err) {
    console.error('Error loading admins:', err);
  }
}

// Fetch and Render Features
async function loadFeatures() {
  try {
    const res = await fetch('/api/features');
    const result = await res.json();
    if (result.success && result.features) {
      renderFeatures(result.features);
    }
  } catch (err) {
    console.error('Error loading features:', err);
  }
}

// Render Top 3 Podium
function renderPodium(top3, type = 'robux') {
  if (!top3 || top3.length === 0) {
    podiumContainer.innerHTML = '';
    return;
  }

  const rankClasses = ['rank-1', 'rank-2', 'rank-3'];
  const rankIcons = ['fa-crown', 'fa-medal', 'fa-award'];

  let html = '';
  top3.forEach((item, index) => {
    const isRobux = type === 'robux';
    const scoreText = isRobux 
      ? `<i class="fa-solid fa-gem"></i> ${formatNumber(item.donated)} R$`
      : `<i class="fa-solid fa-coins"></i> ${formatNumber(item.coins)} Coins`;

    html += `
      <div class="podium-card ${rankClasses[index]}">
        <i class="fa-solid ${rankIcons[index]} podium-crown"></i>
        <img src="${item.avatarUrl}" alt="${item.displayName}" class="podium-avatar" onerror="this.src='https://www.roblox.com/headshot-thumbnail/image?userId=${item.userId}&width=150&height=150&format=png'">
        <div class="podium-name" title="${item.displayName}">${item.displayName}</div>
        <div class="podium-username">@${item.username}</div>
        <div class="podium-score">${scoreText}</div>
      </div>
    `;
  });

  podiumContainer.innerHTML = html;
}

// Render Leaderboard Table
function renderTable(data, type = 'robux') {
  if (!data || data.length === 0) {
    leaderboardTbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">
          Belum ada data peringkat tersimpan.
        </td>
      </tr>
    `;
    return;
  }

  let html = '';
  data.forEach((item) => {
    const rankPillClass = item.rank === 1 ? 'top-1' : item.rank === 2 ? 'top-2' : item.rank === 3 ? 'top-3' : '';
    const isRobux = type === 'robux';
    const amountFormatted = isRobux 
      ? `<span style="color: var(--secondary); font-weight: 700;"><i class="fa-solid fa-gem" style="margin-right: 4px;"></i>${formatNumber(item.donated)} R$</span>`
      : `<span style="color: var(--accent-gold); font-weight: 700;"><i class="fa-solid fa-coins" style="margin-right: 4px;"></i>${formatNumber(item.coins)} Coins</span>`;

    let roleBadgeClass = 'role-player';
    const rName = item.role || 'Player';
    if (rName === 'Owner') roleBadgeClass = 'role-owner';
    else if (rName === 'HeadAdmin') roleBadgeClass = 'role-headadmin';
    else if (rName === 'Admin') roleBadgeClass = 'role-admin';
    else if (rName === 'VVIP') roleBadgeClass = 'role-vvip';
    else if (rName === 'VIP') roleBadgeClass = 'role-vip';

    html += `
      <tr>
        <td>
          <span class="rank-badge-pill ${rankPillClass}">${item.rank}</span>
        </td>
        <td>
          <div class="player-cell">
            <img src="${item.avatarUrl}" alt="${item.displayName}" class="player-avatar-small" onerror="this.src='https://www.roblox.com/headshot-thumbnail/image?userId=${item.userId}&width=150&height=150&format=png'">
            <div class="player-cell-info">
              <strong>${item.displayName}</strong>
              <span>@${item.username}</span>
            </div>
          </div>
        </td>
        <td>${amountFormatted}</td>
        <td>
          <span class="role-badge ${roleBadgeClass}" style="font-size: 0.75rem;">${rName}</span>
        </td>
        <td style="text-align: right;">
          <button class="btn btn-glass" style="padding: 6px 12px; font-size: 0.8rem;" onclick="viewPlayerProfile('${item.username}')">
            <i class="fa-solid fa-user"></i> Lihat Profil
          </button>
        </td>
      </tr>
    `;
  });

  leaderboardTbody.innerHTML = html;
}

// Render Admin Cards Grid
function renderAdmins(admins) {
  if (!admins || admins.length === 0) {
    adminGrid.innerHTML = `<p style="color: var(--text-muted);">Belum ada data admin.</p>`;
    return;
  }

  let html = '';
  admins.forEach(admin => {
    let roleClass = 'role-admin';
    if (admin.rankLevel === 4) roleClass = 'role-owner';
    else if (admin.rankLevel >= 2) roleClass = 'role-headadmin';

    html += `
      <div class="admin-card">
        <img src="${admin.avatarUrl}" alt="${admin.displayName}" class="admin-avatar" onerror="this.src='https://www.roblox.com/headshot-thumbnail/image?userId=${admin.userId}&width=150&height=150&format=png'">
        <div class="admin-card-info">
          <h4>${admin.displayName}</h4>
          <p>@${admin.username}</p>
          <span class="role-badge ${roleClass}">${admin.roleName} (Lvl ${admin.rankLevel})</span>
        </div>
        <button class="btn btn-glass btn-view-profile" onclick="viewPlayerProfile('${admin.userId}')" title="Lihat Profil">
          <i class="fa-solid fa-eye"></i>
          <span>Profil</span>
        </button>
      </div>
    `;
  });

  adminGrid.innerHTML = html;
}

// Render Features Grid
function renderFeatures(features) {
  const iconMap = [
    'fa-trophy',
    'fa-shield-halved',
    'fa-compact-disc',
    'fa-star',
    'fa-heart',
    'fa-sliders'
  ];

  let html = '';
  features.forEach((feat, index) => {
    const icon = iconMap[index % iconMap.length];
    html += `
      <div class="feature-card">
        <div class="feature-icon-box">
          <i class="fa-solid ${icon}"></i>
        </div>
        <h3>${feat.title}</h3>
        <p>${feat.desc}</p>
      </div>
    `;
  });

  featuresGrid.innerHTML = html;
}

// View Player Profile via Modal
window.viewPlayerProfile = async function(identifier) {
  try {
    const res = await fetch(`/api/player/search?query=${encodeURIComponent(identifier)}`);
    const data = await res.json();

    if (!data.success || !data.player) {
      alert(data.error || 'Pemain tidak ditemukan');
      return;
    }

    const p = data.player;
    document.getElementById('modal-avatar').src = p.avatarUrl;
    document.getElementById('modal-display-name').textContent = p.displayName;
    document.getElementById('modal-username').textContent = `@${p.username}`;
    document.getElementById('modal-robux').textContent = `${formatNumber(p.stats.donatedRobux)} R$`;
    document.getElementById('modal-coins').textContent = formatNumber(p.stats.saweriaCoins);
    document.getElementById('modal-title').textContent = `${p.stats.starTitle} (Lvl ${p.stats.starLevel})`;
    document.getElementById('modal-likes').textContent = formatNumber(p.stats.likesCount);
    document.getElementById('modal-roblox-link').href = p.robloxProfileUrl;

    const badge = document.getElementById('modal-role-badge');
    const pRole = p.stats.role || 'Player';
    badge.textContent = pRole;
    badge.className = 'role-badge';
    if (pRole === 'Owner' || p.stats.rankLevel === 4) badge.classList.add('role-owner');
    else if (pRole === 'Co-Owner' || p.stats.rankLevel === 3) badge.classList.add('role-owner');
    else if (pRole === 'HeadAdmin' || p.stats.rankLevel === 2) badge.classList.add('role-headadmin');
    else if (pRole === 'Admin' || p.stats.rankLevel === 1) badge.classList.add('role-admin');
    else if (pRole === 'VVIP') badge.classList.add('role-vvip');
    else if (pRole === 'VIP') badge.classList.add('role-vip');
    else badge.classList.add('role-player');

    profileModal.style.display = 'flex';
  } catch (err) {
    alert('Terjadi kesalahan saat memuat data profil');
  }
};

// Search Form Submit Handler
searchForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const val = searchQuery.value.trim();
  if (val) {
    window.viewPlayerProfile(val);
  }
});

// Close Profile Modal
btnCloseProfile.addEventListener('click', () => {
  profileModal.style.display = 'none';
});

window.addEventListener('click', (e) => {
  if (e.target === profileModal) {
    profileModal.style.display = 'none';
  }
});

// Tab Switch (Robux vs Saweria)
tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    tabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    currentLeaderboardType = btn.getAttribute('data-type');

    if (currentLeaderboardType === 'donations') {
      renderPodium(currentDonationsData.slice(0, 3), 'robux');
      renderTable(currentDonationsData, 'robux');
    } else {
      renderPodium(currentSaweriaData.slice(0, 3), 'coins');
      renderTable(currentSaweriaData, 'coins');
    }
  });
});

// Navigation Switcher (Leaderboard / Admins / Features / Grand Opening)
navBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
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

    // Toggle search bar visibility (only show on leaderboard & admin sections)
    const searchContainer = document.getElementById('global-search-container');
    const topHeaderActions = document.getElementById('top-header-actions');
    if (searchContainer) {
      if (targetId === 'grand-opening-section' || targetId === 'features-section') {
        searchContainer.style.display = 'none';
      } else {
        searchContainer.style.display = 'block';
      }
    }

    // Update Header Text
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    if (targetId === 'leaderboard-section') {
      pageTitle.innerHTML = `<i class="fa-solid fa-trophy" style="color: var(--accent-gold);"></i> Realtime Leaderboard`;
      pageSubtitle.textContent = `Papan peringkat donasi Robux & Saweria Coins pemain di Ruang Bintang Party`;
      if (topHeaderActions) topHeaderActions.style.display = 'flex';
    } else if (targetId === 'grand-opening-section') {
      pageTitle.innerHTML = `<i class="fa-solid fa-envelope-open-text" style="color: var(--accent-gold);"></i> Undangan Grand Opening`;
      pageSubtitle.textContent = `Undangan resmi pesta pembukaan map RUANG BINTANG Party Experience`;
      if (topHeaderActions) topHeaderActions.style.display = 'none';
    } else if (targetId === 'admins-section') {
      pageTitle.innerHTML = `<i class="fa-solid fa-shield-halved" style="color: var(--primary);"></i> Staff & Admin List`;
      pageSubtitle.textContent = `Daftar seluruh Owner, Head Admin, dan Admin Ruang Bintang Party`;
      if (topHeaderActions) topHeaderActions.style.display = 'flex';
    } else if (targetId === 'features-section') {
      pageTitle.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles" style="color: var(--secondary);"></i> Fitur-fitur Game`;
      pageSubtitle.textContent = `Daftar teknologi dan sistem in-game yang aktif di Ruang Bintang`;
      if (topHeaderActions) topHeaderActions.style.display = 'flex';
    }
  });
});

// Refresh Button
btnRefresh.addEventListener('click', () => {
  loadDonationLeaderboard();
  loadSaweriaLeaderboard();
  loadAdmins();
  showNotification('Memperbarui data leaderboard & admin...');
});

// WebSocket Realtime Events
if (socket) {
  socket.on('connect', () => {
    console.log('Connected to Realtime WebSocket server');
  });

  socket.on('leaderboard_update', (data) => {
    console.log('Realtime update received:', data);
    showNotification('⚡ Update DataStore Realtime Diterima!');
    loadDonationLeaderboard();
    loadSaweriaLeaderboard();
  });

  socket.on('game_update', (payload) => {
    showNotification(`⚡ Update Game: ${payload.type}`);
    if (payload.type === 'donations') loadDonationLeaderboard();
    if (payload.type === 'saweria') loadSaweriaLeaderboard();
    if (payload.type === 'admins') loadAdmins();
  });
}

// Countdown Grand Opening (4 September 2026, 20:00:00 WIB / UTC+7)
// 2026-09-04T20:00:00+07:00 => 2026-09-04T13:00:00Z
const GRAND_OPENING_DATE = new Date('2026-09-04T20:00:00+07:00').getTime();

function updateCountdown() {
  const now = new Date().getTime();
  const distance = GRAND_OPENING_DATE - now;

  const daysEl = document.getElementById('cd-days');
  const hoursEl = document.getElementById('cd-hours');
  const minutesEl = document.getElementById('cd-minutes');
  const secondsEl = document.getElementById('cd-seconds');

  if (!daysEl || !hoursEl || !minutesEl || !secondsEl) return;

  if (distance <= 0) {
    daysEl.textContent = '00';
    hoursEl.textContent = '00';
    minutesEl.textContent = '00';
    secondsEl.textContent = '00';
    return;
  }

  const days = Math.floor(distance / (1000 * 60 * 60 * 24));
  const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((distance % (1000 * 60)) / 1000);

  daysEl.textContent = String(days).padStart(2, '0');
  hoursEl.textContent = String(hours).padStart(2, '0');
  minutesEl.textContent = String(minutes).padStart(2, '0');
  secondsEl.textContent = String(seconds).padStart(2, '0');
}

setInterval(updateCountdown, 1000);
updateCountdown();

// Initial Data Load
loadDonationLeaderboard();
loadSaweriaLeaderboard();
loadAdmins();
loadFeatures();
