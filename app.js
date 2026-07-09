let posts = [];
let currentPlatform = 'all';
let currentShowroom = 'all';
let editingId = null;
let editingImageUrls = [];
let editingMediaUrls = [];
let editingThumbnailUrl = '';

const googleMapStorageKey = 'socialhub_google_map_showrooms_v1';
const channelAccountStorageKey = 'socialhub_channel_accounts_v1';
const monthlyKpiStorageKey = 'socialhub_monthly_kpis_v1';
const mediaLibraryStorageKey = 'socialhub_media_library_v1';
const reportShowroomNames = ['HO', 'Phú Quốc', 'Cần Thơ', 'Kiên Giang', 'An Giang', 'Tiền Giang'];
const showroomNames = reportShowroomNames;
const showroomDashboardChannels = ['Facebook', 'TikTok', 'Zalo OA', 'Google Maps'];
const defaultGoogleMapShowrooms = [
  {
    type: 'HQ',
    brand: 'BYD NEG',
    name: 'TRỤ SỞ CHÍNH',
    reviews: 0,
    target: 100,
    address: 'Căn 18 Lake View 1, Số 19 Tố Hữu, Phường An Khánh, Thành phố Hồ Chí Minh.',
    image: '',
    mapLink: ''
  },
  {
    type: '4S',
    brand: 'BYD NEG',
    name: 'BYD NEG TIỀN GIANG',
    reviews: 0,
    target: 100,
    address: '602 Quốc lộ 1, Khu Phố Phước Hòa, Phường Trung An, Tỉnh Đồng Tháp.',
    image: '',
    mapLink: ''
  },
  {
    type: '1S',
    brand: 'BYD NEG',
    name: 'BYD NEG KIÊN GIANG',
    reviews: 0,
    target: 100,
    address: 'Lô P3-01, Đường 3 Tháng 2, Phường Rạch Giá, Tỉnh An Giang.',
    image: '',
    mapLink: ''
  },
  {
    type: '4S',
    brand: 'BYD NEG',
    name: 'BYD NEG PHÚ QUỐC',
    reviews: 0,
    target: 100,
    address: 'Tổ 7, Khu phố Suối Đá Dương Tơ, Đặc khu Phú Quốc, Tỉnh An Giang.',
    image: '',
    mapLink: ''
  },
  {
    type: '1S',
    brand: 'BYD NEG',
    name: 'BYD NEG AN GIANG',
    reviews: 0,
    target: 100,
    address: '43/12 Trần Hưng Đạo, Phường Mỹ Thới, Tỉnh An Giang.',
    image: '',
    mapLink: ''
  },
  {
    type: '4S',
    brand: 'BYD NEG',
    name: 'BYD NEG CẦN THƠ',
    reviews: 0,
    target: 100,
    address: '384 Võ Nguyên Giáp, Phường Hưng Phú, TP. Cần Thơ.',
    image: '',
    mapLink: ''
  }
];
let googleMapShowrooms = JSON.parse(JSON.stringify(defaultGoogleMapShowrooms));
let channelAccounts = createDefaultChannelAccounts();
let monthlyKpis = {};
let mediaLibrary = { folders: defaultMediaFolders(), files: [] };
let currentMediaFolder = 'all';
let selectedLibraryMediaUrls = [];
let pendingPickedMedia = new Set();

const defaultExportFields = [
  { key:'stt', label:'STT', checked:true },
  { key:'platform', label:'Nền tảng', checked:true },
  { key:'showroom', label:'Showroom/Page', checked:true },
  { key:'title', label:'Tiêu đề', checked:true },
  { key:'post_date', label:'Ngày đăng', checked:true },
  { key:'post_time', label:'Giờ đăng', checked:false },
  { key:'week', label:'Tuần trong tháng', checked:true },
  { key:'status', label:'Trạng thái', checked:true },
  { key:'note', label:'Caption', checked:true },
  { key:'image_urls', label:'Ảnh', checked:true },
  { key:'media_urls', label:'Media', checked:false },
  { key:'created_at', label:'Ngày tạo', checked:false }
];
let exportFields = JSON.parse(JSON.stringify(defaultExportFields));

const $ = (id) => document.getElementById(id);

window.addEventListener('DOMContentLoaded', async () => {
  bindEvents();
  setDefaultMonth();
  await loadCloudData();
  renderGoogleMapShowrooms();
  renderChannelAccounts();
  loadPosts();
});

function bindEvents(){
  $('btnOpenModal').addEventListener('click', () => openModal());
  $('btnCloseModal').addEventListener('click', closeModal);
  $('btnCancel').addEventListener('click', closeModal);
  $('btnSave').addEventListener('click', savePost);
  $('btnReload').addEventListener('click', loadPosts);
  $('btnOpenExport').addEventListener('click', openExportModal);
  $('btnCloseExport').addEventListener('click', closeExportModal);
  $('btnCancelExport').addEventListener('click', closeExportModal);
  $('btnExportExcel').addEventListener('click', exportExcel);
  $('btnResetExportFields').addEventListener('click', resetExportFields);
  $('btnResetGoogleReport').addEventListener('click', resetGoogleMapReport);
  $('btnOpenMediaLibrary').addEventListener('click', openMediaLibrary);
  $('btnCreateMediaFolder').addEventListener('click', createMediaFolder);
  $('btnMediaUpload').addEventListener('click', () => $('mediaUploadInput').click());
  $('mediaUploadInput').addEventListener('change', (e) => uploadMediaLibraryFiles(Array.from(e.target.files || [])));
  $('mediaSearch').addEventListener('input', renderMediaLibrary);
  $('mediaFolderFilter').addEventListener('change', (e) => { currentMediaFolder = e.target.value; renderMediaLibrary(); });
  $('btnPickMedia').addEventListener('click', openMediaPicker);
  $('btnCloseMediaPicker').addEventListener('click', closeMediaPicker);
  $('btnCancelMediaPicker').addEventListener('click', closeMediaPicker);
  $('btnUsePickedMedia').addEventListener('click', usePickedMedia);
  $('mediaPickerSearch').addEventListener('input', renderMediaPicker);
  $('searchInput').addEventListener('input', renderPosts);
  $('statusFilter').addEventListener('change', renderPosts);
  $('yearFilter').addEventListener('change', renderPosts);
  $('sortFilter').addEventListener('change', renderPosts);
  $('monthFilter').addEventListener('change', renderPosts);
  $('btnCloseImage').addEventListener('click', closeImage);
  $('imageModal').addEventListener('click', (e)=>{ if(e.target.id==='imageModal') closeImage(); });
  $('postModal').addEventListener('click', (e)=>{ if(e.target.id==='postModal') closeModal(); });
  $('exportModal').addEventListener('click', (e)=>{ if(e.target.id==='exportModal') closeExportModal(); });
  $('mediaPickerModal').addEventListener('click', (e)=>{ if(e.target.id==='mediaPickerModal') closeMediaPicker(); });
  $('imageInput').addEventListener('change', previewImages);
  $('thumbnailInput').addEventListener('change', previewImages);
  setupMediaDropZone();
  document.querySelectorAll('.nav').forEach(btn => {
    btn.addEventListener('click', () => {
      closeMediaLibraryView();
      document.querySelectorAll('.nav').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      setActiveShowroomNav('all');
      currentPlatform = btn.dataset.platform;
      currentShowroom = 'all';
      renderPosts();
    });
  });
  document.querySelectorAll('.showroom-nav').forEach(btn => {
    btn.addEventListener('click', () => {
      closeMediaLibraryView();
      document.querySelectorAll('.showroom-nav').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      setActivePlatformNav('all');
      currentShowroom = btn.dataset.showroom;
      currentPlatform = 'all';
      renderPosts();
    });
  });
}

function setActivePlatformNav(platform){
  document.querySelectorAll('.nav').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.platform === platform);
  });
}

function setActiveShowroomNav(showroom){
  document.querySelectorAll('.showroom-nav').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.showroom === showroom);
  });
}

function openMediaLibrary(){
  document.querySelectorAll('.nav,.showroom-nav').forEach(btn => btn.classList.remove('active'));
  $('btnOpenMediaLibrary').classList.add('active');
  $('mediaLibrary').classList.add('is-visible');
  document.querySelectorAll('.post-content,.google-showrooms,.channel-accounts').forEach(el => el.classList.add('is-hidden'));
  renderMediaLibrary();
}

function closeMediaLibraryView(){
  $('btnOpenMediaLibrary').classList.remove('active');
  $('mediaLibrary').classList.remove('is-visible');
  document.querySelectorAll('.post-content,.google-showrooms,.channel-accounts').forEach(el => el.classList.remove('is-hidden'));
}

async function loadPosts(){
  setStatus('Đang tải dữ liệu từ Supabase...', true);
  const { data, error } = await supabaseClient
    .from('posts')
    .select('*')
    .order('created_at', { ascending:false });

  if(error){
    console.error(error);
    setStatus('Lỗi kết nối Supabase: ' + error.message, false);
    $('postTable').innerHTML = `<tr><td colspan="8" class="empty">Lỗi: ${escapeHtml(error.message)}</td></tr>`;
    return;
  }
  posts = data || [];
  updateYearFilter();
  setStatus('Đã kết nối Supabase. Dữ liệu đang lưu online.', true);
  renderPosts();
}

function updateYearFilter(){
  const selected = $('yearFilter').value || 'all';
  const years = [...new Set(posts.map(p => String(p.post_date || '').slice(0,4)).filter(Boolean))].sort().reverse();
  $('yearFilter').innerHTML = '<option value="all">Năm</option>' + years.map(year => `<option value="${year}">${year}</option>`).join('');
  $('yearFilter').value = years.includes(selected) ? selected : 'all';
}

function csvList(value){
  if(!value) return [];
  return String(value).split(',').map(x => x.trim()).filter(Boolean);
}

function platformList(value){ return csvList(value); }
function showroomList(value){ return csvList(value); }

function platformMatches(value, platform){
  if(platform === 'all') return true;
  return platformList(value).includes(platform);
}

