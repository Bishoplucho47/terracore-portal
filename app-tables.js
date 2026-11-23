/* Terracore — Calendar & Tables */

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
    let badges='';
    if(log){
      if(Number(log.irrigHrs||0)>0)badges+=`<span class="cal-badge irrig">💧${log.irrigHrs}h</span>`;
      if(log.disease)badges+=`<span class="cal-badge disease">⚠️</span>`;
      if(Number(log.waterL||0)>0)badges+=`<span class="cal-badge water">🚰</span>`;
      if(Number(log.electricKwh||0)>0)badges+=`<span class="cal-badge elec">⚡</span>`;
    }
    html+=`<div class="cal-day ${isToday?'today':''}" onclick="openQuickLog('${dateStr}')">
      <div class="d-num">${d}</div><div class="cal-badges">${badges}</div>
    </div>`;
  }
  $('#calendarGrid').innerHTML=html;
}

function renderDailyTable(){
  const rows=[...state.logs].sort((a,b)=>b.date.localeCompare(a.date));
  const tbody=$('#dailyTable tbody');
  if(!rows.length){tbody.innerHTML=`<tr><td colspan="6" style="text-align:center">No entries.</td></tr>`;return;}
  tbody.innerHTML=rows.map(l=>{
    const d=parseDate(l.date);const check=(l.rain!==''&&l.tmax!=='')?'<span class="ok">OK</span>':'<span class="bad">Missing</span>';
    return `<tr><td>${fmtDateShort(d)}</td><td>${l.rain||0} mm</td><td>${l.irrigHrs||0}</td><td>${l.harvest||0} kg</td><td>${check}</td>
      <td><button class="icon-btn" onclick="editLog('${l.date}')">✏️</button><button class="icon-btn" onclick="deleteLog('${l.date}')">🗑</button></td></tr>`;
  }).join('');
}

function deleteLog(date){
  if(!confirm('Delete entry for '+date+'?'))return;
  state.logs=state.logs.filter(l=>l.date!==date);save();renderDailyTable();renderCalendar();renderDashboard();toast('Deleted');
}

function renderWeekly(){
  const seasonStart=parseDate(state.setup.seasonStart);if(!seasonStart)return;
  let cursor=new Date(seasonStart);let w=1;const weeks=[];
  while(cursor<=today()&&w<60){
    const end=new Date(cursor);end.setDate(end.getDate()+6);
    const logs=state.logs.filter(l=>{const d=parseDate(l.date);return d&&d>=cursor&&d<=end;});
    weeks.push({w,days:logs.filter(l=>l.rain!==undefined).length,rain:logs.reduce((s,l)=>s+Number(l.rain||0),0),irrig:logs.reduce((s,l)=>s+Number(l.irrigHrs||0),0),harvest:logs.reduce((s,l)=>s+Number(l.harvest||0),0)});
    cursor=new Date(end);cursor.setDate(cursor.getDate()+1);w++;
  }
  $('#weeklyTable tbody').innerHTML=weeks.reverse().map(wk=>`
    <tr><td>Wk ${wk.w}</td><td>${wk.days}/7</td><td>${wk.rain.toFixed(0)} mm</td><td>${wk.irrig.toFixed(1)} h</td><td>${wk.harvest.toFixed(0)} kg</td></tr>
  `).join('');
}

function renderMonthly(){
  const byMonth={};state.logs.forEach(l=>{const d=parseDate(l.date);if(!d)return;const k=d.getFullYear()+'-'+pad(d.getMonth()+1);if(!byMonth[k])byMonth[k]={year:d.getFullYear(),month:d.getMonth(),logs:[]};byMonth[k].logs.push(l);});
  $('#monthlyTable tbody').innerHTML=Object.keys(byMonth).sort().reverse().map(k=>{
    const g=byMonth[k];const c=CLIMATE[g.month];const actualRain=g.logs.reduce((s,l)=>s+Number(l.rain||0),0);
    const tmaxes=g.logs.filter(l=>l.tmax).map(l=>Number(l.tmax));const avgMax=tmaxes.length?(tmaxes.reduce((a,b)=>a+b,0)/tmaxes.length):0;
    return `<tr><td>${c.name} ${g.year}</td><td>${c.rain} mm</td><td style="color:${actualRain>=c.rain?'var(--green-600)':'var(--amber)'}">${actualRain.toFixed(0)} mm</td><td>${avgMax.toFixed(1)}°C</td><td>${g.logs.length}</td></tr>`;
  }).join('');
}