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
let allInvitations = [];
let activeInvitationFilter = 'all';
let invitationSearchQuery = '';

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

// Invitation Elements
const invitationsGrid = document.getElementById('invitations-grid');
const invEmptyState = document.getElementById('inv-empty-state');
const invCurrentTimeEl = document.getElementById('inv-current-time');
const countAllEl = document.getElementById('count-all-invitations');
const countDiInviteEl = document.getElementById('count-di-invite');
const countMengInviteEl = document.getElementById('count-meng-invite');
const badgeTabAll = document.getElementById('badge-tab-all');
const badgeTabDiInvite = document.getElementById('badge-tab-di-invite');
const badgeTabMengInvite = document.getElementById('badge-tab-meng-invite');
const invTabBtns = document.querySelectorAll('.inv-tab-btn');
const invSearchInput = document.getElementById('inv-search-input');

// Calendar & View Switcher Elements
const invCalendarWrapper = document.getElementById('inv-calendar-wrapper');
const calMonthTitle = document.getElementById('cal-month-title');
const calPrevMonthBtn = document.getElementById('cal-prev-month');
const calNextMonthBtn = document.getElementById('cal-next-month');
const calTodayBtn = document.getElementById('cal-today-btn');
const calDaysGrid = document.getElementById('cal-days-grid');
const calSelectedDateText = document.getElementById('cal-selected-date-text');
const calSelectedCountBadge = document.getElementById('cal-selected-count-badge');
const calDayEventsContainer = document.getElementById('cal-day-events-container');
const invViewBtns = document.querySelectorAll('.inv-view-btn');

// Calendar State
const INDO_MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];
let currentViewMode = 'calendar';
let calendarYear = 2026;
let calendarMonth = 9; // October (0-indexed)
let selectedDateStr = '2026-10-06';

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

// Escape HTML helper
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Indonesian Date Formatter (Strictly WIB / Asia/Jakarta UTC+7)
function formatIndonesianDate(isoString) {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;

    const wib = new Date(d.getTime() + (7 * 3600 * 1000));
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];

    const dayName = days[wib.getUTCDay()];
    const dateNum = wib.getUTCDate();
    const monthName = months[wib.getUTCMonth()];
    const year = wib.getUTCFullYear();
    const hours = String(wib.getUTCHours()).padStart(2, '0');
    const mins = String(wib.getUTCMinutes()).padStart(2, '0');

    return `${dayName}, ${dateNum} ${monthName} ${year} • ${hours}:${mins} WIB`;
  } catch (e) {
    return isoString;
  }
}

// Get WIB Components from Date or ISO string
function getWIBComponents(dateInput) {
  try {
    const d = dateInput instanceof Date ? dateInput : new Date(dateInput);
    if (isNaN(d.getTime())) return null;
    const wib = new Date(d.getTime() + (7 * 3600 * 1000));
    const year = wib.getUTCFullYear();
    const month = wib.getUTCMonth();
    const date = wib.getUTCDate();
    const day = wib.getUTCDay();
    const hours = String(wib.getUTCHours()).padStart(2, '0');
    const mins = String(wib.getUTCMinutes()).padStart(2, '0');
    const isoDate = `${year}-${String(month + 1).padStart(2, '0')}-${String(date).padStart(2, '0')}`;
    return { year, month, date, day, hours, mins, isoDate, wib };
  } catch (e) {
    return null;
  }
}

// Format Day Only in Indonesian for calendar header (e.g. "Minggu, 25 Oktober 2026")
function formatIndonesianDayOnly(isoDateStr) {
  try {
    if (!isoDateStr) return '--';
    const parts = isoDateStr.split('-');
    if (parts.length !== 3) return isoDateStr;
    const y = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    const d = parseInt(parts[2], 10);
    const dt = new Date(Date.UTC(y, m, d));
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    return `${days[dt.getUTCDay()]}, ${d} ${INDO_MONTHS[m]} ${y}`;
  } catch (e) {
    return isoDateStr;
  }
}

// Initialize calendar state with current WIB time
(function initCalendarCurrentTime() {
  const currentWib = getWIBComponents(new Date());
  if (currentWib) {
    calendarYear = currentWib.year;
    calendarMonth = currentWib.month;
    selectedDateStr = currentWib.isoDate;
  }
})();