function showroomMatches(value, showroom){
  if(showroom === 'all') return true;
  return showroomList(value).includes(showroom);
}

function showroomDisplayName(showroom){
  return showroom === 'HO' ? 'BYD NEG Việt Nam' : `BYD NEG ${showroom}`;
}

function getImageUrls(post){
  if(Array.isArray(post.image_urls) && post.image_urls.length) return post.image_urls.filter(Boolean);
  if(post.image_url) return [post.image_url];
  return [];
}

function getMediaUrls(post){
  if(Array.isArray(post.media_urls) && post.media_urls.length) return post.media_urls.filter(Boolean);
  return getImageUrls(post);
}

function isVideoUrl(url){
  return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(String(url || ''));
}

function renderImages(post){
  const urls = getImageUrls(post);
  if(urls.length === 0) return '<span class="muted">-</span>';
  return `<div class="thumb-list">${urls.map(url => `
    <img class="thumb" src="${escapeHtml(url)}" alt="Ảnh bài đăng" loading="lazy" onclick="showImage('${escapeJs(url)}')" onerror="this.outerHTML='<span class=&quot;thumb thumb-error&quot;>Ảnh lỗi</span>'">
  `).join('')}</div>`;
}


function getFilteredPosts(){
  const keyword = $('searchInput').value.toLowerCase().trim();
  const status = $('statusFilter').value;
  const year = $('yearFilter').value;
  const sort = $('sortFilter').value;
  const filtered = posts.filter(p => {
    const matchPlatform = platformMatches(p.platform, currentPlatform);
    const matchStatus = status === 'all' || p.status === status;
    const matchShowroom = showroomMatches(p.showroom, currentShowroom);
    const matchYear = year === 'all' || String(p.post_date || '').slice(0,4) === year;
    const text = `${p.title||''} ${p.note||''} ${p.showroom||''} ${p.platform||''}`.toLowerCase();
    return matchPlatform && matchStatus && matchShowroom && matchYear && text.includes(keyword);
  });
  return sortPosts(filtered, sort);
}

function sortPosts(items, sort){
  const copy = [...items];
  if(sort === 'newest') return copy.sort((a,b)=>String(b.post_date||'').localeCompare(String(a.post_date||'')));
  if(sort === 'oldest') return copy.sort((a,b)=>String(a.post_date||'').localeCompare(String(b.post_date||'')));
  if(sort === 'platform') return copy.sort((a,b)=>String(a.platform||'').localeCompare(String(b.platform||''), 'vi'));
  return copy.sort((a,b)=>String(a.post_date||'').localeCompare(String(b.post_date||'')));
}

function renderPosts(){
  const result = getFilteredPosts();
  updateGoogleMapSection();
  updateChannelAccountSection();
  renderShowroomDashboard();
  updateWorkspaceActions();
  updateReportPanels();
  updateStats();
  if(result.length === 0){
    $('postTable').innerHTML = `<tr><td colspan="8" class="empty">Chưa có bài đăng nào</td></tr>`;
    return;
  }
  $('postTable').innerHTML = result.map(p => `
    <tr>
      <td>${escapeHtml(p.platform || '-')}</td>
      <td>${escapeHtml(p.showroom || '-')}</td>
      <td>${renderImages(p)}</td>
      <td><b class="post-title">${escapeHtml(p.title || '-')}</b></td>
      <td>${formatDate(p.post_date)}</td>
      <td><span class="status-pill ${getStatusClass(p.status)}">${escapeHtml(p.status || '-')}</span></td>
      <td><div class="note-cell" title="${escapeHtml(p.note || '')}">${escapeHtml(p.note || '-')}</div></td>
      <td>${renderRowActions(p)}</td>
    </tr>
  `).join('');
}

function updateReportPanels(){
  const platformPanel = $('platformStats') ? $('platformStats').closest('.report-panel') : null;
  if(platformPanel){
    platformPanel.classList.toggle('is-hidden', currentPlatform !== 'all' && currentShowroom === 'all');
  }
}

function renderRowActions(post){
  if(currentShowroom === 'all') return '<span class="muted">Chỉ xem</span>';
  return `
    <div class="action-group">
      <button class="action-btn" onclick="editPost(${post.id})">Sửa</button>
      <button class="action-btn delete" onclick="deletePost(${post.id})">Xóa</button>
    </div>
  `;
}

function updateWorkspaceActions(){
  document.querySelectorAll('.top-actions').forEach(el => {
    el.classList.toggle('is-hidden', currentShowroom === 'all' || currentPlatform === 'Google Maps');
  });
}

function getStatusClass(status){
  const map = {
    'Ý tưởng': 'is-idea',
    'Đang làm': 'is-doing',
    'Chờ duyệt': 'is-pending',
    'Đã đăng': 'is-done'
  };
  return map[status] || 'is-muted';
}

function updateGoogleMapSection(){
  const section = $('googleShowrooms');
  if(!section) return;
  const isGoogleMap = currentPlatform === 'Google Maps' && currentShowroom === 'all';
  section.classList.toggle('is-visible', isGoogleMap);
  section.classList.toggle('is-hidden', !isGoogleMap);
  document.querySelectorAll('.post-content').forEach(el => {
    if(el.classList.contains('top-actions')) return;
    el.classList.toggle('is-hidden', isGoogleMap);
  });
}

function updateChannelAccountSection(){
  const section = $('channelAccounts');
  if(!section) return;
  const isAccountPlatform = currentPlatform !== 'all' && currentPlatform !== 'Google Maps' && currentShowroom === 'all';
  section.classList.toggle('is-visible', isAccountPlatform);
  section.classList.toggle('is-hidden', !isAccountPlatform);
  if(isAccountPlatform) renderChannelAccounts();
}

function renderShowroomDashboard(){
  const section = $('showroomDashboard');
  const target = $('showroomChannelGrid');
  if(!section || !target) return;
  const isVisible = currentShowroom !== 'all';
  section.classList.toggle('is-visible', isVisible);
  if(!isVisible) return;

  $('showroomDashboardTitle').innerText = `Dashboard ${showroomDisplayName(currentShowroom)}`;
  const month = $('monthFilter').value;
  const showroomPosts = posts.filter(post => {
    const matchMonth = !month || getMonthKey(post.post_date) === month;
    return matchMonth && showroomMatches(post.showroom, currentShowroom);
  });
  const dashboardChannels = currentShowroom === 'HO' ? [...showroomDashboardChannels, 'YouTube'] : showroomDashboardChannels;
  const kpis = getShowroomKpis(currentShowroom, showroomPosts);
  const modules = dashboardChannels.map(platform => {
    const isActiveChannel = currentPlatform === platform;
    const channelPosts = posts.filter(post => {
      const matchMonth = !month || getMonthKey(post.post_date) === month;
      return matchMonth && showroomMatches(post.showroom, currentShowroom) && platformMatches(post.platform, platform);
    });
    const done = channelPosts.filter(post => post.status === 'Đã đăng').length;
    const pending = channelPosts.filter(post => post.status === 'Chờ duyệt').length;
    const idea = channelPosts.filter(post => post.status === 'Ý tưởng').length;
    const accountLink = getShowroomChannelLink(platform, currentShowroom);
    const googleInfo = platform === 'Google Maps' ? getGoogleMapInfoForShowroom(currentShowroom) : null;
    const monthlyKpi = getMonthlyKpi(currentShowroom, platform, month);
    const mapLink = googleInfo ? (googleInfo.mapLink || '') : '';
    const linkValue = platform === 'Google Maps' ? mapLink : accountLink;
    const linkLabel = platform === 'Google Maps' ? 'Link Google Maps' : 'Link account';
    const openLabel = platform === 'Google Maps' ? 'Mở map' : 'Mở account';
    const extraMetric = googleInfo
      ? `<div><b>${toNumber(googleInfo.reviews)}</b><span>Đánh giá</span></div>
         <div><b>${toNumber(googleInfo.target)}</b><span>Target review</span></div>`
      : `<div><b>${pending}</b><span>Chờ duyệt</span></div>
         <div><b>${idea}</b><span>Ý tưởng</span></div>`;
    return `
      <article class="showroom-channel-card ${isActiveChannel ? 'is-current' : ''}">
        <div class="channel-head">
          <span class="channel-badge">${escapeHtml(platform)}</span>
          <button type="button" class="mini-primary" data-create-platform="${escapeHtml(platform)}" data-create-showroom="${escapeHtml(currentShowroom)}">+ Tạo bài</button>
        </div>
        <div class="channel-metrics">
          <div><b>${channelPosts.length}</b><span>Tổng bài</span></div>
          <div><b>${done}</b><span>Đã đăng</span></div>
          ${extraMetric}
        </div>
        <label>${linkLabel}
          <input type="url" placeholder="Dán ${escapeHtml(linkLabel.toLowerCase())}" value="${escapeHtml(linkValue)}" data-dashboard-link-platform="${escapeHtml(platform)}" data-dashboard-link-showroom="${escapeHtml(currentShowroom)}">
        </label>
        <div class="kpi-input-grid">
          <label>Reach<input type="number" min="0" value="${monthlyKpi.reach}" data-kpi-field="reach" data-kpi-platform="${escapeHtml(platform)}" data-kpi-showroom="${escapeHtml(currentShowroom)}"></label>
          <label>Engagement<input type="number" min="0" value="${monthlyKpi.engagement}" data-kpi-field="engagement" data-kpi-platform="${escapeHtml(platform)}" data-kpi-showroom="${escapeHtml(currentShowroom)}"></label>
          <label>Follow<input type="number" min="0" value="${monthlyKpi.follow}" data-kpi-field="follow" data-kpi-platform="${escapeHtml(platform)}" data-kpi-showroom="${escapeHtml(currentShowroom)}"></label>
          <label>Like<input type="number" min="0" value="${monthlyKpi.like}" data-kpi-field="like" data-kpi-platform="${escapeHtml(platform)}" data-kpi-showroom="${escapeHtml(currentShowroom)}"></label>
        </div>
        <a class="open-link ${linkValue ? '' : 'is-disabled'}" href="${escapeHtml(linkValue || '#')}" target="_blank" rel="noopener">${openLabel}</a>
      </article>
    `;
  }).join('');
  target.innerHTML = `
    <div class="workspace-kpi">
      <div><b>${showroomPosts.length}</b><span>Tổng bài tháng</span></div>
      <div><b>${kpis.video}</b><span>Tổng video</span></div>
      <div><b>${kpis.reach}</b><span>Tổng Reach</span></div>
      <div><b>${kpis.engagement}</b><span>Engagement</span></div>
      <div><b>${kpis.follow}</b><span>Follow</span></div>
      <div><b>${kpis.like}</b><span>Like</span></div>
    </div>
    <div class="workspace-layout">
      <div>
        <h4>Module kênh</h4>
        <div class="showroom-module-grid">${modules}</div>
      </div>
      <div>
        <h4>Hoạt động gần đây</h4>
        <div class="activity-list">${renderRecentActivity(showroomPosts)}</div>
        <h4>Lịch nội dung</h4>
        <div class="calendar-mini">${renderContentCalendar(showroomPosts, month)}</div>
      </div>
    </div>
  `;

  document.querySelectorAll('[data-create-platform]').forEach(button => {
    button.addEventListener('click', () => {
      openModal({
        platform: button.dataset.createPlatform,
        showroom: button.dataset.createShowroom
      });
    });
  });
  document.querySelectorAll('[data-dashboard-link-platform]').forEach(input => {
    input.addEventListener('change', handleShowroomDashboardLink);
  });
  document.querySelectorAll('[data-kpi-field]').forEach(input => {
    input.addEventListener('change', handleMonthlyKpiInput);
  });
}

