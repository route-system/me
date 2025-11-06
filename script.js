// script.js — logic for route-system
const API_URL = 'https://script.google.com/macros/s/AKfycbyl_a3jSysX9rP6JbyZGXnfEz9Tkx2G6kSX5dUpqM19e81QeAERMvGXR9n9JaKoRkzU/exec';
let map, directionsService, directionsRenderer, markers = [];

const nameInput = ()=>document.getElementById('name');
const phoneInput = ()=>document.getElementById('phone');
const noteInput = ()=>document.getElementById('note');
const latInput = ()=>document.getElementById('lat');
const lngInput = ()=>document.getElementById('lng');
const statusMsg = ()=>document.getElementById('statusMsg');
const resultTbody = ()=>document.querySelector('#resultTable tbody');

function initMap(){
  map = new google.maps.Map(document.getElementById('map'), { center:{lat:13.7563,lng:100.5018}, zoom:11 });
  directionsService = new google.maps.DirectionsService();
  directionsRenderer = new google.maps.DirectionsRenderer({map: map});
}
window.initMap = initMap;

function showStatus(msg, type='info'){
  const el = statusMsg(); el.textContent = msg; el.className = 'status ' + type;
  setTimeout(()=>{ if (el.textContent === msg) el.textContent = ''; }, 5000);
}

async function apiGet(){
  const res = await fetch(API_URL, { method:'GET', mode:'cors' });
  if (!res.ok) throw new Error('HTTP '+res.status);
  return await res.json();
}