// Check if invitation is expired based on current time
function isInvExpired(inv, now = Date.now()) {
  try {
    const eventTime = new Date(inv.eventTime).getTime();
    if (isNaN(eventTime)) return false;
    const durationMs = (Number(inv.durationHours) || 3) * 3600 * 1000;
    return (eventTime + durationMs) < now;
  } catch (e) {
    return false;
  }
}

// Get Countdown Text & Status
function getInvStatusAndCountdown(inv, now = Date.now()) {
  const eventTime = new Date(inv.eventTime).getTime();
  const durationMs = (Number(inv.durationHours) || 3) * 3600 * 1000;
  const endTime = eventTime + durationMs;

  if (now > endTime) {
    return { status: 'expired', countdownText: 'Selesai', isOngoing: false };
  }

  if (now >= eventTime && now <= endTime) {
    const remainingMs = endTime - now;
    const minsLeft = Math.floor(remainingMs / 60000);
    return {
      status: 'ongoing',
      countdownText: `🔥 Sedang Berlangsung! (Sisa ~${minsLeft} mnt)`,
      isOngoing: true
    };
  }

  const diffMs = eventTime - now;
  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

  let countdownText = 'Mulai dalam: ';
  if (days > 0) {
    countdownText += `${days} Hari ${hours} Jam`;
  } else if (hours > 0) {
    countdownText += `${hours} Jam ${minutes} Menit`;
  } else if (minutes > 0) {
    countdownText += `${minutes} Menit ${seconds} Detik`;
  } else {
    countdownText += `${seconds} Detik`;
  }

  return { status: 'upcoming', countdownText, isOngoing: false };
}

// Fetch and Load Invitations from DataStore API
async function loadInvitations() {
  try {
    const res = await fetch('/api/invitations');
    const result = await res.json();
    if (result.success && Array.isArray(result.data)) {
      allInvitations = result.data;
      renderInvitations();
    }
  } catch (err) {
    console.error('Error fetching invitations:', err);
  }
}

// Helper: Filter invitations by expiration, tab, and search query
function getFilteredInvitations(now = Date.now()) {
  // Filter out any that expired ("ketika sudah lewat otomatis hilang")
  const activeOnly = allInvitations.filter(inv => !isInvExpired(inv, now));

  // Update Counters & Badges
  const totalCount = activeOnly.length;
  const diInviteCount = activeOnly.filter(i => i.type === 'di_invite').length;
  const mengInviteCount = activeOnly.filter(i => i.type === 'meng_invite').length;

  if (countAllEl) countAllEl.textContent = totalCount;
  if (countDiInviteEl) countDiInviteEl.textContent = diInviteCount;
  if (countMengInviteEl) countMengInviteEl.textContent = mengInviteCount;
  if (badgeTabAll) badgeTabAll.textContent = totalCount;
  if (badgeTabDiInvite) badgeTabDiInvite.textContent = diInviteCount;
  if (badgeTabMengInvite) badgeTabMengInvite.textContent = mengInviteCount;

  // Filter by Active Tab
  let filtered = activeOnly;
  if (activeInvitationFilter === 'di_invite') {
    filtered = filtered.filter(i => i.type === 'di_invite');
  } else if (activeInvitationFilter === 'meng_invite') {
    filtered = filtered.filter(i => i.type === 'meng_invite');
  }

  // Filter by Search Query
  if (invitationSearchQuery) {
    const q = invitationSearchQuery.toLowerCase();
    filtered = filtered.filter(i => 
      (i.title && i.title.toLowerCase().includes(q)) ||
      (i.targetName && i.targetName.toLowerCase().includes(q)) ||
      (i.mapName && i.mapName.toLowerCase().includes(q)) ||
      (i.description && i.description.toLowerCase().includes(q))
    );
  }

  return { activeOnly, filtered };
}