function getMonthlyKpi(showroom, platform, month){
  const key = `${month || 'all'}|${showroom}|${platform}`;
  return monthlyKpis[key] || { reach:0, engagement:0, follow:0, like:0 };
}

function handleMonthlyKpiInput(event){
  const month = $('monthFilter').value || 'all';
  const showroom = event.target.dataset.kpiShowroom;
  const platform = event.target.dataset.kpiPlatform;
  const field = event.target.dataset.kpiField;
  const key = `${month}|${showroom}|${platform}`;
  monthlyKpis[key] = monthlyKpis[key] || { reach:0, engagement:0, follow:0, like:0 };
  monthlyKpis[key][field] = Math.max(0, Number(event.target.value || 0));
  saveMonthlyKpis();
  saveMonthlyKpiToSupabase(month, showroom, platform).catch(err => console.warn('Không lưu được KPI lên Supabase:', err));
  renderShowroomDashboard();
}

function getShowroomKpis(showroom, showroomPosts){
  const month = $('monthFilter').value || 'all';
  const platforms = showroom === 'HO' ? [...showroomDashboardChannels, 'YouTube'] : showroomDashboardChannels;
  const totals = platforms.reduce((acc, platform) => {
    const kpi = getMonthlyKpi(showroom, platform, month);
    acc.reach += toNumber(kpi.reach);
    acc.engagement += toNumber(kpi.engagement);
    acc.follow += toNumber(kpi.follow);
    acc.like += toNumber(kpi.like);
    return acc;
  }, { reach:0, engagement:0, follow:0, like:0 });
  const links = ['Facebook', 'TikTok', 'Zalo OA'].map(platform => getShowroomChannelLink(platform, showroom)).filter(Boolean).length;
  const google = getGoogleMapInfoForShowroom(showroom);
  return {
    video: showroomPosts.filter(post => getMediaUrls(post).some(url => isVideoUrl(url))).length,
    reach: totals.reach || '-',
    engagement: totals.engagement || '-',
    follow: totals.follow || (links ? `${links} kênh` : '-'),
    like: totals.like || (google && google.reviews ? google.reviews : '-')
  };
}

function renderRecentActivity(items){
  const recent = [...items].sort((a,b)=>String(b.post_date||'').localeCompare(String(a.post_date||''))).slice(0,5);
  if(!recent.length) return '<div class="empty-mini">Chưa có hoạt động</div>';
  return recent.map(post => `
    <div class="activity-item">
      <b>${escapeHtml(post.title || '-')}</b>
      <span>${escapeHtml(post.platform || '-')} · ${formatDate(post.post_date)}</span>
    </div>
  `).join('');
}

function renderContentCalendar(items, month){
  const daysInMonth = month ? new Date(Number(month.slice(0,4)), Number(month.slice(5,7)), 0).getDate() : 31;
  const postedDays = new Set(items.map(post => Number(String(post.post_date || '').slice(8,10))).filter(Boolean));
  return Array.from({ length: daysInMonth }, (_, i) => {
    const day = i + 1;
    return `<span class="${postedDays.has(day) ? 'has-post' : ''}">${day}</span>`;
  }).join('');
}

function getShowroomChannelLink(platform, showroom){
  return getShowroomChannelAccount(platform, showroom).link || '';
}

function getShowroomChannelAccount(platform, showroom){
  const accounts = channelAccounts[platform] || [];
  const found = accounts.find(account => account.showroom === showroom);
  return found || { showroom, link:'', avatar:'' };
}

function setShowroomChannelLink(platform, showroom, link){
  const found = setChannelAccountLocal(platform, showroom);
  found.link = link;
  saveChannelAccounts();
  saveChannelAccountToSupabase(platform, showroom).catch(err => console.warn('Không lưu được link account lên Supabase:', err));
}

function setShowroomChannelAvatar(platform, showroom, avatar){
  const found = setChannelAccountLocal(platform, showroom);
  found.avatar = avatar;
  saveChannelAccounts();
  saveChannelAccountToSupabase(platform, showroom).catch(err => console.warn('Không lưu được avatar account lên Supabase:', err));
}

function setChannelAccountLocal(platform, showroom, link, avatar){
  if(!channelAccounts[platform]){
    channelAccounts[platform] = showroomNames.map(name => ({ showroom:name, link:'', avatar:'' }));
  }
  let found = channelAccounts[platform].find(account => account.showroom === showroom);
  if(!found){
    found = { showroom, link:'', avatar:'' };
    channelAccounts[platform].push(found);
  }
  if(link !== undefined) found.link = link;
  if(avatar !== undefined) found.avatar = avatar;
  return found;
}

function getGoogleMapInfoForShowroom(showroom){
  return googleMapShowrooms.find(item => item.name.includes(showroom)) || {
    reviews: 0,
    target: 0,
    mapLink: ''
  };
}

function handleShowroomDashboardLink(event){
  const platform = event.target.dataset.dashboardLinkPlatform;
  const showroom = event.target.dataset.dashboardLinkShowroom;
  const link = event.target.value.trim();
  if(platform === 'Google Maps'){
    const info = googleMapShowrooms.find(item => item.name.includes(showroom));
    if(info){
      info.mapLink = link;
      saveGoogleMapShowrooms();
    }
  }else{
    setShowroomChannelLink(platform, showroom, link);
  }
  renderShowroomDashboard();
}

function renderChannelAccounts(){
  const section = $('channelAccounts');
  const target = $('channelAccountGrid');
  if(!section || !target) return;
  const overviewShowrooms = currentPlatform === 'YouTube' ? ['HO'] : reportShowroomNames;
  $('channelAccountTitle').innerText = currentPlatform === 'YouTube'
    ? 'Tổng quan YouTube - BYD NEG Việt Nam'
    : `Tổng quan ${currentPlatform} - 6 đơn vị`;
  const month = $('monthFilter').value;
  target.innerHTML = overviewShowrooms.map(showroom => {
    const channelPosts = posts.filter(post => {
      const matchMonth = !month || getMonthKey(post.post_date) === month;
      return matchMonth && showroomMatches(post.showroom, showroom) && platformMatches(post.platform, currentPlatform);
    });
    const done = channelPosts.filter(post => post.status === 'Đã đăng').length;
    const pending = channelPosts.filter(post => post.status === 'Chờ duyệt').length;
    const idea = channelPosts.filter(post => post.status === 'Ý tưởng').length;
    const account = getShowroomChannelAccount(currentPlatform, showroom);
    const link = account.link || '';
    const avatar = account.avatar || '';
    const avatarLabel = currentPlatform === 'YouTube' ? 'Logo kênh' : 'Avatar kênh';
    const avatarNode = avatar
      ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(showroomDisplayName(showroom))}" loading="lazy">`
      : `<span>${escapeHtml(avatarLabel)}</span>`;
    return `
      <article class="account-card">
        <div class="channel-head">
          <div class="account-title">
            <label class="account-avatar" title="Bấm để upload ${escapeHtml(avatarLabel.toLowerCase())}">
              ${avatarNode}
              <input type="file" accept="image/*" data-account-avatar-showroom="${escapeHtml(showroom)}">
            </label>
            <h4>${escapeHtml(showroomDisplayName(showroom))}</h4>
          </div>
        </div>
        <div class="channel-metrics">
          <div><b>${channelPosts.length}</b><span>Tổng bài</span></div>
          <div><b>${done}</b><span>Đã đăng</span></div>
          <div><b>${pending}</b><span>Chờ duyệt</span></div>
          <div><b>${idea}</b><span>Ý tưởng</span></div>
        </div>
        <label>Link account
          <input type="url" placeholder="Dán link ${escapeHtml(currentPlatform)}" value="${escapeHtml(link)}" data-account-showroom="${escapeHtml(showroom)}">
        </label>
        <a class="open-link ${link ? '' : 'is-disabled'}" href="${escapeHtml(link || '#')}" target="_blank" rel="noopener">Mở account</a>
      </article>
    `;
  }).join('');
  document.querySelectorAll('[data-account-showroom]').forEach(input => {
    input.addEventListener('change', handleAccountInput);
  });
  document.querySelectorAll('[data-account-avatar-showroom]').forEach(input => {
    input.addEventListener('change', handleAccountAvatarInput);
  });
}

