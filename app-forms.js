let isEditingLog = false;

// --- FARM LOG (bmf) ---
function openQuickLog(dateStr = null) {
  const f = $('#logForm');f.reset();isEditingLog = false;
  const targetDate = dateStr || fmtDate(today());f.date.value = targetDate;
  
  const existing = state.logs.find(l => l.date === targetDate);
  if (existing) {
    isEditingLog = true;$('#logModalTitle').textContent = '✏️ Edit Log';
    ['weather','rain','pumpHours','harvest','initials','notes'].forEach(k=>{ if(existing[k]!==undefined) f[k].value = existing[k]; });
  } else {
    $('#logModalTitle').textContent = '📝 New Farm Log';
    if (targetDate === fmtDate(today()) && liveWeather) {
      f.rain.value = liveWeather.current.precipitation;
      const code = liveWeather.current.weather_code;
      if(code >= 51 && code <= 67 || code >= 80 && code <= 82 || code >= 95) f.weather.value = 'Rainy';
      else if(code >= 1 && code <= 3) f.weather.value = 'Cloudy';
      else f.weather.value = 'Sunny';
    }
  }
  openModal('logModal');
}

$('#logForm').addEventListener('submit', e => {
  e.preventDefault();const f = e.target;
  const entry = {
    date: f.date.value, weather: f.weather.value, rain: Number(f.rain.value || 0),
    pumpHours: Number(f.pumpHours.value || 0), harvest: Number(f.harvest.value || 0),
    initials: f.initials.value.trim().toUpperCase(), notes: f.notes.value
  };
  
  const idx = state.logs.findIndex(l => l.date === entry.date);
  if (idx >= 0) {
    if (!isEditingLog && !confirm('Entry exists. Replace?')) return;
    state.logs[idx] = entry;
  } else { state.logs.push(entry); }
  
  save();closeModal('logModal');toast('Farm Log Saved');
  renderDashboard();renderCalendar();renderDailyTable();
});

// --- CASHBOOK (eeh) ---
function updateCashCategories(){
  const type = $('#cashType').value;
  const catSel = $('#cashCategory');
  const shField = $('#shareholderField');
  
  if(type === 'income'){
    catSel.innerHTML = `<option value="Sales">Sales</option><option value="Other income">Other income</option>`;
    shField.style.display = 'none';
  } else if(type === 'expense'){
    catSel.innerHTML = EXPENSE_CATS.map(c=>`<option value="${c}">${c}</option>`).join('');
    shField.style.display = 'none';
  } else {
    catSel.innerHTML = `<option value="Capital injection">Capital injection</option><option value="Shareholder payout">Shareholder payout</option>`;
    shField.style.display = 'block';
  }
}

function openCashbookModal(editId = null){
  const f = $('#cashForm'); f.reset();
  $('#cashId').value = editId || '';
  $('#cashDate').value = fmtDate(today());
  
  const shSel = $('#cashShareholder');
  shSel.innerHTML = state.setup.shareholders.map(s=>`<option value="${s.name}">${s.name}</option>`).join('');
  
  if(editId){
    const ex = state.cashbook.find(c=>c.id===editId);
    if(ex){
      $('#cashModalTitle').textContent = '✏️ Edit Entry';
      f.date.value = ex.date; f.type.value = ex.type; updateCashCategories();
      f.category.value = ex.category; f.amount.value = ex.amount; f.desc.value = ex.desc;
      if(ex.shareholder) f.shareholder.value = ex.shareholder;
    }
  } else {
    $('#cashModalTitle').textContent = 'New Cashbook Entry';
    updateCashCategories();
  }
  openModal('cashModal');
}

function editCashEntry(id){ openCashbookModal(id); }

$('#cashForm').addEventListener('submit', e=>{
  e.preventDefault();const f = e.target;const editId = $('#cashId').value;
  
  const entry = {
    id: editId || ('c_' + Date.now()), date: f.date.value, type: f.type.value,
    category: f.category.value, amount: Number(f.amount.value || 0), desc: f.desc.value,
    shareholder: f.type.value === 'capital' ? f.shareholder.value : ''
  };
  
  if(!entry.amount){ toast('Enter amount', true); return; }
  
  if(editId){
    const idx = state.cashbook.findIndex(c=>c.id===editId);
    if(idx>=0) state.cashbook[idx] = entry;
  } else { state.cashbook.push(entry); }
  
  save(); closeModal('cashModal'); toast('Saved');
  renderCashbook(); renderDashboard(); renderShareholders();
});

// --- UTILS & BOOT ---
function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }
$$('.modal-bg').forEach(bg=>{ bg.addEventListener('click',e=>{ if(e.target===bg) bg.classList.remove('open'); }); });

function refreshAll(){
  renderDashboard();renderCalendar();renderDailyTable();renderCashbook();renderShareholders();fillSetupForms();
}

function boot(){
  const sess = sessionStorage.getItem(SESSION_KEY);
  if(sess){try { currentUser = JSON.parse(sess); if(currentUser.name) enterApp(); } catch(e){}}
  fetchWeather();setInterval(fetchWeather, 10 * 60 * 1000);
}
window.addEventListener('load', boot);