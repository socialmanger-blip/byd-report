let posts = [];
let currentPlatform = 'all';
let currentShowroom = 'all';
let currentBiView = 'overview';
let editingId = null;
let editingImageUrls = [];
let editingMediaUrls = [];
let appReady = false;
let currentUser = null;
let periodPickerDisplayYear = new Date().getFullYear();
let cloudPostMetricsFallback = {};
let metaImportRows = [];
let metaImportContext = { platform:'Facebook', showroom:null };
let dashboardNotifications = [];
let activeNotificationId = null;

const googleMapStorageKey = 'socialhub_google_map_showrooms_v1';
const channelAccountStorageKey = 'socialhub_channel_accounts_v1';
const monthlyKpiStorageKey = 'socialhub_monthly_kpis_v1';
const mediaLibraryStorageKey = 'socialhub_media_library_v1';
const photoSopGuideStorageKey = 'socialhub_photo_sop_guide_v1';
const fallbackPostMetricsStorageKey = 'socialhub_post_metrics_fallback_v1';
const notificationReadStorageKey = 'socialhub_notification_read_v1';
const photoSopFolderRoot = 'SOP Chụp ảnh';
const mediaLibraryStorageFolder = 'media-library';
const reportShowroomNames = ['HO', 'Phú Quốc', 'Cần Thơ', 'Kiên Giang', 'An Giang', 'Tiền Giang'];
const showroomNames = reportShowroomNames;
const showroomDashboardChannels = ['Facebook', 'TikTok', 'Zalo OA', 'Google Maps'];
const standardPostMetricNames = [
  'Lượt xem',
  'Số người tiếp cận',
  'Người xem',
  'Lượt tương tác',
  'Lượt thích và cảm xúc',
  'Bình luận',
  'Lượt chia sẻ',
  'Lượt lưu',
  'Lượt click vào liên kết',
  'Lượt phản hồi',
  'Lượt theo dõi',
  'Thời gian xem',
  'Thời gian phát video trung bình',
  'Lượt xem trong tối thiểu 3 giây',
  'Thu nhập ước tính từ quảng cáo trong luồng'
];
const defaultPostMetrics = [
  { name:'Lượt xem', value:0 },
  { name:'Số người tiếp cận', value:0 },
  { name:'Lượt tương tác', value:0 },
  { name:'Lượt click vào liên kết', value:0 }
];
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
let photoSopGuide = loadPhotoSopGuide();
let photoSopSaveTimer = null;
let currentMediaFolder = 'all';
let expandedMediaFolders = new Set();
let movingMediaFileId = null;
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
const bindClick = (id, handler) => {
  const el = $(id);
  if(el) el.addEventListener('click', handler);
};

window.addEventListener('DOMContentLoaded', async () => {
  bindAuthEvents();
  const { data } = await supabaseClient.auth.getSession();
  if(data && data.session){
    await startApp(data.session);
  }else{
    showLogin();
  }
  supabaseClient.auth.onAuthStateChange((_event, session) => {
    if(session) startApp(session);
    else showLogin();
  });
});

function bindAuthEvents(){
  $('loginForm').addEventListener('submit', loginUser);
  $('btnLogout').addEventListener('click', logoutUser);
}