function getAccountsForCurrentPlatform(){
  if(!channelAccounts[currentPlatform]){
    channelAccounts[currentPlatform] = showroomNames.map(showroom => ({ showroom, link:'', avatar:'' }));
  }
  return channelAccounts[currentPlatform];
}

function handleAccountInput(event){
  setShowroomChannelLink(currentPlatform, event.target.dataset.accountShowroom, event.target.value.trim());
  renderChannelAccounts();
}

async function handleAccountAvatarInput(event){
  const showroom = event.target.dataset.accountAvatarShowroom;
  const file = event.target.files && event.target.files[0];
  if(!file) return;
  event.target.disabled = true;
  try{
    const url = await uploadFile(file, 'channel-avatars');
    setShowroomChannelAvatar(currentPlatform, showroom, url);
    renderChannelAccounts();
  }catch(err){
    console.error(err);
    alert('Lỗi upload ảnh đại diện kênh: ' + err.message);
  }finally{
    event.target.disabled = false;
  }
}

function renderGoogleMapShowrooms(){
  const target = $('googleShowroomGrid');
  if(!target) return;
  googleMapShowrooms = mergeGoogleMapDefaults(googleMapShowrooms);
  updateGoogleSummary();
  target.innerHTML = googleMapShowrooms.map((showroom, index) => {
    const reviews = toNumber(showroom.reviews);
    const reviewTarget = toNumber(showroom.target);
    const progress = reviewTarget ? Math.min(100, Math.round(reviews / reviewTarget * 100)) : 0;
    const remaining = Math.max(0, reviewTarget - reviews);
    const mapLink = showroom.mapLink || '';
    const image = showroom.image
      ? `<img src="${escapeHtml(showroom.image)}" alt="${escapeHtml(showroom.name)}" loading="lazy" onerror="this.outerHTML='<div class=&quot;google-photo-empty&quot;>Ảnh showroom</div>'">`
      : '<div class="google-photo-empty">Ảnh showroom</div>';
    return `
      <article class="google-card">
        <label class="google-photo" title="Bấm để upload ảnh showroom">
          ${image}
          <input type="file" accept="image/*" data-google-field="image" data-google-index="${index}">
        </label>
        ${showroom.image ? `<button type="button" class="clear-google-photo" onclick="clearGoogleShowroomImage(${index})">Xóa ảnh</button>` : ''}
        <div class="google-body">
          <div class="google-topline">
            <span class="service-badge">${escapeHtml(showroom.type || '')}</span>
          </div>
          <h4>${escapeHtml(showroom.name)}</h4>
          <div class="review-metrics">
            <div><b>${reviews}</b><span>Đánh giá hiện tại</span></div>
            <div><b>${reviewTarget}</b><span>Target</span></div>
            <div><b>${remaining}</b><span>Còn thiếu</span></div>
          </div>
          <div class="progress-track"><i style="width:${progress}%"></i></div>
          <div class="review-count">${progress}% target</div>
          <p><span class="pin-icon">⌖</span>${escapeHtml(showroom.address)}</p>
          <div class="google-edit">
            <label>Số đánh giá
              <input type="number" min="0" value="${reviews}" data-google-field="reviews" data-google-index="${index}">
            </label>
            <label>Target
              <input type="number" min="0" value="${reviewTarget}" data-google-field="target" data-google-index="${index}">
            </label>
            <label>Link Google Maps
              <input type="url" placeholder="Dán link Google Maps" value="${escapeHtml(mapLink)}" data-google-field="mapLink" data-google-index="${index}">
            </label>
            <a class="open-link ${mapLink ? '' : 'is-disabled'}" href="${escapeHtml(mapLink || '#')}" target="_blank" rel="noopener">Mở Google Maps</a>
          </div>
        </div>
      </article>
    `;
  }).join('');
  bindGoogleMapInputs();
  updateGoogleMapSection();
}

function bindGoogleMapInputs(){
  document.querySelectorAll('[data-google-field]').forEach(input => {
    input.addEventListener('change', handleGoogleMapInput);
  });
}

function clearGoogleShowroomImage(index){
  if(!googleMapShowrooms[index]) return;
  if(!confirm('Xóa ảnh của Google Business này?')) return;
  googleMapShowrooms[index].image = '';
  saveGoogleMapShowrooms();
  renderGoogleMapShowrooms();
}

async function handleGoogleMapInput(event){
  const input = event.target;
  const index = Number(input.dataset.googleIndex);
  const field = input.dataset.googleField;
  if(!googleMapShowrooms[index]) return;

  if(field === 'image'){
    const file = input.files && input.files[0];
    if(!file) return;
    input.disabled = true;
    try{
      googleMapShowrooms[index].image = await uploadShowroomImage(file, googleMapShowrooms[index].name);
      saveGoogleMapShowrooms();
      renderGoogleMapShowrooms();
    }catch(err){
      console.error(err);
      alert('Lỗi upload ảnh showroom: ' + err.message);
    }finally{
      input.disabled = false;
    }
    return;
  }

  if(field === 'reviews' || field === 'target'){
    googleMapShowrooms[index][field] = Math.max(0, Number(input.value || 0));
  }else{
    googleMapShowrooms[index][field] = input.value.trim();
  }
  saveGoogleMapShowrooms();
  renderGoogleMapShowrooms();
}

function updateGoogleSummary(){
  const totalReviews = googleMapShowrooms.reduce((sum, item) => sum + toNumber(item.reviews), 0);
  const totalTarget = googleMapShowrooms.reduce((sum, item) => sum + toNumber(item.target), 0);
  const progress = totalTarget ? Math.min(100, Math.round(totalReviews / totalTarget * 100)) : 0;
  const remaining = Math.max(0, totalTarget - totalReviews);
  $('googleTotalReviews').innerText = totalReviews;
  $('googleTotalTarget').innerText = totalTarget;
  $('googleProgress').innerText = `${progress}%`;
  $('googleRemaining').innerText = remaining;
}

function resetGoogleMapReport(){
  if(!confirm('Đặt lại báo cáo Google Maps về mặc định?')) return;
  googleMapShowrooms = JSON.parse(JSON.stringify(defaultGoogleMapShowrooms));
  saveGoogleMapShowrooms();
  renderGoogleMapShowrooms();
}

function loadGoogleMapShowrooms(){
  try{
    const saved = localStorage.getItem(googleMapStorageKey);
    if(saved) return mergeGoogleMapDefaults(JSON.parse(saved));
  }catch(err){
    console.warn('Không đọc được dữ liệu Google Maps đã lưu:', err);
  }
  return JSON.parse(JSON.stringify(defaultGoogleMapShowrooms));
}

function mergeGoogleMapDefaults(saved){
  const existing = Array.isArray(saved) ? saved : [];
  const existingByKey = existing.reduce((acc, item) => {
    const key = showroomKeyFromGoogleName(item.name || '');
    if(key && !acc[key]) acc[key] = item;
    return acc;
  }, {});
  const merged = defaultGoogleMapShowrooms.map(defaultItem => {
    const key = showroomKeyFromGoogleName(defaultItem.name);
    const found = existingByKey[key];
    return found ? {
      ...defaultItem,
      reviews: found.reviews || 0,
      target: found.target || defaultItem.target,
      image: found.image || '',
      mapLink: found.mapLink || ''
    } : { ...defaultItem };
  });
  return merged;
}

function showroomKeyFromGoogleName(name){
  const normalized = normalizeText(name);
  if(normalized.includes('tru so') || normalized.includes('viet nam')) return 'Trụ sở chính';
  if(normalized.includes('phu quoc')) return 'Phú Quốc';
  if(normalized.includes('can tho')) return 'Cần Thơ';
  if(normalized.includes('kien giang')) return 'Kiên Giang';
  if(normalized.includes('an giang')) return 'An Giang';
  if(normalized.includes('tien giang')) return 'Tiền Giang';
  return 'Trụ sở chính';
}

