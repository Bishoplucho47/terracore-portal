/* Terracore — Weather Background & Dashboard Formulas */

async function fetchWeather(){
  try{
    const url=`https://api.open-meteo.com/v1/forecast?latitude=-6.4333&longitude=38.9000&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&timezone=Africa%2FDar_es_Salaam`;
    const r=await fetch(url);if(!r.ok)throw new Error();liveWeather=await r.json();
  }catch(e){liveWeather=null;}
  if(liveWeather){$('#weatherChipText').textContent=`${Math.round(liveWeather.current.temperature_2m)}°C`;}
  else{$('#weatherChipText').textContent='Offline';}
  renderDashboard();
}

function renderDashboard(){
  const now=today(); const s=state.setup; const seasonStart=parseDate(s.seasonStart); const monthC=climateFor(now);
  
  // 1. RIGHT NOW
  $('#rnToday').textContent=fmtDateLong(now);
  let seasonDayText='—';
  if(seasonStart){
    const diff=daysBetween(seasonStart,now)+1;
    seasonDayText=diff>=1?'Day '+diff:'Starts in '+Math.abs(diff)+' days';
  }
  $('#rnSeason').textContent=seasonDayText;
  $('#rnPhase').textContent=monthC.phase;
  
  const todaysLog=state.logs.find(l=>l.date===fmtDate(now));
  let latestText='—';
  if(todaysLog&&todaysLog.tmax){latestText=`${todaysLog.tmax}°C (logged today)`;}
  else if(state.logs.length){
    const last=[...state.logs].sort((a,b)=>b.date.localeCompare(a.date))[0];
    if(last&&last.tmax)latestText=`${last.tmax}°C (${fmtDateShort(parseDate(last.date))})`;
  }
  if(latestText==='—'&&liveWeather){latestText=`${Math.round(liveWeather.current.temperature_2m)}°C live`;}
  $('#rnLatest').textContent=latestText;

  // 2. SUGGESTED ACTION (eeh.xlsx W column logic)
  let actionText='Enter today\'s rain and temp to see action.', actionLevel='ok';
  const rain=Number(todaysLog?.rain||0); const tmax=Number(todaysLog?.tmax||0); const hum=Number(todaysLog?.humidity||0);
  const daysSinceRain=getDaysSinceRain();

  if(today() < seasonStart){ actionText='Season has not started yet.'; actionLevel='ok'; }
  else if(!todaysLog){ actionText='Enter today\'s rain and temperature in the Daily Log.'; actionLevel='warn'; }
  else if(tmax>=s.thHeat){ actionText='HEAT STRESS: irrigate early, mulch, check for flower drop.'; actionLevel='danger'; }
  else if(rain>=s.thRain){ actionText='HEAVY RAIN: hold spraying and fertiliser, clear drains.'; actionLevel='danger'; }
  else if(hum>=s.thHum&&tmax>=25){ actionText='DISEASE WATCH: scout for blight, leaf spot. Spray after leaves dry.'; actionLevel='warn'; }
  else if(daysSinceRain>=s.thDry){ actionText=`IRRIGATE: ${daysSinceRain} days without rain.`; actionLevel='warn'; }
  else if(rain>=1){ actionText='Rain recorded: skip irrigation today.'; actionLevel='ok'; }
  else{ actionText='No alert: routine day. Follow the daily focus.'; actionLevel='ok'; }

  $('#rnAction').textContent=actionText;
  const alertEl=$('#alertBanner');
  alertEl.className=`alert-banner ${actionLevel}`;
  alertEl.innerHTML=`<span class="ico">${actionLevel==='danger'?'🚨':actionLevel==='warn'?'⚠️':'✅'}</span><div>${actionText}</div>`;

  // 3. SEASON TO DATE (eeh.xlsx counts and sums)
  let daysElapsed=0; if(seasonStart)daysElapsed=Math.max(0,daysBetween(seasonStart,now)+1);
  const seasonLogs=state.logs.filter(l=>parseDate(l.date)<=now);
  const daysLogged=seasonLogs.filter(l=>l.rain!==''&&l.rain!==undefined).length;
  const completeness=daysElapsed>0?Math.round((daysLogged/daysElapsed)*100):0;
  const missingLast7=7-seasonLogs.filter(l=>daysBetween(parseDate(l.date),now)<=7).length;
  const totalRain=seasonLogs.reduce((s,l)=>s+Number(l.rain||0),0);
  let normalRainToDate=0;
  if(seasonStart){for(let i=0;i<daysElapsed;i++){const d=new Date(seasonStart);d.setDate(d.getDate()+i);const c=climateFor(d);normalRainToDate+=c.rain/new Date(d.getFullYear(),d.getMonth()+1,0).getDate();}}
  const avgMaxTemps=seasonLogs.filter(l=>l.tmax).map(l=>Number(l.tmax));
  const avgMax=avgMaxTemps.length?(avgMaxTemps.reduce((a,b)=>a+b,0)/avgMaxTemps.length):0;
  const heatDays=seasonLogs.filter(l=>Number(l.tmax||0)>=s.thHeat).length;
  const irrigDays=seasonLogs.filter(l=>Number(l.irrigHrs||0)>0).length;
  const totalHarvest=seasonLogs.reduce((s,l)=>s+Number(l.harvest||0),0);
  const totalLabour=seasonLogs.reduce((s,l)=>s+Number(l.labourHrs||0),0);

  $('#seasonGrid').innerHTML=`
    <div><span class="lbl">Days Elapsed / Logged</span><span class="val">${daysElapsed} / ${daysLogged}</span></div>
    <div><span class="lbl">Completeness</span><span class="val">${completeness}%</span></div>
    <div><span class="lbl">Missing (Last 7d)</span><span class="val">${missingLast7}</span></div>
    <div><span class="lbl">Rain vs Normal</span><span class="val">${Math.round(totalRain)} vs ${Math.round(normalRainToDate)} mm</span></div>
    <div><span class="lbl">Avg Max Temp</span><span class="val">${avgMax.toFixed(1)}°C</span></div>
    <div><span class="lbl">Heat-Stress Days</span><span class="val">${heatDays}</span></div>
    <div><span class="lbl">Days Irrigated</span><span class="val">${irrigDays}</span></div>
    <div><span class="lbl">Total Harvest</span><span class="val">${fmtNum(totalHarvest)} kg</span></div>
    <div><span class="lbl">Labour Hours</span><span class="val">${fmtNum(totalLabour)} h</span></div>
    <div><span class="lbl">Harvest Value</span><span class="val">${fmtTZS(totalHarvest*s.priceKg)}</span></div>
  `;

  // 4. FOCUS
  const phase=monthC.phase;
  const t=state.tasks[phase]||{daily:'—',weekly:'—',monthly:'—'};
  $('#focusDaily').textContent=t.daily; $('#focusWeekly').textContent=t.weekly; $('#focusMonthly').textContent=t.monthly;

  renderCharts();
}

