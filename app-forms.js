let isEditingLog = false;

function openQuickLog(dateStr = null) {
  const f = $('#logForm');f.reset();isEditingLog = false;
  const targetDate = dateStr || fmtDate(today());f.date.value = targetDate;
  const existing = state.logs.find(l => l.date === targetDate);
  
  if (existing) {
    isEditingLog = true;$('#logModalTitle').textContent = '✏️ Edit Log';$('#logSubmitBtn').textContent = 'Update';
    ['rain','tmax','humidity','irrigHrs','waterL','electricKwh','harvest','labourHrs','notes','disease','block'].forEach(k=>{
      if(existing[k]!==undefined) f[k].value = existing[k];
    });
  } else {
    $('#logModalTitle').textContent = '📝 New Log';$('#logSubmitBtn').textContent = 'Save';
    // BACKGROUND WEATHER AUTO-FILL (Only for today)
    if (targetDate === fmtDate(today()) && liveWeather) {
      f.tmax.value = Math.round(liveWeather.current.temperature_2m);
      f.humidity.value = liveWeather.current.relative_humidity_2m;
      f.rain.value = liveWeather.current.precipitation;
    }
  }
  openModal('logModal');
}

function editLog(date) { openQuickLog(date); }

$('#logForm').addEventListener('submit', e => {
  e.preventDefault();const f = e.target;
  const entry = {
    date: f.date.value, block: f.block.value,
    rain: f.rain.value === '' ? '' : Number(f.rain.value),
    tmax: f.tmax.value === '' ? '' : Number(f.tmax.value),
    humidity: f.humidity.value === '' ? '' : Number(f.humidity.value),
    irrigHrs: Number(f.irrigHrs.value || 0),
    waterL: Number(f.waterL.value || 0),
    electricKwh: Number(f.electricKwh.value || 0),
    harvest: Number(f.harvest.value || 0),
    labourHrs: Number(f.labourHrs.value || 0),
    disease: f.disease.value, notes: f.notes.value, by: currentUser.name
  };
  
  const idx = state.logs.findIndex(l => l.date === entry.date);
  if (idx >= 0) {
    if (!isEditingLog && !confirm('Entry exists. Replace?')) return;
    state.logs[idx] = entry;
  } else {
    state.logs.push(entry);
  }
  
  save();closeModal('logModal');toast(isEditingLog ? 'Updated' : 'Saved');
  renderDashboard();renderCalendar();renderDailyTable();
});

function openFinanceModal(type, editId = null) {
  const f = $('#finForm');f.reset();$('#finType').value = type;$('#finId').value = editId || '';$('#finDate').value = fmtDate(today());
  $('#finCategory').innerHTML = (type === 'income' ? INCOME_CATS : EXPENSE_CATS).map(c => `<option value="${c}">${c}</option>`).join('');
  if (editId) {
    const ex = state.finance.find(x => x.id === editId);
    if (ex) {$('#finModalTitle').textContent = '✏️ Edit';$('#finDate').value = ex.date;$('#finCategory').value = ex.category;f.amount.value = ex.amount;f.desc.value = ex.desc;}
  } else {$('#finModalTitle').textContent = type === 'income' ? '💰 Income' : '💸 Expense';}
  openModal('finModal');
}
function editFinance(id) {const e = state.finance.find(x => x.id === id);if(e) openFinanceModal(e.type, id);}

$('#finForm').addEventListener('submit', e => {
  e.preventDefault();const f = e.target;const editId = $('#finId').value;
  const entry = {id: editId || ('f_' + Date.now()),type: $('#finType').value,date: $('#finDate').value,category: $('#finCategory').value,amount: Number(f.amount.value || 0),desc: f.desc.value,by: currentUser.name};
  if (!entry.amount) { toast('Enter amount', true); return; }
  if (editId) {const idx = state.finance.findIndex(x => x.id === editId);if (idx >= 0) state.finance[idx] = entry;}
  else {state.finance.push(entry);}
  save();closeModal('finModal');toast('Saved');renderFinance();renderDashboard();
});

function openModal(id){ document.getElementById(id).classList.add('open'); }
function closeModal(id){ document.getElementById(id).classList.remove('open'); }
$$('.modal-bg').forEach(bg=>{ bg.addEventListener('click',e=>{ if(e.target===bg) bg.classList.remove('open'); }); });

function exportJSON(){
  const blob = new Blob([JSON.stringify({state}, null, 2)], {type:'application/json'});
  const a = document.createElement('a');a.href = URL.createObjectURL(blob);a.download = 'terracore_backup.json';a.click();toast('Downloaded');
}
$('#importFile').addEventListener('change', async e => {
  const file = e.target.files[0];if(!file) return;
  try {
    const text = await file.text();const j = JSON.parse(text);
    if(!j.state) throw new Error();
    if(!confirm('Restore backup?')) return;
    state = j.state;save();location.reload();
  } catch(err) { toast('Invalid file', true); }
});

function refreshAll(){
  renderDashboard();renderCalendar();renderDailyTable();renderWeekly();renderMonthly();renderFinance();renderTasks();fillSetupForm();
}

function boot(){
  const sess = sessionStorage.getItem(SESSION_KEY);
  if(sess){try { currentUser = JSON.parse(sess); if(currentUser.name) enterApp(); } catch(e){}}
  fetchWeather();setInterval(fetchWeather, 10 * 60 * 1000);
}
window.addEventListener('load', boot);