function normalizeText(text){
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

function saveGoogleMapShowrooms(){
  localStorage.setItem(googleMapStorageKey, JSON.stringify(googleMapShowrooms));
  saveGoogleBusinessToSupabase().catch(err => console.warn('Không lưu được Google Maps lên Supabase:', err));
}

function loadChannelAccounts(){
  try{
    const saved = localStorage.getItem(channelAccountStorageKey);
    if(saved) return mergeChannelAccountDefaults(JSON.parse(saved));
  }catch(err){
    console.warn('Không đọc được link account đã lưu:', err);
  }
  return createDefaultChannelAccounts();
}

function createDefaultChannelAccounts(){
  return {
    Facebook: showroomNames.map(showroom => ({ showroom, link:'', avatar:'' })),
    TikTok: showroomNames.map(showroom => ({ showroom, link:'', avatar:'' })),
    'Zalo OA': showroomNames.map(showroom => ({ showroom, link:'', avatar:'' })),
    YouTube: [{ showroom:'HO', link:'', avatar:'' }]
  };
}

function mergeChannelAccountDefaults(saved){
  const defaults = createDefaultChannelAccounts();
  Object.keys(defaults).forEach(platform => {
    const existing = Array.isArray(saved && saved[platform]) ? saved[platform] : [];
    defaults[platform] = defaults[platform].map(item => {
      const found = existing.find(account => account.showroom === item.showroom);
      return found ? { ...item, ...found } : item;
    });
  });
  return defaults;
}

function saveChannelAccounts(){
  localStorage.setItem(channelAccountStorageKey, JSON.stringify(channelAccounts));
}

function loadMonthlyKpis(){
  try{
    const saved = localStorage.getItem(monthlyKpiStorageKey);
    if(saved) return JSON.parse(saved);
  }catch(err){
    console.warn('Không đọc được KPI tháng đã lưu:', err);
  }
  return {};
}

function saveMonthlyKpis(){
  localStorage.setItem(monthlyKpiStorageKey, JSON.stringify(monthlyKpis));
}

async function loadCloudData(){
  const results = await Promise.allSettled([
    loadGoogleBusinessFromSupabase(),
    loadChannelAccountsFromSupabase(),
    loadMonthlyKpisFromSupabase(),
    loadMediaLibraryFromSupabase()
  ]);
  results.forEach(result => {
    if(result.status === 'rejected') console.warn('Có dữ liệu chưa đồng bộ được từ Supabase:', result.reason);
  });
}

async function loadGoogleBusinessFromSupabase(){
  const { data, error } = await supabaseClient.from('google_business').select('*');
  if(error){
    console.warn('Không đọc được Google Maps từ Supabase:', error);
    googleMapShowrooms = loadGoogleMapShowrooms();
    return;
  }
  if(!data || !data.length){
    googleMapShowrooms = loadGoogleMapShowrooms();
    await saveGoogleBusinessToSupabase();
    return;
  }
  googleMapShowrooms = mergeGoogleMapDefaults(data.map(row => ({
    type: row.type || '',
    name: row.name || '',
    address: row.address || '',
    image: row.image || '',
    mapLink: row.map_link || '',
    reviews: toNumber(row.reviews),
    target: toNumber(row.target) || 100
  })));
  saveGoogleMapShowroomsLocal();
}

function saveGoogleMapShowroomsLocal(){
  localStorage.setItem(googleMapStorageKey, JSON.stringify(googleMapShowrooms));
}

async function saveGoogleBusinessToSupabase(){
  const { error: deleteError } = await supabaseClient.from('google_business').delete().neq('name', '__never__');
  if(deleteError) throw deleteError;
  const rows = googleMapShowrooms.map(item => ({
    name: item.name || '',
    type: item.type || '',
    address: item.address || '',
    image: item.image || '',
    map_link: item.mapLink || '',
    reviews: toNumber(item.reviews),
    target: toNumber(item.target) || 100,
    updated_at: new Date().toISOString()
  }));
  const { error } = await supabaseClient.from('google_business').insert(rows);
  if(error) throw error;
}

async function loadChannelAccountsFromSupabase(){
  const { data, error } = await supabaseClient.from('channel_accounts').select('*');
  if(error){
    console.warn('Không đọc được account từ Supabase:', error);
    channelAccounts = loadChannelAccounts();
    return;
  }
  if(!data || !data.length){
    channelAccounts = loadChannelAccounts();
    await saveAllChannelAccountsToSupabase();
    return;
  }
  channelAccounts = createDefaultChannelAccounts();
  data.forEach(row => {
    setChannelAccountLocal(row.platform, row.showroom, row.link || '', row.avatar || '');
  });
  saveChannelAccounts();
}

async function saveAllChannelAccountsToSupabase(){
  const tasks = [];
  Object.keys(channelAccounts).forEach(platform => {
    (channelAccounts[platform] || []).forEach(account => {
      tasks.push(saveChannelAccountToSupabase(platform, account.showroom));
    });
  });
  await Promise.all(tasks);
}

async function saveChannelAccountToSupabase(platform, showroom){
  const account = getShowroomChannelAccount(platform, showroom);
  const { error } = await supabaseClient.from('channel_accounts').upsert({
    platform,
    showroom,
    link: account.link || '',
    avatar: account.avatar || '',
    updated_at: new Date().toISOString()
  }, { onConflict: 'platform,showroom' });
  if(error) throw error;
}

async function loadMonthlyKpisFromSupabase(){
  const { data, error } = await supabaseClient.from('monthly_kpis').select('*');
  if(error){
    console.warn('Không đọc được KPI từ Supabase:', error);
    monthlyKpis = loadMonthlyKpis();
    return;
  }
  if(!data || !data.length){
    monthlyKpis = loadMonthlyKpis();
    await saveAllMonthlyKpisToSupabase();
    return;
  }
  monthlyKpis = {};
  data.forEach(row => {
    const key = `${row.month || 'all'}|${row.showroom}|${row.platform}`;
    monthlyKpis[key] = {
      reach: toNumber(row.reach),
      engagement: toNumber(row.engagement),
      follow: toNumber(row.follow),
      like: toNumber(row.like_count)
    };
  });
  saveMonthlyKpis();
}

async function saveAllMonthlyKpisToSupabase(){
  await Promise.all(Object.keys(monthlyKpis).map(key => {
    const [month, showroom, platform] = key.split('|');
    return saveMonthlyKpiToSupabase(month, showroom, platform);
  }));
}

async function saveMonthlyKpiToSupabase(month, showroom, platform){
  const kpi = getMonthlyKpi(showroom, platform, month);
  const { error } = await supabaseClient.from('monthly_kpis').upsert({
    month: month || 'all',
    showroom,
    platform,
    reach: toNumber(kpi.reach),
    engagement: toNumber(kpi.engagement),
    follow: toNumber(kpi.follow),
    like_count: toNumber(kpi.like),
    updated_at: new Date().toISOString()
  }, { onConflict: 'month,showroom,platform' });
  if(error) throw error;
}

function defaultMediaFolders(){
  return [
    'Hình ảnh sản phẩm/Sealion 6',
    'Hình ảnh sản phẩm/Seal 5',
    'Hình ảnh sản phẩm/M6',
    'Hình ảnh sản phẩm/M9',
    'Hình ảnh sản phẩm/Atto 2',
    'Hình ảnh sản phẩm/Dolphin',
    'Video sản phẩm',
    'Logo & Bộ nhận diện thương hiệu/Brand Guideline',
    'Brochure/Brochure sản phẩm',
    'Brochure/Brochure showroom',
    'Tài liệu đào tạo/Đào tạo sản phẩm',
    'Tài liệu đào tạo/Đào tạo bán hàng',
    'Tài liệu đào tạo/Đào tạo Marketing',
    'SOP/Quy trình',
    'SOP/Chính sách',
    'SOP/Checklist',
    'Hình ảnh Showroom/Trụ sở chính',
    'Hình ảnh Showroom/Phú Quốc',
    'Hình ảnh Showroom/Cần Thơ',
    'Hình ảnh Showroom/Kiên Giang',
    'Hình ảnh Showroom/An Giang',
    'Hình ảnh Showroom/Tiền Giang',
    'Banner & Template',
    'Chiến dịch Marketing/Khai trương',
    'Chiến dịch Marketing/Roadshow',
    'Chiến dịch Marketing/Caravan',
    'Chiến dịch Marketing/Triển lãm',
    'Chiến dịch Marketing/Khuyến mãi',
    'Chiến dịch Marketing/Livestream',
    'Chiến dịch Marketing/Khác',
    'Tài liệu khác/Báo giá',
    'Tài liệu khác/Hợp đồng mẫu',
    'Tài liệu khác/Excel',
    'Tài liệu khác/Word',
    'Tài liệu khác/PDF',
    'Tài liệu khác/Biểu mẫu',
    'Tài liệu khác/Tài liệu nội bộ'
  ];
}

function loadMediaLibrary(){
  try{
    const saved = localStorage.getItem(mediaLibraryStorageKey);
    if(saved){
      const parsed = JSON.parse(saved);
      return {
        folders: [...new Set([...defaultMediaFolders(), ...(parsed.folders || [])])],
        files: parsed.files || []
      };
    }
  }catch(err){
    console.warn('Không đọc được Media Library:', err);
  }
  return { folders: defaultMediaFolders(), files: [] };
}

function saveMediaLibrary(){
  localStorage.setItem(mediaLibraryStorageKey, JSON.stringify(mediaLibrary));
}

async function loadMediaLibraryFromSupabase(){
  const { data, error } = await supabaseClient
    .from('media_library')
    .select('*')
    .order('uploaded_at', { ascending:false });
  if(error){
    console.warn('Không đọc được Media Library từ Supabase:', error);
    mediaLibrary = loadMediaLibrary();
    return;
  }
  if(!data || !data.length){
    mediaLibrary = loadMediaLibrary();
    await migrateLocalMediaLibraryToSupabase();
    return;
  }
  const folders = data
    .filter(row => row.type === 'folder')
    .map(row => row.folder)
    .filter(Boolean);
  const files = data
    .filter(row => row.type !== 'folder')
    .map(row => ({
      id: row.id,
      name: row.name || 'Tệp chưa đặt tên',
      folder: row.folder || 'Tài liệu khác',
      url: row.url || '',
      type: row.type || 'application/octet-stream',
      size: toNumber(row.size),
      uploadedAt: row.uploaded_at || new Date().toISOString()
    }));
  mediaLibrary = {
    folders: [...new Set([...defaultMediaFolders(), ...folders, ...files.map(file => file.folder)])],
    files
  };
  saveMediaLibrary();
}

async function migrateLocalMediaLibraryToSupabase(){
  const folders = [...new Set(mediaLibrary.folders || [])];
  await Promise.all(folders.map(folder => saveMediaFolderToSupabase(folder)));
  const rows = (mediaLibrary.files || []).map(file => ({
    name: file.name || 'Tệp chưa đặt tên',
    folder: file.folder || 'Tài liệu khác',
    url: file.url || '',
    type: file.type || 'application/octet-stream',
    size: toNumber(file.size),
    uploaded_at: file.uploadedAt || new Date().toISOString()
  })).filter(row => row.url);
  if(rows.length){
    const { data, error } = await supabaseClient.from('media_library').insert(rows).select('*');
    if(error) throw error;
    mediaLibrary.files = (data || []).map(row => ({
      id: row.id,
      name: row.name,
      folder: row.folder,
      url: row.url,
      type: row.type || 'application/octet-stream',
      size: toNumber(row.size),
      uploadedAt: row.uploaded_at
    }));
  }
  saveMediaLibrary();
}

async function saveMediaFolderToSupabase(folder){
  if(!folder) return;
  const { data } = await supabaseClient
    .from('media_library')
    .select('id')
    .eq('folder', folder)
    .eq('type', 'folder')
    .limit(1);
  if(data && data.length) return;
  const { error } = await supabaseClient.from('media_library').insert({
    name: '.folder',
    folder,
    url: '#folder',
    type: 'folder',
    size: 0
  });
  if(error) throw error;
}

function updateMediaFolderInSupabase(folder, nextFolder){
  supabaseClient
    .from('media_library')
    .update({ folder: nextFolder })
    .eq('folder', folder)
    .then(({ error }) => {
      if(error) console.warn('Không đổi tên thư mục trên Supabase:', error);
    });
}

function deleteMediaFolderFromSupabase(folder){
  supabaseClient
    .from('media_library')
    .delete()
    .eq('folder', folder)
    .then(({ error }) => {
      if(error) console.warn('Không xóa được thư mục trên Supabase:', error);
    });
}

function updateMediaFileInSupabase(id, fields){
  supabaseClient
    .from('media_library')
    .update(fields)
    .eq('id', id)
    .then(({ error }) => {
      if(error) console.warn('Không cập nhật được Media Library trên Supabase:', error);
    });
}

function deleteMediaFileFromSupabase(id){
  supabaseClient
    .from('media_library')
    .delete()
    .eq('id', id)
    .then(({ error }) => {
      if(error) console.warn('Không xóa được file Media Library trên Supabase:', error);
    });
}

function renderMediaLibrary(){
  renderMediaFolders();
  renderMediaFiles();
}

function renderMediaFolders(){
  const folders = ['all', ...mediaLibrary.folders];
  $('mediaFolderFilter').innerHTML = folders.map(folder => `
    <option value="${escapeHtml(folder)}" ${folder === currentMediaFolder ? 'selected' : ''}>${folder === 'all' ? 'Tất cả thư mục' : escapeHtml(folder)}</option>
  `).join('');
  $('mediaFolderTree').innerHTML = folders.map(folder => `
    <div class="media-folder-row ${folder === currentMediaFolder ? 'active' : ''}">
      <button onclick="selectMediaFolder('${escapeJs(folder)}')">${folder === 'all' ? 'Tất cả thư mục' : escapeHtml(folder)}</button>
      ${folder === 'all' ? '' : `
        <button class="folder-edit" title="Đổi tên thư mục" onclick="renameMediaFolder('${escapeJs(folder)}')">✎</button>
        <button class="folder-delete" title="Xóa thư mục" onclick="deleteMediaFolder('${escapeJs(folder)}')">×</button>
      `}
    </div>
  `).join('');
}

function selectMediaFolder(folder){
  currentMediaFolder = folder;
  renderMediaLibrary();
}

function getFilteredMediaFiles(){
  const keyword = $('mediaSearch').value.toLowerCase().trim();
  return mediaLibrary.files.filter(file => {
    const matchFolder = currentMediaFolder === 'all' || file.folder === currentMediaFolder;
    const text = `${file.name} ${file.folder}`.toLowerCase();
    return matchFolder && text.includes(keyword);
  });
}

function renderMediaFiles(){
  const files = getFilteredMediaFiles();
  if(!files.length){
    $('mediaGrid').innerHTML = '<div class="empty-mini">Chưa có tài nguyên trong thư mục này</div>';
    return;
  }
  $('mediaGrid').innerHTML = files.map(file => `
    <article class="media-card">
      <div class="media-preview" onclick="previewMedia('${escapeJs(file.url)}','${escapeJs(file.type)}')">${renderMediaThumb(file)}</div>
      <div class="media-info">
        <b title="${escapeHtml(file.name)}">${escapeHtml(file.name)}</b>
        <span>${escapeHtml(file.folder)}</span>
      </div>
      <div class="media-actions">
        <button onclick="renameMediaFile('${file.id}')">Đổi tên</button>
        <button onclick="moveMediaFile('${file.id}')">Di chuyển</button>
        <button onclick="downloadMediaFile('${file.id}')">Tải xuống</button>
        <button class="danger" onclick="deleteMediaFile('${file.id}')">Xóa</button>
      </div>
    </article>
  `).join('');
}

function renderMediaThumb(file){
  if(file.type.startsWith('image/')) return `<img src="${escapeHtml(file.url)}" alt="${escapeHtml(file.name)}">`;
  if(file.type.startsWith('video/')) return '<div class="file-preview">Video</div>';
  return '<div class="file-preview">Tài liệu</div>';
}

function setupMediaDropZone(){
  const zone = $('mediaDropZone');
  const prevent = e => {
    e.preventDefault();
    e.stopPropagation();
  };
  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    document.addEventListener(eventName, prevent, false);
  });
  zone.addEventListener('click', () => $('mediaUploadInput').click());
  zone.addEventListener('dragover', e => {
    zone.classList.add('is-dragging');
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('is-dragging'));
  zone.addEventListener('drop', e => {
    zone.classList.remove('is-dragging');
    uploadMediaLibraryFiles(Array.from(e.dataTransfer.files || []));
  });
  $('mediaLibrary').addEventListener('drop', e => {
    zone.classList.remove('is-dragging');
    uploadMediaLibraryFiles(Array.from(e.dataTransfer.files || []));
  });
}