async function loginUser(event){
  event.preventDefault();
  $('btnLogin').disabled = true;
  $('btnLogin').innerText = 'Đang đăng nhập...';
  $('loginMessage').innerText = '';
  const email = $('loginEmail').value.trim();
  const password = $('loginPassword').value;
  const { error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if(error){
    $('loginMessage').innerText = 'Sai email/mật khẩu hoặc tài khoản chưa được cấp.';
    $('btnLogin').disabled = false;
    $('btnLogin').innerText = 'Đăng nhập';
    return;
  }
  $('btnLogin').innerText = 'Đăng nhập';
}

async function logoutUser(){
  await supabaseClient.auth.signOut();
}

function showLogin(){
  currentUser = null;
  $('authScreen').classList.remove('is-hidden');
  $('appShell').classList.remove('is-visible');
  $('loginPassword').value = '';
  $('btnLogin').disabled = false;
  $('btnLogin').innerText = 'Đăng nhập';
}

async function startApp(session){
  currentUser = session.user;
  $('authScreen').classList.add('is-hidden');
  $('appShell').classList.add('is-visible');
  $('currentUserEmail').innerText = currentUser.email || '-';
  if(appReady) return;
  appReady = true;
  bindEvents();
  setDefaultMonth();
  await loadCloudData();
  renderGoogleMapShowrooms();
  renderChannelAccounts();
  await loadPosts();
}

function bindEvents(){
  bindClick('btnNotifications', openNotificationCenter);
  bindClick('btnCloseNotifications', closeNotificationCenter);
  bindClick('notificationOverlay', closeNotificationCenter);
  bindClick('btnMarkAllRead', markAllNotificationsRead);
  bindClick('btnOpenModal', () => openModal());
  bindClick('btnCloseModal', closeModal);
  bindClick('btnCancel', closeModal);
  bindClick('btnSave', savePost);
  bindClick('btnAddPostMetric', () => addPostMetricRow());
  bindClick('btnReload', loadPosts);
  bindClick('btnOpenExport', openExportModal);
  bindClick('btnOpenExportTop', openExportModal);
  bindClick('btnExportPdf', exportPdfReport);
  bindClick('btnOpenMetaImport', openMetaImportModal);
  bindClick('btnCloseMetaImport', closeMetaImportModal);
  bindClick('btnCancelMetaImport', closeMetaImportModal);
  bindClick('btnRunMetaImport', importMetaRows);
  $('metaCsvInput').addEventListener('change', handleMetaCsvFile);
  bindClick('btnCloseExport', closeExportModal);
  bindClick('btnCancelExport', closeExportModal);
  bindClick('btnExportExcel', exportExcel);
  bindClick('btnResetExportFields', resetExportFields);
  bindClick('btnResetGoogleReport', resetGoogleMapReport);
  bindClick('btnOpenMediaLibrary', openMediaLibrary);
  bindClick('btnOpenPhotoSop', openPhotoSopReference);
  bindClick('btnAddSopItem', addPhotoSopItem);
  bindClick('btnResetSopGuide', resetPhotoSopGuide);
  bindClick('btnCreateMediaFolder', createMediaFolder);
  bindClick('btnMediaUpload', () => $('mediaUploadInput').click());
  $('mediaUploadInput').addEventListener('change', (e) => uploadMediaLibraryFiles(Array.from(e.target.files || [])));
  $('mediaSearch').addEventListener('input', renderMediaLibrary);
  $('mediaFolderFilter').addEventListener('change', (e) => { currentMediaFolder = e.target.value; renderMediaLibrary(); });
  $('btnPickMedia').addEventListener('click', openMediaPicker);
  $('btnCloseMediaPicker').addEventListener('click', closeMediaPicker);
  $('btnCancelMediaPicker').addEventListener('click', closeMediaPicker);
  $('btnUsePickedMedia').addEventListener('click', usePickedMedia);
  $('mediaPickerSearch').addEventListener('input', renderMediaPicker);
  $('btnCloseMoveMedia').addEventListener('click', closeMoveMediaModal);
  $('btnCancelMoveMedia').addEventListener('click', closeMoveMediaModal);
  $('btnConfirmMoveMedia').addEventListener('click', confirmMoveMediaFile);
  document.querySelectorAll('.chart-type-select').forEach(select => {
    select.addEventListener('change', updateStats);
  });
  $('searchInput').addEventListener('input', renderPosts);
  if($('postSearchInput')){
    $('postSearchInput').addEventListener('input', event => {
      $('searchInput').value = event.target.value;
      renderPosts();
    });
  }
  $('statusFilter').addEventListener('change', renderPosts);
  $('yearFilter').addEventListener('change', renderPosts);
  $('sortFilter').addEventListener('change', renderPosts);
  $('monthFilter').addEventListener('change', renderPosts);
  bindClick('periodPickerTrigger', togglePeriodPicker);
  bindClick('periodPrevYear', () => changePeriodPickerYear(-1));
  bindClick('periodNextYear', () => changePeriodPickerYear(1));
  bindClick('periodAll', () => selectReportMonth(''));
  document.addEventListener('click', event => {
    const picker = $('periodPicker');
    if(picker && !picker.contains(event.target)) closePeriodPicker();
  });
  $('btnCloseImage').addEventListener('click', closeImage);
  $('imageModal').addEventListener('click', (e)=>{ if(e.target.id==='imageModal') closeImage(); });
  $('postModal').addEventListener('click', (e)=>{ if(e.target.id==='postModal') closeModal(); });
  $('exportModal').addEventListener('click', (e)=>{ if(e.target.id==='exportModal') closeExportModal(); });
  $('metaImportModal').addEventListener('click', (e)=>{ if(e.target.id==='metaImportModal') closeMetaImportModal(); });
  $('mediaPickerModal').addEventListener('click', (e)=>{ if(e.target.id==='mediaPickerModal') closeMediaPicker(); });
  $('moveMediaModal').addEventListener('click', (e)=>{ if(e.target.id==='moveMediaModal') closeMoveMediaModal(); });
  $('imageInput').addEventListener('change', previewImages);
  document.querySelectorAll('[data-bi-view]').forEach(button => {
    button.addEventListener('click', () => {
      const view = button.dataset.biView;
      setBiView(view);
      renderPosts();
    });
  });
  setupMediaDropZone();
  document.querySelectorAll('.nav').forEach(btn => {
    btn.addEventListener('click', event => {
      event.preventDefault();
      closeMediaLibraryView();
      currentPlatform = btn.dataset.platform;
      currentShowroom = 'all';
      setActivePlatformNav(currentPlatform);
      setActiveShowroomNav(currentShowroom);
      renderPosts();
      setActivePlatformNav(currentPlatform);
      setActiveShowroomNav(currentShowroom);
    });
  });
  document.querySelectorAll('.showroom-nav').forEach(btn => {
    btn.addEventListener('click', event => {
      event.preventDefault();
      closeMediaLibraryView();
      currentShowroom = btn.dataset.showroom;
      currentPlatform = 'all';
      setActiveShowroomNav(currentShowroom);
      setActivePlatformNav(currentPlatform);
      renderPosts();
      setActiveShowroomNav(currentShowroom);
      setActivePlatformNav(currentPlatform);
    });
  });
}

function setBiView(view = 'overview'){
  currentBiView = view;
  const dashboard = document.querySelector('.bi-dashboard');
  if(dashboard){
    dashboard.classList.remove('view-overview', 'view-platform', 'view-showroom', 'view-monthly');
    dashboard.classList.add(`view-${view}`);
  }
  document.querySelectorAll('[data-bi-view]').forEach(button => {
    button.classList.toggle('active', button.dataset.biView === view);
  });
  document.querySelectorAll('[data-bi-panel]').forEach(panel => {
    const views = String(panel.dataset.biPanel || '').split(' ');
    panel.classList.toggle('is-hidden', view !== 'overview' && !views.includes(view));
  });
  document.querySelectorAll('[data-view-context]').forEach(control => {
    control.classList.toggle('is-active', control.dataset.viewContext === view);
  });
  setActivePlatformNav(currentPlatform);
  setActiveShowroomNav(currentShowroom);
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
  document.querySelectorAll('.nav,.showroom-nav,.library-nav').forEach(btn => btn.classList.remove('active'));
  $('btnOpenMediaLibrary').classList.add('active');
  $('mediaLibrary').classList.add('is-visible');
  $('photoSopReference').classList.remove('is-visible');
  document.querySelectorAll('.post-content,.google-showrooms,.channel-accounts').forEach(el => el.classList.add('is-hidden'));
  renderMediaLibrary();
}

function openPhotoSopReference(){
  document.querySelectorAll('.nav,.showroom-nav,.library-nav').forEach(btn => btn.classList.remove('active'));
  $('btnOpenPhotoSop').classList.add('active');
  $('photoSopReference').classList.add('is-visible');
  $('mediaLibrary').classList.remove('is-visible');
  document.querySelectorAll('.post-content,.google-showrooms,.channel-accounts').forEach(el => el.classList.add('is-hidden'));
  renderPhotoSopGuide();
}

function closeMediaLibraryView(){
  document.querySelectorAll('.library-nav').forEach(btn => btn.classList.remove('active'));
  $('mediaLibrary').classList.remove('is-visible');
  $('photoSopReference').classList.remove('is-visible');
  document.querySelectorAll('.post-content,.google-showrooms,.channel-accounts').forEach(el => el.classList.remove('is-hidden'));
}

function defaultPhotoSopGuide(){
  return [
    { id:'overview', title:'Toàn cảnh sự kiện', minimum:5, note:'Chụp sân khấu, khu vực xe trưng bày, backdrop, khách tham dự và tổng thể không gian.' },
    { id:'checkin', title:'Check-in khách hàng', minimum:5, note:'Ưu tiên ảnh khách nhìn rõ mặt, có backdrop/logo BYD NEG, không để hậu cảnh rối.' },
    { id:'consulting', title:'Tư vấn khách hàng', minimum:10, note:'Chụp TVBH đang giới thiệu xe, giải thích tính năng, trao đổi trực tiếp với khách.' },
    { id:'car-detail', title:'Xe và chi tiết xe', minimum:20, note:'Gồm chính diện, góc 45 độ, hông xe, đuôi xe, nội thất, logo, đèn, mâm và cốp.' },
    { id:'test-drive', title:'Lái thử / trải nghiệm', minimum:20, note:'Chụp xe đang chạy, khách lên/xuống xe, TVBH hướng dẫn và khoảnh khắc trải nghiệm thực tế.' },
    { id:'gift', title:'Trao quà', minimum:5, note:'Ảnh khách nhận quà, đại diện showroom trao quà, logo/ấn phẩm xuất hiện rõ.' },
    { id:'group', title:'Group photo', minimum:3, note:'Chụp tập thể cuối chương trình, ưu tiên ảnh ngang, đầy đủ người và xe/backdrop.' },
    { id:'video', title:'Video ngắn', minimum:5, note:'Quay các đoạn 5-10 giây: drone/toàn cảnh, check-in, tư vấn, lái thử, phỏng vấn, trao quà.' }
  ];
}

function loadPhotoSopGuide(){
  try{
    const saved = localStorage.getItem(photoSopGuideStorageKey);
    if(saved){
      const parsed = JSON.parse(saved);
      if(Array.isArray(parsed) && parsed.length) return parsed;
    }
  }catch(err){
    console.warn('Không đọc được SOP chụp ảnh:', err);
  }
  return defaultPhotoSopGuide();
}

function savePhotoSopGuide(){
  localStorage.setItem(photoSopGuideStorageKey, JSON.stringify(photoSopGuide));
  if(appReady && currentUser){
    clearTimeout(photoSopSaveTimer);
    photoSopSaveTimer = setTimeout(() => {
      savePhotoSopGuideToSupabase().catch(err => console.warn('Không lưu được SOP chụp ảnh lên Supabase:', err));
    }, 650);
  }
}

async function loadPhotoSopGuideFromSupabase(){
  const { data, error } = await supabaseClient
    .from('media_library')
    .select('*')
    .eq('type', 'photo_sop_guide')
    .order('uploaded_at', { ascending:false })
    .limit(1);
  if(error){
    console.warn('Không đọc được SOP chụp ảnh từ Supabase:', error);
    return;
  }
  const row = data && data[0];
  if(!row || !row.name){
    await savePhotoSopGuideToSupabase();
    return;
  }
  try{
    const parsed = JSON.parse(row.name);
    if(Array.isArray(parsed) && parsed.length){
      photoSopGuide = parsed;
      localStorage.setItem(photoSopGuideStorageKey, JSON.stringify(photoSopGuide));
    }
  }catch(err){
    console.warn('Dữ liệu SOP chụp ảnh trên Supabase không hợp lệ:', err);
  }
}

async function savePhotoSopGuideToSupabase(){
  const payload = {
    name: JSON.stringify(photoSopGuide),
    folder: photoSopFolderRoot,
    url: '#photo-sop-guide',
    type: 'photo_sop_guide',
    size: 0,
    uploaded_at: new Date().toISOString()
  };
  const { error: deleteError } = await supabaseClient
    .from('media_library')
    .delete()
    .eq('type', 'photo_sop_guide');
  if(deleteError) throw deleteError;
  const { error } = await supabaseClient.from('media_library').insert(payload);
  if(error) throw error;
}

function getPhotoSopFolder(item){
  return `${photoSopFolderRoot}/${item.title}`;
}

function getPhotoSopFiles(item){
  const folder = getPhotoSopFolder(item);
  return (mediaLibrary.files || []).filter(file => file.folder === folder);
}

function renderPhotoSopGuide(){
  const wrap = $('photoSopGuideList');
  if(!wrap) return;
  const total = photoSopGuide.reduce((sum, item) => sum + toNumber(item.minimum), 0);
  $('sopTotalShots').innerText = total;
  wrap.innerHTML = photoSopGuide.map((item, index) => {
    const files = getPhotoSopFiles(item);
    return `
      <article class="sop-guide-item">
        <div class="sop-guide-main">
          <div class="sop-guide-number">${String(index + 1).padStart(2, '0')}</div>
          <div>
            <h4>${escapeHtml(item.title)}</h4>
            <label>Số lượng tối thiểu
              <input type="number" min="0" value="${escapeHtml(item.minimum)}" onchange="updatePhotoSopItem('${escapeJs(item.id)}','minimum',this.value)">
            </label>
          </div>
        </div>
        <div class="sop-upload-box">
          <div class="sop-upload-head">
            <b>Ảnh mẫu</b>
            <label class="sop-upload-btn">
              Upload ảnh
              <input type="file" accept="image/*" multiple onchange="uploadPhotoSopExamples('${escapeJs(item.id)}', this.files); this.value='';">
            </label>
          </div>
          <div class="sop-example-grid">
            ${files.length ? files.map(file => `
              <div class="sop-example">
                <button type="button" onclick="previewMedia('${escapeJs(file.url)}','${escapeJs(file.type)}')">
                  ${renderMediaThumb(file)}
                </button>
                <button type="button" class="sop-example-delete" onclick="deletePhotoSopExample('${escapeJs(file.id)}')">Xóa</button>
              </div>
            `).join('') : '<div class="sop-empty">Chưa có ảnh mẫu</div>'}
          </div>
        </div>
        <label class="sop-note-label">Ghi chú hướng dẫn
          <textarea placeholder="Nhập lưu ý để mọi người đọc..." oninput="updatePhotoSopItem('${escapeJs(item.id)}','note',this.value)">${escapeHtml(item.note || '')}</textarea>
        </label>
        <div class="sop-item-actions">
          <button type="button" onclick="deletePhotoSopItem('${escapeJs(item.id)}')">Xóa mục</button>
        </div>
      </article>
    `;
  }).join('');
}

function updatePhotoSopItem(id, field, value){
  const item = photoSopGuide.find(entry => entry.id === id);
  if(!item) return;
  item[field] = field === 'minimum' ? Math.max(0, toNumber(value)) : value;
  savePhotoSopGuide();
  if(field === 'minimum') renderPhotoSopGuide();
}

async function uploadPhotoSopExamples(id, fileList){
  const item = photoSopGuide.find(entry => entry.id === id);
  const files = Array.from(fileList || []);
  if(!item || !files.length) return;
  const folder = getPhotoSopFolder(item);
  try{
    for(const file of files){
      await uploadFileToMediaLibrary(file, folder);
    }
    saveMediaLibrary();
    renderPhotoSopGuide();
  }catch(err){
    console.error(err);
    alert('Không upload được ảnh mẫu: ' + err.message);
  }
}

function addPhotoSopItem(){
  const title = prompt('Tên mục cần chụp');
  if(!title) return;
  const minimum = prompt('Số lượng ảnh tối thiểu', '5');
  const cleanTitle = title.trim();
  if(!cleanTitle) return;
  photoSopGuide.push({
    id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    title: cleanTitle,
    minimum: Math.max(0, toNumber(minimum)),
    note: ''
  });
  savePhotoSopGuide();
  renderPhotoSopGuide();
}

function deletePhotoSopItem(id){
  const item = photoSopGuide.find(entry => entry.id === id);
  if(!item) return;
  if(!confirm(`Xóa mục "${item.title}" khỏi quy định chụp ảnh? Ảnh mẫu đã upload trong Media Library vẫn được giữ lại.`)) return;
  photoSopGuide = photoSopGuide.filter(entry => entry.id !== id);
  savePhotoSopGuide();
  renderPhotoSopGuide();
}

async function deletePhotoSopExample(fileId){
  await deleteMediaFile(fileId);
  renderPhotoSopGuide();
}

function resetPhotoSopGuide(){
  if(!confirm('Đặt lại danh sách quy định chụp ảnh về mẫu mặc định?')) return;
  photoSopGuide = defaultPhotoSopGuide();
  savePhotoSopGuide();
  renderPhotoSopGuide();
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
  await loadCloudPostMetricsFallback();
  posts = (data || []).map(post => {
    const fallbackMetrics = getFallbackPostMetrics(post);
    return {
      ...post,
      performance_metrics:Object.keys(fallbackMetrics).length ? fallbackMetrics : post.performance_metrics
    };
  });
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
function normalizeShowroomKey(value){
  const text = String(value || '').trim();
  const normalized = text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if(['ho', 'hq'].includes(normalized) || normalized.includes('tru so') || normalized.includes('viet nam')) return 'HO';
  return text;
}

function showroomList(value){ return csvList(value).map(normalizeShowroomKey); }

function platformMatches(value, platform){
  if(platform === 'all') return true;
  return platformList(value).includes(platform);
}

function showroomMatches(value, showroom){
  if(showroom === 'all') return true;
  return showroomList(value).includes(normalizeShowroomKey(showroom));
}

function belongsToReportShowrooms(post){
  return showroomList(post && post.showroom).some(showroom => reportShowroomNames.includes(showroom));
}

function showroomDisplayName(showroom){
  return normalizeShowroomKey(showroom) === 'HO' ? 'BYD NEG Việt Nam' : `BYD NEG ${showroom}`;
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
  const month = $('monthFilter').value;
  const status = $('statusFilter').value;
  const year = $('yearFilter').value;
  const sort = $('sortFilter').value;
  const filtered = posts.filter(p => {
    const matchPlatform = platformMatches(p.platform, currentPlatform);
    const matchStatus = status === 'all' || p.status === status;
    const matchShowroom = currentShowroom === 'all'
      ? belongsToReportShowrooms(p)
      : showroomMatches(p.showroom, currentShowroom);
    const matchMonth = !month || getMonthKey(p.post_date) === month;
    const matchYear = year === 'all' || String(p.post_date || '').slice(0,4) === year;
    const text = `${p.title||''} ${p.note||''} ${p.showroom||''} ${p.platform||''}`.toLowerCase();
    return matchPlatform && matchStatus && matchShowroom && matchMonth && matchYear && text.includes(keyword);
  });
  return sortPosts(filtered, sort);
}

function normalizePerformanceMetrics(value){
  if(!value) return {};
  if(typeof value === 'string'){
    try { value = JSON.parse(value); } catch(_err) { return {}; }
  }
  if(Array.isArray(value)){
    return value.reduce((acc, item) => {
      const name = String(item && item.name || '').trim();
      if(name) acc[name] = Math.max(0, toNumber(item.value));
      return acc;
    }, {});
  }
  return Object.entries(value).reduce((acc, [name, amount]) => {
    if(String(name).trim()) acc[String(name).trim()] = Math.max(0, toNumber(amount));
    return acc;
  }, {});
}

function postMetricsFallbackKey(post){
  return [
    post.post_date || '',
    post.title || '',
    post.platform || '',
    post.showroom || ''
  ].join('|');
}

function loadFallbackPostMetrics(){
  try { return JSON.parse(localStorage.getItem(fallbackPostMetricsStorageKey) || '{}'); }
  catch(_err) { return {}; }
}

function getFallbackPostMetrics(post){
  const key = postMetricsFallbackKey(post);
  return cloudPostMetricsFallback[key] || loadFallbackPostMetrics()[key] || {};
}

async function loadCloudPostMetricsFallback(){
  const { data, error } = await supabaseClient
    .from('media_library')
    .select('name,folder')
    .eq('type', 'post_metrics');
  if(error){
    console.warn('Không tải được KPI dự phòng từ Supabase:', error);
    return;
  }
  cloudPostMetricsFallback = (data || []).reduce((acc, row) => {
    try { acc[row.folder] = normalizePerformanceMetrics(JSON.parse(row.name || '{}')); }
    catch(_err) { acc[row.folder] = {}; }
    return acc;
  }, {});
}

async function saveFallbackPostMetrics(post, metrics){
  const key = postMetricsFallbackKey(post);
  const saved = loadFallbackPostMetrics();
  saved[key] = metrics;
  localStorage.setItem(fallbackPostMetricsStorageKey, JSON.stringify(saved));
  cloudPostMetricsFallback[key] = metrics;
  const { error: deleteError } = await supabaseClient
    .from('media_library')
    .delete()
    .eq('type', 'post_metrics')
    .eq('folder', key);
  if(deleteError) throw deleteError;
  const { error } = await supabaseClient.from('media_library').insert({
    name: JSON.stringify(metrics),
    folder: key,
    url: '#post-metrics',
    type: 'post_metrics',
    size: 0,
    uploaded_at: new Date().toISOString()
  });
  if(error) throw error;
}

async function saveFallbackPostMetricsBatch(entries){
  if(!entries.length) return;
  const saved = loadFallbackPostMetrics();
  const unique = new Map();
  entries.forEach(({ post, metrics }) => {
    const key = postMetricsFallbackKey(post);
    saved[key] = metrics;
    cloudPostMetricsFallback[key] = metrics;
    unique.set(key, metrics);
  });
  localStorage.setItem(fallbackPostMetricsStorageKey, JSON.stringify(saved));
  const keys = [...unique.keys()];
  for(let index = 0; index < keys.length; index += 50){
    const chunkKeys = keys.slice(index, index + 50);
    const { error: deleteError } = await supabaseClient
      .from('media_library')
      .delete()
      .eq('type', 'post_metrics')
      .in('folder', chunkKeys);
    if(deleteError) throw deleteError;
    const rows = chunkKeys.map(key => ({
      name:JSON.stringify(unique.get(key)),
      folder:key,
      url:'#post-metrics',
      type:'post_metrics',
      size:0,
      uploaded_at:new Date().toISOString()
    }));
    const { error } = await supabaseClient.from('media_library').insert(rows);
    if(error) throw error;
  }
}

function isMissingPerformanceMetricsColumn(error){
  return /performance_metrics/i.test(String(error && error.message || ''))
    && /(schema cache|column|does not exist)/i.test(String(error && error.message || ''));
}

function aggregatePerformanceMetrics(items){
  return items.reduce((totals, post) => {
    Object.entries(normalizePerformanceMetrics(post.performance_metrics)).forEach(([name, value]) => {
      totals[name] = (totals[name] || 0) + toNumber(value);
    });
    return totals;
  }, {});
}

function formatMetricNumber(value){
  return new Intl.NumberFormat('vi-VN', { maximumFractionDigits:2 }).format(toNumber(value));
}

function renderPerformanceSummary(items){
  const target = $('performanceSummary');
  if(!target) return;
  const entries = Object.entries(aggregatePerformanceMetrics(items)).sort((a,b) => b[1] - a[1]);
  target.innerHTML = entries.length ? entries.map(([name, value]) => `
    <div class="performance-metric-card"><b>${formatMetricNumber(value)}</b><span>${escapeHtml(name)}</span></div>
  `).join('') : '<div class="empty-mini">Chưa có chỉ số. Mở một bài đăng và nhập KPI để dashboard tự tổng hợp.</div>';
}

const engagementMetricNames = new Set([
  'Lượt thích và cảm xúc',
  'Bình luận',
  'Lượt chia sẻ',
  'Lượt lưu',
  'Lượt click vào liên kết',
  'Lượt phản hồi',
  'Lượt theo dõi'
]);

function updateTopPostsMetricOptions(items){
  const select = $('topPostsMetric');
  if(!select) return;
  const selected = select.value || '__engagement__';
  const names = Object.keys(aggregatePerformanceMetrics(items)).sort((a,b) => a.localeCompare(b, 'vi'));
  select.innerHTML = `
    <option value="__engagement__">Tổng tương tác</option>
    ${names.map(name => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('')}
  `;
  select.value = selected === '__engagement__' || names.includes(selected) ? selected : '__engagement__';
}

function getPostPerformanceValue(post, criterion){
  const metrics = normalizePerformanceMetrics(post.performance_metrics);
  if(criterion !== '__engagement__') return toNumber(metrics[criterion]);
  if(toNumber(metrics['Lượt tương tác']) > 0) return toNumber(metrics['Lượt tương tác']);
  return Object.entries(metrics).reduce((total, [name, value]) => {
    return total + (engagementMetricNames.has(name) ? toNumber(value) : 0);
  }, 0);
}

function renderTopPerformingPosts(items){
  const target = $('topPerformingPosts');
  const select = $('topPostsMetric');
  if(!target || !select) return;
  updateTopPostsMetricOptions(items);
  const criterion = select.value;
  const ranked = items
    .map(post => ({ post, value:getPostPerformanceValue(post, criterion) }))
    .filter(item => item.value > 0)
    .sort((a,b) => b.value - a.value)
    .slice(0, 5);
  if(!ranked.length){
    target.innerHTML = '<div class="empty-mini">Chưa có bài nào có dữ liệu cho tiêu chí này.</div>';
    return;
  }
  const max = ranked[0].value || 1;
  target.innerHTML = ranked.map((item, index) => {
    const postMetrics = Object.entries(normalizePerformanceMetrics(item.post.performance_metrics))
      .filter(([, value]) => toNumber(value) > 0)
      .sort((a,b) => b[1] - a[1])
      .slice(0, 3);
    return `
      <article class="top-post-item">
        <div class="top-post-rank">${index + 1}</div>
        <div class="top-post-body">
          <div class="top-post-title-row">
            <div>
              <b>${escapeHtml(item.post.title || 'Bài đăng không tiêu đề')}</b>
              <span>${escapeHtml(item.post.platform || '-')} · ${formatDate(item.post.post_date)}</span>
            </div>
            <strong>${formatMetricNumber(item.value)}</strong>
          </div>
          <div class="top-post-bar"><i style="width:${Math.max(5, Math.round(item.value / max * 100))}%"></i></div>
          <div class="top-post-metrics">
            ${postMetrics.map(([name, value]) => `<span>${escapeHtml(name)}: <b>${formatMetricNumber(value)}</b></span>`).join('')}
          </div>
        </div>
      </article>
    `;
  }).join('');
}

function sumPostAliases(items, aliases){
  return items.reduce((total, post) => {
    const metrics = normalizePerformanceMetrics(post.performance_metrics);
    return total + aliases.reduce((sum, name) => sum + toNumber(metrics[name]), 0);
  }, 0);
}

function platformDashboardMetric(items, aliases){
  return formatMetricNumber(sumPostAliases(items, aliases));
}

function renderPlatformPerformanceDashboard(){
  const target = $('platformPerformanceDashboard');
  if(!target) return;
  const selectedMonth = $('monthFilter').value;
  const scoped = posts.filter(post => {
    const matchShowroom = currentShowroom === 'all'
      ? belongsToReportShowrooms(post)
      : showroomMatches(post.showroom, currentShowroom);
    return matchShowroom && (!selectedMonth || getMonthKey(post.post_date) === selectedMonth);
  });
  const definitions = [
    { name:'Facebook', posts:scoped.filter(p => platformMatches(p.platform, 'Facebook')) },
    { name:'TikTok', posts:scoped.filter(p => platformMatches(p.platform, 'TikTok')) },
    { name:'Website', posts:scoped.filter(p => platformMatches(p.platform, 'Website')) }
  ];
  const rows = definitions.map(item => {
    const monthly = reportShowroomNames.reduce((acc, showroom) => {
      const kpi = getMonthlyKpi(showroom, item.name, selectedMonth || 'all');
      acc.reach += toNumber(kpi.reach);
      acc.engagement += toNumber(kpi.engagement);
      acc.follow += toNumber(kpi.follow);
      acc.like += toNumber(kpi.like);
      return acc;
    }, { reach:0, engagement:0, follow:0, like:0 });
    const postReach = sumPostAliases(item.posts, ['Số người tiếp cận', 'Reach']);
    const postEngagement = totalEngagementForPosts(item.posts);
    const postFollow = sumPostAliases(item.posts, ['Lượt theo dõi','Followers tăng','Người theo dõi mới']);
    return {
      ...item,
      reach:postReach || monthly.reach,
      engagement:postEngagement || monthly.engagement,
      follow:postFollow || monthly.follow,
      like:sumPostAliases(item.posts, ['Lượt thích và cảm xúc','Like']) || monthly.like
    };
  });
  const selectedPlatform = currentPlatform;
  const visibleDefinitions = selectedPlatform === 'all'
    ? definitions
    : definitions.filter(item => item.name === selectedPlatform);
  const cards = visibleDefinitions.map(item => {
    const summary = rows.find(row => row.name === item.name) || item;
    const top = [...item.posts].sort((a,b) => getPostPerformanceValue(b, item.name === 'TikTok' ? 'Lượt xem' : '__engagement__') - getPostPerformanceValue(a, item.name === 'TikTok' ? 'Lượt xem' : '__engagement__'))[0];
    const metrics = item.name === 'Facebook' ? [
      ['Reach', formatMetricNumber(summary.reach)],
      ['Engagement', formatMetricNumber(summary.engagement)],
      ['Followers tăng', formatMetricNumber(summary.follow)],
      ['Số bài', formatMetricNumber(item.posts.length)]
    ] : item.name === 'TikTok' ? [
      ['View', platformDashboardMetric(item.posts, ['Lượt xem','Views'])],
      ['Reach', formatMetricNumber(summary.reach)],
      ['Followers', formatMetricNumber(summary.follow)],
      ['Số video', formatMetricNumber(item.posts.length)]
    ] : [
      ['Visitor', platformDashboardMetric(item.posts, ['Visitor','Người dùng','Lượt xem trang'])],
      ['Click', platformDashboardMetric(item.posts, ['Lượt click vào liên kết','Click'])],
      ['Lead', platformDashboardMetric(item.posts, ['Lead','Lead/Form','Khách hàng tiềm năng'])],
      ['Số bài', formatMetricNumber(item.posts.length)]
    ];
    return `<article class="platform-performance-card">
      <h4>${item.name}</h4>
      <div class="platform-kpi-grid">${metrics.map(([label,value]) => `<div><span>${label}</span><b>${value}</b></div>`).join('')}</div>
      <div class="platform-top-post"><span>Top bài</span><b>${escapeHtml(top ? top.title || 'Bài đăng không tiêu đề' : 'Chưa có dữ liệu')}</b></div>
    </article>`;
  }).join('');
  target.innerHTML = `
    <div class="dedicated-title"><div><h3>Platform Performance</h3><p>Hiệu quả marketing trên từng nền tảng</p></div></div>
    <div class="platform-performance-grid ${visibleDefinitions.length === 1 ? 'is-single' : ''}">${cards || '<div class="empty-mini">Nền tảng này chưa có trong nhóm báo cáo Facebook, TikTok và Website.</div>'}</div>
    <div class="platform-comparison">
      <h4>So sánh Platform</h4>
      <div class="platform-table-wrap"><table><thead><tr><th>Platform</th><th>Reach</th><th>Engagement</th><th>Posts</th></tr></thead>
      <tbody>${rows.map(row => `<tr><td><b>${row.name}</b></td><td>${formatMetricNumber(row.reach)}</td><td>${row.reach ? (row.engagement / row.reach * 100).toLocaleString('vi-VN',{maximumFractionDigits:2}) + '%' : '--'}</td><td>${row.posts.length}</td></tr>`).join('')}</tbody></table></div>
    </div>`;
}

function getShowroomCommunicationTotals(showroom, month){
  const items = posts.filter(post => {
    const matchMonth = !month || getMonthKey(post.post_date) === month;
    return matchMonth && showroomMatches(post.showroom, showroom);
  });
  const platforms = showroom === 'HO'
    ? [...showroomDashboardChannels, 'YouTube', 'Website']
    : showroomDashboardChannels;
  const monthly = platforms.reduce((acc, platform) => {
    const kpi = getMonthlyKpi(showroom, platform, month || 'all');
    acc.reach += toNumber(kpi.reach);
    acc.engagement += toNumber(kpi.engagement);
    acc.follow += toNumber(kpi.follow);
    acc.like += toNumber(kpi.like);
    return acc;
  }, { reach:0, engagement:0, follow:0, like:0 });
  const postReach = sumPostAliases(items, ['Số người tiếp cận','Reach']);
  const postEngagement = totalEngagementForPosts(items);
  const postFollow = sumPostAliases(items, ['Lượt theo dõi','Followers tăng','Người theo dõi mới']);
  const postLike = sumPostAliases(items, ['Lượt thích và cảm xúc','Like']);
  const reach = postReach || monthly.reach;
  const engagement = postEngagement || monthly.engagement;
  const topPost = items
    .map(post => ({ post, value:getPostPerformanceValue(post, '__engagement__') || heatmapMetricValue(post, 'Số người tiếp cận') }))
    .sort((a,b) => b.value - a.value)[0];
  return {
    showroom,
    items,
    posts:items.length,
    reach,
    engagement,
    engagementRate:reach ? engagement / reach * 100 : 0,
    follow:postFollow || monthly.follow,
    like:postLike || monthly.like,
    views:sumPostAliases(items, ['Lượt xem','Views']),
    topPost:topPost ? topPost.post : null
  };
}

function renderShowroomAnalysisDashboard(){
  const target = $('showroomAnalysisDashboard');
  if(!target) return;
  const panel = target.closest('[data-bi-panel]');
  const shouldShow = currentShowroom === 'all' && currentBiView === 'showroom';
  if(panel) panel.classList.toggle('is-hidden', !shouldShow);
  if(!shouldShow){
    target.innerHTML = '';
    return;
  }
  const month = $('monthFilter').value;
  const branchNames = ['Phú Quốc','Cần Thơ','An Giang','Kiên Giang','Tiền Giang'];
  const rows = branchNames.map(showroom => getShowroomCommunicationTotals(showroom, month));
  const allUnits = reportShowroomNames.map(showroom => getShowroomCommunicationTotals(showroom, month));
  const total = allUnits.reduce((acc, row) => {
    acc.posts += row.posts;
    acc.reach += row.reach;
    acc.engagement += row.engagement;
    acc.follow += row.follow;
    acc.like += row.like;
    acc.views += row.views;
    return acc;
  }, { posts:0, reach:0, engagement:0, follow:0, like:0, views:0 });
  const best = [...rows].sort((a,b) => b.reach - a.reach)[0];
  target.innerHTML = `
    <div class="dedicated-title">
      <div>
        <h3>Showroom Analysis</h3>
        <p>Phân tích hiệu quả truyền thông của 5 showroom · ${month ? `Tháng ${Number(month.slice(5,7))}/${month.slice(0,4)}` : 'Tất cả thời gian'}</p>
      </div>
    </div>
    <div class="showroom-summary-grid">
      <div><span>Tổng Reach</span><b>${formatMetricNumber(total.reach)}</b></div>
      <div><span>Tổng Engagement</span><b>${formatMetricNumber(total.engagement)}</b></div>
      <div><span>Tổng bài đăng</span><b>${formatMetricNumber(total.posts)}</b></div>
      <div><span>Showroom nổi bật</span><b>${escapeHtml(best && best.reach ? best.showroom : 'Chưa có dữ liệu')}</b></div>
    </div>
    <div class="showroom-communication-grid">
      ${rows.map(row => `<article class="showroom-communication-card">
        <div class="showroom-communication-head"><h4>${escapeHtml(row.showroom)}</h4><span>${row.posts} bài</span></div>
        <div class="showroom-communication-kpis">
          <div><span>Reach</span><b>${formatMetricNumber(row.reach)}</b></div>
          <div><span>Engagement</span><b>${formatMetricNumber(row.engagement)}</b></div>
          <div><span>Engagement rate</span><b>${row.reach ? row.engagementRate.toLocaleString('vi-VN',{maximumFractionDigits:2}) + '%' : '--'}</b></div>
          <div><span>Followers tăng</span><b>${formatMetricNumber(row.follow)}</b></div>
        </div>
        <p><span>Top bài:</span> ${escapeHtml(row.topPost ? row.topPost.title || 'Bài đăng không tiêu đề' : 'Chưa có dữ liệu')}</p>
      </article>`).join('')}
    </div>
    <div class="platform-comparison showroom-comparison">
      <h4>So sánh hiệu quả truyền thông showroom</h4>
      <div class="platform-table-wrap"><table>
        <thead><tr><th>Showroom</th><th>Reach</th><th>Engagement</th><th>Tỷ lệ</th><th>Followers tăng</th><th>Số bài</th></tr></thead>
        <tbody>${rows.map(row => `<tr><td><b>${escapeHtml(row.showroom)}</b></td><td>${formatMetricNumber(row.reach)}</td><td>${formatMetricNumber(row.engagement)}</td><td>${row.reach ? row.engagementRate.toLocaleString('vi-VN',{maximumFractionDigits:2}) + '%' : '--'}</td><td>${formatMetricNumber(row.follow)}</td><td>${row.posts}</td></tr>`).join('')}</tbody>
      </table></div>
    </div>`;
}

function renderMonthlyTrendsDashboard(){
  const target = $('monthlyTrendsDashboard');
  if(!target) return;
  const selectedYear = $('yearFilter').value !== 'all' ? Number($('yearFilter').value) : new Date().getFullYear();
  const months = Array.from({length:12}, (_,i) => `${selectedYear}-${String(i+1).padStart(2,'0')}`);
  const series = [
    ['Reach',['Số người tiếp cận','Reach']],
    ['Lead',['Lead','Lead/Form','Khách hàng tiềm năng']],
    ['Đặt cọc',['Đặt cọc','Deposit']],
    ['Giao xe',['Bàn giao','Delivery','Giao xe']],
    ['Doanh thu',['Doanh thu','Revenue']],
    ['Chi phí Marketing',['Chi phí Ads','Marketing Cost','Ads Cost']]
  ];
  target.innerHTML = `<div class="dedicated-title"><div><h3>Monthly Trends</h3><p>Xu hướng theo thời gian · Năm ${selectedYear}</p></div></div>
    <div class="monthly-chart-grid">${series.map(([label,aliases]) => {
      const values = months.map(month => sumPostAliases(posts.filter(post => {
        const matchShowroom = currentShowroom === 'all'
          ? belongsToReportShowrooms(post)
          : showroomMatches(post.showroom, currentShowroom);
        return matchShowroom && getMonthKey(post.post_date) === month;
      }), aliases));
      const max = Math.max(...values,1);
      return `<section class="monthly-chart"><h4>${label} theo tháng</h4><div class="trend-columns">${values.map((number,index) => `<div><b title="${formatMetricNumber(number)}" style="height:${Math.max(number ? 8 : 2, number/max*100)}%"></b><span>T${index+1}</span></div>`).join('')}</div></section>`;
    }).join('')}</div>`;
}

function previousMonthKey(month){
  if(!month) return '';
  const [year, number] = month.split('-').map(Number);
  const date = new Date(year, number - 2, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function postsForComparisonMonth(month){
  return posts.filter(post => {
    return getMonthKey(post.post_date) === month
      && platformMatches(post.platform, currentPlatform)
      && showroomMatches(post.showroom, currentShowroom);
  });
}

function sumMetricAliases(items, aliases){
  return items.reduce((total, post) => {
    const metrics = normalizePerformanceMetrics(post.performance_metrics);
    return total + aliases.reduce((sum, name) => sum + toNumber(metrics[name]), 0);
  }, 0);
}

function totalEngagementForPosts(items){
  return items.reduce((total, post) => total + getPostPerformanceValue(post, '__engagement__'), 0);
}

function comparisonChange(current, previous){
  if(previous === 0 && current > 0) return { label:'Mới', type:'new' };
  if(previous === 0 && current === 0) return { label:'Chưa có dữ liệu', type:'neutral' };
  const percent = (current - previous) / previous * 100;
  if(Math.abs(percent) < 0.05) return { label:'0% so với tháng trước', type:'neutral' };
  return {
    label:`${percent > 0 ? '↑' : '↓'} ${Math.abs(percent).toLocaleString('vi-VN', { maximumFractionDigits:1 })}% so với tháng trước`,
    type:percent > 0 ? 'up' : 'down'
  };
}

function renderMonthComparison(){
  const target = $('monthComparison');
  if(!target) return;
  const selectedMonth = $('monthFilter').value;
  if(!selectedMonth){
    target.innerHTML = '<div class="empty-mini">Hãy chọn một tháng để xem mức tăng hoặc giảm.</div>';
    return;
  }
  const previousMonth = previousMonthKey(selectedMonth);
  const currentItems = postsForComparisonMonth(selectedMonth);
  const previousItems = postsForComparisonMonth(previousMonth);
  const definitions = [
    { label:'Tổng bài đăng', current:currentItems.length, previous:previousItems.length },
    { label:'Lượt xem', current:sumMetricAliases(currentItems, ['Lượt xem']), previous:sumMetricAliases(previousItems, ['Lượt xem']) },
    { label:'Số người tiếp cận', current:sumMetricAliases(currentItems, ['Số người tiếp cận']), previous:sumMetricAliases(previousItems, ['Số người tiếp cận']) },
    { label:'Tổng tương tác', current:totalEngagementForPosts(currentItems), previous:totalEngagementForPosts(previousItems) },
    { label:'Click liên kết', current:sumMetricAliases(currentItems, ['Lượt click vào liên kết']), previous:sumMetricAliases(previousItems, ['Lượt click vào liên kết']) },
    { label:'Lead/Form', current:sumMetricAliases(currentItems, ['Lead', 'Lead/Form', 'Khách hàng tiềm năng']), previous:sumMetricAliases(previousItems, ['Lead', 'Lead/Form', 'Khách hàng tiềm năng']) }
  ];
  if($('monthComparisonCaption')){
    $('monthComparisonCaption').innerText = `Tháng ${Number(selectedMonth.slice(5,7))}/${selectedMonth.slice(0,4)} so với tháng ${Number(previousMonth.slice(5,7))}/${previousMonth.slice(0,4)}`;
  }
  target.innerHTML = definitions.map(metric => {
    const change = comparisonChange(metric.current, metric.previous);
    return `
      <div class="comparison-card">
        <span>${escapeHtml(metric.label)}</span>
        <b>${formatMetricNumber(metric.current)}</b>
        <small class="comparison-change is-${change.type}">${escapeHtml(change.label)}</small>
        <em>Tháng trước: ${formatMetricNumber(metric.previous)}</em>
      </div>
    `;
  }).join('');
}

function sortPosts(items, sort){
  const copy = [...items];
  if(sort === 'newest') return copy.sort((a,b)=>String(b.post_date||'').localeCompare(String(a.post_date||'')));
  if(sort === 'oldest') return copy.sort((a,b)=>String(a.post_date||'').localeCompare(String(b.post_date||'')));
  if(sort === 'platform') return copy.sort((a,b)=>String(a.platform||'').localeCompare(String(b.platform||''), 'vi'));
  return copy.sort((a,b)=>String(a.post_date||'').localeCompare(String(b.post_date||'')));
}

function renderPosts(){
  if($('postSearchInput') && $('postSearchInput').value !== $('searchInput').value){
    $('postSearchInput').value = $('searchInput').value;
  }
  if($('postTablePeriodLabel')){
    const month = $('monthFilter').value;
    $('postTablePeriodLabel').innerText = month
      ? `Tháng ${Number(month.slice(5,7))}/${month.slice(0,4)}`
      : 'Tất cả thời gian';
  }
  const result = getFilteredPosts();
  updateGoogleMapSection();
  updateChannelAccountSection();
  renderShowroomDashboard();
  updateWorkspaceActions();
  updateReportPanels();
  updateStats();
  if(result.length === 0){
    const message = posts.length
      ? 'Không có bài phù hợp với bộ lọc hiện tại'
      : 'Supabase đang trả về 0 bài. Nếu trước đó có bài, hãy kiểm tra đã đăng nhập đúng tài khoản và đã chạy file supabase_rls_fix.sql chưa.';
    $('postTable').innerHTML = `<tr><td colspan="8" class="empty">${escapeHtml(message)}</td></tr>`;
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
  setBiView(currentBiView);
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
  if($('btnExportPdf')) $('btnExportPdf').classList.toggle('is-hidden', currentShowroom !== 'all' || currentPlatform !== 'all');
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
  const dashboardChannels = currentShowroom === 'HO' ? [...showroomDashboardChannels, 'YouTube', 'Website'] : showroomDashboardChannels;
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
    const isWebsite = platform === 'Website';
    const extraMetric = googleInfo
      ? `${renderMetricBox(toNumber(googleInfo.reviews), 'Đánh giá')}
         ${renderMetricBox(toNumber(googleInfo.target), 'Target review')}`
      : isWebsite
        ? `${renderMetricBox(monthlyKpi.engagement, 'Phiên truy cập')}
           ${renderMetricBox(monthlyKpi.follow, 'Người dùng')}`
      : `${renderMetricBox(pending, 'Chờ duyệt')}
         ${renderMetricBox(idea, 'Ý tưởng')}`;
    return `
      <article class="showroom-channel-card ${isActiveChannel ? 'is-current' : ''} ${isWebsite ? 'website-card' : ''}">
        <div class="channel-head">
          <span class="channel-badge">${escapeHtml(platform)}</span>
          ${isWebsite ? '' : `<button type="button" class="mini-primary" data-create-platform="${escapeHtml(platform)}" data-create-showroom="${escapeHtml(currentShowroom)}">+ Tạo bài</button>`}
        </div>
        <div class="channel-metrics">
          ${renderMetricBox(channelPosts.length, 'Tổng bài')}
          ${renderMetricBox(done, 'Đã đăng')}
          ${extraMetric}
        </div>
        <label>${linkLabel}
          <input type="url" placeholder="Dán ${escapeHtml(linkLabel.toLowerCase())}" value="${escapeHtml(linkValue)}" data-dashboard-link-platform="${escapeHtml(platform)}" data-dashboard-link-showroom="${escapeHtml(currentShowroom)}">
        </label>
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
  const platforms = showroom === 'HO' ? [...showroomDashboardChannels, 'YouTube', 'Website'] : showroomDashboardChannels;
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
  const key = normalizeShowroomKey(showroom);
  const found = googleMapShowrooms.find(item => {
    const name = String(item.name || '');
    if(key === 'HO') return showroomKeyFromGoogleName(name) === 'Trụ sở chính';
    return name.includes(key);
  });
  return found || {
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
    const key = normalizeShowroomKey(showroom);
    const info = googleMapShowrooms.find(item => {
      const name = String(item.name || '');
      if(key === 'HO') return showroomKeyFromGoogleName(name) === 'Trụ sở chính';
      return name.includes(key);
    });
    if(info){
      info.mapLink = link;
      saveGoogleMapShowrooms();
    }
  }else{
    setShowroomChannelLink(platform, showroom, link);
  }
  renderShowroomDashboard();
}

function renderMetricBox(value, label){
  return `
    <div style="background:rgba(8,18,33,.92);border:1px solid rgba(34,211,238,.28);border-radius:10px;padding:10px;">
      <b style="display:block;margin-bottom:3px;color:#67e8f9;font-size:20px;font-weight:900;text-shadow:0 0 18px rgba(34,211,238,.24);">${escapeHtml(value)}</b>
      <span style="color:#cbd5e1;font-size:12px;font-weight:800;">${escapeHtml(label)}</span>
    </div>
  `;
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
          ${renderMetricBox(channelPosts.length, 'Tổng bài')}
          ${renderMetricBox(done, 'Đã đăng')}
          ${renderMetricBox(pending, 'Chờ duyệt')}
          ${renderMetricBox(idea, 'Ý tưởng')}
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
    loadMediaLibraryFromSupabase(),
    loadPhotoSopGuideFromSupabase()
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
    'Sản phẩm',
    'Showroom',
    'Chiến dịch',
    'Banner & Template',
    'Logo & Brand',
    'Brochure',
    'Đào tạo',
    'SOP',
    'Tài liệu'
  ];
}

function legacyDefaultMediaFolders(){
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

function normalizeMediaFolders(folders, files = []){
  const legacy = new Set(legacyDefaultMediaFolders());
  const foldersWithFiles = new Set((files || []).map(file => file.folder).filter(Boolean));
  return [...new Set([...(folders || []), ...foldersWithFiles])]
    .filter(folder => folder && (!legacy.has(folder) || foldersWithFiles.has(folder)));
}

function loadMediaLibrary(){
  try{
    const saved = localStorage.getItem(mediaLibraryStorageKey);
    if(saved){
      const parsed = JSON.parse(saved);
      const files = parsed.files || [];
      return {
        folders: normalizeMediaFolders([...defaultMediaFolders(), ...(parsed.folders || [])], files),
        files
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
    .filter(row => row.type !== 'folder' && row.type !== 'photo_sop_guide' && row.type !== 'post_metrics')
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
    folders: normalizeMediaFolders([...defaultMediaFolders(), ...folders, ...files.map(file => file.folder)], files),
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

function isUuid(value){
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || ''));
}

async function updateMediaFileInSupabase(id, fields){
  const file = mediaLibrary.files.find(item => item.id === id);
  if(!file) return;
  const payload = {
    name: file.name || 'Tệp chưa đặt tên',
    folder: file.folder || 'Tài liệu',
    url: file.url || '',
    type: file.type || guessMediaType(file.name),
    size: toNumber(file.size),
    uploaded_at: file.uploadedAt || new Date().toISOString(),
    ...fields
  };

  if(isUuid(id)){
    const { data, error } = await supabaseClient
      .from('media_library')
      .update(fields)
      .eq('id', id)
      .select('id')
      .maybeSingle();
    if(error) throw error;
    if(data) return;
  }

  if(file.url){
    const { data, error } = await supabaseClient
      .from('media_library')
      .update(fields)
      .eq('url', file.url)
      .select('id')
      .maybeSingle();
    if(error) throw error;
    if(data){
      file.id = data.id;
      saveMediaLibrary();
      return;
    }
  }

  const { data, error } = await supabaseClient
    .from('media_library')
    .insert(payload)
    .select('id')
    .single();
  if(error) throw error;
  file.id = data.id;
  saveMediaLibrary();
}

async function deleteMediaFileFromSupabase(id){
  const file = mediaLibrary.files.find(item => item.id === id);
  if(isUuid(id)){
    const { error } = await supabaseClient.from('media_library').delete().eq('id', id);
    if(error) throw error;
    return;
  }
  if(file && file.url){
    const { error } = await supabaseClient.from('media_library').delete().eq('url', file.url);
    if(error) throw error;
  }
}

function renderMediaLibrary(){
  renderMediaFolders();
  renderMediaFiles();
  renderPostMediaFolderOptions();
}

function renderMediaFolders(){
  const folders = ['all', ...mediaLibrary.folders];
  $('mediaFolderFilter').innerHTML = folders.map(folder => `
    <option value="${escapeHtml(folder)}" ${folder === currentMediaFolder ? 'selected' : ''}>${folder === 'all' ? 'Tất cả thư mục' : escapeHtml(folder)}</option>
  `).join('');
  $('mediaFolderTree').innerHTML = buildMediaFolderTreeHtml(mediaLibrary.folders || []);
}

function buildMediaFolderTreeHtml(folders){
  const tree = {};
  folders.forEach(folder => {
    const parts = String(folder || '').split('/').filter(Boolean);
    if(!parts.length) return;
    let level = tree;
    parts.forEach((part, index) => {
      const path = parts.slice(0, index + 1).join('/');
      if(!level[part]) level[part] = { name: part, path, children: {} };
      level = level[part].children;
    });
  });
  return `
    ${renderMediaFolderTreeRow('all', 'Tất cả thư mục', 0, false)}
    ${Object.values(tree).map(node => renderMediaFolderNode(node, 0)).join('')}
  `;
}

function renderMediaFolderNode(node, depth){
  const children = Object.values(node.children || {});
  const isOpen = expandedMediaFolders.has(node.path) || currentMediaFolder === node.path || currentMediaFolder.startsWith(`${node.path}/`);
  return `
    ${renderMediaFolderTreeRow(node.path, node.name, depth, children.length > 0, isOpen)}
    ${children.length && isOpen ? children.map(child => renderMediaFolderNode(child, depth + 1)).join('') : ''}
  `;
}

function renderMediaFolderTreeRow(folder, label, depth, hasChildren = false, isOpen = false){
  return `
    <div class="media-folder-row ${folder === currentMediaFolder ? 'active' : ''} ${depth ? 'is-child' : ''}" style="--folder-depth:${depth}">
      <button class="folder-toggle ${hasChildren ? '' : 'is-placeholder'}" title="${isOpen ? 'Thu gọn' : 'Mở thư mục con'}" onclick="toggleMediaFolder('${escapeJs(folder)}')">${hasChildren ? (isOpen ? '⌄' : '›') : ''}</button>
      <button class="folder-name-btn" onclick="selectMediaFolder('${escapeJs(folder)}')" title="${escapeHtml(folder)}">
        <span class="folder-main">${escapeHtml(label)}</span>
        ${depth ? `<span class="folder-parent">${escapeHtml(String(folder).split('/').slice(0, -1).join(' / '))}</span>` : ''}
      </button>
      ${folder === 'all' ? '<span></span><span></span><span></span>' : `
        <button class="folder-add" title="Tạo thư mục con" onclick="createMediaFolder('${escapeJs(folder)}')">+</button>
        <button class="folder-edit" title="Đổi tên thư mục" onclick="renameMediaFolder('${escapeJs(folder)}')">✎</button>
        <button class="folder-delete" title="Xóa thư mục" onclick="deleteMediaFolder('${escapeJs(folder)}')">×</button>
      `}
    </div>
  `;
}

function renderFolderLabel(folder){
  if(folder === 'all') return '<span class="folder-main">Tất cả thư mục</span>';
  const parts = String(folder || '').split('/').filter(Boolean);
  const name = parts.pop() || folder;
  const parent = parts.join(' / ');
  return `
    <span class="folder-main" title="${escapeHtml(folder)}">${escapeHtml(name)}</span>
    ${parent ? `<span class="folder-parent">${escapeHtml(parent)}</span>` : ''}
  `;
}

function renderPostMediaFolderOptions(){
  const select = $('postMediaFolder');
  if(!select) return;
  const selected = select.value || '';
  const folders = [...new Set(mediaLibrary.folders || [])];
  select.innerHTML = '<option value="">Không lưu vào Media Library</option>' + renderFolderOptions(folders, selected);
  select.value = folders.includes(selected) ? selected : '';
}

function renderFolderOptions(folders, selected = ''){
  return folders.map(folder => `
    <option value="${escapeHtml(folder)}" ${folder === selected ? 'selected' : ''}>${escapeHtml(folder)}</option>
  `).join('');
}

function selectMediaFolder(folder){
  currentMediaFolder = folder;
  expandFolderAncestors(folder);
  renderMediaLibrary();
}

function toggleMediaFolder(folder){
  if(!folder || folder === 'all') return;
  if(expandedMediaFolders.has(folder)) expandedMediaFolders.delete(folder);
  else expandedMediaFolders.add(folder);
  renderMediaFolders();
}

function expandFolderAncestors(folder){
  const parts = String(folder || '').split('/').filter(Boolean);
  parts.pop();
  parts.forEach((_part, index) => {
    expandedMediaFolders.add(parts.slice(0, index + 1).join('/'));
  });
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
      await uploadFileToMediaLibrary(file, folder);
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

async function uploadPostFilesToMediaLibrary(files){
  const folder = $('postMediaFolder') ? $('postMediaFolder').value : '';
  if(!folder){
    return uploadFiles(files, 'posts');
  }
  const urls = [];
  for(const file of files){
    const saved = await uploadFileToMediaLibrary(file, folder);
    urls.push(saved.url);
  }
  saveMediaLibrary();
  return urls;
}

async function uploadFileToMediaLibrary(file, folder){
  if(folder && !mediaLibrary.folders.includes(folder)){
    mediaLibrary.folders.push(folder);
    await saveMediaFolderToSupabase(folder);
  }
  const url = await uploadFile(file, mediaLibraryStorageFolder);
  const row = {
    name: file.name,
    folder,
    url,
    type: file.type || guessMediaType(file.name),
    size: file.size,
    uploaded_at: new Date().toISOString()
  };
  const { data, error } = await supabaseClient.from('media_library').insert(row).select('*').single();
  if(error) throw error;
  const item = {
    id: data.id,
    name: data.name,
    folder: data.folder,
    url: data.url,
    type: data.type || 'application/octet-stream',
    size: toNumber(data.size),
    uploadedAt: data.uploaded_at
  };
  mediaLibrary.files.unshift(item);
  saveMediaLibrary();
  return item;
}

function createMediaFolder(parentFolder = ''){
  const baseFolder = parentFolder || (currentMediaFolder !== 'all' ? currentMediaFolder : '');
  const label = baseFolder ? `Tạo thư mục con trong "${baseFolder}"` : 'Nhập tên thư mục';
  const name = prompt(label);
  if(!name) return;
  const cleanName = name.trim().replace(/^\/+|\/+$/g, '');
  if(!cleanName) return;
  const folder = baseFolder && !cleanName.includes('/') ? `${baseFolder}/${cleanName}` : cleanName;
  if(!folder) return;
  if(!mediaLibrary.folders.includes(folder)) mediaLibrary.folders.push(folder);
  currentMediaFolder = folder;
  if(baseFolder) expandedMediaFolders.add(baseFolder);
  expandFolderAncestors(folder);
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
  saveMediaFolderToSupabase(nextFolder).catch(err => console.warn('Không lưu được tên thư mục mới lên Supabase:', err));
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

async function renameMediaFile(id){
  const file = mediaLibrary.files.find(item => item.id === id);
  if(!file) return;
  const name = prompt('Tên mới', file.name);
  if(!name) return;
  const previousName = file.name;
  file.name = name.trim();
  try{
    await updateMediaFileInSupabase(id, { name: file.name });
    saveMediaLibrary();
    renderMediaLibrary();
  }catch(err){
    file.name = previousName;
    saveMediaLibrary();
    renderMediaLibrary();
    alert('Không lưu được tên file lên Supabase: ' + err.message);
  }
}

function moveMediaFile(id){
  const file = mediaLibrary.files.find(item => item.id === id);
  if(!file) return;
  movingMediaFileId = id;
  $('moveMediaFolder').innerHTML = renderFolderOptions(mediaLibrary.folders || [], file.folder);
  $('moveMediaFolder').value = mediaLibrary.folders.includes(file.folder) ? file.folder : (mediaLibrary.folders[0] || '');
  $('moveMediaModal').classList.add('open');
}

function closeMoveMediaModal(){
  movingMediaFileId = null;
  $('moveMediaModal').classList.remove('open');
}

async function confirmMoveMediaFile(){
  const file = mediaLibrary.files.find(item => item.id === movingMediaFileId);
  const folder = $('moveMediaFolder').value;
  if(!file || !folder) return;
  const previousFolder = file.folder;
  file.folder = folder;
  try{
    await updateMediaFileInSupabase(movingMediaFileId, { folder: file.folder });
    saveMediaLibrary();
    closeMoveMediaModal();
    renderMediaLibrary();
  }catch(err){
    file.folder = previousFolder;
    saveMediaLibrary();
    renderMediaLibrary();
    alert('Không lưu được thư mục mới lên Supabase: ' + err.message);
  }
}

async function deleteMediaFile(id){
  if(!confirm('Xóa tài nguyên khỏi Media Library?')) return;
  const previousFiles = [...mediaLibrary.files];
  try{
    await deleteMediaFileFromSupabase(id);
    mediaLibrary.files = mediaLibrary.files.filter(file => file.id !== id);
    saveMediaLibrary();
    renderMediaLibrary();
  }catch(err){
    mediaLibrary.files = previousFiles;
    saveMediaLibrary();
    renderMediaLibrary();
    alert('Không xóa được file trên Supabase: ' + err.message);
  }
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

function guessMediaType(name, fallback){
  if(fallback) return fallback;
  const extension = String(name || '').split('.').pop().toLowerCase();
  if(['jpg', 'jpeg', 'png', 'webp', 'gif', 'avif', 'svg'].includes(extension)) return `image/${extension === 'jpg' ? 'jpeg' : extension}`;
  if(['mp4', 'mov', 'webm', 'm4v'].includes(extension)) return `video/${extension === 'mov' ? 'quicktime' : extension}`;
  if(extension === 'pdf') return 'application/pdf';
  if(['doc', 'docx'].includes(extension)) return 'application/msword';
  if(['xls', 'xlsx'].includes(extension)) return 'application/vnd.ms-excel';
  if(['ppt', 'pptx'].includes(extension)) return 'application/vnd.ms-powerpoint';
  return 'application/octet-stream';
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
  periodPickerDisplayYear = now.getFullYear();
  renderPeriodPicker();
}

function togglePeriodPicker(){
  const popover = $('periodPickerPopover');
  if(!popover) return;
  const willOpen = !popover.classList.contains('is-open');
  closePeriodPicker();
  if(willOpen){
    const selected = $('monthFilter').value;
    if(selected) periodPickerDisplayYear = Number(selected.slice(0,4));
    renderPeriodPicker();
    popover.classList.add('is-open');
    $('periodPickerTrigger').classList.add('is-open');
  }
}

function closePeriodPicker(){
  if($('periodPickerPopover')) $('periodPickerPopover').classList.remove('is-open');
  if($('periodPickerTrigger')) $('periodPickerTrigger').classList.remove('is-open');
}

function changePeriodPickerYear(offset){
  periodPickerDisplayYear += offset;
  renderPeriodPicker();
}

function renderPeriodPicker(){
  const selected = $('monthFilter').value;
  const label = $('periodPickerLabel');
  if(label){
    label.innerText = selected
      ? `Tháng ${Number(selected.slice(5,7))}/${selected.slice(0,4)}`
      : 'Tất cả thời gian';
  }
  if($('periodPickerYear')) $('periodPickerYear').innerText = periodPickerDisplayYear;
  const grid = $('periodMonthGrid');
  if(!grid) return;
  grid.innerHTML = Array.from({ length:12 }, (_, index) => {
    const month = String(index + 1).padStart(2, '0');
    const value = `${periodPickerDisplayYear}-${month}`;
    return `<button type="button" class="${selected === value ? 'is-selected' : ''}" data-report-month="${value}">Thg ${index + 1}</button>`;
  }).join('');
  grid.querySelectorAll('[data-report-month]').forEach(button => {
    button.addEventListener('click', () => selectReportMonth(button.dataset.reportMonth));
  });
  if($('periodAll')) $('periodAll').classList.toggle('is-selected', !selected);
}

function selectReportMonth(value){
  $('monthFilter').value = value;
  if(value) periodPickerDisplayYear = Number(value.slice(0,4));
  renderPeriodPicker();
  closePeriodPicker();
  $('monthFilter').dispatchEvent(new Event('change', { bubbles:true }));
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
    const matchShowroom = currentShowroom === 'all'
      ? belongsToReportShowrooms(p)
      : showroomMatches(p.showroom, currentShowroom);
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
  const chartType = getChartType(targetId, 'bar');
  if(chartType === 'tile'){
    $(targetId).innerHTML = `<div class="chart-tiles">${entries.map(([name, count]) => `
      <div class="chart-tile"><b>${count}</b><span>${escapeHtml(name)}</span></div>
    `).join('')}</div>`;
    return;
  }
  if(chartType === 'donut'){
    const total = entries.reduce((sum, item) => sum + item[1], 0) || 1;
    let offset = 0;
    const colors = ['#22d3ee', '#3b82f6', '#8b5cf6', '#34d399', '#fbbf24', '#f87171'];
    const gradient = entries.map(([name, count], index) => {
      const start = offset;
      const end = offset + (count / total * 100);
      offset = end;
      return `${colors[index % colors.length]} ${start}% ${end}%`;
    }).join(', ');
    $(targetId).innerHTML = `
      <div class="donut-chart-wrap">
        <div class="donut-chart" style="background: conic-gradient(${gradient})"><b>${total}</b><span>Tổng</span></div>
        <div class="donut-legend">${entries.map(([name, count], index) => `
          <div><i style="background:${colors[index % colors.length]}"></i><span>${escapeHtml(name)}</span><b>${count}</b></div>
        `).join('')}</div>
      </div>
    `;
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

function getChartType(targetId, fallback){
  const select = document.querySelector(`[data-chart-target="${targetId}"]`);
  return select ? select.value : fallback;
}

function heatmapMetricValue(post, metric){
  if(metric === '__engagement__') return getPostPerformanceValue(post, '__engagement__');
  return toNumber(normalizePerformanceMetrics(post.performance_metrics)[metric]);
}

function heatmapSlot(postTime){
  if(!String(postTime || '').trim()) return null;
  const hour = Number(String(postTime || '').slice(0,2));
  if(!Number.isFinite(hour)) return null;
  const slots = [6, 9, 12, 15, 18, 21];
  return slots.reduce((best, slot) => Math.abs(slot - hour) < Math.abs(best - hour) ? slot : best, slots[0]);
}

function heatmapDayIndex(dateText){
  const date = new Date(`${dateText}T00:00:00`);
  if(Number.isNaN(date.getTime())) return null;
  return (date.getDay() + 6) % 7;
}

function heatmapPostLink(post){
  const value = String(post.post_link || '').trim();
  if(!value) return '';
  try {
    const url = new URL(value, window.location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch(_err) {
    return '';
  }
}

function renderHeatmapPostDetails(group, dayName, slot, metric, metricLabel){
  const target = $('heatmapPostDetails');
  if(!target) return;
  const ranked = [...group].sort((a,b) => heatmapMetricValue(b, metric) - heatmapMetricValue(a, metric));
  const average = ranked.reduce((sum, post) => sum + heatmapMetricValue(post, metric), 0) / Math.max(ranked.length, 1);
  target.classList.remove('is-hidden');
  target.innerHTML = `
    <div class="heatmap-detail-head">
      <div>
        <span>Các bài trong khung giờ</span>
        <h5>${escapeHtml(dayName)} · ${String(slot).padStart(2,'0')}:00</h5>
        <small>${ranked.length} bài · Trung bình ${formatMetricNumber(average)} ${escapeHtml(metricLabel)}/bài</small>
      </div>
      <button type="button" class="heatmap-detail-close" aria-label="Đóng danh sách bài">×</button>
    </div>
    <div class="heatmap-detail-list">
      ${ranked.map((post, index) => {
        const value = heatmapMetricValue(post, metric);
        const link = heatmapPostLink(post);
        const reach = heatmapMetricValue(post, 'Số người tiếp cận');
        const views = heatmapMetricValue(post, 'Lượt xem');
        const engagement = getPostPerformanceValue(post, '__engagement__');
        return `
          <article class="heatmap-post-item">
            <div class="heatmap-post-rank">${index + 1}</div>
            <div class="heatmap-post-main">
              <div class="heatmap-post-title">
                <div>
                  <b>${escapeHtml(post.title || 'Bài đăng không tiêu đề')}</b>
                  <span>${escapeHtml(post.platform || '-')} · ${escapeHtml(post.showroom || 'Chưa chọn showroom')} · ${formatDate(post.post_date)} ${escapeHtml(post.post_time || '')}</span>
                </div>
                <strong>${formatMetricNumber(value)} <small>${escapeHtml(metricLabel)}</small></strong>
              </div>
              <div class="heatmap-post-kpis">
                <span>Reach <b>${formatMetricNumber(reach)}</b></span>
                <span>Views <b>${formatMetricNumber(views)}</b></span>
                <span>Engagement <b>${formatMetricNumber(engagement)}</b></span>
                ${link ? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener noreferrer">Mở bài đăng ↗</a>` : '<em>Chưa có liên kết bài</em>'}
              </div>
            </div>
          </article>
        `;
      }).join('')}
    </div>
  `;
  target.querySelector('.heatmap-detail-close').addEventListener('click', () => target.classList.add('is-hidden'));
  target.scrollIntoView({ behavior:'smooth', block:'nearest' });
}

function renderPostingHeatmap(items){
  const target = $('postingHeatmap');
  if(!target) return;
  const metric = $('heatmapMetric') ? $('heatmapMetric').value : 'Số người tiếp cận';
  const days = ['Thứ 2','Thứ 3','Thứ 4','Thứ 5','Thứ 6','Thứ 7','Chủ nhật'];
  const slots = [6, 9, 12, 15, 18, 21];
  const metricLabel = metric === '__engagement__' ? 'Engagement' : metric;
  const cells = new Map();
  slots.forEach(slot => days.forEach((_day, day) => cells.set(`${slot}|${day}`, [])));
  items.forEach(post => {
    const slot = heatmapSlot(post.post_time);
    const day = heatmapDayIndex(post.post_date);
    if(slot === null || day === null) return;
    cells.get(`${slot}|${day}`).push(post);
  });
  const averages = [...cells.values()].map(group => group.length
    ? group.reduce((sum, post) => sum + heatmapMetricValue(post, metric), 0) / group.length
    : 0);
  const max = Math.max(...averages, 1);
  const excluded = items.filter(post => heatmapSlot(post.post_time) === null).length;
  let best = null;
  cells.forEach((group, key) => {
    if(!group.length) return;
    const average = group.reduce((sum, post) => sum + heatmapMetricValue(post, metric), 0) / group.length;
    if(!best || average > best.average) best = { key, average, count:group.length };
  });
  if($('heatmapInsight')){
    if(best){
      const [slot, day] = best.key.split('|').map(Number);
      $('heatmapInsight').innerHTML = `<button type="button" class="heatmap-insight-button" data-heatmap-key="${best.key}"><b>Khung giờ hiệu quả nhất:</b> ${days[day]} lúc ${String(slot).padStart(2,'0')}:00 · Trung bình ${formatMetricNumber(best.average)} ${escapeHtml(metricLabel)}/bài · ${best.count} bài <span>Xem các bài →</span></button>`;
    }else{
      $('heatmapInsight').innerHTML = '<b>Chưa đủ dữ liệu:</b> cần có giờ đăng và KPI của bài.';
    }
  }
  if($('heatmapMethod')){
    $('heatmapMethod').innerText = `Cách đọc: số lớn là ${metricLabel} trung bình trên mỗi bài. Màu so tương đối với ô tốt nhất trong kỳ: thấp <25%, trung bình 25–49%, cao 50–74%, rất cao ≥75%. ${excluded ? `${excluded} bài chưa có giờ đăng nên chưa được tính.` : ''}`;
  }
  const header = `<div class="heatmap-corner">Giờ</div>${days.map(day => `<div class="heatmap-day">${day}</div>`).join('')}`;
  const body = slots.map(slot => {
    const label = `<div class="heatmap-time">${String(slot).padStart(2,'0')}:00</div>`;
    const row = days.map((dayName, day) => {
      const group = cells.get(`${slot}|${day}`);
      const average = group.length ? group.reduce((sum, post) => sum + heatmapMetricValue(post, metric), 0) / group.length : 0;
      const ratio = average / max;
      const level = !group.length || ratio < .25 ? 'low' : ratio < .5 ? 'medium' : ratio < .75 ? 'high' : 'very-high';
      const avgReach = group.length ? group.reduce((sum, post) => sum + heatmapMetricValue(post, 'Số người tiếp cận'), 0) / group.length : 0;
      const avgViews = group.length ? group.reduce((sum, post) => sum + heatmapMetricValue(post, 'Lượt xem'), 0) / group.length : 0;
      const avgEngagement = group.length ? group.reduce((sum, post) => sum + getPostPerformanceValue(post, '__engagement__'), 0) / group.length : 0;
      const title = `${dayName} · ${String(slot).padStart(2,'0')}:00\nSố bài: ${group.length}\nReach TB: ${formatMetricNumber(avgReach)}\nView TB: ${formatMetricNumber(avgViews)}\nEngagement TB: ${formatMetricNumber(avgEngagement)}`;
      return `<button type="button" class="heatmap-cell heat-${level}" data-heatmap-key="${slot}|${day}" ${group.length ? '' : 'disabled'} title="${escapeHtml(title)}" aria-label="${escapeHtml(title.replace(/\n/g, '. '))}"><b>${group.length ? formatMetricNumber(average) : '–'}</b><span>${group.length ? `${escapeHtml(metricLabel)} TB · ${group.length} bài` : '0 bài'}</span></button>`;
    }).join('');
    return label + row;
  }).join('');
  target.innerHTML = `<div class="heatmap-grid">${header}${body}</div>`;
  const openCell = key => {
    const group = cells.get(key) || [];
    if(!group.length) return;
    const [slot, day] = key.split('|').map(Number);
    target.querySelectorAll('.heatmap-cell').forEach(cell => cell.classList.toggle('is-selected', cell.dataset.heatmapKey === key));
    renderHeatmapPostDetails(group, days[day], slot, metric, metricLabel);
  };
  target.querySelectorAll('[data-heatmap-key]').forEach(cell => {
    cell.addEventListener('click', () => openCell(cell.dataset.heatmapKey));
  });
  const insightButton = $('heatmapInsight') ? $('heatmapInsight').querySelector('[data-heatmap-key]') : null;
  if(insightButton) insightButton.addEventListener('click', () => openCell(insightButton.dataset.heatmapKey));
  const details = $('heatmapPostDetails');
  if(details) details.classList.add('is-hidden');
}

function loadReadNotificationIds(){
  try { return new Set(JSON.parse(localStorage.getItem(notificationReadStorageKey) || '[]')); }
  catch(_err) { return new Set(); }
}

function saveReadNotificationIds(ids){
  localStorage.setItem(notificationReadStorageKey, JSON.stringify([...ids]));
}

function buildDashboardNotifications(){
  const now = new Date();
  const month = $('monthFilter').value;
  const scoped = getMonthPosts();
  const notifications = [];
  const missingMetrics = scoped.filter(post => !Object.keys(normalizePerformanceMetrics(post.performance_metrics)).length);
  if(missingMetrics.length) notifications.push({
    id:`missing-metrics-${month}-${missingMetrics.length}`,
    type:'action',
    title:`Có ${missingMetrics.length} bài chưa nhập số liệu`,
    detail:'Bổ sung KPI để báo cáo và Top 5 chính xác hơn.',
    solution:'Mở bài đầu tiên chưa đủ số liệu, nhập Reach, Views và Engagement từ báo cáo nền tảng, sau đó lưu bài. Tiếp tục xử lý các bài còn lại trong danh sách.',
    postId:missingMetrics[0].id
  });
  ['Facebook','TikTok','YouTube'].forEach(platform => {
    const latest = posts.filter(post => platformMatches(post.platform, platform) && post.post_date)
      .sort((a,b) => String(b.post_date).localeCompare(String(a.post_date)))[0];
    const days = latest ? Math.floor((now - new Date(`${latest.post_date}T00:00:00`)) / 86400000) : 999;
    if(days >= 5) notifications.push({
      id:`stale-${platform}-${latest ? latest.post_date : 'none'}`,
      type:'action',
      title:`${platform} ${days === 999 ? 'chưa có bài đăng' : `${days} ngày chưa đăng bài`}`,
      detail:'Kiểm tra lại lịch nội dung của kênh.',
      solution:`Rà lịch nội dung ${platform}, chọn một bài đang chờ duyệt hoặc tạo bài mới, chốt người phụ trách và thời gian đăng trong 24 giờ tới.`,
      postId:latest ? latest.id : null
    });
  });
  const selectedMonth = month || `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const previous = previousMonthKey(selectedMonth);
  const reachNow = sumMetricAliases(postsForComparisonMonth(selectedMonth), ['Số người tiếp cận']);
  const reachBefore = sumMetricAliases(postsForComparisonMonth(previous), ['Số người tiếp cận']);
  if(reachBefore > 0 && reachNow < reachBefore){
    const drop = Math.round((reachBefore - reachNow) / reachBefore * 100);
    notifications.push({ id:`reach-drop-${selectedMonth}-${drop}`, type:'warning', title:`Reach giảm ${drop}% so với tháng trước`, detail:'Xem lại tần suất đăng và nhóm nội dung hiệu quả.' });
    notifications[notifications.length - 1].solution = 'So sánh Top 5 bài của hai tháng, giữ lại chủ đề và khung giờ có Reach cao, giảm nội dung kém hiệu quả và bổ sung lịch đăng cho các kênh đang thiếu tần suất.';
  }
  posts.forEach(post => {
    const views = heatmapMetricValue(post, 'Lượt xem');
    if(views >= 50000) notifications.push({
      id:`views-50k-${post.id}`,
      type:'success',
      title:'Video đạt trên 50.000 Views',
      detail:post.title || 'Bài đăng nổi bật',
      solution:'Lưu lại hook mở đầu, định dạng video, chủ đề và khung giờ đăng. Tạo phiên bản tiếp nối, tái sử dụng CTA hiệu quả và phân phối lại trên các kênh phù hợp.',
      postId:post.id
    });
  });
  const read = loadReadNotificationIds();
  dashboardNotifications = notifications.map(item => ({ ...item, read:read.has(item.id) }));
}

function renderNotificationCenter(){
  buildDashboardNotifications();
  const unread = dashboardNotifications.filter(item => !item.read).length;
  if($('notificationBadge')){
    $('notificationBadge').innerText = unread;
    $('notificationBadge').classList.toggle('is-hidden', unread === 0);
  }
  if($('notificationUnreadText')) $('notificationUnreadText').innerText = `${unread} chưa đọc`;
  const groups = [
    { type:'action', title:'🔴 Cần xử lý' },
    { type:'warning', title:'🟡 Cảnh báo' },
    { type:'success', title:'🟢 Thành tích' }
  ];
  $('notificationGroups').innerHTML = groups.map(group => {
    const items = dashboardNotifications.filter(item => item.type === group.type);
    return `<section class="notification-group"><h4>${group.title}</h4>${items.length ? items.map(item => `
      <article class="notification-card ${item.read ? 'is-read' : ''}">
        <button type="button" class="notification-item" onclick="readNotification('${escapeJs(item.id)}')">
          <b>${escapeHtml(item.title)}</b><span>${escapeHtml(item.detail)}</span>
          <small>${activeNotificationId === item.id ? 'Thu gọn hướng xử lý ↑' : 'Xem hướng xử lý →'}</small>
        </button>
        ${activeNotificationId === item.id ? `<div class="notification-solution">
          <strong>Hướng xử lý đề xuất</strong>
          <p>${escapeHtml(item.solution || 'Kiểm tra dữ liệu liên quan, xác định người phụ trách và cập nhật trạng thái sau khi xử lý.')}</p>
          ${item.postId ? `<button type="button" onclick="openNotificationPost('${escapeJs(item.id)}', ${item.postId})">Mở đúng bài liên quan</button>` : ''}
        </div>` : ''}
      </article>`).join('') : '<div class="notification-empty">Không có thông báo</div>'}</section>`;
  }).join('');
}

function openNotificationCenter(){
  renderNotificationCenter();
  $('notificationCenter').classList.add('is-open');
  $('notificationOverlay').classList.add('is-open');
}

function closeNotificationCenter(){
  $('notificationCenter').classList.remove('is-open');
  $('notificationOverlay').classList.remove('is-open');
}

function readNotification(id){
  const read = loadReadNotificationIds();
  read.add(id);
  saveReadNotificationIds(read);
  activeNotificationId = activeNotificationId === id ? null : id;
  renderNotificationCenter();
}

function openNotificationPost(id, postId){
  const read = loadReadNotificationIds();
  read.add(id);
  saveReadNotificationIds(read);
  const post = posts.find(item => item.id === postId);
  if(!post) return;
  closeNotificationCenter();
  const showroom = showroomList(post.showroom)[0];
  currentShowroom = reportShowroomNames.includes(showroom) ? showroom : 'all';
  currentPlatform = 'all';
  selectReportMonth(getMonthKey(post.post_date));
  setActiveShowroomNav(currentShowroom);
  setActivePlatformNav(currentPlatform);
  editPost(postId);
}

function markAllNotificationsRead(){
  const read = loadReadNotificationIds();
  dashboardNotifications.forEach(item => read.add(item.id));
  saveReadNotificationIds(read);
  renderNotificationCenter();
}

function updateStats(){
  const monthPosts = getMonthPosts();
  renderPlatformPerformanceDashboard();
  renderShowroomAnalysisDashboard();
  renderMonthlyTrendsDashboard();
  renderPerformanceSummary(monthPosts);
  renderTopPerformingPosts(monthPosts);
  renderMonthComparison();
  renderPostingHeatmap(monthPosts);
  renderNotificationCenter();
  const done = monthPosts.filter(p => p.status === 'Đã đăng').length;
  const pending = monthPosts.filter(p => p.status === 'Chờ duyệt').length;
  const idea = monthPosts.filter(p => p.status === 'Ý tưởng').length;
  $('totalCount').innerText = monthPosts.length;
  $('pendingCount').innerText = pending;
  $('doneCount').innerText = done;
  $('ideaCount').innerText = idea;
  if($('doneRate')) $('doneRate').innerText = monthPosts.length ? `${Math.round(done / monthPosts.length * 100)}%` : '0%';

  const weeks = { 'Tuần 1':0, 'Tuần 2':0, 'Tuần 3':0, 'Tuần 4':0, 'Tuần 5':0 };
  monthPosts.forEach(p => {
    const w = getWeekOfMonth(p.post_date);
    if(w) weeks[`Tuần ${Math.min(w,5)}`] += 1;
  });
  renderKeyValueStats('weekStats', weeks);

  renderKeyValueStats('platformStats', countBy(monthPosts, p => platformList(p.platform || 'Khác')));
  renderKeyValueStats('showroomStats', countBy(monthPosts, p => showroomList(p.showroom || 'Chưa chọn').map(showroomDisplayName)));
  renderDailyTrend(monthPosts);
}

function renderDailyTrend(monthPosts){
  const target = $('dailyTrend');
  if(!target) return;
  const chartType = getChartType('dailyTrend', 'column');
  const selectedMonth = $('monthFilter').value;
  const daysInMonth = selectedMonth
    ? new Date(Number(selectedMonth.slice(0,4)), Number(selectedMonth.slice(5,7)), 0).getDate()
    : 31;
  const dayCounts = Array.from({ length: daysInMonth }, (_, index) => ({
    day: index + 1,
    count: 0
  }));
  monthPosts.forEach(post => {
    const day = Number(String(post.post_date || '').slice(8,10));
    if(dayCounts[day - 1]) dayCounts[day - 1].count += 1;
  });
  const visible = dayCounts.filter(item => item.count > 0);
  const series = visible.length ? visible : dayCounts.slice(0, Math.min(daysInMonth, 12));
  const max = Math.max(...series.map(item => item.count), 1);
  if(chartType === 'tile'){
    target.className = 'daily-trend is-tiles';
    target.innerHTML = series.map(item => `
      <div class="chart-tile"><b>${item.count}</b><span>Ngày ${item.day}</span></div>
    `).join('');
    return;
  }
  target.className = chartType === 'line' ? 'daily-trend is-line' : 'daily-trend';
  target.innerHTML = series.map(item => `
    <div class="trend-column">
      <span class="trend-value">${item.count}</span>
      <i style="height:${Math.max(8, Math.round(item.count / max * 100))}%"></i>
      <b>${item.day}</b>
    </div>
  `).join('');
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
  selectedLibraryMediaUrls = [];
  pendingPickedMedia = new Set();
  renderPostMediaFolderOptions();
  $('modalTitle').innerText = 'Tạo bài mới';
  setPlatformChecks('Facebook');
  setShowroomChecks('HO');
  $('title').value = '';
  $('postDate').value = '';
  $('postTime').value = '';
  $('postStatus').value = 'Ý tưởng';
  $('note').value = '';
  renderPostMetricsEditor(defaultPostMetrics);
  $('imageInput').value = '';
  $('previewWrap').innerHTML = '';
  renderPickedMedia();
}

function renderPostMetricsEditor(metrics){
  const target = $('postMetricsEditor');
  if(!target) return;
  const entries = Array.isArray(metrics)
    ? metrics
    : Object.entries(normalizePerformanceMetrics(metrics)).map(([name, value]) => ({ name, value }));
  target.innerHTML = '';
  (entries.length ? entries : defaultPostMetrics).forEach(item => addPostMetricRow(item.name, item.value));
}

function addPostMetricRow(name = '', value = 0){
  const target = $('postMetricsEditor');
  if(!target) return;
  const isStandard = standardPostMetricNames.includes(name);
  const selectedName = name || standardPostMetricNames.find(metricName => {
    return !Array.from(document.querySelectorAll('.post-metric-select')).some(select => select.value === metricName);
  }) || standardPostMetricNames[0];
  const useCustom = Boolean(name) && !isStandard;
  const row = document.createElement('div');
  row.className = 'post-metric-row';
  row.innerHTML = `
    <span class="metric-drag" title="Chỉ số">⋮⋮</span>
    <div class="post-metric-name-wrap">
      <select class="post-metric-select">
        ${standardPostMetricNames.map(metricName => `<option value="${escapeHtml(metricName)}" ${!useCustom && selectedName === metricName ? 'selected' : ''}>${escapeHtml(metricName)}</option>`).join('')}
        <option value="__custom__" ${useCustom ? 'selected' : ''}>+ Chỉ số tùy chỉnh</option>
      </select>
      <input class="post-metric-custom-name ${useCustom ? '' : 'is-hidden'}" placeholder="Nhập tên chỉ số mới" value="${useCustom ? escapeHtml(name) : ''}">
    </div>
    <input class="post-metric-value" type="number" min="0" step="any" placeholder="Giá trị" value="${toNumber(value)}">
    <button type="button" class="post-metric-delete" title="Xóa chỉ số">×</button>
  `;
  const select = row.querySelector('.post-metric-select');
  const customInput = row.querySelector('.post-metric-custom-name');
  select.addEventListener('change', () => {
    const custom = select.value === '__custom__';
    customInput.classList.toggle('is-hidden', !custom);
    if(custom) customInput.focus();
  });
  row.querySelector('button').addEventListener('click', () => row.remove());
  target.appendChild(row);
}

function getPostMetricsFromEditor(){
  return Array.from(document.querySelectorAll('.post-metric-row')).reduce((metrics, row) => {
    const select = row.querySelector('.post-metric-select');
    const name = select.value === '__custom__'
      ? row.querySelector('.post-metric-custom-name').value.trim()
      : select.value;
    const value = Math.max(0, toNumber(row.querySelector('.post-metric-value').value));
    if(name) metrics[name] = value;
    return metrics;
  }, {});
}

function previewImages(){
  const files = Array.from($('imageInput').files || []);
  $('previewWrap').innerHTML = '';
  if(files.length === 0) return;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      $('previewWrap').appendChild(createPreviewNode(file, e.target.result));
    };
    reader.readAsDataURL(file);
  });
}

function renderExistingPreview(urls){
  $('previewWrap').innerHTML = urls.map(url => `<img src="${escapeHtml(url)}" class="preview" style="display:block">`).join('');
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
    const files = Array.from($('imageInput').files || []);
    if(files.length){
      mediaUrls = await uploadPostFilesToMediaLibrary(files);
      imageUrls = mediaUrls.filter(url => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url));
    }
    if(selectedLibraryMediaUrls.length){
      mediaUrls = [...mediaUrls, ...selectedLibraryMediaUrls];
      imageUrls = [...imageUrls, ...selectedLibraryMediaUrls.filter(url => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(url))];
    }

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
      thumbnail_url: '',
      performance_metrics: getPostMetricsFromEditor()
    };

    let error;
    let metricsSavedAsFallback = false;
    if(editingId){
      ({ error } = await supabaseClient.from('posts').update(payload).eq('id', editingId));
    }else{
      ({ error } = await supabaseClient.from('posts').insert([payload]));
    }
    if(error && isMissingPerformanceMetricsColumn(error)){
      const fallbackMetrics = payload.performance_metrics;
      const compatiblePayload = { ...payload };
      delete compatiblePayload.performance_metrics;
      if(editingId){
        ({ error } = await supabaseClient.from('posts').update(compatiblePayload).eq('id', editingId));
      }else{
        ({ error } = await supabaseClient.from('posts').insert([compatiblePayload]));
      }
      if(!error){
        await saveFallbackPostMetrics(compatiblePayload, fallbackMetrics);
        metricsSavedAsFallback = true;
      }
    }
    if(error) throw error;
    if(!metricsSavedAsFallback){
      await saveFallbackPostMetrics(payload, payload.performance_metrics).catch(err => {
        console.warn('Không thể tạo bản sao KPI dự phòng:', err);
      });
    }
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
  selectedLibraryMediaUrls = [];
  pendingPickedMedia = new Set();
  renderPostMediaFolderOptions();
  $('modalTitle').innerText = 'Sửa bài đăng';
  setPlatformChecks(p.platform || 'Facebook');
  setShowroomChecks(p.showroom || 'HO');
  $('title').value = p.title || '';
  $('postDate').value = p.post_date || '';
  $('postTime').value = p.post_time || '';
  $('postStatus').value = p.status || 'Ý tưởng';
  $('note').value = p.note || '';
  renderPostMetricsEditor(p.performance_metrics || defaultPostMetrics);
  $('imageInput').value = '';
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


function openMetaImportModal(){
  if(currentPlatform === 'all' && currentShowroom === 'all'){
    alert('Vui lòng chọn một tab showroom hoặc nền tảng trước khi nhập CSV Meta.');
    return;
  }
  metaImportContext = {
    platform:currentPlatform !== 'all' ? currentPlatform : 'Facebook',
    showroom:currentShowroom !== 'all' ? currentShowroom : null
  };
  metaImportRows = [];
  $('metaCsvInput').value = '';
  $('metaImportSummary').innerHTML = '<div class="empty-mini">Chưa chọn file CSV.</div>';
  $('metaImportPreview').innerHTML = '';
  $('btnRunMetaImport').disabled = true;
  $('metaImportDestination').innerHTML = `
    <b>Phạm vi nhập:</b>
    ${metaImportContext.showroom ? escapeHtml(showroomDisplayName(metaImportContext.showroom)) : 'Tất cả showroom'}
    · ${escapeHtml(metaImportContext.platform)}
  `;
  $('metaImportModal').classList.add('open');
}

function closeMetaImportModal(){ $('metaImportModal').classList.remove('open'); }

function parseCsvText(text){
  const rows = [];
  let row = [], value = '', quoted = false;
  const source = String(text || '').replace(/^\uFEFF/, '');
  for(let i = 0; i < source.length; i += 1){
    const char = source[i];
    if(char === '"'){
      if(quoted && source[i + 1] === '"'){ value += '"'; i += 1; }
      else quoted = !quoted;
    }else if(char === ',' && !quoted){
      row.push(value); value = '';
    }else if((char === '\n' || char === '\r') && !quoted){
      if(char === '\r' && source[i + 1] === '\n') i += 1;
      row.push(value); value = '';
      if(row.some(cell => cell !== '')) rows.push(row);
      row = [];
    }else value += char;
  }
  if(value || row.length){ row.push(value); rows.push(row); }
  if(rows.length < 2) return [];
  const headers = rows[0].map(header => header.trim());
  return rows.slice(1).map(cells => headers.reduce((record, header, index) => {
    record[header] = cells[index] || '';
    return record;
  }, {}));
}

function metaNumber(value){
  const number = Number(String(value || '').replace(/\s/g, '').replace(/,/g, ''));
  return Number.isFinite(number) ? number : 0;
}

function parseMetaPostDate(value){
  const match = String(value || '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if(!match) return '';
  return `${match[3]}-${String(match[1]).padStart(2,'0')}-${String(match[2]).padStart(2,'0')}`;
}

function parseMetaPostTime(value){
  const match = String(value || '').match(/\s(\d{1,2}):(\d{2})/);
  if(!match) return '';
  return `${String(match[1]).padStart(2,'0')}:${match[2]}`;
}

function metaTitle(value){
  return String(value || '').split(/\r?\n/).map(line => line.trim()).find(Boolean) || 'Bài đăng từ Meta';
}

function inferMetaShowroom(row){
  if(metaImportContext.showroom) return metaImportContext.showroom;
  const text = normalizeText(`${row['Tên Trang'] || ''} ${row['Tiêu đề'] || ''}`);
  return showroomNames.find(name => name !== 'HO' && text.includes(normalizeText(name))) || 'HO';
}

function metaMetrics(row){
  const metrics = {
    'Lượt xem':metaNumber(row['Lượt xem']),
    'Số người tiếp cận':metaNumber(row['Số người tiếp cận']),
    'Lượt tương tác':metaNumber(row['Cảm xúc, bình luận và lượt chia sẻ']),
    'Lượt thích và cảm xúc':metaNumber(row['Cảm xúc']),
    'Bình luận':metaNumber(row['Bình luận']),
    'Lượt chia sẻ':metaNumber(row['Lượt chia sẻ']),
    'Tổng lượt click':metaNumber(row['Tổng lượt click']),
    'Lượt click vào liên kết':metaNumber(row['Lượt click vào liên kết']),
    'Thời gian xem':metaNumber(row['Số Giây xem']),
    'Thời gian phát video trung bình':metaNumber(row['Số Giây xem trung bình']),
    'Thu nhập ước tính từ quảng cáo trong luồng':metaNumber(row['Thu nhập ước tính ((USD))']),
    'Lượt hiển thị quảng cáo':metaNumber(row['Lượt hiển thị quảng cáo'])
  };
  return Object.fromEntries(Object.entries(metrics).filter(([, amount]) => amount !== 0));
}

function titleSimilarity(left, right){
  const a = new Set(normalizeText(left).split(/\s+/).filter(word => word.length > 2));
  const b = new Set(normalizeText(right).split(/\s+/).filter(word => word.length > 2));
  if(!a.size || !b.size) return 0;
  return [...a].filter(word => b.has(word)).length / Math.min(a.size, b.size);
}

function findMetaPostMatch(row){
  const date = parseMetaPostDate(row['Thời gian đăng']);
  const title = metaTitle(row['Tiêu đề']);
  const metaId = String(row['ID bài viết'] || '');
  const candidates = posts.filter(post => {
    const matchPlatform = platformMatches(post.platform, metaImportContext.platform);
    const matchShowroom = !metaImportContext.showroom || showroomMatches(post.showroom, metaImportContext.showroom);
    return matchPlatform && matchShowroom;
  });
  const idMatch = candidates.find(post => metaId && String(post.post_link || '').includes(metaId));
  if(idMatch) return idMatch;
  const ranked = candidates.map(post => ({
    post,
    sameDate:Boolean(date && post.post_date === date),
    similarity:titleSimilarity(title, post.title || post.note || '')
  })).sort((a,b) => b.similarity - a.similarity);
  const best = ranked[0];
  if(!best) return null;
  if(best.sameDate && best.similarity >= 0.55) return best.post;
  if(best.similarity >= 0.9) return best.post;
  return null;
}

async function handleMetaCsvFile(event){
  const file = event.target.files && event.target.files[0];
  if(!file) return;
  try{
    const parsed = parseCsvText(await file.text());
    if(!parsed.length || !Object.prototype.hasOwnProperty.call(parsed[0], 'ID bài viết')){
      throw new Error('File không đúng định dạng báo cáo nội dung của Meta.');
    }
    metaImportRows = parsed.map(row => ({
      source:row,
      title:metaTitle(row['Tiêu đề']),
      postDate:parseMetaPostDate(row['Thời gian đăng']),
      postTime:parseMetaPostTime(row['Thời gian đăng']),
      showroom:inferMetaShowroom(row),
      metrics:metaMetrics(row),
      match:findMetaPostMatch(row)
    }));
    renderMetaImportPreview();
    $('btnRunMetaImport').disabled = false;
  }catch(err){
    metaImportRows = [];
    $('btnRunMetaImport').disabled = true;
    $('metaImportSummary').innerHTML = `<div class="meta-import-error">${escapeHtml(err.message)}</div>`;
  }
}

function renderMetaImportPreview(){
  const matched = metaImportRows.filter(item => item.match).length;
  $('metaImportSummary').innerHTML = `
    <div><b>${metaImportRows.length}</b><span>Dòng dữ liệu</span></div>
    <div><b>${matched}</b><span>Cập nhật bài có sẵn</span></div>
    <div><b>${metaImportRows.length - matched}</b><span>Bài chưa khớp</span></div>
  `;
  $('metaImportPreview').innerHTML = metaImportRows.map((item, index) => `
    <div class="meta-preview-row">
      <span>${index + 1}</span>
      <div>
        <b>${escapeHtml(item.title)}</b>
        <small>${formatDate(item.postDate)} · ${escapeHtml(item.showroom)}</small>
        ${item.match ? `<small class="meta-match-detail">Khớp với: ${escapeHtml(item.match.title || 'Bài không tiêu đề')}</small>` : ''}
      </div>
      <em class="${item.match ? 'is-match' : 'is-new'}">${item.match ? 'Cập nhật' : 'Tạo mới'}</em>
    </div>
  `).join('');
}

async function saveImportedMetaItem(item, createMissing){
  const metaId = String(item.source['ID bài viết'] || '');
  const permalink = item.source['Liên kết vĩnh viễn'] || (metaId ? `https://www.facebook.com/${metaId}` : '');
  if(item.match){
    let { error } = await supabaseClient.from('posts').update({ performance_metrics:item.metrics, post_link:permalink, post_time:item.postTime || null }).eq('id', item.match.id);
    if(error && isMissingPerformanceMetricsColumn(error)){
      ({ error } = await supabaseClient.from('posts').update({ post_link:permalink, post_time:item.postTime || null }).eq('id', item.match.id));
    }
    if(error) throw error;
    await saveFallbackPostMetrics({ ...item.match, post_link:permalink }, item.metrics);
    return 'updated';
  }
  if(!createMissing) return 'skipped';
  const payload = {
    platform:metaImportContext.platform, showroom:metaImportContext.showroom || item.showroom, title:item.title, post_date:item.postDate || null, post_time:item.postTime || null,
    status:'Đã đăng', note:item.source['Tiêu đề'] || '', post_link:permalink,
    image_url:'', image_urls:[], media_urls:[], thumbnail_url:'', performance_metrics:item.metrics
  };
  let { error } = await supabaseClient.from('posts').insert([payload]);
  if(error && isMissingPerformanceMetricsColumn(error)){
    const compatiblePayload = { ...payload };
    delete compatiblePayload.performance_metrics;
    ({ error } = await supabaseClient.from('posts').insert([compatiblePayload]));
  }
  if(error) throw error;
  await saveFallbackPostMetrics(payload, item.metrics);
  return 'created';
}

async function importMetaRows(){
  if(!metaImportRows.length) return;
  const button = $('btnRunMetaImport');
  button.disabled = true;
  button.innerText = 'Đang chuẩn bị...';
  const totals = { updated:0, created:0, skipped:0 };
  try{
    const createMissing = $('metaCreateMissing').checked;
    const matchedItems = metaImportRows.filter(item => item.match);
    const newItems = metaImportRows.filter(item => !item.match && createMissing);
    totals.skipped = metaImportRows.length - matchedItems.length - newItems.length;

    button.innerText = `Đang cập nhật 0/${matchedItems.length}...`;
    for(let index = 0; index < matchedItems.length; index += 10){
      const chunk = matchedItems.slice(index, index + 10);
      await Promise.all(chunk.map(async item => {
        const metaId = String(item.source['ID bài viết'] || '');
        const permalink = item.source['Liên kết vĩnh viễn'] || (metaId ? `https://www.facebook.com/${metaId}` : '');
        const { error } = await supabaseClient.from('posts').update({ post_link:permalink, post_time:item.postTime || null }).eq('id', item.match.id);
        if(error) throw error;
      }));
      totals.updated += chunk.length;
      button.innerText = `Đang cập nhật ${totals.updated}/${matchedItems.length}...`;
    }

    const newPayloads = newItems.map(item => {
      const metaId = String(item.source['ID bài viết'] || '');
      return {
        platform:metaImportContext.platform,
        showroom:metaImportContext.showroom || item.showroom,
        title:item.title,
        post_date:item.postDate || null,
        post_time:item.postTime || null,
        status:'Đã đăng',
        note:item.source['Tiêu đề'] || '',
        post_link:item.source['Liên kết vĩnh viễn'] || (metaId ? `https://www.facebook.com/${metaId}` : ''),
        image_url:'',
        image_urls:[],
        media_urls:[],
        thumbnail_url:''
      };
    });
    for(let index = 0; index < newPayloads.length; index += 50){
      const chunk = newPayloads.slice(index, index + 50);
      button.innerText = `Đang tạo ${totals.created}/${newPayloads.length}...`;
      const { error } = await supabaseClient.from('posts').insert(chunk);
      if(error) throw error;
      totals.created += chunk.length;
    }

    button.innerText = 'Đang lưu KPI...';
    const metricEntries = [
      ...matchedItems.map(item => ({ post:item.match, metrics:item.metrics })),
      ...newItems.map((item, index) => ({ post:newPayloads[index], metrics:item.metrics }))
    ];
    await saveFallbackPostMetricsBatch(metricEntries);

    closeMetaImportModal();
    await loadPosts();
    alert(`Đã nhập Meta thành công: ${totals.updated} bài cập nhật, ${totals.created} bài tạo mới, ${totals.skipped} bài bỏ qua.`);
  }catch(err){
    console.error(err);
    alert('Lỗi nhập dữ liệu Meta: ' + err.message);
  }finally{
    button.disabled = false;
    button.innerText = 'Nhập dữ liệu';
  }
}

function getAllShowroomReportPosts(month){
  return posts.filter(post => {
    if(month && getMonthKey(post.post_date) !== month) return false;
    const assigned = showroomList(post.showroom);
    return assigned.some(showroom => reportShowroomNames.includes(showroom));
  });
}

function exportPdfReport(){
  if(currentShowroom !== 'all' || currentPlatform !== 'all'){
    alert('Xuất PDF chỉ áp dụng tại tab Tất cả showroom.');
    return;
  }
  const month = $('monthFilter').value;
  if(!month){
    alert('Vui lòng chọn tháng trước khi xuất PDF.');
    return;
  }
  const source = getAllShowroomReportPosts(month);
  if(!source.length){
    alert('Không có dữ liệu trong tháng đã chọn để xuất PDF.');
    return;
  }
  const periodLabel = `Tháng ${Number(month.slice(5,7))}/${month.slice(0,4)}`;
  const units = reportShowroomNames.map(showroom => getShowroomCommunicationTotals(showroom, month));
  const total = units.reduce((acc, row) => {
    acc.posts += row.posts;
    acc.reach += row.reach;
    acc.engagement += row.engagement;
    acc.follow += row.follow;
    return acc;
  }, { posts:0, reach:0, engagement:0, follow:0 });
  const platformNames = ['Facebook','TikTok','Website'];
  const platformRows = platformNames.map(platform => {
    const items = source.filter(post => platformMatches(post.platform, platform));
    const reach = sumPostAliases(items, ['Số người tiếp cận','Reach']);
    const engagement = totalEngagementForPosts(items);
    return { platform, posts:items.length, reach, engagement, rate:reach ? engagement / reach * 100 : 0 };
  });
  const topPosts = source
    .map(post => ({ post, value:getPostPerformanceValue(post, '__engagement__') || heatmapMetricValue(post, 'Số người tiếp cận') }))
    .sort((a,b) => b.value - a.value)
    .slice(0, 5);
  const reportWindow = window.open('', '_blank');
  if(!reportWindow){
    alert('Trình duyệt đang chặn cửa sổ báo cáo. Vui lòng cho phép pop-up rồi thử lại.');
    return;
  }
  reportWindow.opener = null;
  const unitRows = units.map(row => `<tr><td>${escapeHtml(showroomDisplayName(row.showroom))}</td><td>${formatMetricNumber(row.reach)}</td><td>${formatMetricNumber(row.engagement)}</td><td>${row.reach ? row.engagementRate.toLocaleString('vi-VN',{maximumFractionDigits:2}) + '%' : '--'}</td><td>${row.posts}</td></tr>`).join('');
  const platformTable = platformRows.map(row => `<tr><td>${row.platform}</td><td>${formatMetricNumber(row.reach)}</td><td>${formatMetricNumber(row.engagement)}</td><td>${row.rate ? row.rate.toLocaleString('vi-VN',{maximumFractionDigits:2}) + '%' : '--'}</td><td>${row.posts}</td></tr>`).join('');
  const topRows = topPosts.map((item,index) => `<tr><td><span class="rank">${index+1}</span></td><td><b>${escapeHtml(item.post.title || 'Bài đăng không tiêu đề')}</b></td><td>${escapeHtml(item.post.platform || '-')}</td><td>${escapeHtml(item.post.showroom || '-')}</td><td><b>${formatMetricNumber(item.value)}</b></td></tr>`).join('');
  const postRows = source.slice(0, 100).map((post,index) => `<tr><td>${index+1}</td><td>${formatDate(post.post_date)}</td><td>${escapeHtml(post.platform || '-')}</td><td>${escapeHtml(post.showroom || '-')}</td><td>${escapeHtml(post.title || '-')}</td></tr>`).join('');
  const maxUnitReach = Math.max(...units.map(row => row.reach), 1);
  const maxPlatformReach = Math.max(...platformRows.map(row => row.reach), 1);
  const unitChart = units.map((row,index) => `<div class="bar-row"><span>${escapeHtml(showroomDisplayName(row.showroom))}</span><div class="bar-track"><i style="width:${row.reach ? Math.max(3,row.reach/maxUnitReach*100) : 0}%;--bar-color:${['#22d3ee','#3b82f6','#8b5cf6','#10b981','#f59e0b','#ec4899'][index]}"></i></div><b>${formatMetricNumber(row.reach)}</b></div>`).join('');
  const platformChart = platformRows.map((row,index) => `<div class="bar-row"><span>${row.platform}</span><div class="bar-track"><i style="width:${row.reach ? Math.max(3,row.reach/maxPlatformReach*100) : 0}%;--bar-color:${['#2563eb','#111827','#06b6d4'][index]}"></i></div><b>${formatMetricNumber(row.reach)}</b></div>`).join('');
  reportWindow.document.write(`<!doctype html><html lang="vi"><head><meta charset="utf-8"><title>Báo cáo truyền thông ${periodLabel}</title>
  <style>
    @page{size:A4;margin:11mm}*{box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}
    :root{--navy:#071629;--panel:#0d223d;--cyan:#22d3ee;--blue:#2563eb;--ink:#132238;--muted:#64748b;--line:#dce6f0}
    body{margin:0;font-family:Inter,Segoe UI,Arial,sans-serif;color:var(--ink);background:#eef4f8;font-size:9.5px}
    .report-page{background:#fff;min-height:275mm;padding:0}
    header{position:relative;overflow:hidden;padding:22px 24px 19px;background:linear-gradient(125deg,#061426 0%,#0b2a4d 58%,#0e7490 100%);color:#fff;border-radius:0 0 16px 16px;margin-bottom:14px}
    header:after{content:"";position:absolute;width:190px;height:190px;border:36px solid rgba(34,211,238,.11);border-radius:50%;right:-60px;top:-90px}
    .brand-row{display:flex;align-items:center;justify-content:space-between;position:relative;z-index:1}
    .brand{display:flex;align-items:center;gap:9px}.brand-mark{display:grid;place-items:center;width:31px;height:31px;border-radius:9px;background:linear-gradient(145deg,#22d3ee,#2563eb);font-weight:900}
    header small{letter-spacing:1.5px;text-transform:uppercase;color:#a5f3fc;font-weight:700}.period-badge{padding:6px 10px;border:1px solid rgba(165,243,252,.35);border-radius:999px;background:rgba(6,20,38,.28);font-weight:700}
    header h1{position:relative;z-index:1;margin:17px 0 5px;font-size:23px;letter-spacing:-.5px}header p{position:relative;z-index:1;margin:0;color:#cbdff4}
    .content{padding:0 14px 14px}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:12px}
    .summary div{position:relative;overflow:hidden;padding:12px;border:1px solid #dce8f2;border-radius:11px;background:linear-gradient(145deg,#fff,#f3f8fc);box-shadow:0 4px 12px rgba(15,50,80,.06)}
    .summary div:before{content:"";position:absolute;left:0;top:0;bottom:0;width:3px;background:linear-gradient(#22d3ee,#2563eb)}
    .summary span{display:block;color:var(--muted);font-size:8px;text-transform:uppercase;letter-spacing:.4px;font-weight:700}.summary b{display:block;margin-top:6px;font-size:18px;color:#0a3158}
    .section{margin-top:11px;padding:12px;border:1px solid var(--line);border-radius:12px;background:#fff;box-shadow:0 3px 12px rgba(15,50,80,.05);page-break-inside:avoid}
    .section-head{display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:10px}.section-head h2{font-size:13px;margin:0;color:#0a3158}.section-head p{margin:3px 0 0;color:var(--muted);font-size:8px}.section-tag{padding:4px 7px;border-radius:6px;background:#e6f8fb;color:#08778b;font-size:7.5px;font-weight:800;text-transform:uppercase}
    .dashboard-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.chart-card{padding:10px;border-radius:9px;background:#f5f9fc;border:1px solid #e2ebf3}.chart-card h3{margin:0 0 9px;font-size:9px;color:#334155}
    .bar-row{display:grid;grid-template-columns:82px 1fr 52px;align-items:center;gap:7px;margin:7px 0}.bar-row>span{color:#475569;font-size:7.8px}.bar-row>b{text-align:right;color:#0f3b62;font-size:8px}
    .bar-track{height:8px;border-radius:99px;background:#e1eaf2;overflow:hidden}.bar-track i{display:block;height:100%;border-radius:99px;background:var(--bar-color)}
    table{width:100%;border-collapse:separate;border-spacing:0;page-break-inside:auto}thead{display:table-header-group}tr{page-break-inside:avoid}
    th{padding:7px 8px;background:#0b2746;color:#dff8ff;text-align:left;font-size:7.5px;text-transform:uppercase;letter-spacing:.35px}
    th:first-child{border-radius:7px 0 0 0}th:last-child{border-radius:0 7px 0 0}td{padding:7px 8px;border-bottom:1px solid #e5edf4;vertical-align:top;color:#334155}tbody tr:nth-child(even){background:#f6f9fc}tbody tr:last-child td{border-bottom:0}
    .rank{display:inline-grid;place-items:center;width:19px;height:19px;border-radius:6px;background:#dff7fb;color:#08778b;font-weight:900}
    .page-break{break-before:page;page-break-before:always}.note{margin:12px 2px 0;color:#64748b;font-size:8px;line-height:1.5}
    .footer{margin-top:16px;padding:9px 2px 0;border-top:1px solid #dbe5ef;color:#64748b;display:flex;justify-content:space-between}
    @media print{body{background:#fff}.no-print{display:none}.report-page{min-height:auto}.section{box-shadow:none}}
    .no-print{position:fixed;z-index:20;right:18px;top:18px;padding:10px 14px;border:0;border-radius:8px;background:#22d3ee;color:#062033;font-weight:bold;box-shadow:0 8px 24px rgba(6,20,38,.25);cursor:pointer}
  </style></head><body>
  <button class="no-print" onclick="window.print()">Lưu thành PDF</button>
  <main class="report-page">
    <header><div class="brand-row"><div class="brand"><div class="brand-mark">B</div><div><small>BYD NEG</small><div>Marketing Intelligence</div></div></div><div class="period-badge">${periodLabel}</div></div><h1>Social Media Performance Report</h1><p>Tổng hợp hiệu quả truyền thông của Trụ sở chính và 5 showroom</p></header>
    <div class="content">
      <section class="summary"><div><span>Tổng Reach</span><b>${formatMetricNumber(total.reach)}</b></div><div><span>Tổng Engagement</span><b>${formatMetricNumber(total.engagement)}</b></div><div><span>Tổng bài đăng</span><b>${formatMetricNumber(total.posts)}</b></div><div><span>Followers tăng</span><b>${formatMetricNumber(total.follow)}</b></div></section>
      <section class="section"><div class="section-head"><div><h2>Executive Overview</h2><p>So sánh Reach theo đơn vị và nền tảng</p></div><span class="section-tag">Power BI View</span></div><div class="dashboard-grid"><div class="chart-card"><h3>Reach theo đơn vị</h3>${unitChart}</div><div class="chart-card"><h3>Reach theo nền tảng</h3>${platformChart}</div></div></section>
      <section class="section"><div class="section-head"><div><h2>Showroom Performance</h2><p>So sánh chi tiết 6 đơn vị</p></div><span class="section-tag">6 đơn vị</span></div><table><thead><tr><th>Đơn vị</th><th>Reach</th><th>Engagement</th><th>Tỷ lệ</th><th>Bài đăng</th></tr></thead><tbody>${unitRows}</tbody></table></section>
      <section class="section"><div class="section-head"><div><h2>Platform Performance</h2><p>Hiệu quả theo kênh truyền thông</p></div><span class="section-tag">Channel mix</span></div><table><thead><tr><th>Nền tảng</th><th>Reach</th><th>Engagement</th><th>Tỷ lệ</th><th>Bài đăng</th></tr></thead><tbody>${platformTable}</tbody></table></section>
      <section class="section"><div class="section-head"><div><h2>Top Performing Posts</h2><p>5 bài đăng nổi bật nhất trong kỳ</p></div><span class="section-tag">Top 5</span></div><table><thead><tr><th>#</th><th>Tiêu đề</th><th>Nền tảng</th><th>Showroom</th><th>Hiệu quả</th></tr></thead><tbody>${topRows}</tbody></table></section>
      <section class="section page-break"><div class="section-head"><div><h2>Post Details</h2><p>Danh sách bài đăng thuộc kỳ báo cáo</p></div><span class="section-tag">${source.length} bài</span></div><table><thead><tr><th>#</th><th>Ngày</th><th>Nền tảng</th><th>Showroom</th><th>Tiêu đề</th></tr></thead><tbody>${postRows}</tbody></table></section>
      <p class="note">Báo cáo được tổng hợp từ dữ liệu hiện có của 6 đơn vị trong tháng được chọn. Danh sách chi tiết hiển thị tối đa 100 bài; dùng Xuất Excel để lấy toàn bộ dữ liệu.</p>
      <div class="footer"><span>SocialHub · BYD NEG</span><span>Ngày xuất: ${new Date().toLocaleDateString('vi-VN')}</span></div>
    </div>
  </main>
  <script>setTimeout(()=>window.print(),500)<\/script></body></html>`);
  reportWindow.document.close();
}

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
