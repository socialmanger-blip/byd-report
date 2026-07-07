let posts = [];
let currentPlatform = 'all';
let currentShowroom = 'all';
let editingId = null;
let editingImageUrls = [];

const defaultExportFields = [
  { key:'stt', label:'STT', checked:true },
  { key:'platform', label:'Nền tảng', checked:true },
  { key:'showroom', label:'Showroom/Page', checked:true },
  { key:'title', label:'Tiêu đề', checked:true },
  { key:'post_date', label:'Ngày đăng', checked:true },
  { key:'week', label:'Tuần trong tháng', checked:true },
  { key:'status', label:'Trạng thái', checked:true },
  { key:'note', label:'Ghi chú/Caption', checked:true },
  { key:'image_urls', label:'Ảnh', checked:true },
  { key:'created_at', label:'Ngày tạo', checked:false }
];
let exportFields = JSON.parse(JSON.stringify(defaultExportFields));

const $ = (id) => document.getElementById(id);

window.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  setDefaultMonth();
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
  $('searchInput').addEventListener('input', renderPosts);
  $('statusFilter').addEventListener('change', renderPosts);
  $('monthFilter').addEventListener('change', renderPosts);
  $('btnCloseImage').addEventListener('click', closeImage);
  $('imageModal').addEventListener('click', (e)=>{ if(e.target.id==='imageModal') closeImage(); });
  $('postModal').addEventListener('click', (e)=>{ if(e.target.id==='postModal') closeModal(); });
  $('exportModal').addEventListener('click', (e)=>{ if(e.target.id==='exportModal') closeExportModal(); });
  $('imageInput').addEventListener('change', previewImages);
  document.querySelectorAll('.nav').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentPlatform = btn.dataset.platform;
      renderPosts();
    });
  });
  document.querySelectorAll('.showroom-nav').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.showroom-nav').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      currentShowroom = btn.dataset.showroom;
      renderPosts();
    });
  });
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
  setStatus('Đã kết nối Supabase. Dữ liệu đang lưu online.', true);
  renderPosts();
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

function getImageUrls(post){
  if(Array.isArray(post.image_urls) && post.image_urls.length) return post.image_urls.filter(Boolean);
  if(post.image_url) return [post.image_url];
  return [];
}

function renderImages(post){
  const urls = getImageUrls(post);
  if(urls.length === 0) return '-';
  return `<div class="thumb-list">${urls.map(url => `
    <img class="thumb" src="${escapeHtml(url)}" onclick="showImage('${escapeJs(url)}')">
  `).join('')}</div>`;
}


function getFilteredPosts(){
  const keyword = $('searchInput').value.toLowerCase().trim();
  const status = $('statusFilter').value;
  return posts.filter(p => {
    const matchPlatform = platformMatches(p.platform, currentPlatform);
    const matchStatus = status === 'all' || p.status === status;
    const matchShowroom = showroomMatches(p.showroom, currentShowroom);
    const text = `${p.title||''} ${p.note||''} ${p.showroom||''} ${p.platform||''}`.toLowerCase();
    return matchPlatform && matchStatus && matchShowroom && text.includes(keyword);
  });
}

function renderPosts(){
  const result = getFilteredPosts();
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
      <td><b>${escapeHtml(p.title || '-')}</b></td>
      <td>${formatDate(p.post_date)}</td>
      <td>${escapeHtml(p.status || '-')}</td>
      <td>${escapeHtml(p.note || '-')}</td>
      <td>
        <button class="action-btn" onclick="editPost(${p.id})">Sửa</button>
        <button class="action-btn delete" onclick="deletePost(${p.id})">Xóa</button>
      </td>
    </tr>
  `).join('');
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
  $(targetId).innerHTML = entries.map(([name, count]) => `
    <div class="stat-row">
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

function openModal(){
  clearForm();
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
  $('modalTitle').innerText = 'Tạo bài mới';
  setPlatformChecks('Facebook');
  setShowroomChecks('HO');
  $('title').value = '';
  $('postDate').value = '';
  $('postStatus').value = 'Ý tưởng';
  $('note').value = '';
  $('imageInput').value = '';
  $('previewWrap').innerHTML = '';
}

function previewImages(){
  const files = Array.from($('imageInput').files || []);
  $('previewWrap').innerHTML = '';
  if(files.length === 0) return;
  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = document.createElement('img');
      img.src = e.target.result;
      img.className = 'preview';
      img.style.display = 'block';
      $('previewWrap').appendChild(img);
    };
    reader.readAsDataURL(file);
  });
}

function renderExistingPreview(urls){
  $('previewWrap').innerHTML = urls.map(url => `<img src="${escapeHtml(url)}" class="preview" style="display:block">`).join('');
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
    const files = Array.from($('imageInput').files || []);
    if(files.length){ imageUrls = await uploadImages(files); }

    const payload = {
      platform: selectedPlatforms.join(', '),
      showroom: selectedShowrooms.join(', '),
      title,
      post_date: $('postDate').value || null,
      status: $('postStatus').value,
      note: $('note').value.trim(),
      image_url: imageUrls[0] || '',
      image_urls: imageUrls
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
    urls.push(await uploadImage(file));
  }
  return urls;
}

async function uploadImage(file){
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  const path = `posts/${safeName}`;
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
  $('modalTitle').innerText = 'Sửa bài đăng';
  setPlatformChecks(p.platform || 'Facebook');
  setShowroomChecks(p.showroom || 'HO');
  $('title').value = p.title || '';
  $('postDate').value = p.post_date || '';
  $('postStatus').value = p.status || 'Ý tưởng';
  $('note').value = p.note || '';
  $('imageInput').value = '';
  renderExistingPreview(editingImageUrls);
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
  if(key === 'week') {
    const week = getWeekOfMonth(post.post_date);
    return week ? `Tuần ${Math.min(week, 5)}` : '';
  }
  if(key === 'image_urls') return getImageUrls(post).join('\n');
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
const source = getExportSourcePosts()
  .slice()
  .sort((a, b) => {
    if (!a.post_date && !b.post_date) return 0;
    if (!a.post_date) return 1;
    if (!b.post_date) return -1;
    return new Date(a.post_date) - new Date(b.post_date);
  });  if(source.length === 0){ alert('Không có dữ liệu để xuất'); return; }

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