async function uploadMediaLibraryFiles(files){
  if(!files.length) return;
  const folder = currentMediaFolder === 'all' ? (mediaLibrary.folders[0] || 'Tài liệu khác') : currentMediaFolder;
  try{
    $('mediaDropZone').innerText = `Đang upload ${files.length} tệp...`;
    for(const file of files){
      const url = await uploadFile(file, 'media-library');
      const row = {
        name: file.name,
        folder,
        url,
        type: file.type || 'application/octet-stream',
        size: file.size,
        uploaded_at: new Date().toISOString()
      };
      const { data, error } = await supabaseClient.from('media_library').insert(row).select('*').single();
      if(error) throw error;
      mediaLibrary.files.unshift({
        id: data.id,
        name: data.name,
        folder: data.folder,
        url: data.url,
        type: data.type || 'application/octet-stream',
        size: toNumber(data.size),
        uploadedAt: data.uploaded_at
      });
    }
    saveMediaLibrary();
    $('mediaUploadInput').value = '';
    $('mediaDropZone').innerText = `Đã upload ${files.length} tệp vào ${folder}`;
    renderMediaLibrary();
  }catch(err){
    console.error(err);
    alert('Lỗi upload Media Library: ' + err.message);
    $('mediaDropZone').innerText = 'Kéo và thả tệp vào đây để upload';
  }
}

function createMediaFolder(){
  const name = prompt('Nhập tên thư mục hoặc đường dẫn thư mục con');
  if(!name) return;
  const folder = name.trim();
  if(!folder) return;
  if(!mediaLibrary.folders.includes(folder)) mediaLibrary.folders.push(folder);
  currentMediaFolder = folder;
  saveMediaLibrary();
  saveMediaFolderToSupabase(folder).catch(err => console.warn('Không lưu được thư mục lên Supabase:', err));
  renderMediaLibrary();
}

function renameMediaFolder(folder){
  const name = prompt('Tên thư mục mới', folder);
  if(!name) return;
  const nextFolder = name.trim();
  if(!nextFolder || nextFolder === folder) return;
  if(mediaLibrary.folders.includes(nextFolder)){
    alert('Thư mục này đã tồn tại');
    return;
  }
  mediaLibrary.folders = mediaLibrary.folders.map(item => item === folder ? nextFolder : item);
  mediaLibrary.files.forEach(file => {
    if(file.folder === folder) file.folder = nextFolder;
  });
  if(currentMediaFolder === folder) currentMediaFolder = nextFolder;
  saveMediaLibrary();
  updateMediaFolderInSupabase(folder, nextFolder);
  renderMediaLibrary();
}

function deleteMediaFolder(folder){
  const fileCount = mediaLibrary.files.filter(file => file.folder === folder).length;
  const message = fileCount
    ? `Xóa thư mục "${folder}" và ${fileCount} tệp trong thư mục khỏi Media Library?`
    : `Xóa thư mục "${folder}"?`;
  if(!confirm(message)) return;
  mediaLibrary.folders = mediaLibrary.folders.filter(item => item !== folder);
  mediaLibrary.files = mediaLibrary.files.filter(file => file.folder !== folder);
  if(currentMediaFolder === folder) currentMediaFolder = 'all';
  saveMediaLibrary();
  deleteMediaFolderFromSupabase(folder);
  renderMediaLibrary();
}

function renameMediaFile(id){
  const file = mediaLibrary.files.find(item => item.id === id);
  if(!file) return;
  const name = prompt('Tên mới', file.name);
  if(!name) return;
  file.name = name.trim();
  saveMediaLibrary();
  updateMediaFileInSupabase(id, { name: file.name });
  renderMediaLibrary();
}

function moveMediaFile(id){
  const file = mediaLibrary.files.find(item => item.id === id);
  if(!file) return;
  const folder = prompt('Di chuyển tới thư mục', file.folder);
  if(!folder) return;
  file.folder = folder.trim();
  if(!mediaLibrary.folders.includes(file.folder)){
    mediaLibrary.folders.push(file.folder);
    saveMediaFolderToSupabase(file.folder).catch(err => console.warn('Không lưu được thư mục lên Supabase:', err));
  }
  saveMediaLibrary();
  updateMediaFileInSupabase(id, { folder: file.folder });
  renderMediaLibrary();
}

function deleteMediaFile(id){
  if(!confirm('Xóa tài nguyên khỏi Media Library?')) return;
  mediaLibrary.files = mediaLibrary.files.filter(file => file.id !== id);
  saveMediaLibrary();
  deleteMediaFileFromSupabase(id);
  renderMediaLibrary();
}

function downloadMediaFile(id){
  const file = mediaLibrary.files.find(item => item.id === id);
  if(!file) return;
  const link = document.createElement('a');
  link.href = file.url;
  link.download = file.name;
  link.target = '_blank';
  link.rel = 'noopener';
  link.click();
}

function previewMedia(url, type){
  if(String(type).startsWith('image/')) showImage(url);
  else window.open(url, '_blank', 'noopener');
}

function openMediaPicker(){
  pendingPickedMedia = new Set(selectedLibraryMediaUrls);
  $('mediaPickerModal').classList.add('open');
  renderMediaPicker();
}

