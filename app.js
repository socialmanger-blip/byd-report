import { createClient } from "https://esm.sh/@supabase/supabase-js@2.110.2";

const config = window.BYD_CONFIG || {};
const configured = config.supabaseUrl?.startsWith("https://") && !config.supabaseUrl.includes("DAN_") && config.supabaseKey && !config.supabaseKey.includes("DAN_");
const $ = (id) => document.getElementById(id);
const show = (id) => $(id).classList.remove("hidden");
const hide = (id) => $(id).classList.add("hidden");

if (!configured) {
  show("setup");
} else {
  const supabase = createClient(config.supabaseUrl, config.supabaseKey);
  const defs = {
    provinces: { label:"Tỉnh & địa bàn", singular:"tỉnh", cols:["name","population","urban_rate","ev_readiness","leads_6m","deliveries_6m"], fields:[
      ["name","Tên tỉnh","text",true],["current_province","Tỉnh pháp lý hiện hành","text"],["population","Dân số (triệu)","number"],["urban_rate","Tỷ lệ đô thị (%)","number"],["grdp_per_capita","GRDP/người (triệu VNĐ)","number"],["households","Số hộ (nghìn)","number"],["cars_estimate","Xe con ước tính","number"],["ev_readiness","Sẵn sàng EV","select",false,["Rất cao","Cao","Trung bình - cao","Trung bình","Thấp"]],["leads_6m","Khách tiềm năng 6 tháng","number"],["deliveries_6m","Xe giao 6 tháng","number"],["has_showroom","Có showroom","boolean"],["commercial_insight","Nhận định thương mại","textarea"] ]},
    showrooms: { label:"Showroom", singular:"showroom", cols:["name","showroom_type","address","contact_name","phone","charging_spec"], fields:[
      ["name","Tên showroom","text",true],["showroom_type","Loại hình","select",false,["1S","2S","3S","4S"]],["address","Địa chỉ","textarea"],["contact_name","Người liên hệ","text"],["phone","Số điện thoại","text"],["opening_hours","Giờ hoạt động","text"],["charging_spec","Thông số sạc","text"],["service_area","Địa bàn phục vụ","textarea"] ]},
    chargers: { label:"Trạm sạc", singular:"trạm sạc", cols:["name","province_city","area","operator","charger_type","power_kw","ports","status"], fields:[
      ["name","Tên trạm sạc","text",true],["address","Địa chỉ","textarea",true],["province_city","Tỉnh/Thành","text",true],["area","Khu vực","text"],["operator","Nhà vận hành","text"],["charger_type","Loại sạc (AC/DC)","select",true,["AC","DC","AC & DC"]],["power_kw","Công suất (kW)","number"],["ports","Số cổng sạc","number"],["price_note","Giá (nếu có)","text"],["status","Tình trạng","select",false,["Đang hoạt động","Cần xác minh","Tạm ngưng","Sắp khai trương"]],["google_maps_url","Google Maps","text"],["notes","Ghi chú","textarea"] ]},
    models: { label:"Mẫu xe", singular:"mẫu xe", cols:["name","powertrain","price_from","market_role","target_customer"], fields:[
      ["name","Tên mẫu xe","text",true],["powertrain","Hệ truyền động","select",false,["BEV","PHEV","HEV"]],["price_from","Giá từ (triệu VNĐ)","number"],["price_to","Giá đến (triệu VNĐ)","number"],["market_role","Vai trò thị trường","textarea"],["target_customer","Khách hàng mục tiêu","textarea"],["sales_barrier","Rào cản bán hàng","textarea"],["charging_message","Thông điệp sạc","textarea"],["competitors","Đối thủ","textarea"] ]},
    marketing_plans: { label:"Marketing", singular:"kế hoạch", cols:["province_name","priority","hero_models","budget_low","budget_high"], fields:[
      ["province_name","Tỉnh / khu vực","text",true],["priority","Mức ưu tiên","select",false,["Cao nhất","Cao","Trung bình","Trung bình - thấp","Thấp"]],["hero_models","Mẫu xe chủ lực","text"],["budget_low","Ngân sách từ (triệu VNĐ)","number"],["budget_high","Ngân sách đến (triệu VNĐ)","number"],["campaign_note","Ghi chú chiến dịch","textarea"] ]}
  };
  const labels = Object.values(defs).flatMap(d=>d.fields).reduce((a,f)=>({...a,[f[0]]:f[1]}),{});
  let data = Object.fromEntries(Object.keys(defs).map(k=>[k,[]]));
  let current = "overview", editRow = null, deleteRow = null;

  async function init() {
    const { data:{ session } } = await supabase.auth.getSession();
    session ? enter(session) : show("login");
    supabase.auth.onAuthStateChange((_e,s)=>s ? enter(s) : exit());
  }
  async function enter(session) {
    hide("login"); hide("setup"); show("app");
    $("userEmail").textContent=session.user.email||""; $("avatar").textContent=(session.user.email||"A")[0].toUpperCase();
    await loadAll();
  }
  function exit(){ hide("app"); show("login"); }
  async function loadAll(){
    $("refresh").textContent="↻ Đang tải…";
    for(const key of Object.keys(defs)){
      const {data:rows,error}=await supabase.from(key).select("*").order(key==="provinces"?"name":"created_at");
      if(error){ notify(error.message,true); continue; } data[key]=rows||[]; $("count-"+key).textContent=data[key].length;
    }
    $("refresh").textContent="↻ Đồng bộ"; renderOverview(); if(current!=="overview") renderTable();
  }
  function renderOverview(){
    const provinces=data.provinces, pop=provinces.reduce((a,r)=>a+Number(r.population||0),0), leads=provinces.reduce((a,r)=>a+Number(r.leads_6m||0),0), deliveries=provinces.reduce((a,r)=>a+Number(r.deliveries_6m||0),0), budget=data.marketing_plans.reduce((a,r)=>a+(Number(r.budget_low||0)+Number(r.budget_high||0))/2,0);
    $("kpis").innerHTML=[["Dân số toàn vùng",pop.toLocaleString("vi-VN",{maximumFractionDigits:1})+" tr","13 tỉnh địa giới cũ"],["Khách tiềm năng · 6 tháng",leads.toLocaleString("vi-VN"),"Ước tính lập kế hoạch"],["Xe dự kiến giao",deliveries.toLocaleString("vi-VN"),"Theo dữ liệu hiện tại"],["Ngân sách marketing",Math.round(budget).toLocaleString("vi-VN")+" tr","Mức trung bình kế hoạch"]].map((x,i)=>`<article class="kpi ${i===1?'accent':''}"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></article>`).join("");
    const top=[...provinces].sort((a,b)=>Number(b.leads_6m)-Number(a.leads_6m)).slice(0,6), max=Math.max(...top.map(x=>Number(x.leads_6m)),1);
    $("leadChart").innerHTML=top.map(r=>`<div><span>${esc(r.name)}</span><i><b style="width:${Number(r.leads_6m)/max*100}%"></b></i><strong>${Number(r.leads_6m).toLocaleString("vi-VN")}</strong></div>`).join("");
    $("coverage").innerHTML=Object.entries(defs).map(([k,d])=>`<button data-open="${k}"><span>${data[k].length}</span><small>${d.label}</small><b>›</b></button>`).join("");
    document.querySelectorAll("[data-open]").forEach(b=>b.onclick=()=>switchView(b.dataset.open));
  }
  function switchView(view){
    current=view; document.querySelectorAll("#nav button").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
    if(view==="overview"){show("overviewView");hide("tableView");$("pageTitle").textContent="Tổng quan điều hành";} else {hide("overviewView");show("tableView");$("pageTitle").textContent=defs[view].label;$("search").value="";renderTable();}
    document.body.classList.remove("nav-open");
  }
  function renderTable(){
    const def=defs[current], q=$("search").value.toLowerCase(), rows=data[current].filter(r=>Object.values(r).some(v=>String(v??"").toLowerCase().includes(q)));
    const localLabels=def.fields.reduce((a,f)=>({...a,[f[0]]:f[1]}),{});
    $("rowCount").textContent=rows.length+" bản ghi"; $("tableHead").innerHTML=`<tr>${def.cols.map(c=>`<th>${localLabels[c]||c}</th>`).join("")}<th>Thao tác</th></tr>`;
    $("tableBody").innerHTML=rows.length?rows.map(r=>`<tr>${def.cols.map(c=>`<td class="${c==='name'||c==='province_name'?'main-cell':''}">${fmt(c,r[c])}</td>`).join("")}<td class="actions"><button data-edit="${r.id}">✎</button><button data-delete="${r.id}">♲</button></td></tr>`).join(""):`<tr><td colspan="${def.cols.length+1}" class="empty">Chưa có dữ liệu.</td></tr>`;
    document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openDrawer(data[current].find(r=>r.id===b.dataset.edit)));
    document.querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>askDelete(data[current].find(r=>r.id===b.dataset.delete)));
  }
  function openDrawer(row=null){
    editRow=row; $("drawerKicker").textContent=row?"CHỈNH SỬA":"THÊM MỚI"; $("drawerTitle").textContent=(row?"Cập nhật ":"Thêm ")+defs[current].singular;
    $("formFields").innerHTML=defs[current].fields.map(f=>fieldHtml(f,row?.[f[0]])).join(""); show("overlay");show("drawer");hide("formError");
  }
  function fieldHtml(f,value){const [key,label,type,required,options]=f, req=required?"required":""; if(type==="textarea")return`<label class="wide">${label}<textarea name="${key}" rows="3">${esc(value??"")}</textarea></label>`;if(type==="select")return`<label>${label}<select name="${key}"><option value="">Chọn…</option>${options.map(o=>`<option ${value===o?'selected':''}>${o}</option>`).join("")}</select></label>`;if(type==="boolean")return`<label>${label}<select name="${key}"><option value="true" ${value===true?'selected':''}>Có</option><option value="false" ${value!==true?'selected':''}>Không</option></select></label>`;return`<label>${label}${required?' *':''}<input name="${key}" type="${type}" step="any" value="${esc(value??"")}" ${req}></label>`;}
  function closeDrawer(){hide("overlay");hide("drawer");}
  async function save(e){e.preventDefault();const fd=new FormData(e.target),payload={};defs[current].fields.forEach(f=>{let v=fd.get(f[0]);if(f[2]==="number")v=v===""?null:Number(v);if(f[2]==="boolean")v=v==="true";payload[f[0]]=v;});const result=editRow?await supabase.from(current).update(payload).eq("id",editRow.id):await supabase.from(current).insert(payload);if(result.error){$("formError").textContent=result.error.message;show("formError");return;}closeDrawer();notify(editRow?"Đã cập nhật dữ liệu.":"Đã thêm dữ liệu.");await loadAll();}
  function askDelete(row){deleteRow=row;$("confirmText").innerHTML=`Bạn sắp xoá <strong>${esc(row.name||row.province_name||"bản ghi này")}</strong>.`;show("overlay");show("confirmModal");}
  async function remove(){const {error}=await supabase.from(current).delete().eq("id",deleteRow.id);hide("overlay");hide("confirmModal");if(error)return notify(error.message,true);notify("Đã xoá dữ liệu.");await loadAll();}
  function exportCsv(){const def=defs[current],fields=def.fields.map(f=>f[0]),localLabels=def.fields.reduce((a,f)=>({...a,[f[0]]:f[1]}),{}),quote=v=>`"${String(v??"").replaceAll('"','""')}"`,csv="\uFEFF"+fields.map(k=>quote(localLabels[k])).join(",")+"\n"+data[current].map(r=>fields.map(k=>quote(r[k])).join(",")).join("\n"),a=document.createElement("a");a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));a.download=`byd-neg-${current}.csv`;a.click();}
  function fmt(k,v){if(v===null||v===undefined||v==="")return"—";if(k==="google_maps_url")return`<a href="${esc(v)}" target="_blank" rel="noopener noreferrer">Mở bản đồ ↗</a>`;if(typeof v==="boolean")return v?"Có":"Không";if(typeof v==="number")return v.toLocaleString("vi-VN")+(k==="urban_rate"?"%":"");return esc(v);}
  function esc(v){return String(v).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
  function notify(msg,bad=false){$("notice").textContent=msg;$("notice").classList.toggle("bad",bad);show("notice");setTimeout(()=>hide("notice"),3000);}
  $("loginForm").onsubmit=async e=>{e.preventDefault();hide("loginError");const {error}=await supabase.auth.signInWithPassword({email:$("email").value,password:$("password").value});if(error){$("loginError").textContent="Email hoặc mật khẩu không đúng.";show("loginError");}};
  $("logout").onclick=()=>supabase.auth.signOut(); $("refresh").onclick=loadAll; $("search").oninput=renderTable; $("addBtn").onclick=()=>openDrawer(); $("closeDrawer").onclick=closeDrawer; $("cancelEdit").onclick=closeDrawer; $("overlay").onclick=()=>{closeDrawer();hide("confirmModal");}; $("editForm").onsubmit=save; $("cancelDelete").onclick=()=>{hide("overlay");hide("confirmModal");}; $("confirmDelete").onclick=remove; $("exportBtn").onclick=exportCsv; $("menuBtn").onclick=()=>document.body.classList.toggle("nav-open");
  document.querySelectorAll("#nav button").forEach(b=>b.onclick=()=>switchView(b.dataset.view));
  init();
}