function getDaysSinceRain(){
  const sorted=[...state.logs].sort((a,b)=>b.date.localeCompare(a.date));
  for(const l of sorted){if(Number(l.rain||0)>=1)return daysBetween(parseDate(l.date),today());}
  return 999;
}

function renderCharts(){
  if(!window.Chart)return;
  const now=today();const labels=[],actual=[],normal=[];
  for(let i=13;i>=0;i--){
    const d=new Date(now);d.setDate(d.getDate()-i);labels.push(fmtDateShort(d));
    const log=state.logs.find(l=>l.date===fmtDate(d));const c=climateFor(d);
    actual.push(log?Number(log.rain||0):0);normal.push(Number((c.rain/new Date(d.getFullYear(),d.getMonth()+1,0).getDate()).toFixed(1)));
  }
  if(charts.rain)charts.rain.destroy();
  charts.rain=new Chart(document.getElementById('chartRain'),{
    type:'bar',data:{labels,datasets:[{label:'Actual',data:actual,backgroundColor:'#3f9c69'},{label:'Normal',data:normal,type:'line',borderColor:'#c89512',borderDash:[4,4],pointRadius:0}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{display:false},y:{beginAtZero:true}}}
  });

  const fLabels=[],fInc=[],fExp=[];const months={};
  state.finance.forEach(f=>{const m=f.date.slice(0,7);if(!months[m])months[m]={inc:0,exp:0};if(f.type==='income')months[m].inc+=Number(f.amount||0);else months[m].exp+=Number(f.amount||0);});
  Object.keys(months).sort().slice(-6).forEach(m=>{fLabels.push(m);fInc.push(months[m].inc);fExp.push(months[m].exp);});
  if(charts.finance)charts.finance.destroy();
  charts.finance=new Chart(document.getElementById('chartFinance'),{
    type:'bar',data:{labels:fLabels,datasets:[{label:'Inc',data:fInc,backgroundColor:'#2d7a52'},{label:'Exp',data:fExp,backgroundColor:'#c0392b'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true}}}
  });
}