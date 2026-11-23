/* Terracore — Modals, Forms, Export, Boot */

let isEditingLog = false;

function openQuickLog(dateStr = null) {
  const f = $('#logForm');
  f.reset();
  isEditingLog = false;
  
  const targetDate = dateStr || fmtDate(today());
  f.date.value = targetDate;
  
  // Check if entry exists for this date
  const existing = state.logs.find(l => l.date === targetDate);
  
  if (existing) {
    isEditingLog = true;
    $('#logModalTitle').textContent = '✏️ Edit Log Entry';
    $('#logSubmitBtn').textContent = 'Update Entry';
    f.rain.value = existing.rain;
    f.tmax.value = existing.tmax;
    f.humidity.value = existing.humidity;
    f.harvest.value = existing.harvest;
    f.labourHrs.value = existing.labourHrs;
    f.notes.value = existing.notes;
  } else {
    $('#logModalTitle').textContent = '📝 New Log Entry';
    $('#logSubmitBtn').textContent = 'Save Entry';
    // Prefill weather if logging today
    if (targetDate === fmtDate(today()) && liveWeather) {
      f.tmax.value = Math.round(liveWeather.current.temperature_2m);
      f.humidity.value = liveWeather.current.relative_humidity_2m;
      f.rain.value = liveWeather.current.precipitation;
    }
  }
  openModal('logModal');
}

function editLog(date) {
  openQuickLog(date);
}

$('#logForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target;
  const date = f.date.value;
  
  const entry = {
    date: date,
    rain: f.rain.value === '' ? '' : Number(f.rain.value),
    tmax: f.tmax.value === '' ? '' : Number(f.tmax.value),
    humidity: f.humidity.value === '' ? '' : Number(f.humidity.value),
    harvest: Number(f.harvest.value || 0),
    labourHrs: Number(f.labourHrs.value || 0),
    notes: f.notes.value,
    by: currentUser.name
  };
  
  if (isEditingLog) {
    const idx = state.logs.findIndex(l => l.date === date);
    if (idx >= 0) state.logs[idx] = entry;
  } else {
    // Check if we accidentally overwrite an existing entry due to date change
    const idx = state.logs.findIndex(l => l.date === date);
    if (idx >= 0) {
      if (!confirm('An entry already exists for this date. Replace it?')) return;
      state.logs[idx] = entry;
    } else {
      state.logs.push(entry);
    }
  }
  
  save();
  closeModal('logModal');
  toast(isEditingLog ? 'Entry updated' : 'Entry saved');
  
  renderDashboard();
  renderCalendar();
  renderDailyTable();
});

// ================== FINANCE ==================

function openFinanceModal(type, editId = null) {
  const f = $('#finForm');
  f.reset();
  $('#finType').value = type;
  $('#finId').value = editId || '';
  $('#finDate').value = fmtDate(today());
  
  const cats = type === 'income' ? INCOME_CATS : EXPENSE_CATS;
  $('#finCategory').innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
  
  if (editId) {
    const existing = state.finance.find(x => x.id === editId);
    if (existing) {
      $('#finModalTitle').textContent = '✏️ Edit Entry';
      $('#finDate').value = existing.date;
      $('#finCategory').value = existing.category;
      f.amount.value = existing.amount;
      f.desc.value = existing.desc;
    }
  } else {
    $('#finModalTitle').textContent = type === 'income' ? '💰 New Income' : '💸 New Expense';
  }
  openModal('finModal');
}

function editFinance(id) {
  const entry = state.finance.find(x => x.id === id);
  if(entry) openFinanceModal(entry.type, id);
}

$('#finForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = e.target;
  const editId = $('#finId').value;
  
  const entry = {
    id: editId || ('f_' + Date.now()),
    type: $('#finType').value,
    date: $('#finDate').value,
    category: $('#finCategory').value,
    amount: Number(f.amount.value || 0),
    desc: f.desc.value,
    by: currentUser.name
  };
  
  if (!entry.amount) { toast('Enter amount', true); return; }
  
  if (editId) {
    const idx = state.finance.findIndex(x => x.id === editId);
    if (idx >= 0) state.finance[idx] = entry;
  } else {
    state.finance.push(entry);
  }
  
  save();
  closeModal('finModal');
  toast('Saved');
  renderFinance();
  renderDashboard();
});

// ================== UTILS ==================

function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }
$$('.modal-bg').forEach(bg=>{ bg.addEventListener('click',e=>{ if(e.target===bg) bg.classList.remove('open'); }); });

function exportJSON(){
  const blob = new Blob([JSON.stringify({state, exported:new Date().toISOString()}, null, 2)], {type:'application/json'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'terracore_backup.json';
  a.click();
  toast('Backup downloaded');
}

$('#importFile').addEventListener('change', async e => {
  const file = e.target.files[0];
  if(!file) return;
  try {
    const text = await file.text();
    const j = JSON.parse(text);
    if(!j.state) throw new Error('invalid');
    if(!confirm('Restore backup? Current data will be replaced.')) return;
    state = j.state;
    save();
    location.reload();
  } catch(err) { toast('Invalid file', true); }
});

function refreshAll(){
  renderDashboard();
  renderCalendar();
  renderDailyTable();
  renderWeekly();
  renderMonthly();
  renderFinance();
  renderTasks();
  fillSetupForm();
}

function boot(){
  const sess = sessionStorage.getItem(SESSION_KEY);
  if(sess){
    try { currentUser = JSON.parse(sess); if(currentUser.name) enterApp(); } catch(e){}
  }
  fetchWeather();
  setInterval(fetchWeather, 10 * 60 * 1000);
}

window.addEventListener('load', boot);