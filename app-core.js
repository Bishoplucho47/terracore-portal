const LS_KEY='terracore_v2';
const SESSION_KEY='terracore_session';

const CLIMATE=[
  {m:0,name:'January',phase:'Hot Dry',rain:60,high:32,hum:78},{m:1,name:'February',phase:'Hot Dry',rain:70,high:32,hum:78},
  {m:2,name:'March',phase:'Long Rains',rain:150,high:32,hum:82},{m:3,name:'April',phase:'Long Rains',rain:260,high:31,hum:86},
  {m:4,name:'May',phase:'Long Rains Tapering',rain:180,high:30,hum:84},{m:5,name:'June',phase:'Cool Dry',rain:40,high:29,hum:76},
  {m:6,name:'July',phase:'Cool Dry',rain:25,high:29,hum:74},{m:7,name:'August',phase:'Cool Dry',rain:20,high:29,hum:74},
  {m:8,name:'September',phase:'Cool Dry',rain:25,high:30,hum:76},{m:9,name:'October',phase:'Short Rains',rain:70,high:31,hum:80},
  {m:10,name:'November',phase:'Short Rains',rain:140,high:31,hum:84},{m:11,name:'December',phase:'Short Rains Tapering',rain:90,high:32,hum:80}
];

const INCOME_CATS=['Harvest sales','Livestock','Other income'];
const EXPENSE_CATS=['Labour','Seed','Fertiliser','Fuel','Transport','Other'];

const WEATHER_CODES={0:['Clear','☀️'],1:['Mainly clear','🌤️'],2:['Partly cloudy','⛅'],3:['Overcast','☁️'],45:['Fog','🌫️'],51:['Drizzle','🌦️'],61:['Rain','🌧️'],63:['Rain','🌧️'],65:['Heavy rain','🌧️'],80:['Showers','🌦️'],95:['Thunderstorm','⛈️']};

function defaultState(){
  return {setup:{farmName:'Terracore Fresh Ltd',seasonStart:'2025-10-06',pin:'2468',thHeat:33,thRain:20,thHum:85,thDry:5,priceKg:1200,rateHr:3500},logs:[],finance:[],tasks:{}};
}

let state=load();
let liveWeather=null;
let charts={rain:null,finance:null};
let currentUser={name:'—',role:null};
let calDate = new Date(); // For calendar view

function load(){
  try{
    const raw=localStorage.getItem(LS_KEY);
    if(!raw){
      // Migrate from v1 if exists
      const old=localStorage.getItem('terracore_v1');
      if(old){ const parsed=JSON.parse(old); localStorage.setItem(LS_KEY,JSON.stringify(parsed)); return parsed; }
      return defaultState();
    }
    const parsed=JSON.parse(raw);
    const base=defaultState();
    return {setup:{...base.setup,...(parsed.setup||{})},logs:Array.isArray(parsed.logs)?parsed.logs:[],finance:Array.isArray(parsed.finance)?parsed.finance:[],tasks:parsed.tasks||{}};
  }catch(e){return defaultState();}
}
function save(){localStorage.setItem(LS_KEY,JSON.stringify(state));}

const $=s=>document.querySelector(s);
const $$=s=>document.querySelectorAll(s);
const pad=n=>String(n).padStart(2,'0');
const fmtDate=d=>{if(!(d instanceof Date))d=new Date(d);return d.toISOString().slice(0,10);};
const fmtDateShort=d=>{if(!(d instanceof Date))d=new Date(d);return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});};
const daysBetween=(a,b)=>Math.floor((b-a)/(1000*60*60*24));
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d;};
const parseDate=s=>{if(!s)return null;const d=new Date(s+'T00:00:00');return isNaN(d)?null:d;};
const fmtNum=n=>Number(n||0).toLocaleString('en-US');
const fmtTZS=n=>'TZS '+Number(Math.round(n||0)).toLocaleString('en-US');
const weatherInfo=c=>WEATHER_CODES[c]||['—','🌡️'];
const phaseFor=date=>CLIMATE[date.getMonth()].phase;
const climateFor=date=>CLIMATE[date.getMonth()];

function toast(msg,isErr){
  const t=$('#toast');
  t.textContent=msg;
  t.className=isErr?'show err':'show';
  clearTimeout(t._t);
  t._t=setTimeout(()=>t.className='',2500);
}

$('#loginForm').addEventListener('submit',e=>{
  e.preventDefault();
  const name=$('#loginName').value.trim();
  const role=$('#loginRole').value;
  const pin=$('#loginPin').value.trim();
  if(!name){toast('Enter name',true);return;}
  if(pin!==state.setup.pin){toast('Incorrect PIN',true);return;}
  currentUser={name,role};
  sessionStorage.setItem(SESSION_KEY,JSON.stringify(currentUser));
  enterApp();
});

function enterApp(){
  $('#loginGate').style.display='none';
  $('#app').classList.add('ready');
  $('#userName').textContent=currentUser.name;
  const roleMap={operator:'Operator',manager:'Manager',shareholder:'Shareholder'};
  $('#userRole').textContent=roleMap[currentUser.role]||'—';
  $('#userAvatar').textContent=(currentUser.name[0]||'?').toUpperCase();
  applyRole();
  refreshAll();
}

$('#logoutBtn').addEventListener('click',()=>{sessionStorage.removeItem(SESSION_KEY);location.reload();});

function applyRole(){
  const r=currentUser.role;
  const allowed={operator:['dashboard','daily','tasks'],manager:['dashboard','daily','weekly','monthly','finance','tasks','setup'],shareholder:['dashboard','finance']}[r]||['dashboard'];
  $$('.tab').forEach(t=>{t.style.display=allowed.includes(t.dataset.tab)?'':'none';});
}

$$('.tab').forEach(tab=>{tab.addEventListener('click',()=>switchTab(tab.dataset.tab));});

function switchTab(name){
  $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===name));
  $$('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+name));
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='dashboard'){ setTimeout(()=>{ renderCharts(); }, 30); }
  if(name==='daily'){ renderCalendar(); renderDailyTable(); }
  if(name==='weekly')renderWeekly();
  if(name==='monthly')renderMonthly();
  if(name==='finance')renderFinance();
  if(name==='tasks')renderTasks();
  if(name==='setup')fillSetupForm();
}