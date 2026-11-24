const LS_KEY='terracore_v7';
const SESSION_KEY='terracore_session';

const CLIMATE=[
  {m:0,name:'January',phase:'Hot Dry',rain:60,high:32,hum:78},{m:1,name:'February',phase:'Hot Dry',rain:70,high:32,hum:78},
  {m:2,name:'March',phase:'Long Rains',rain:150,high:32,hum:82},{m:3,name:'April',phase:'Long Rains',rain:260,high:31,hum:86},
  {m:4,name:'May',phase:'Long Rains Tapering',rain:180,high:30,hum:84},{m:5,name:'June',phase:'Cool Dry',rain:40,high:29,hum:76},
  {m:6,name:'July',phase:'Cool Dry',rain:25,high:29,hum:74},{m:7,name:'August',phase:'Cool Dry',rain:20,high:29,hum:74},
  {m:8,name:'September',phase:'Cool Dry',rain:25,high:30,hum:76},{m:9,name:'October',phase:'Short Rains',rain:70,high:31,hum:80},
  {m:10,name:'November',phase:'Short Rains',rain:140,high:31,hum:84},{m:11,name:'December',phase:'Short Rains Tapering',rain:90,high:32,hum:80}
];

const INCOME_CATS=['Sales','Other income'];
const EXPENSE_CATS=['Start-up investment','Planting inputs','Field costs','Picking, packaging & transport','Land lease & overheads','Other costs'];

function defaultState(){
  return {
    setup:{
      farmName:'Terracore Fresh Ltd', seasonStart:'2025-10-06', pin:'2468',
      pumpFlow: 50, pumpPower: 15, elecRate: 300,
      startCapital: 0, lookback: 30, planSales: 0, planSpend: 0,
      shareholders:[{name:'Samwel Mwamfupe',percent:0.6},{name:'Abdul Yusufu',percent:0.4}]
    },
    logs:[],      // bmf.xlsx
    cashbook:[]   // eeh.xlsx
  };
}

let state=load();
let liveWeather=null;
let currentUser={name:'—',role:null};
let calDate = new Date();

function load(){
  try{
    const raw=localStorage.getItem(LS_KEY);
    if(!raw)return defaultState();
    const parsed=JSON.parse(raw);const base=defaultState();
    return {setup:{...base.setup,...(parsed.setup||{})},logs:Array.isArray(parsed.logs)?parsed.logs:[],cashbook:Array.isArray(parsed.cashbook)?parsed.cashbook:[]};
  }catch(e){return defaultState();}
}
function save(){localStorage.setItem(LS_KEY,JSON.stringify(state));}

const $=s=>document.querySelector(s);const $$=s=>document.querySelectorAll(s);
const pad=n=>String(n).padStart(2,'0');
const fmtDate=d=>{if(!(d instanceof Date))d=new Date(d);return d.toISOString().slice(0,10);};
const fmtDateShort=d=>{if(!(d instanceof Date))d=new Date(d);return d.toLocaleDateString('en-GB',{day:'2-digit',month:'short'});};
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d;};
const parseDate=s=>{if(!s)return null;const d=new Date(s+'T00:00:00');return isNaN(d)?null:d;};
const daysBetween=(a,b)=>Math.floor((b-a)/(1000*60*60*24));
const fmtNum=n=>Number(n||0).toLocaleString('en-US');
const fmtTZS=n=>'TZS '+Number(Math.round(n||0)).toLocaleString('en-US');
const climateFor=date=>CLIMATE[date.getMonth()];

function toast(msg,isErr){const t=$('#toast');t.textContent=msg;t.className=isErr?'show err':'show';clearTimeout(t._t);t._t=setTimeout(()=>t.className='',2500);}

$('#loginForm').addEventListener('submit',e=>{
  e.preventDefault();const name=$('#loginName').value.trim();const role=$('#loginRole').value;const pin=$('#loginPin').value.trim();
  if(!name){toast('Enter name',true);return;} if(pin!==state.setup.pin){toast('Incorrect PIN',true);return;}
  currentUser={name,role};sessionStorage.setItem(SESSION_KEY,JSON.stringify(currentUser));enterApp();
});

function enterApp(){
  $('#loginGate').style.display='none';$('#app').classList.add('ready');$('#userAvatar').textContent=(currentUser.name[0]||'?').toUpperCase();
  refreshAll();
}

$('#logoutBtn').addEventListener('click',()=>{sessionStorage.removeItem(SESSION_KEY);location.reload();});
$$('.tab').forEach(tab=>{tab.addEventListener('click',()=>switchTab(tab.dataset.tab));});

function switchTab(name){
  $$('.tab').forEach(t=>t.classList.toggle('active',t.dataset.tab===name));
  $$('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+name));
  window.scrollTo({top:0,behavior:'smooth'});
  if(name==='dashboard')renderDashboard();
  if(name==='daily'){renderCalendar();renderDailyTable();}
  if(name==='cashbook')renderCashbook();
  if(name==='shareholders')renderShareholders();
  if(name==='setup')fillSetupForms();
}