async function apiPost(payload){
  const res = await fetch(API_URL, { method:'POST', mode:'cors', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
  if (!res.ok) throw new Error('HTTP '+res.status);
  return await res.json();
}

async function saveData(){
  const payload = {
    name: nameInput().value.trim(),
    phone: phoneInput().value.trim(),
    note: noteInput().value.trim(),
    lat: latInput().value.trim(),
    lng: lngInput().value.trim()
  };
  if (!payload.name) { showStatus('กรุณากรอกชื่อ', 'error'); return; }
  try{
    await apiPost(payload);
    showStatus('บันทึกเรียบร้อย', 'success');
    await refreshAll();
  }catch(err){ console.error(err); showStatus('บันทึกไม่สำเร็จ: '+err.message, 'error'); }
}

async function refreshAll(){
  try{
    const rows = await apiGet();
    renderTable(rows);
    document.getElementById('count').textContent = `📍 จำนวนพิกัดทั้งหมด: ${rows.length}`;
    renderMarkers(rows);
    updateDashboard(rows);
  }catch(err){ console.error(err); showStatus('ดึงข้อมูลไม่สำเร็จ: '+err.message,'error'); }
}

function clearMarkers(){ markers.forEach(m=>m.setMap(null)); markers = []; }

function renderMarkers(rows){
  clearMarkers();
  rows.forEach(r=>{ if (r.lat && r.lng){ const m = new google.maps.Marker({position:{lat: parseFloat(r.lat), lng: parseFloat(r.lng)}, map, title: r.name}); markers.push(m); } });
  if (markers.length>0) map.setCenter(markers[0].getPosition());
}

function renderTable(rows){
  const tbody = resultTbody(); tbody.innerHTML='';
  rows.forEach((r,i)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${i+1}</td>
      <td>${escapeHtml(r.name)}</td>
      <td>${escapeHtml(r.phone||'')}</td>
      <td>${escapeHtml(r.status||'ยังไม่ส่ง')}</td>
      <td>${escapeHtml(r.timestamp||'')}</td>
      <td>
        <button data-name="${escapeAttr(r.name)}" class="btn-deliver">ส่งแล้ว</button>
        <button data-name="${escapeAttr(r.name)}" class="btn-delete">ลบ</button>
      </td>`;
    tbody.appendChild(tr);
  });
  tbody.querySelectorAll('.btn-deliver').forEach(b=>b.onclick = e=>{ markDelivered(e.target.dataset.name); });
  tbody.querySelectorAll('.btn-delete').forEach(b=>b.onclick = e=>{ deleteRecord(e.target.dataset.name); });
}

async function markDelivered(name){
  if(!confirm(`ยืนยัน "ส่งแล้ว" สำหรับ ${name}?`)) return;
  try{
    await apiPost({name:name, status:'ส่งแล้ว', time: new Date().toLocaleString()});
    showStatus('อัปเดตสถานะเรียบร้อย', 'success');
    await refreshAll();
  }catch(err){ console.error(err); showStatus('อัปเดตไม่สำเร็จ: '+err.message,'error'); }
}

async function deleteRecord(name){
  if(!confirm(`ลบรายการ ${name} ?`)) return;
  try{
    // call delete via GET parameter; Apps Script doDelete handles it
    const res = await fetch(API_URL + '?name=' + encodeURIComponent(name), { method:'DELETE', mode:'cors' });
    if (!res.ok) throw new Error('HTTP '+res.status);
    await res.json();
    showStatus('ลบเรียบร้อย','success');
    await refreshAll();
  }catch(err){ console.error(err); showStatus('ลบไม่สำเร็จ: '+err.message,'error'); }
}

async function calculateRoute(){
  try{
    const rows = await apiGet();
    const valid = rows.filter(r => !isNaN(parseFloat(r.lat)) && !isNaN(parseFloat(r.lng)));
    if (valid.length < 2){ alert('ต้องมีพิกัดอย่างน้อย 2 จุด'); return; }
    const origin = {lat: parseFloat(valid[0].lat), lng: parseFloat(valid[0].lng)};
    const destination = {lat: parseFloat(valid.at(-1).lat), lng: parseFloat(valid.at(-1).lng)};
    const waypoints = valid.slice(1,-1).map(p => ({location: {lat: parseFloat(p.lat), lng: parseFloat(p.lng)}, stopover:true}));

    directionsService.route({origin, destination, waypoints, travelMode:'DRIVING', optimizeWaypoints:true}, (result,status)=>{
      if (status !== 'OK'){ alert('Google Maps Error: ' + status); return; }
      directionsRenderer.setDirections(result);
      const route = result.routes[0]; let totalDist = 0, totalTime = 0; let html = '<h4>สรุปเส้นทาง</h4>';
      route.legs.forEach((leg,i)=>{ html += `<div>${i+1}. ${leg.start_address} → ${leg.end_address}<br>ระยะทาง: ${leg.distance.text}, เวลา: ${leg.duration.text}</div><hr>`; totalDist += leg.distance.value; totalTime += leg.duration.value; });
      html += `<b>รวม:</b> ${(totalDist/1000).toFixed(1)} กม., ${(totalTime/60).toFixed(0)} นาที`;
      document.getElementById('routeSummary').innerHTML = html;
    });
  }catch(err){ console.error(err); showStatus('คำนวณเส้นทางผิดพลาด: '+err.message,'error'); }
}

function escapeHtml(s){ if(!s) return ''; return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function escapeAttr(s){ return (s||'').replace(/"/g,'&quot;'); }

function capture(){ html2canvas(document.body).then(canvas=>{ const a = document.createElement('a'); a.href = canvas.toDataURL('image/png'); a.download = 'route_capture.png'; a.click(); }); }

function updateDashboard(rows){
  const total = rows.length;
  const delivered = rows.filter(r=> (r.status||'')==='ส่งแล้ว').length;
  const pending = total - delivered;
  document.getElementById('totalCount').textContent = `ทั้งหมด: ${total}`;
  document.getElementById('deliveredCount').textContent = `ส่งแล้ว: ${delivered}`;
  document.getElementById('pendingCount').textContent = `ยังไม่ส่ง: ${pending}`;
  // update pie chart
  const ctx = document.getElementById('pieChart').getContext('2d');
  if (window._pieChart) window._pieChart.destroy();
  window._pieChart = new Chart(ctx, { type:'pie', data:{ labels: ['ส่งแล้ว','ยังไม่ส่ง'], datasets:[{ data:[delivered,pending] }] } });
}

window.addEventListener('load', ()=>{
  initMap();
  document.getElementById('btnGeolocate').onclick = ()=>{ navigator.geolocation.getCurrentPosition(p=>{ latInput().value = p.coords.latitude.toFixed(6); lngInput().value = p.coords.longitude.toFixed(6); showStatus('ดึงพิกัดสำเร็จ','success'); }, e=>showStatus('ไม่สามารถดึงพิกัด: '+e.message,'error')); };
  document.getElementById('btnSave').onclick = saveData;
  document.getElementById('btnRefresh').onclick = refreshAll;
  document.getElementById('btnShowMarkers').onclick = async ()=>{ const rows = await apiGet(); renderMarkers(rows); renderTable(rows); };
  document.getElementById('btnCalcRoute').onclick = calculateRoute;
  document.getElementById('btnClearTable').onclick = ()=>{ resultTbody().innerHTML = ''; document.getElementById('routeSummary').innerHTML = ''; directionsRenderer.setDirections({routes:[]}); };
  document.getElementById('btnCapture').onclick = capture;
  refreshAll();
});
