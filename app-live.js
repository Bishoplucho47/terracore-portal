async function fetchWeather(){
  try{
    const url=`https://api.open-meteo.com/v1/forecast?latitude=-6.4333&longitude=38.9000&current=temperature_2m,relative_humidity_2m,precipitation,weather_code&timezone=Africa%2FDar_es_Salaam`;
    const r=await fetch(url);if(!r.ok)throw new Error();liveWeather=await r.json();
  }catch(e){liveWeather=null;}
  if(liveWeather){$('#weatherChipText').textContent=`${Math.round(liveWeather.current.temperature_2m)}°C`;}
  else{$('#weatherChipText').textContent='Offline';}
}

function getDayStatus(log){
  if(!log) return 'To do';
  if(log.weather && (log.pumpHours || log.rain) && log.initials) return 'Done';
  return 'To do';
}

function renderDashboard(){
  const now = today();
  const s = state.setup;
  const seasonStart = parseDate(s.seasonStart);
  const monthC = climateFor(now);

  // --- 1. FINANCE (eeh.xlsx) ---
  const totalIncome = state.cashbook.filter(c=>c.type==='income').reduce((a,b)=>a+Number(b.amount||0),0);
  const totalExpense = state.cashbook.filter(c=>c.type==='expense').reduce((a,b)=>a+Number(b.amount||0),0);
  const totalCapital = state.cashbook.filter(c=>c.type==='capital' && c.category==='Capital injection').reduce((a,b)=>a+Number(b.amount||0),0);
  const totalPayout = state.cashbook.filter(c=>c.type==='capital' && c.category==='Shareholder payout').reduce((a,b)=>a+Number(b.amount||0),0);
  
  const cashInHand = s.startCapital + totalIncome - totalExpense + totalCapital - totalPayout;
  const netResult = totalIncome - totalExpense;

  $('#kpiCash').className = `kpi-card ${cashInHand < 0 ? 'red' : 'green'}`;
  $('#kpiCash .val').textContent = fmtTZS(cashInHand);
  
  $('#kpiSales').className = `kpi-card green`;
  $('#kpiSales .val').textContent = fmtTZS(totalIncome);
  $('#kpiSalesSub').textContent = `Plan: ${fmtTZS(s.planSales)}`;

  $('#kpiSpend').className = `kpi-card red`;
  $('#kpiSpend .val').textContent = fmtTZS(totalExpense);
  $('#kpiSpendSub').textContent = `Plan: ${fmtTZS(s.planSpend)}`;

  $('#kpiNet').className = `kpi-card ${netResult < 0 ? 'red' : 'green'}`;
  $('#kpiNet .val').textContent = fmtTZS(netResult);
  
  // Health Score Logic
  let green = 0, red = 0;
  if(cashInHand > 0) green++; else red++;
  if(netResult > 0) green++; else red++;
  if(totalIncome >= s.planSales) green++; else red++;
  if(totalExpense <= s.planSpend) green++; else red++;
  
  const healthPct = Math.round((green / 4) * 100);
  let healthLabel = 'GOOD', healthClass = 'ok', healthIcon = '🟢';
  if(healthPct < 40) { healthLabel='CRITICAL'; healthClass='danger'; healthIcon='🔴'; }
  else if(healthPct < 70) { healthLabel='WATCH'; healthClass='warn'; healthIcon='🟡'; }
  
  $('#healthChip').textContent = `${healthIcon} ${healthPct}%`;
  const banner = $('#healthBanner');
  banner.className = `alert-banner ${healthClass}`;
  banner.innerHTML = `<span class="ico">${healthIcon}</span><div><strong>BUSINESS HEALTH ${healthPct}%</strong> | ${healthLabel} | Net: ${fmtTZS(netResult)}</div>`;

  // --- 2. RIGHT NOW & CLIMATE (bmf.xlsx) ---
  $('#rnDate').textContent = now.toLocaleDateString('en-GB',{weekday:'short', day:'2-digit', month:'short'});
  let seasonDayText = '—';
  if(seasonStart){
    const diff = daysBetween(seasonStart, now) + 1;
    seasonDayText = diff >= 1 ? 'Day ' + diff : 'Starts in ' + Math.abs(diff) + ' days';
  }
  $('#rnSeason').textContent = seasonDayText;
  $('#rnPhase').textContent = monthC.phase;
  
  const normalDailyRain = (monthC.rain / new Date(now.getFullYear(), now.getMonth()+1, 0).getDate()).toFixed(1);
  $('#rnNormal').textContent = `${monthC.high}°C / ${normalDailyRain} mm`;

  const todaysLog = state.logs.find(l => l.date === fmtDate(now));
  let actionText = 'Pick today\'s weather in the Farm Log.';
  let actionLevel = 'ok';
  if (todaysLog) {
    const rain = Number(todaysLog.rain || 0);
    if (todaysLog.weather === 'Sunny' && monthC.high >= 33) {
      actionText = 'HEAT STRESS: irrigate early, mulch.';
      actionLevel = 'danger';
    } else if (rain >= 20) {
      actionText = 'HEAVY RAIN: hold spraying, clear drains.';
      actionLevel = 'danger';
    } else if (rain > 0) {
      actionText = 'Rain recorded: skip irrigation today.';
    } else {
      const deficit = Math.max(0, monthC.rain/30 - rain);
      const suggestedHours = (deficit / s.pumpFlow).toFixed(1);
      actionText = suggestedHours > 0 ? `IRRIGATE about ${suggestedHours} pump hours today.` : 'No irrigation needed today.';
      actionLevel = suggestedHours > 0 ? 'warn' : 'ok';
    }
  } else {
    actionLevel = 'warn';
  }
  $('#rnAction').textContent = actionText;
  $('#rnAction').style.background = actionLevel==='danger'?'var(--red-light)':actionLevel==='warn'?'var(--amber-light)':'var(--green-100)';
  $('#rnAction').style.color = actionLevel==='danger'?'var(--red)':actionLevel==='warn'?'var(--amber)':'var(--green-800)';

  // --- 3. SEASON TO DATE OPS (bmf.xlsx) ---
  const closedLogs = state.logs.filter(l => l.initials && l.initials.trim() !== '');
  const totalDaysElapsed = seasonStart ? Math.max(0, daysBetween(seasonStart, now) + 1) : 0;
  const totalRain = closedLogs.reduce((sum, l) => sum + Number(l.rain || 0), 0);
  const totalPumpHours = closedLogs.reduce((sum, l) => sum + Number(l.pumpHours || 0), 0);
  const totalWater = totalPumpHours * s.pumpFlow;
  const totalEnergy = totalPumpHours * s.pumpPower;
  const totalHarvest = closedLogs.reduce((sum, l) => sum + Number(l.harvest || 0), 0);

  $('#seasonGrid').innerHTML = `
    <div class="rw-row"><span>Days Closed</span><strong>${closedLogs.length} / ${totalDaysElapsed}</strong></div>
    <div class="rw-row"><span>Rain Recorded</span><strong>${Math.round(totalRain)} mm</strong></div>
    <div class="rw-row"><span>Pump Hours</span><strong>${totalPumpHours.toFixed(1)} h</strong></div>
    <div class="rw-row"><span>Water Used</span><strong>${fmtNum(totalWater)} m³</strong></div>
    <div class="rw-row"><span>Electricity</span><strong>${fmtNum(totalEnergy)} kWh</strong></div>
    <div class="rw-row"><span>Harvest</span><strong>${fmtNum(totalHarvest)} kg</strong></div>
  `;

  renderCharts();
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
  state.cashbook.forEach(f=>{const m=f.date.slice(0,7);if(!months[m])months[m]={inc:0,exp:0};if(f.type==='income')months[m].inc+=Number(f.amount||0);else if(f.type==='expense')months[m].exp+=Number(f.amount||0);});
  Object.keys(months).sort().slice(-6).forEach(m=>{fLabels.push(m);fInc.push(months[m].inc);fExp.push(months[m].exp);});
  if(charts.finance)charts.finance.destroy();
  charts.finance=new Chart(document.getElementById('chartFinance'),{
    type:'bar',data:{labels:fLabels,datasets:[{label:'Inc',data:fInc,backgroundColor:'#2d7a52'},{label:'Exp',data:fExp,backgroundColor:'#c0392b'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{position:'bottom'}},scales:{x:{stacked:true},y:{stacked:true,beginAtZero:true}}}
  });
}