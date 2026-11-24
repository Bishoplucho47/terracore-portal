let charts = { rain: null, finance: null };

function changeMonth(dir){calDate.setMonth(calDate.getMonth()+dir);renderCalendar();}

function renderCalendar(){
  const year=calDate.getFullYear();const month=calDate.getMonth();
  const monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  $('#calMonthYear').textContent=`${monthNames[month]} ${year}`;
  const firstDay=new Date(year,month,1).getDay();const daysInMonth=new Date(year,month+1,0).getDate();
  
  let html='';['Su','Mo','Tu','We','Th','Fr','Sa'].forEach(d=>html+=`<div class="cal-dow">${d}</div>`);
  for(let i=0;i<firstDay;i++)html+=`<div class="cal-day empty"></div>`;

  for(let d=1;d<=daysInMonth;d++){
    const dateStr=`${year}-${pad(month+1)}-${pad(d)}`;const log=state.logs.find(l=>l.date===dateStr);const isToday=dateStr===fmtDate(today());
    const status = getDayStatus(log);
    const isClosed = status === 'Done';
    
    html+=`<div class="cal-day ${isToday?'today':''} ${isClosed?'closed':''}" onclick="openQuickLog('${dateStr}')">
      <div class="d-num">${d}</div>
      ${isClosed ? `<div class="status">✓ ${log.initials}</div>` : ''}
    </div>`;
  }
  $('#calendarGrid').innerHTML=html;
}

function renderDailyTable(){
  const rows=[...state.logs].sort((a,b)=>b.date.localeCompare(a.date));
  const tbody=$('#dailyTable tbody');
  if(!rows.length){tbody.innerHTML=`<tr><td colspan="6" style="text-align:center">No entries.</td></tr>`;return;}
  
  tbody.innerHTML=rows.map(l=>{
    const d=parseDate(l.date);
    const status = getDayStatus(l);
    return `<tr>
      <td>${fmtDateShort(d)}</td>
      <td>${l.rain||0} mm</td>
      <td>${l.pumpHours||0} h</td>
      <td>${l.harvest||0} kg</td>
      <td>${status==='Done'?'<span class="ok">Closed</span>':'<span class="bad">Open</span>'}</td>
      <td><button class="icon-btn" onclick="openQuickLog('${l.date}')">✏️</button><button class="icon-btn" onclick="deleteLog('${l.date}')">🗑</button></td>
    </tr>`;
  }).join('');
}

function deleteLog(date){
  if(!confirm('Delete entry for '+date+'?'))return;
  state.logs=state.logs.filter(l=>l.date!==date);save();renderDailyTable();renderCalendar();renderDashboard();toast('Deleted');
}

function renderCashbook(){
  const rows=[...state.cashbook].sort((a,b)=>b.date.localeCompare(a.date));
  const tbody=$('#cashbookTable tbody');
  if(!rows.length){tbody.innerHTML=`<tr><td colspan="7" style="text-align:center">No entries.</td></tr>`;return;}
  
  tbody.innerHTML=rows.map(c=>{
    const isInc = c.type==='income';
    const isExp = c.type==='expense';
    const tagCls = isInc?'':(isExp?'exp':'cap');
    return `<tr>
      <td>${fmtDateShort(parseDate(c.date))}</td>
      <td><span class="tag ${tagCls}">${c.category}</span></td>
      <td style="font-size:.75rem">${c.desc||''}</td>
      <td>${c.shareholder||'—'}</td>
      <td class="num" style="color:var(--green-600)">${isInc?fmtNum(c.amount):'—'}</td>
      <td class="num" style="color:var(--red)">${isExp?fmtNum(c.amount):'—'}</td>
      <td><button class="icon-btn" onclick="editCashEntry('${c.id}')">✏️</button><button class="icon-btn" onclick="deleteCashEntry('${c.id}')">🗑</button></td>
    </tr>`;
  }).join('');
}

function deleteCashEntry(id){
  if(!confirm('Delete this entry?'))return;
  state.cashbook=state.cashbook.filter(c=>c.id!==id);save();renderCashbook();renderDashboard();toast('Deleted');
}

function renderShareholders(){
  const s = state.setup;
  const totalIncome = state.cashbook.filter(c=>c.type==='income').reduce((a,b)=>a+Number(b.amount||0),0);
  const totalExpense = state.cashbook.filter(c=>c.type==='expense').reduce((a,b)=>a+Number(b.amount||0),0);
  const netResult = totalIncome - totalExpense;

  const tbody=$('#shareholderTable tbody');
  tbody.innerHTML = s.shareholders.map(sh=>{
    const shareResult = netResult * sh.percent;
    const injected = state.cashbook.filter(c=>c.type==='capital' && c.category==='Capital injection' && c.shareholder===sh.name).reduce((a,b)=>a+Number(b.amount||0),0);
    const paid = state.cashbook.filter(c=>c.type==='capital' && c.category==='Shareholder payout' && c.shareholder===sh.name).reduce((a,b)=>a+Number(b.amount||0),0);
    
    return `<tr>
      <td>${sh.name}</td>
      <td>${(sh.percent*100).toFixed(0)}%</td>
      <td class="num" style="color:${shareResult>=0?'var(--green-600)':'var(--red)'}">${fmtTZS(shareResult)}</td>
      <td class="num">${fmtTZS(injected)}</td>
      <td class="num">${fmtTZS(paid)}</td>
    </tr>`;
  }).join('');
}