// Generate HTML for an individual day cell in calendar
function createCalendarDayCellHtml({ dayNumber, isoDate, isOtherMonth, isToday, isSelected, events }) {
  const hasEvents = events.length > 0;
  const classes = [
    'cal-day-cell',
    isOtherMonth ? 'other-month' : '',
    isToday ? 'is-today' : '',
    isSelected ? 'is-selected' : '',
    hasEvents ? 'has-events' : ''
  ].filter(Boolean).join(' ');

  let eventBadgesHtml = '';
  if (hasEvents) {
    const maxShow = 2;
    events.slice(0, maxShow).forEach(({ inv, comp }) => {
      const isDiInvite = inv.type === 'di_invite';
      const chipClass = isDiInvite ? 'chip-di-invite' : 'chip-meng-invite';
      const iconClass = isDiInvite ? 'fa-envelope-open-text' : 'fa-paper-plane';
      eventBadgesHtml += `
        <div class="cal-event-chip ${chipClass}" title="${escapeHtml(inv.title)} (${comp.hours}:${comp.mins} WIB)">
          <i class="fa-solid ${iconClass}"></i>
          <span class="chip-time">${comp.hours}:${comp.mins}</span>
          <span class="chip-title">${escapeHtml(inv.title)}</span>
        </div>
      `;
    });

    if (events.length > maxShow) {
      eventBadgesHtml += `
        <div class="cal-event-chip-more">+${events.length - maxShow} lagi</div>
      `;
    }
  }

  const todayBadge = isToday ? `<span class="cal-today-pill">Hari Ini</span>` : '';
  const countBadge = hasEvents ? `<span class="cal-cell-event-count" title="${events.length} jadwal">${events.length}</span>` : '';

  return `
    <div class="${classes}" data-date="${isoDate}">
      <div class="cal-cell-top">
        <span class="cal-date-number">${dayNumber}</span>
        <div class="cal-cell-meta">
          ${todayBadge}
          ${countBadge}
        </div>
      </div>
      <div class="cal-cell-events">
        ${eventBadgesHtml}
      </div>
    </div>
  `;
}

// Render Selected Day Event Details in Calendar
function renderCalendarSelectedDayDetails(selectedEvents, now) {
  if (!calSelectedDateText || !calSelectedCountBadge || !calDayEventsContainer) return;

  calSelectedDateText.textContent = `Jadwal Acara: ${formatIndonesianDayOnly(selectedDateStr)}`;
  const count = selectedEvents.length;
  calSelectedCountBadge.textContent = `${count} Jadwal`;

  if (count === 0) {
    calDayEventsContainer.innerHTML = `
      <div class="cal-empty-day">
        <div class="cal-empty-day-icon">
          <i class="fa-solid fa-calendar-xmark"></i>
        </div>
        <div class="cal-empty-day-text">
          <h5>Tidak Ada Jadwal Acara Pada Tanggal Ini</h5>
          <p>Pilih tanggal lain yang memiliki tanda warna pada kalender untuk melihat jadwal yang tersedia.</p>
        </div>
      </div>
    `;
    return;
  }

  let html = '';
  selectedEvents.forEach(({ inv }) => {
    const isDiInvite = inv.type === 'di_invite';
    const cardTypeClass = isDiInvite ? 'type-di-invite' : 'type-meng-invite';
    const typeBadgeHtml = isDiInvite
      ? `<span class="inv-type-badge badge-di-invite"><i class="fa-solid fa-envelope-open-text"></i> UNDANGAN</span>`
      : `<span class="inv-type-badge badge-meng-invite"><i class="fa-solid fa-paper-plane"></i> MENGUNDANG</span>`;

    const { status, countdownText, isOngoing } = getInvStatusAndCountdown(inv, now);
    const statusPillHtml = isOngoing
      ? `<span class="inv-status-pill status-ongoing">● Sedang Berlangsung</span>`
      : `<span class="inv-status-pill status-upcoming">Mendatang</span>`;

    const partyInfoLabel = isDiInvite ? 'Penyelenggara / Pengundang:' : 'Tamu yang Diundang:';
    const partyInfoIcon = isDiInvite ? 'fa-user-tag' : 'fa-users-line';
    const formattedDate = formatIndonesianDate(inv.eventTime);
    const mapNameDisplay = inv.mapName || (isDiInvite ? 'Map Host Pengundang' : 'Ruang Bintang Main Stage');
    const mapHref = inv.mapLink || 'https://www.roblox.com/games/86691557621244';
    const durationText = inv.durationHours ? `± ${inv.durationHours} Jam` : '± 3 Jam';

    html += `
      <div class="inv-card ${cardTypeClass} cal-day-card" data-id="${inv.id}" data-event-time="${inv.eventTime}" data-duration="${inv.durationHours || 3}">
        <div>
          <div class="inv-card-header">
            ${typeBadgeHtml}
            ${statusPillHtml}
          </div>

          <div class="inv-party-info">
            <i class="fa-solid ${partyInfoIcon}"></i>
            <span class="inv-label">${partyInfoLabel}</span>
            <strong class="inv-target-name">${escapeHtml(inv.targetName)}</strong>
          </div>

          <h3 class="inv-title">${escapeHtml(inv.title)}</h3>
          
          ${inv.description ? `<p class="inv-desc">${escapeHtml(inv.description)}</p>` : ''}

          <div class="inv-details-box">
            <div class="inv-detail-row time">
              <i class="fa-solid fa-calendar-day"></i>
              <span><strong>Jadwal:</strong> ${formattedDate}</span>
            </div>
            <div class="inv-detail-row duration">
              <i class="fa-solid fa-hourglass-half"></i>
              <span><strong>Durasi:</strong> ${durationText}</span>
            </div>
            <div class="inv-detail-row venue">
              <i class="fa-solid fa-map-location-dot"></i>
              <span><strong>Venue:</strong> ${escapeHtml(mapNameDisplay)}</span>
            </div>
          </div>

          <div class="inv-countdown-bar">
            <span class="inv-countdown-label"><i class="fa-solid fa-stopwatch"></i> Status Waktu</span>
            <span class="inv-countdown-val countdown-display-val">${countdownText}</span>
          </div>
        </div>

        <div class="inv-card-footer">
          <a href="${escapeHtml(mapHref)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary inv-btn-play">
            <i class="fa-solid fa-gamepad"></i>
            <span>Buka Map Roblox</span>
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a>
        </div>
      </div>
    `;
  });

  calDayEventsContainer.innerHTML = html;
}