function closeMediaPicker(){
  $('mediaPickerModal').classList.remove('open');
}

function renderMediaPicker(){
  const keyword = $('mediaPickerSearch').value.toLowerCase().trim();
  const files = mediaLibrary.files.filter(file => `${file.name} ${file.folder}`.toLowerCase().includes(keyword));
  if(!files.length){
    $('mediaPickerGrid').innerHTML = '<div class="empty-mini">Chưa có tài nguyên phù hợp</div>';
    return;
  }
  $('mediaPickerGrid').innerHTML = files.map(file => `
    <article class="media-card picker ${pendingPickedMedia.has(file.url) ? 'is-picked' : ''}" onclick="togglePickedMedia('${escapeJs(file.url)}')">
      <div class="media-preview">${renderMediaThumb(file)}</div>
      <div class="media-info">
        <b>${escapeHtml(file.name)}</b>
        <span>${escapeHtml(file.folder)}</span>
      </div>
    </article>
  `).join('');
}

function togglePickedMedia(url){
  if(pendingPickedMedia.has(url)) pendingPickedMedia.delete(url);
  else pendingPickedMedia.add(url);
  renderMediaPicker();
}

function usePickedMedia(){
  selectedLibraryMediaUrls = Array.from(pendingPickedMedia);
  renderPickedMedia();
  closeMediaPicker();
}

function renderPickedMedia(){
  const wrap = $('pickedMediaWrap');
  if(!wrap) return;
  if(!selectedLibraryMediaUrls.length){
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML = selectedLibraryMediaUrls.map(url => `
    <span>
      ${escapeHtml(mediaNameByUrl(url))}
      <button type="button" onclick="removePickedMedia('${escapeJs(url)}')">×</button>
    </span>
  `).join('');
}

function removePickedMedia(url){
  selectedLibraryMediaUrls = selectedLibraryMediaUrls.filter(item => item !== url);
  renderPickedMedia();
}

function mediaNameByUrl(url){
  const file = mediaLibrary.files.find(item => item.url === url);
  return file ? file.name : 'Media Library';
}

function toNumber(value){
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

async function uploadShowroomImage(file, showroomName){
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const slug = String(showroomName || 'showroom')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `showrooms/${slug || 'showroom'}/${safeName}`;
  const { error } = await supabaseClient.storage.from(BUCKET_NAME).upload(path, file, { upsert:false });
  if(error) throw error;
  const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

function setDefaultMonth(){
  const now = new Date();
  const month = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  $('monthFilter').value = month;
}

function getMonthKey(dateText){
  if(!dateText) return '';
  return String(dateText).slice(0,7);
}

function getMonthPosts(){
  const month = $('monthFilter').value;
  return posts.filter(p => {
    const matchMonth = !month || getMonthKey(p.post_date) === month;
    const matchPlatform = platformMatches(p.platform, currentPlatform);
    const matchShowroom = showroomMatches(p.showroom, currentShowroom);
    return matchMonth && matchPlatform && matchShowroom;
  });
}

function getWeekOfMonth(dateText){
  if(!dateText) return null;
  const d = new Date(dateText + 'T00:00:00');
  if(Number.isNaN(d.getTime())) return null;
  return Math.ceil(d.getDate() / 7);
}

function countBy(items, getter){
  return items.reduce((acc, item) => {
    const keys = getter(item);
    (Array.isArray(keys) ? keys : [keys]).forEach(key => {
      if(!key) return;
      acc[key] = (acc[key] || 0) + 1;
    });
    return acc;
  }, {});
}

function renderKeyValueStats(targetId, data){
  const entries = Object.entries(data).sort((a,b)=>b[1]-a[1]);
  if(entries.length === 0){
    $(targetId).innerHTML = '<div class="empty-mini">Chưa có dữ liệu</div>';
    return;
  }
  const max = Math.max(...entries.map(x=>x[1]), 1);
  $(targetId).innerHTML = entries.map(([name, count], index) => `
    <div class="stat-row" style="--bar-index:${index}">
      <div class="stat-label"><span>${escapeHtml(name)}</span><b>${count}</b></div>
      <div class="bar"><i style="width:${Math.max(8, Math.round(count/max*100))}%"></i></div>
    </div>
  `).join('');
}

function updateStats(){
  const monthPosts = getMonthPosts();
  $('totalCount').innerText = monthPosts.length;
  $('pendingCount').innerText = monthPosts.filter(p => p.status === 'Chờ duyệt').length;
  $('doneCount').innerText = monthPosts.filter(p => p.status === 'Đã đăng').length;
  $('ideaCount').innerText = monthPosts.filter(p => p.status === 'Ý tưởng').length;

  const weeks = { 'Tuần 1':0, 'Tuần 2':0, 'Tuần 3':0, 'Tuần 4':0, 'Tuần 5':0 };
  monthPosts.forEach(p => {
    const w = getWeekOfMonth(p.post_date);
    if(w) weeks[`Tuần ${Math.min(w,5)}`] += 1;
  });
  renderKeyValueStats('weekStats', weeks);

  renderKeyValueStats('platformStats', countBy(monthPosts, p => platformList(p.platform || 'Khác')));
  renderKeyValueStats('showroomStats', countBy(monthPosts, p => showroomList(p.showroom || 'Chưa chọn')));
}

function openModal(preset = {}){
  clearForm();
  if(preset.platform) setPlatformChecks(preset.platform);
  if(preset.showroom) setShowroomChecks(preset.showroom);
  $('postModal').classList.add('open');
}
function closeModal(){ $('postModal').classList.remove('open'); }

function setChecks(name, values, fallback){
  const selected = csvList(values || fallback);
  document.querySelectorAll(`input[name="${name}"]`).forEach(cb => {
    cb.checked = selected.includes(cb.value);
  });
}

function getChecks(name){
  return Array.from(document.querySelectorAll(`input[name="${name}"]:checked`)).map(cb => cb.value);
}

function setPlatformChecks(values){ setChecks('platformCheck', values, 'Facebook'); }
function getPlatformChecks(){ return getChecks('platformCheck'); }
function setShowroomChecks(values){ setChecks('showroomCheck', values, 'HO'); }
function getShowroomChecks(){ return getChecks('showroomCheck'); }

function clearForm(){
  editingId = null;
  editingImageUrls = [];
  editingMediaUrls = [];
  editingThumbnailUrl = '';
  selectedLibraryMediaUrls = [];
  pendingPickedMedia = new Set();
  $('modalTitle').innerText = 'Tạo bài mới';
  setPlatformChecks('Facebook');
  setShowroomChecks('HO');
  $('title').value = '';
  $('postDate').value = '';
  $('postTime').value = '';
  $('postStatus').value = 'Ý tưởng';
  $('note').value = '';
  $('imageInput').value = '';
  $('thumbnailInput').value = '';
  $('previewWrap').innerHTML = '';
  renderPickedMedia();
}

function previewImages(){
  const files = Array.from($('imageInput').files || []);
  $('previewWrap').innerHTML = '';
  const thumbnail = $('thumbnailInput').files && $('thumbnailInput').files[0];
  if(files.length === 0 && !thumbnail) return;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      $('previewWrap').appendChild(createPreviewNode(file, e.target.result));
    };
    reader.readAsDataURL(file);
  });
  if(thumbnail){
    const reader = new FileReader();
    reader.onload = e => {
      const node = createPreviewNode(thumbnail, e.target.result);
      node.classList.add('is-thumbnail');
      $('previewWrap').prepend(node);
    };
    reader.readAsDataURL(thumbnail);
  }
}

function renderExistingPreview(urls){
  const media = [...(editingThumbnailUrl ? [editingThumbnailUrl] : []), ...urls];
  $('previewWrap').innerHTML = media.map(url => `<img src="${escapeHtml(url)}" class="preview" style="display:block">`).join('');
}

function createPreviewNode(file, src){
  if(file.type.startsWith('image/')){
    const img = document.createElement('img');
    img.src = src;
    img.className = 'preview';
    return img;
  }
  const box = document.createElement('div');
  box.className = 'file-preview';
  box.textContent = file.name;
  return box;
}

async function savePost(){
  const title = $('title').value.trim();
  if(!title){ alert('Vui lòng nhập tiêu đề'); return; }
  const selectedPlatforms = getPlatformChecks();
  if(selectedPlatforms.length === 0){ alert('Vui lòng chọn ít nhất 1 nền tảng'); return; }
  const selectedShowrooms = getShowroomChecks();
  if(selectedShowrooms.length === 0){ alert('Vui lòng chọn ít nhất 1 showroom/page'); return; }
  $('btnSave').disabled = true;
  $('btnSave').innerText = 'Đang lưu...';
  try{
    let imageUrls = editingImageUrls || [];
    let mediaUrls = editingMediaUrls || [];
    let thumbnailUrl = editingThumbnailUrl || '';
    const files = Array.from($('imageInput').files || []);
    if(files.length){
      mediaUrls = await uploadFiles(files, 'posts');
      imageUrls = mediaUrls.filter(url => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url));
    }
    if(selectedLibraryMediaUrls.length){
      mediaUrls = [...mediaUrls, ...selectedLibraryMediaUrls];
      imageUrls = [...imageUrls, ...selectedLibraryMediaUrls.filter(url => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url))];
    }
    const thumbnail = $('thumbnailInput').files && $('thumbnailInput').files[0];
    if(thumbnail){ thumbnailUrl = await uploadFile(thumbnail, 'thumbnails'); }

    const payload = {
      platform: selectedPlatforms.join(', '),
      showroom: selectedShowrooms.join(', '),
      title,
      post_date: $('postDate').value || null,
      post_time: $('postTime').value || null,
      status: $('postStatus').value,
      note: $('note').value.trim(),
      image_url: imageUrls[0] || '',
      image_urls: imageUrls,
      media_urls: mediaUrls,
      thumbnail_url: thumbnailUrl
    };

    let error;
    if(editingId){
      ({ error } = await supabaseClient.from('posts').update(payload).eq('id', editingId));
    }else{
      ({ error } = await supabaseClient.from('posts').insert([payload]));
    }
    if(error) throw error;
    closeModal();
    await loadPosts();
    alert('Đã lưu thành công');
  }catch(err){
    console.error(err);
    alert('Lỗi lưu dữ liệu: ' + err.message);
  }finally{
    $('btnSave').disabled = false;
    $('btnSave').innerText = 'Lưu';
  }
}

