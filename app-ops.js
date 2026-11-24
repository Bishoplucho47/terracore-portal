function fillSetupForms(){
  const s = state.setup;
  
  // Farm Setup
  const f1 = $('#farmSetupForm');
  f1.farmName.value = s.farmName; f1.seasonStart.value = s.seasonStart; f1.pin.value = s.pin;
  f1.pumpFlow.value = s.pumpFlow; f1.pumpPower.value = s.pumpPower; f1.elecRate.value = s.elecRate;
  
  // Finance Setup
  const f2 = $('#finSetupForm');
  f2.startCapital.value = s.startCapital; f2.lookback.value = s.lookback;
  f2.planSales.value = s.planSales; f2.planSpend.value = s.planSpend;
  f2.shareholders.value = s.shareholders.map(x=>`${x.name}|${x.percent*100}`).join(', ');
}

$('#farmSetupForm').addEventListener('submit',e=>{
  e.preventDefault();
  const f = e.target;
  state.setup = {
    ...state.setup,
    farmName: f.farmName.value, seasonStart: f.seasonStart.value, pin: f.pin.value,
    pumpFlow: parseFloat(f.pumpFlow.value), pumpPower: parseFloat(f.pumpPower.value), elecRate: parseFloat(f.elecRate.value)
  };
  save(); toast('Farm Setup saved'); renderDashboard();
});

$('#finSetupForm').addEventListener('submit',e=>{
  e.preventDefault();
  const f = e.target;
  const shRaw = f.shareholders.value.split(',');
  const shArr = shRaw.map(str=>{
    const parts = str.split('|');
    if(parts.length === 2) return {name:parts[0].trim(), percent: parseFloat(parts[1].trim())/100};
    return null;
  }).filter(x=>x);

  state.setup = {
    ...state.setup,
    startCapital: Number(f.startCapital.value), lookback: Number(f.lookback.value),
    planSales: Number(f.planSales.value), planSpend: Number(f.planSpend.value),
    shareholders: shArr
  };
  save(); toast('Finance Setup saved'); renderDashboard();
});