// Render Calendar View
function renderCalendar(filtered, now) {
  if (!calDaysGrid || !calMonthTitle) return;

  const todayWib = getWIBComponents(new Date());
  const todayIso = todayWib ? todayWib.isoDate : '';

  // Update Month Header
  calMonthTitle.textContent = `${INDO_MONTHS[calendarMonth]} ${calendarYear}`;

  // Map invitations to date (YYYY-MM-DD in WIB)
  const eventsByDate = {};
  filtered.forEach(inv => {
    const comp = getWIBComponents(inv.eventTime);
    if (comp) {
      if (!eventsByDate[comp.isoDate]) eventsByDate[comp.isoDate] = [];
      eventsByDate[comp.isoDate].push({ inv, comp });
    }
  });

  // Calculate grid days
  const firstDay = new Date(Date.UTC(calendarYear, calendarMonth, 1));
  const firstDayCol = (firstDay.getUTCDay() + 6) % 7; // Monday = 0, Sunday = 6
  const daysInCurrentMonth = new Date(Date.UTC(calendarYear, calendarMonth + 1, 0)).getUTCDate();
  const daysInPrevMonth = new Date(Date.UTC(calendarYear, calendarMonth, 0)).getUTCDate();

  // If selectedDateStr is empty or not in this month, choose smart default
  const thisMonthPrefix = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}`;
  if (!selectedDateStr || !selectedDateStr.startsWith(thisMonthPrefix)) {
    const datesWithEvents = Object.keys(eventsByDate)
      .filter(d => d.startsWith(thisMonthPrefix))
      .sort();
    if (datesWithEvents.length > 0) {
      if (todayIso.startsWith(thisMonthPrefix) && eventsByDate[todayIso]) {
        selectedDateStr = todayIso;
      } else {
        selectedDateStr = datesWithEvents[0];
      }
    } else if (todayIso.startsWith(thisMonthPrefix)) {
      selectedDateStr = todayIso;
    } else {
      selectedDateStr = `${thisMonthPrefix}-01`;
    }
  }

  let html = '';

  // 1. Previous month padding days
  for (let i = firstDayCol - 1; i >= 0; i--) {
    const dNum = daysInPrevMonth - i;
    const prevM = calendarMonth === 0 ? 11 : calendarMonth - 1;
    const prevY = calendarMonth === 0 ? calendarYear - 1 : calendarYear;
    const prevIso = `${prevY}-${String(prevM + 1).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
    const dayEvents = eventsByDate[prevIso] || [];

    html += createCalendarDayCellHtml({
      dayNumber: dNum,
      isoDate: prevIso,
      isOtherMonth: true,
      isToday: prevIso === todayIso,
      isSelected: prevIso === selectedDateStr,
      events: dayEvents
    });
  }

  // 2. Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const iso = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEvents = eventsByDate[iso] || [];

    html += createCalendarDayCellHtml({
      dayNumber: d,
      isoDate: iso,
      isOtherMonth: false,
      isToday: iso === todayIso,
      isSelected: iso === selectedDateStr,
      events: dayEvents
    });
  }

  // 3. Next month padding days to complete grid rows
  const totalRendered = firstDayCol + daysInCurrentMonth;
  const remainder = totalRendered % 7;
  const nextDaysCount = remainder === 0 ? 0 : 7 - remainder;

  for (let d = 1; d <= nextDaysCount; d++) {
    const nextM = calendarMonth === 11 ? 0 : calendarMonth + 1;
    const nextY = calendarMonth === 11 ? calendarYear + 1 : calendarYear;
    const nextIso = `${nextY}-${String(nextM + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    const dayEvents = eventsByDate[nextIso] || [];

    html += createCalendarDayCellHtml({
      dayNumber: d,
      isoDate: nextIso,
      isOtherMonth: true,
      isToday: nextIso === todayIso,
      isSelected: nextIso === selectedDateStr,
      events: dayEvents
    });
  }

  calDaysGrid.innerHTML = html;

  // Render detail events for the currently selected date
  renderCalendarSelectedDayDetails(eventsByDate[selectedDateStr] || [], now);
}

// Render Invitations Grid (Card View)
function renderGridInvitations(filtered, now) {
  if (!invitationsGrid) return;

  if (filtered.length === 0) {
    invitationsGrid.innerHTML = '';
    return;
  }

  let html = '';
  filtered.forEach(inv => {
    const isDiInvite = inv.type === 'di_invite';
    const cardTypeClass = isDiInvite ? 'type-di-invite' : 'type-meng-invite';
    const typeBadgeHtml = isDiInvite
      ? `<span class="inv-type-badge badge-di-invite"><i class="fa-solid fa-envelope-open-text"></i> UNDANGAN</span>`
      : `<span class="inv-type-badge badge-meng-invite"><i class="fa-solid fa-paper-plane"></i> MENGUNDANG</span>`;

    const { status, countdownText, isOngoing } = getInvStatusAndCountdown(inv, now);
    const statusPillHtml = isOngoing
      ? `<span class="inv-status-pill status-ongoing">● Sedang Berlangsung</span>`
      : `<span class="inv-status-pill status-upcoming">Mendatang</span>`;

    const partyInfoLabel = isDiInvite ? 'Penyelenggara / Pengundang:' : 'Tamu yang Diundang:';
    const partyInfoIcon = isDiInvite ? 'fa-user-tag' : 'fa-users-line';
    const formattedDate = formatIndonesianDate(inv.eventTime);
    const mapNameDisplay = inv.mapName || (isDiInvite ? 'Map Host Pengundang' : 'Ruang Bintang Main Stage');
    const mapHref = inv.mapLink || 'https://www.roblox.com/games/86691557621244';
    const durationText = inv.durationHours ? `± ${inv.durationHours} Jam` : '± 3 Jam';

    html += `
      <div class="inv-card ${cardTypeClass}" data-id="${inv.id}" data-event-time="${inv.eventTime}" data-duration="${inv.durationHours || 3}">
        <div>
          <div class="inv-card-header">
            ${typeBadgeHtml}
            ${statusPillHtml}
          </div>

          <div class="inv-party-info">
            <i class="fa-solid ${partyInfoIcon}"></i>
            <span class="inv-label">${partyInfoLabel}</span>
            <strong class="inv-target-name">${escapeHtml(inv.targetName)}</strong>
          </div>

          <h3 class="inv-title">${escapeHtml(inv.title)}</h3>
          
          ${inv.description ? `<p class="inv-desc">${escapeHtml(inv.description)}</p>` : ''}

          <div class="inv-details-box">
            <div class="inv-detail-row time">
              <i class="fa-solid fa-calendar-day"></i>
              <span><strong>Jadwal:</strong> ${formattedDate}</span>
            </div>
            <div class="inv-detail-row duration">
              <i class="fa-solid fa-hourglass-half"></i>
              <span><strong>Durasi:</strong> ${durationText}</span>
            </div>
            <div class="inv-detail-row venue">
              <i class="fa-solid fa-map-location-dot"></i>
              <span><strong>Venue:</strong> ${escapeHtml(mapNameDisplay)}</span>
            </div>
          </div>

          <div class="inv-countdown-bar">
            <span class="inv-countdown-label"><i class="fa-solid fa-stopwatch"></i> Status Waktu</span>
            <span class="inv-countdown-val countdown-display-val">${countdownText}</span>
          </div>
        </div>

        <div class="inv-card-footer">
          <a href="${escapeHtml(mapHref)}" target="_blank" rel="noopener noreferrer" class="btn btn-primary inv-btn-play">
            <i class="fa-solid fa-gamepad"></i>
            <span>Buka Map Roblox</span>
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
          </a>
        </div>
      </div>
    `;
  });

  invitationsGrid.innerHTML = html;
}

// Master Render Invitations (Updates both Calendar & Card View)
function renderInvitations() {
  const now = Date.now();
  const { filtered } = getFilteredInvitations(now);

  // If no items match overall
  if (filtered.length === 0) {
    if (invEmptyState) invEmptyState.style.display = 'block';
  } else {
    if (invEmptyState) invEmptyState.style.display = 'none';
  }

  // Render both views
  renderCalendar(filtered, now);
  renderGridInvitations(filtered, now);

  // Apply view mode toggle visibility
  if (currentViewMode === 'calendar') {
    if (invCalendarWrapper) invCalendarWrapper.style.display = 'block';
    if (invitationsGrid) invitationsGrid.style.display = 'none';
  } else {
    if (invCalendarWrapper) invCalendarWrapper.style.display = 'none';
    if (invitationsGrid) invitationsGrid.style.display = 'grid';
  }
}

// Live Clock & Countdowns Ticker
function updateInvitationCountdowns() {
  const nowMs = Date.now();
  
  // Update Live Clock Display (Strictly WIB / Asia/Jakarta UTC+7)
  if (invCurrentTimeEl) {
    const wib = new Date(nowMs + (7 * 3600 * 1000));
    const hours = String(wib.getUTCHours()).padStart(2, '0');
    const mins = String(wib.getUTCMinutes()).padStart(2, '0');
    const secs = String(wib.getUTCSeconds()).padStart(2, '0');
    invCurrentTimeEl.textContent = `${hours}:${mins}:${secs} WIB`;
  }

  // Update countdown text on each card
  const cards = document.querySelectorAll('.inv-card');
  let hasExpiredItems = false;

  cards.forEach(card => {
    const eventTimeStr = card.getAttribute('data-event-time');
    const duration = parseFloat(card.getAttribute('data-duration')) || 3;
    const countdownEl = card.querySelector('.countdown-display-val');

    if (eventTimeStr && countdownEl) {
      const { status, countdownText } = getInvStatusAndCountdown({
        eventTime: eventTimeStr,
        durationHours: duration
      }, nowMs);

      countdownEl.textContent = countdownText;

      if (status === 'expired') {
        hasExpiredItems = true;
      }
    }
  });

  // If any item expired live, re-render to make it automatically disappear
  if (hasExpiredItems) {
    renderInvitations();
  }
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
          <span class="role-badge ${roleClass}">${admin.roleName} • Lvl ${admin.rankLevel}</span>
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
      if (targetId === 'invitations-section' || targetId === 'grand-opening-section' || targetId === 'features-section') {
        searchContainer.style.display = 'none';
      } else {
        searchContainer.style.display = 'block';
      }
    }

    // Update Header Text
    const pageTitle = document.getElementById('page-title');
    const pageSubtitle = document.getElementById('page-subtitle');
    if (targetId === 'invitations-section') {
      pageTitle.innerHTML = `<i class="fa-solid fa-calendar-star" style="color: var(--accent-gold);"></i> Jadwal Undangan & Kolaborasi`;
      pageSubtitle.textContent = `Jadwal resmi menghadiri undangan di map lain dan agenda mengundang tamu ke Ruang Bintang`;
      if (topHeaderActions) topHeaderActions.style.display = 'flex';
    } else if (targetId === 'leaderboard-section') {
      pageTitle.innerHTML = `<i class="fa-solid fa-trophy" style="color: var(--accent-gold);"></i> Realtime Leaderboard`;
      pageSubtitle.textContent = `Papan peringkat donasi Robux & Saweria Coins pemain di Ruang Bintang Party`;
      if (topHeaderActions) topHeaderActions.style.display = 'flex';
    } else if (targetId === 'grand-opening-section') {
      pageTitle.innerHTML = `<i class="fa-solid fa-envelope-open-text" style="color: var(--secondary);"></i> Undangan Grand Opening`;
      pageSubtitle.textContent = `Undangan resmi pesta pembukaan map RUANG BINTANG Party Experience`;
      if (topHeaderActions) topHeaderActions.style.display = 'flex';
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

// Invitation Filter Tabs & Search Event Listeners
invTabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    invTabBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeInvitationFilter = btn.getAttribute('data-filter') || 'all';
    renderInvitations();
  });
});

if (invSearchInput) {
  invSearchInput.addEventListener('input', (e) => {
    invitationSearchQuery = e.target.value.trim();
    renderInvitations();
  });
}

// Calendar Navigation & Day Click Listeners
if (calPrevMonthBtn) {
  calPrevMonthBtn.addEventListener('click', () => {
    calendarMonth--;
    if (calendarMonth < 0) {
      calendarMonth = 11;
      calendarYear--;
    }
    renderInvitations();
  });
}

if (calNextMonthBtn) {
  calNextMonthBtn.addEventListener('click', () => {
    calendarMonth++;
    if (calendarMonth > 11) {
      calendarMonth = 0;
      calendarYear++;
    }
    renderInvitations();
  });
}

if (calTodayBtn) {
  calTodayBtn.addEventListener('click', () => {
    const nowW = getWIBComponents(new Date());
    if (nowW) {
      calendarYear = nowW.year;
      calendarMonth = nowW.month;
      selectedDateStr = nowW.isoDate;
      renderInvitations();
    }
  });
}

if (calDaysGrid) {
  calDaysGrid.addEventListener('click', (e) => {
    const cell = e.target.closest('.cal-day-cell');
    if (!cell) return;
    const dateStr = cell.getAttribute('data-date');
    if (!dateStr) return;

    selectedDateStr = dateStr;

    // If clicking a date from previous/next month, update the calendar month/year
    const parts = dateStr.split('-');
    const cellY = parseInt(parts[0], 10);
    const cellM = parseInt(parts[1], 10) - 1;
    if (cellY !== calendarYear || cellM !== calendarMonth) {
      calendarYear = cellY;
      calendarMonth = cellM;
    }

    renderInvitations();

    // On mobile screens, scroll down to the schedule detail box smoothly
    if (window.innerWidth <= 768) {
      const detailBox = document.getElementById('cal-day-detail-box');
      if (detailBox) {
        detailBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }
  });
}

// View Mode Toggle (Kalender vs Daftar Kartu)
invViewBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const targetView = btn.getAttribute('data-view');
    if (!targetView) return;
    currentViewMode = targetView;

    invViewBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');

    if (currentViewMode === 'calendar') {
      if (invCalendarWrapper) invCalendarWrapper.style.display = 'block';
      if (invitationsGrid) invitationsGrid.style.display = 'none';
    } else {
      if (invCalendarWrapper) invCalendarWrapper.style.display = 'none';
      if (invitationsGrid) invitationsGrid.style.display = 'grid';
    }
  });
});

// Refresh Button
btnRefresh.addEventListener('click', () => {
  loadInvitations();
  loadDonationLeaderboard();
  loadSaweriaLeaderboard();
  loadAdmins();
  showNotification('Memperbarui seluruh data...');
});

// WebSocket Realtime Events
if (socket) {
  socket.on('connect', () => {
    console.log('Connected to Realtime WebSocket server');
  });

  socket.on('invitations_updated', (data) => {
    console.log('Realtime invitation update received:', data);
    showNotification('⚡ Jadwal Undangan Terupdate dari DataStore!');
    loadInvitations();
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

// Live Countdown and Clock Interval
setInterval(updateInvitationCountdowns, 1000);
updateInvitationCountdowns();

// Countdown Grand Opening (25 Oktober 2026, 19:00:00 WIB / UTC+7)
// 2026-10-25T19:00:00+07:00 => 2026-10-25T12:00:00Z
const GRAND_OPENING_DATE = new Date('2026-10-25T19:00:00+07:00').getTime();

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
loadInvitations();
loadDonationLeaderboard();
loadSaweriaLeaderboard();
loadAdmins();
loadFeatures();
