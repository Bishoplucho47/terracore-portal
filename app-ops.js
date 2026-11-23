function renderFinance(){
  const rows=[...state.finance].sort((a,b)=>b.date.localeCompare(a.date));
  $('#financeTable tbody').innerHTML=rows.length?rows.map(f=>`
    <tr><td>${fmtDateShort(parseDate(f.date))}</td><td><span class="tag" style="background:${f.type==='income'?'var(--green-100)':'var(--red-light)'};color:${f.type==='income'?'var(--green-700)':'var(--red)'}">${f.type}</span></td>
      <td style="font-size:.75rem">${f.desc||f.category}</td><td class="num" style="font-weight:600;color:${f.type==='income'?'var(--green-700)':'var(--red)'}">${fmtNum(f.amount)}</td>
      <td><button class="icon-btn" onclick="editFinance('${f.id}')">✏️</button><button class="icon-btn" onclick="deleteFinance('${f.id}')">🗑</button></td></tr>
  `).join(''):`<tr><td colspan="5" style="text-align:center">No entries.</td></tr>`;
}
function deleteFinance(id){if(!confirm('Delete?'))return;state.finance=state.finance.filter(f=>f.id!==id);save();renderFinance();renderDashboard();}

function renderTasks(){
  const phases=['Hot Dry','Long Rains','Long Rains Tapering','Cool Dry','Short Rains','Short Rains Tapering'];
  $('#tasksList').innerHTML=phases.map(phase=>{
    const t=state.tasks[phase]||{daily:'—',weekly:'—',monthly:'—'};
    return `<div class="card" style="margin-bottom:12px"><div class="card-h"><h3>${phase}</h3></div>
      <div class="form-field" style="margin-bottom:8px"><label>Daily Focus</label><textarea data-phase="${phase}" data-field="daily" rows="2">${t.daily}</textarea></div>
      <div class="form-field" style="margin-bottom:8px"><label>Weekly Focus</label><textarea data-phase="${phase}" data-field="weekly" rows="2">${t.weekly}</textarea></div>
      <div class="form-field"><label>Monthly Focus</label><textarea data-phase="${phase}" data-field="monthly" rows="2">${t.monthly}</textarea></div>
      <div style="text-align:right;margin-top:10px"><button class="btn btn-primary btn-sm" onclick="saveTask('${phase}')">Save</button></div></div>`;
  }).join('');
}
function saveTask(phase){
  const t={};['daily','weekly','monthly'].forEach(f=>{const n=document.querySelector(`[data-phase="${phase}"][data-field="${f}"]`);if(n)t[f]=n.value;});
  state.tasks[phase]=t;save();toast('Saved');
}

function fillSetupForm(){
  const s=state.setup;const f=$('#setupForm');
  f.farmName.value=s.farmName||'';f.seasonStart.value=s.seasonStart||'';f.pin.value=s.pin||'';
  f.thHeat.value=s.thHeat||33;f.thRain.value=s.thRain||20;f.priceKg.value=s.priceKg||1200;f.rateHr.value=s.rateHr||3500;
}
$('#setupForm').addEventListener('submit',e=>{
  e.preventDefault();const f=e.target;
  state.setup={...state.setup,farmName:f.farmName.value,seasonStart:f.seasonStart.value,pin:f.pin.value,thHeat:parseFloat(f.thHeat.value),thRain:parseFloat(f.thRain.value),priceKg:parseFloat(f.priceKg.value),rateHr:parseFloat(f.rateHr.value)};
  save();toast('Saved');renderDashboard();
});
function resetAll(){if(!confirm('Erase all data?'))return;localStorage.removeItem(LS_KEY);location.reload();}