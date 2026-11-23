/* Terracore — Live Data & Dashboard */

async function fetchWeather(){
  try{
    const url=`https://api.open-meteo.com/v1/forecast?latitude=-6.4333&longitude=38.9000&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&timezone=Africa%2FDar_es_Salaam`;
    const r=await fetch(url);
    if(!r.ok)throw new Error('weather');
    liveWeather=await r.json();
  }catch(e){liveWeather=null;}
  renderWeather();
  renderDashboard();
}

function renderWeather(){
  const chipEl=$('#weatherChipText');
  if(!liveWeather){
    chipEl.textContent='Offline';
    $('#wxIcon').textContent='⚠️'; $('#wxTemp').textContent='--°C'; $('#wxDesc').textContent='Unavailable'; $('#wxRain').textContent='Rain: --';
    return;
  }
  const cur=liveWeather.current;
  const [cond,ico]=weatherInfo(cur.weather_code);
  chipEl.textContent=`${Math.round(cur.temperature_2m)}°C`;
  $('#wxIcon').textContent=ico;
  $('#wxTemp').textContent=`${Math.round(cur.temperature_2m)}°C`;
  $('#wxDesc').textContent=cond;
  $('#wxRain').textContent=`Rain today: ${cur.precipitation.toFixed(1)} mm`;
}

function renderDashboard(){
  const now=today();
  const s=state.setup;
  const seasonStart=parseDate(s.seasonStart);
  const monthC=climateFor(now);
  
  // --- Finance Highlight ---
  const inc=state.finance.filter(f=>f.type==='income').reduce((a,b)=>a+Number(b.amount||0),0);
  const exp=state.finance.filter(f=>f.type==='expense').reduce((a,b)=>a+Number(b.amount||0),0);
  const net=inc-exp;
  $('#dashNet').textContent=fmtTZS(net);
  $('#dashNet').style.color = net>=0 ? 'var(--green-700)' : 'var(--red)';
  $('#dashInc').textContent=fmtNum(inc);
  $('#dashExp').textContent=fmtNum(exp);

  // --- Progress Highlight ---
  let daysElapsed=0;
  if(seasonStart) daysElapsed=Math.max(0,daysBetween(seasonStart,now)+1);
  const seasonLogs=state.logs.filter(l=>parseDate(l.date)<=now);
  const daysLogged=seasonLogs.filter(l=>l.rain!==undefined&&l.rain!=='').length;
  const pct=daysElapsed>0?Math.round((daysLogged/daysElapsed)*100):0;
  $('#dashProgressPct').textContent=pct+'%';
  $('#dashProgressSub').textContent=`${daysLogged} of ${daysElapsed} days logged`;
  $('#dashProgressBar').style.width=Math.min(100,pct)+'%';
  
  const totalHarvest=seasonLogs.reduce((a,b)=>a+Number(b.harvest||0),0);
  $('#dashHarvest').textContent=fmtNum(totalHarvest.toFixed(0))+' kg';

  // --- Suggested Action ---
  const todaysLog=state.logs.find(l=>l.date===fmtDate(now));
  let rain, tmax, hum;
  if(todaysLog){rain=Number(todaysLog.rain||0);tmax=Number(todaysLog.tmax||0);hum=Number(todaysLog.humidity||0);}
  else if(liveWeather){rain=liveWeather.current.precipitation||0;tmax=liveWeather.current.temperature_2m||0;hum=liveWeather.current.relative_humidity_2m||0;}
  else{rain=0;tmax=0;hum=0;}

  let actionText='No alert: routine day.', actionLevel='ok';
  if(tmax>=s.thHeat){actionText='HEAT STRESS: irrigate early, mulch, check for flower drop.';actionLevel='danger';}
  else if(rain>=s.thRain){actionText='HEAVY RAIN: hold spraying and fertiliser, clear drains.';actionLevel='danger';}
  else if(hum>=s.thHum&&tmax>=25){actionText='DISEASE WATCH: scout for blight, leaf spot. Spray after leaves dry.';actionLevel='warn';}
  
  $('#rnAction').textContent=actionText;
  $('#rnPhase').textContent=monthC.phase;

  const alertEl=$('#alertBanner');
  const ico=actionLevel==='danger'?'🚨':actionLevel==='warn'?'⚠️':'✅';
  alertEl.className=`alert-banner ${actionLevel}`;
  alertEl.innerHTML=`<span class="ico">${ico}</span><div><strong>${actionLevel==='ok'?'All clear':'Attention'}:</strong> ${actionText}</div>`;

  renderRecentTable();
  renderCharts();
}

function renderRecentTable(){
  const rows=[...state.logs].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,5);
  const tbody=$('#recentTable tbody');
  if(!rows.length){tbody.innerHTML=`<tr><td colspan="4" style="text-align:center;color:var(--ink-3)">No entries yet.</td></tr>`;return;}
  tbody.innerHTML=rows.map(l=>{
    const check=(l.rain!==''&&l.tmax!=='')?'<span class="ok">OK</span>':'<span class="bad">Missing</span>';
    return `<tr><td>${fmtDateShort(parseDate(l.date))}</td><td>${l.rain||0} mm</td><td>${l.harvest||0} kg</td><td>${check}</td></tr>`;
  }).join('');
}

function renderCharts(){
  if(!window.Chart)return;
  // Rain Chart
  const now=today();
  const labels=[], actual=[], normal=[];
  for(let i=13;i>=0;i--){
    const d=new Date(now);d.setDate(d.getDate()-i);
    labels.push(fmtDateShort(d));
    const log=state.logs.find(l=>l.date===fmtDate(d));
    const c=climateFor(d);
    actual.push(log?Number(log.rain||0):0);
    normal.push(Number((c.rain/new Date(d.getFullYear(),d.getMonth()+1,0).getDate()).toFixed(1)));
  }
  if(charts.rain)charts.rain.destroy();
  charts.rain=new Chart(document.getElementById('chartRain'),{
    type:'bar',
    data:{labels,datasets:[
      {label:'Actual',data:actual,backgroundColor:'#3f9c69',borderRadius:4},
      {label:'Normal',data:normal,type:'line',borderColor:'#c89512',borderDash:[4,4],pointRadius:0}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{display:false},y:{beginAtZero:true,ticks:{font:{size:10}}}}}
  });

  // Finance Chart
  const fLabels=[], fInc=[], fExp=[];
  const months={};
  state.finance.forEach(f=>{
    const m=f.date.slice(0,7);
    if(!months[m])months[m]={inc:0,exp:0};
    if(f.type==='income')months[m].inc+=Number(f.amount||0);
    else months[m].exp+=Number(f.amount||0);
  });
  Object.keys(months).sort().slice(-6).forEach(m=>{
    fLabels.push(m);
    fInc.push(months[m].inc);
    fExp.push(months[m].exp);
  });

  if(charts.finance)charts.finance.destroy();
  charts.finance=new Chart(document.getElementById('chartFinance'),{
    type:'bar',
    data:{labels:fLabels,datasets:[
      {label:'Income',data:fInc,backgroundColor:'#2d7a52',borderRadius:4},
      {label:'Expense',data:fExp,backgroundColor:'#c0392b',borderRadius:4}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom',labels:{boxWidth:10,font:{size:10}}}},scales:{x:{stacked:true,grid:{display:false}},y:{stacked:true,beginAtZero:true,ticks:{font:{size:10}}}}}
  });
}