async function uploadImages(files){
  const urls = [];
  for(const file of files){
    urls.push(await uploadFile(file, 'posts'));
  }
  return urls;
}

async function uploadImage(file){
  return uploadFile(file, 'posts');
}

async function uploadFiles(files, folder){
  const urls = [];
  for(const file of files){
    urls.push(await uploadFile(file, folder));
  }
  return urls;
}

async function uploadFile(file, folder){
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `${folder}/${safeName}`;
  const { error } = await supabaseClient.storage.from(BUCKET_NAME).upload(path, file, { upsert:false });
  if(error) throw error;
  const { data } = supabaseClient.storage.from(BUCKET_NAME).getPublicUrl(path);
  return data.publicUrl;
}

function editPost(id){
  const p = posts.find(x => x.id === id);
  if(!p) return;
  editingId = p.id;
  editingImageUrls = getImageUrls(p);
  editingMediaUrls = getMediaUrls(p);
  editingThumbnailUrl = p.thumbnail_url || '';
  selectedLibraryMediaUrls = [];
  pendingPickedMedia = new Set();
  $('modalTitle').innerText = 'Sửa bài đăng';
  setPlatformChecks(p.platform || 'Facebook');
  setShowroomChecks(p.showroom || 'HO');
  $('title').value = p.title || '';
  $('postDate').value = p.post_date || '';
  $('postTime').value = p.post_time || '';
  $('postStatus').value = p.status || 'Ý tưởng';
  $('note').value = p.note || '';
  $('imageInput').value = '';
  $('thumbnailInput').value = '';
  renderExistingPreview(editingMediaUrls);
  renderPickedMedia();
  $('postModal').classList.add('open');
}

async function deletePost(id){
  if(!confirm('Bạn có chắc muốn xóa bài này không?')) return;
  const { error } = await supabaseClient.from('posts').delete().eq('id', id);
  if(error){ alert('Lỗi xóa: ' + error.message); return; }
  await loadPosts();
}

function showImage(src){ $('bigImage').src = src; $('imageModal').classList.add('open'); }
function closeImage(){ $('imageModal').classList.remove('open'); $('bigImage').src=''; }
function setStatus(msg, ok){ const el=$('connectionStatus'); el.innerText=msg; el.className = ok ? 'status-ok':'status-bad'; }
function formatDate(d){ if(!d) return '-'; const [y,m,day]=d.split('-'); return `${day}/${m}/${y}`; }
function escapeHtml(text){ return String(text).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function escapeJs(text){ return String(text).replace(/\\/g, '\\\\').replace(/'/g, "\\'"); }


function openExportModal(){
  renderExportFields();
  $('exportModal').classList.add('open');
}

function closeExportModal(){ $('exportModal').classList.remove('open'); }

function resetExportFields(){
  exportFields = JSON.parse(JSON.stringify(defaultExportFields));
  renderExportFields();
}

function renderExportFields(){
  $('exportFieldList').innerHTML = exportFields.map((field, index) => `
    <div class="export-field" data-index="${index}">
      <label><input type="checkbox" ${field.checked ? 'checked' : ''} onchange="toggleExportField(${index}, this.checked)"> ${escapeHtml(field.label)}</label>
      <div class="field-actions">
        <button onclick="moveExportField(${index}, -1)" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button onclick="moveExportField(${index}, 1)" ${index === exportFields.length - 1 ? 'disabled' : ''}>↓</button>
      </div>
    </div>
  `).join('');
}

function toggleExportField(index, checked){
  exportFields[index].checked = checked;
}

function moveExportField(index, direction){
  const newIndex = index + direction;
  if(newIndex < 0 || newIndex >= exportFields.length) return;
  const temp = exportFields[index];
  exportFields[index] = exportFields[newIndex];
  exportFields[newIndex] = temp;
  renderExportFields();
}

function getExportSourcePosts(){
  const scope = $('exportScope').value;
  if(scope === 'all') return posts;
  if(scope === 'month') return getMonthPosts();
  return getFilteredPosts();
}

function getExportValue(post, key, index){
  if(key === 'stt') return index + 1;
  if(key === 'post_date') return formatDate(post.post_date);
  if(key === 'post_time') return post.post_time || '';
  if(key === 'week') {
    const week = getWeekOfMonth(post.post_date);
    return week ? `Tuần ${Math.min(week, 5)}` : '';
  }
  if(key === 'image_urls') return getImageUrls(post).join('\n');
  if(key === 'media_urls') return getMediaUrls(post).join('\n');
  if(key === 'created_at') return post.created_at ? new Date(post.created_at).toLocaleString('vi-VN') : '';
  return post[key] || '';
}

function getImageExtensionFromUrl(url){
  const clean = String(url || '').split('?')[0].toLowerCase();
  if(clean.endsWith('.png')) return 'png';
  if(clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'jpeg';
  return 'jpeg';
}

async function fetchImageForExcel(url){
  const response = await fetch(url);
  if(!response.ok) throw new Error('Không tải được ảnh');
  const buffer = await response.arrayBuffer();
  return {
    buffer,
    extension: getImageExtensionFromUrl(url)
  };
}

function downloadWorkbookBuffer(buffer, fileName){
  const blob = new Blob([buffer], { type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function exportExcel(){
  if(typeof ExcelJS === 'undefined'){
    alert('Chưa tải được thư viện xuất Excel. Vui lòng kiểm tra mạng rồi thử lại.');
    return;
  }
  const selectedFields = exportFields.filter(f => f.checked);
  if(selectedFields.length === 0){ alert('Vui lòng chọn ít nhất 1 trường để xuất'); return; }
  const source = getExportSourcePosts();
  if(source.length === 0){ alert('Không có dữ liệu để xuất'); return; }

  const exportBtn = $('btnExportExcel');
  exportBtn.disabled = true;
  exportBtn.innerText = 'Đang xuất...';

  try{
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'SocialHub NEG';
    workbook.created = new Date();
    const worksheet = workbook.addWorksheet('SocialHub', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    // Nếu có nhiều ảnh trong 1 bài, Excel sẽ tự tách thành nhiều cột: Ảnh 1, Ảnh 2, Ảnh 3...
    const maxImageCount = Math.max(1, ...source.map(post => getImageUrls(post).length));
    const excelColumns = [];
    selectedFields.forEach(field => {
      if(field.key === 'image_urls'){
        for(let i = 0; i < maxImageCount; i++){
          excelColumns.push({
            header: maxImageCount === 1 ? field.label : `${field.label} ${i + 1}`,
            key: `image_urls_${i}`,
            sourceKey: field.key,
            imageIndex: i,
            width: 26
          });
        }
      }else{
        excelColumns.push({
          header: field.label,
          key: field.key,
          sourceKey: field.key,
          width: field.key === 'note' ? 45 : 18
        });
      }
    });

    worksheet.columns = excelColumns.map(col => ({
      header: col.header,
      key: col.key,
      width: col.width
    }));

    const header = worksheet.getRow(1);
    header.font = { bold:true, color:{ argb:'FFFFFFFF' } };
    header.fill = { type:'pattern', pattern:'solid', fgColor:{ argb:'FF111827' } };
    header.alignment = { vertical:'middle', horizontal:'center', wrapText:true };
    header.height = 26;

    source.forEach((post, index) => {
      const rowData = {};
      excelColumns.forEach(col => {
        rowData[col.key] = col.sourceKey === 'image_urls' ? '' : getExportValue(post, col.sourceKey, index);
      });
      const row = worksheet.addRow(rowData);
      row.height = excelColumns.some(col => col.sourceKey === 'image_urls') && getImageUrls(post).length ? 130 : 24;
      row.eachCell(cell => {
        cell.alignment = { vertical:'middle', wrapText:true };
        cell.border = {
          top:{style:'thin', color:{argb:'FFE5E7EB'}},
          left:{style:'thin', color:{argb:'FFE5E7EB'}},
          bottom:{style:'thin', color:{argb:'FFE5E7EB'}},
          right:{style:'thin', color:{argb:'FFE5E7EB'}}
        };
      });
    });

    // Chèn toàn bộ ảnh, mỗi ảnh nằm trong một cột riêng để không bị mất ảnh thứ 2, thứ 3...
    const imageColumns = excelColumns
      .map((col, idx) => ({ ...col, excelIndex: idx + 1 }))
      .filter(col => col.sourceKey === 'image_urls');

    if(imageColumns.length){
      for(let rowIndex = 0; rowIndex < source.length; rowIndex++){
        const urls = getImageUrls(source[rowIndex]);
        for(const col of imageColumns){
          const url = urls[col.imageIndex];
          if(!url) continue;
          try{
            const imageData = await fetchImageForExcel(url);
            const imageId = workbook.addImage(imageData);
            worksheet.addImage(imageId, {
              tl: { col: col.excelIndex - 1 + 0.08, row: rowIndex + 1 + 0.15 },
              ext: { width: 150, height: 112 }
            });
          }catch(err){
            console.warn('Không chèn được ảnh:', url, err);
            worksheet.getCell(rowIndex + 2, col.excelIndex).value = 'Không tải được ảnh';
          }
        }
      }
    }

    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: excelColumns.length }
    };

    const month = $('monthFilter').value || 'all';
    const fileName = `SocialHub_NEG_${month}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    downloadWorkbookBuffer(buffer, fileName);
    closeExportModal();
  }catch(err){
    console.error(err);
    alert('Lỗi xuất Excel: ' + err.message);
  }finally{
    exportBtn.disabled = false;
    exportBtn.innerText = 'Xuất file Excel';
  }
}
