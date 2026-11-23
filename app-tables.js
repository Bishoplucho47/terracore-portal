/* Terracore — Calendar & Tabular Data */

function changeMonth(dir){
  calDate.setMonth(calDate.getMonth()+dir);
  renderCalendar();
}

function renderCalendar(){
  const year=calDate.getFullYear();
  const month=calDate.getMonth();
  const monthNames=['January','February','March','April','May','June','July','August','September','October','November','December'];
  $('#calMonthYear').textContent=`${monthNames[month]} ${year}`;

  const firstDay=new Date(year,month,1).getDay(); // 0=Sun
  const daysInMonth=new Date(year,month+1,0).getDate();
  
  let html='';
  const dows=['Su','Mo','Tu','We','Th','Fr','Sa'];
  dows.forEach(d=>html+=`<div class="cal-dow">${d}</div>`);

  // Empty cells before first day
  for(let i=0;i<firstDay;i++)html+=`<div class="cal-day empty"></div>`;

  for(let d=1;d<=daysInMonth;d++){
    const dateStr=`${year}-${pad(month+1)}-${pad(d)}`;
    const log=state.logs.find(l=>l.date===dateStr);
    const isToday=dateStr===fmtDate(today());
    
    let dot='';
    if(log){
      if(Number(log.rain||0)>0) dot=`<div class="d-dot" style="background:var(--blue)"></div>`;
      else dot=`<div class="d-dot"></div>`;
    }
    
    html+=`<div class="cal-day ${isToday?'today':''}" onclick="openQuickLog('${dateStr}')">
      <div class="d-num">${d}</div>
      ${dot}
      ${log&&log.harvest?`<div class="d-rain" style="color:var(--green-600)">${log.harvest}kg</div>`:''}
    </div>`;
  }
  $('#calendarGrid').innerHTML=html;
}

function renderDailyTable(){
  const rows=[...state.logs].sort((a,b)=>b.date.localeCompare(a.date));
  const tbody=$('#dailyTable tbody');
  if(!rows.length){tbody.innerHTML=`<tr><td colspan="6" style="text-align:center;color:var(--ink-3)">No entries.</td></tr>`;return;}
  
  tbody.innerHTML=rows.map(l=>{
    const d=parseDate(l.date);
    const check=(l.rain!==''&&l.tmax!=='')?'<span class="ok">OK</span>':'<span class="bad">Missing</span>';
    return `<tr>
      <td>${fmtDateShort(d)}</td>
      <td class="num">${l.rain||0}</td>
      <td class="num">${l.tmax||'—'}</td>
      <td class="num">${l.harvest||0}</td>
      <td>${check}</td>
      <td>
        <button class="icon-btn" onclick="editLog('${l.date}')" title="Edit">✏️</button>
        <button class="icon-btn" onclick="deleteLog('${l.date}')" title="Delete">🗑</button>
      </td>
    </tr>`;
  }).join('');
}

function deleteLog(date){
  if(!confirm('Delete entry for '+date+'?'))return;
  state.logs=state.logs.filter(l=>l.date!==date);
  save();
  renderDailyTable();
  renderCalendar();
  renderDashboard();
  toast('Entry deleted');
}

function renderWeekly(){
  const seasonStart=parseDate(state.setup.seasonStart);
  if(!seasonStart){$('#weeklyTable tbody').innerHTML=`<tr><td colspan="6" style="text-align:center">Set season start in Settings.</td></tr>`;return;}
  
  const now=today();
  let cursor=new Date(seasonStart);
  let w=1;
  const weeks=[];
  
  while(cursor<=now&&w<60){
    const end=new Date(cursor);end.setDate(end.getDate()+6);
    const logs=state.logs.filter(l=>{const d=parseDate(l.date);return d&&d>=cursor&&d<=end;});
    const days=logs.filter(l=>l.rain!==undefined&&l.rain!=='').length;
    const rain=logs.reduce((s,l)=>s+Number(l.rain||0),0);
    const harvest=logs.reduce((s,l)=>s+Number(l.harvest||0),0);
    weeks.push({w,start:cursor,end,days,rain,harvest});
    cursor=new Date(end);cursor.setDate(cursor.getDate()+1);
    w++;
  }
  
  const tbody=$('#weeklyTable tbody');
  tbody.innerHTML=weeks.reverse().map(wk=>{
    const status=wk.days>=6?'<span class="ok">Complete</span>':wk.days>=4?'<span class="warn">Partial</span>':'<span class="bad">Incomplete</span>';
    return `<tr>
      <td>Week ${wk.w}</td>
      <td>${fmtDateShort(wk.start)} - ${fmtDateShort(wk.end)}</td>
      <td class="num">${wk.days}/7</td>
      <td class="num">${wk.rain.toFixed(0)} mm</td>
      <td class="num">${wk.harvest.toFixed(0)} kg</td>
      <td>${status}</td>
    </tr>`;
  }).join('');
}

function renderMonthly(){
  const byMonth={};
  state.logs.forEach(l=>{
    const d=parseDate(l.date);if(!d)return;
    const k=d.getFullYear()+'-'+pad(d.getMonth()+1);
    if(!byMonth[k])byMonth[k]={year:d.getFullYear(),month:d.getMonth(),logs:[]};
    byMonth[k].logs.push(l);
  });
  
  const tbody=$('#monthlyTable tbody');
  const keys=Object.keys(byMonth).sort().reverse();
  if(!keys.length){tbody.innerHTML=`<tr><td colspan="5" style="text-align:center">No data.</td></tr>`;return;}
  
  tbody.innerHTML=keys.map(k=>{
    const g=byMonth[k];
    const c=CLIMATE[g.month];
    const actualRain=g.logs.reduce((s,l)=>s+Number(l.rain||0),0);
    const tmaxes=g.logs.filter(l=>l.tmax).map(l=>Number(l.tmax));
    const avgMax=tmaxes.length?(tmaxes.reduce((a,b)=>a+b,0)/tmaxes.length):0;
    
    return `<tr>
      <td>${c.name} ${g.year}</td>
      <td class="num">${c.rain} mm</td>
      <td class="num" style="color:${actualRain>=c.rain?'var(--green-600)':'var(--amber)'}">${actualRain.toFixed(0)} mm</td>
      <td class="num">${avgMax.toFixed(1)}°C</td>
      <td class="num">${g.logs.length}</td>
    </tr>`;
  }).join('');
}