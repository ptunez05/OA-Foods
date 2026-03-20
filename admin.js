// OA Shop Book — admin.js  v3.3 Final
// Auth, navigation, API, Shop Today, Sales & Orders, Offline Queue

var API = 'https://script.google.com/macros/s/AKfycbzBsrATkHIq6v4TtiFXsXEBxPbdHSpmDwp10a0LavYJnnMa12BMHNLbsnhO2rQtCwdOGw/exec';
var SESSION_KEY       = 'oa_sb_session';
var SESSION_TIMEOUT   = 14400000; // 4 hours
var OFFLINE_QUEUE_KEY = 'oa_sb_offline_queue';

var APP = {
  role:'', name:'', pulseData:null,
  currentOrderTab:'pending', currentPeopleTab:'retail',
  currentStockTab:'levels', currentSettingsTab:'general',
  allProducts:[], openDrawer:''
};

// ── AUTH ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  var saved = getSavedSession();
  if (saved) { APP.role=saved.role; APP.name=saved.name; bootApp(); }
  var pw = document.getElementById('login-pw');
  if (pw) pw.addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });
  var theme = localStorage.getItem('oa_theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeBtn(theme);
  initOfflineHandling();
  initChartStates();
});

function getSavedSession() {
  try {
    var s = JSON.parse(sessionStorage.getItem(SESSION_KEY)||'null');
    if (!s) return null;
    if (Date.now()-s.ts > SESSION_TIMEOUT) { sessionStorage.removeItem(SESSION_KEY); return null; }
    return s;
  } catch(e) { return null; }
}

function doLogin() {
  var btn=document.getElementById('login-btn'), txt=document.getElementById('login-btn-text');
  var err=document.getElementById('login-err'), pw=document.getElementById('login-pw').value.trim();
  if (!pw) return;
  err.classList.add('hidden'); btn.disabled=true; txt.textContent='Checking…';
  call('login',{password:pw}).then(function(res){
    if (res.success) {
      APP.role=res.role; APP.name=res.name;
      sessionStorage.setItem(SESSION_KEY,JSON.stringify({role:res.role,name:res.name,ts:Date.now()}));
      bootApp();
    } else {
      err.classList.remove('hidden'); err.textContent=res.message||'Wrong password. Try again.';
      btn.disabled=false; txt.textContent='Sign In';
    }
  }).catch(function(){
    err.classList.remove('hidden'); err.textContent='Could not connect. Check your internet.';
    btn.disabled=false; txt.textContent='Sign In';
  });
}

function bootApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('sb-role').textContent = APP.role==='master'?'Full Admin':APP.name||'Staff';
  if (APP.role!=='master') document.querySelectorAll('.master-only').forEach(function(el){ el.style.display='none'; });
  var av=document.getElementById('greeting-avatar');
  if (av&&APP.name) av.textContent=initials(APP.name);
  loadToday();
  refreshSessionTimer();
}

function doLogout() {
  sessionStorage.removeItem(SESSION_KEY); APP.role=''; APP.name='';
  document.getElementById('app').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
  document.getElementById('login-pw').value='';
  document.getElementById('login-err').classList.add('hidden');
  var sb=document.getElementById('sidebar'); if(sb) sb.classList.remove('open');
  var mn=document.getElementById('bn-more-menu'); if(mn) mn.classList.remove('open');
}

function refreshSessionTimer() {
  ['click','scroll','keydown','input','touchstart'].forEach(function(evt){
    var opts=(evt==='scroll'||evt==='touchstart')?{passive:true}:false;
    document.addEventListener(evt,function(){
      var s=getSavedSession();
      if(s){s.ts=Date.now();sessionStorage.setItem(SESSION_KEY,JSON.stringify(s));}
    },opts);
  });
}

// ── THEME ─────────────────────────────────────────────────────────────────────

function toggleTheme() {
  var cur=document.documentElement.getAttribute('data-theme')||'light';
  var next=cur==='light'?'dark':'light';
  document.documentElement.setAttribute('data-theme',next);
  localStorage.setItem('oa_theme',next); updateThemeBtn(next);
}
function updateThemeBtn(theme) {
  var btn=document.getElementById('theme-btn');
  if(btn) btn.textContent=theme==='light'?'🌙':'☀️';
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────

function goto(name,el) {
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); p.classList.add('hidden'); });
  document.querySelectorAll('.sb-link').forEach(function(l){ l.classList.remove('active'); });
  document.querySelectorAll('.bn-tab').forEach(function(b){ b.classList.remove('active'); });
  var page=document.getElementById('page-'+name);
  if(page){page.classList.remove('hidden');page.classList.add('active');}
  if(el) el.classList.add('active');
  var titles={today:'Shop Today',orders:'Sales & Orders',items:'Items in Shop',
    stock:'My Stock',people:'People Asking',customers:'My Customers',
    money:'Money Records',settings:'Shop Settings'};
  var tb=document.getElementById('tb-title'); if(tb) tb.textContent=titles[name]||name;
  var sb=document.getElementById('sidebar'); if(sb) sb.classList.remove('open');
  updateBottomNavForPage(name);
  if(name==='today')     loadToday();
  if(name==='orders')    loadOrders('pending');
  if(name==='items')     loadItems();
  if(name==='stock')     loadStock('levels');
  if(name==='people')    loadPeople('retail');
  if(name==='customers') loadCustomers();
  if(name==='money')     loadMoney();
  if(name==='settings')  loadSettings('general');
}
function toggleSidebar(){ var s=document.getElementById('sidebar'); if(s) s.classList.toggle('open'); }
function updateBottomNavForPage(name){
  var map={today:0,orders:1,items:2,people:3}; if(map[name]!==undefined) updateBottomNav(map[name]);
}
function updateBottomNav(idx){
  document.querySelectorAll('.bn-tab').forEach(function(tab,i){
    if(i===idx) tab.classList.add('active'); else if(i<4) tab.classList.remove('active');
  });
}
function toggleMoreMenu(){ var m=document.getElementById('bn-more-menu'); if(m) m.classList.toggle('open'); }

// ── OFFLINE QUEUE ─────────────────────────────────────────────────────────────

function initOfflineHandling(){
  window.addEventListener('online', function(){ showOfflineStatus(false); drainQueue(); });
  window.addEventListener('offline',function(){ showOfflineStatus(true); });
  if(!navigator.onLine) showOfflineStatus(true);
}
function showOfflineStatus(isOffline){
  var el=document.getElementById('offline-indicator'); if(!el) return;
  if(isOffline) el.classList.remove('hidden'); else el.classList.add('hidden');
}
function showSyncStatus(show,msg){
  var el=document.getElementById('sync-status'); if(!el) return;
  if(show){el.textContent=msg||'Syncing…';el.classList.remove('hidden');}else el.classList.add('hidden');
}
function queueRequest(action,params){
  var q=JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)||'[]');
  q.push({action:action,params:params,timestamp:Date.now(),id:'req_'+Date.now()+'_'+Math.random().toString(36).substr(2,9)});
  localStorage.setItem(OFFLINE_QUEUE_KEY,JSON.stringify(q));
  showOfflineStatus(true);
  toast('Saved offline — will sync when you reconnect','bad');
  return Promise.resolve({success:false,offline:true,queued:true});
}
function drainQueue(){
  var q=JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)||'[]');
  if(!q.length) return;
  var total=q.length;
  var failed=[];
  showSyncStatus(true,'Sending '+total+' saved change'+(total>1?'s':'')+'…');

  // Skip-and-continue: process ALL items, collect failures at end
  var processAll=function(remaining){
    if(!remaining.length){
      // All processed — save any failures back to queue
      if(failed.length){
        localStorage.setItem(OFFLINE_QUEUE_KEY,JSON.stringify(failed));
        showSyncStatus(false);
        var sent=total-failed.length;
        toast((sent>0?sent+' change'+(sent>1?'s':'')+' sent, ':'')+failed.length+' could not send — will retry when online','bad');
      } else {
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
        showSyncStatus(false);
        toast('All '+total+' change'+(total>1?'s':'')+' synced!','good');
        loadToday();
      }
      return;
    }
    var req=remaining.shift();
    call(req.action,req.params).then(function(res){
      if(!res.success){ req._retries=(req._retries||0)+1; failed.push(req); }
      processAll(remaining);
    }).catch(function(){
      // Network error mid-drain — requeue everything remaining + this item + already-failed
      var requeue=[req].concat(remaining).concat(failed);
      localStorage.setItem(OFFLINE_QUEUE_KEY,JSON.stringify(requeue));
      showSyncStatus(false);
      toast('Sync paused — connection dropped. Will retry when back online.','bad');
    });
  };
  processAll(q.slice()); // pass a copy so we can mutate freely
}

// ── API ───────────────────────────────────────────────────────────────────────

function call(action,params){
  if(!navigator.onLine) return queueRequest(action,params);
  var body=Object.assign({action:action},params||{});
  return fetch(API,{method:'POST',headers:{'Content-Type':'text/plain'},body:JSON.stringify(body)}).then(function(r){return r.json();});
}
function toast(msg,type){
  var t=document.getElementById('toast'); if(!t) return;
  t.textContent=msg; t.className='toast show '+(type||'');
  setTimeout(function(){t.className='toast hidden';},3000);
}
function closeModal(id){ var el=document.getElementById(id); if(el) el.classList.add('hidden'); }
document.addEventListener('click',function(e){
  if(e.target.classList.contains('modal-bg'))
    document.querySelectorAll('.modal-bg').forEach(function(m){m.classList.add('hidden');});
  if(!e.target.closest('.bottom-nav')&&!e.target.closest('.bn-more-menu')){
    var mn=document.getElementById('bn-more-menu'); if(mn) mn.classList.remove('open');
  }
});

function fmt(v)  { return (parseFloat(v)||0).toLocaleString('en-NG'); }
function fmtK(v) { var n=parseFloat(v)||0; if(n>=1000000) return '₦'+(n/1000000).toFixed(1)+'M'; if(n>=1000) return '₦'+(n/1000).toFixed(0)+'k'; return '₦'+fmt(n); }
function esc(s)  { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function badge(text,cls){ return '<span class="badge badge-'+esc(cls||text)+'">'+esc(text)+'</span>'; }
function initials(name){ var p=String(name||'').trim().split(/\s+/); return (p[0]?p[0][0]:'')+(p[1]?p[1][0]:''); }

// ── CHART COLLAPSE ────────────────────────────────────────────────────────────

function initChartStates(){
  ['chart-months','chart-sellers'].forEach(function(id){
    var block=document.getElementById(id);
    if(block&&localStorage.getItem('oa_'+id+'_collapsed')==='true') block.classList.add('collapsed');
  });
}
function toggleChart(chartId){
  var block=document.getElementById(chartId); if(!block) return;
  var c=block.classList.toggle('collapsed');
  localStorage.setItem('oa_'+chartId+'_collapsed',c);
}

// ── SHOP TODAY ────────────────────────────────────────────────────────────────

function loadToday(){
  renderGreeting();
  call('getShopPulse').then(function(res){
    if(!res.success){toast('Could not load shop data','bad');return;}
    APP.pulseData=res.data;
    renderPulseRings(res.data); renderMetricCards(res.data); renderTargetBar(res.data);
    renderMonthlyChart(res.data); renderTopSellers(res.data);
    renderLowStockBanner(res.data); updateNavDots(res.data);
  }).catch(function(){toast('Connection issue — check internet','bad');});
}

// Time-based greeting (Kimi image 8)
function renderGreeting(){
  var el=document.getElementById('today-greeting'); if(!el) return;
  var h=new Date().getHours();
  var period=h<12?'MORNING':h<17?'AFTERNOON':'EVENING';
  var name=APP.name?', '+APP.name.split(' ')[0]:', MANAGER';
  el.textContent=period+name;
}

// Pulse rings — grey=no activity, red=negative, yellow=minor, green=strong positive
function renderPulseRings(d){
  // Determine colour: grey when null/missing/zero-activity
  var moneyC  = d.money_pulse  || ((!d.money_in_this_month || d.money_in_this_month===0)  ? 'grey' : 'red');
  var stockC  = d.stock_pulse  || ((!d.stock_worth || d.stock_worth===0)                   ? 'grey' : 'red');
  var peopleC = d.people_pulse || (((d.retail_clients||0)+(d.wholesale_clients||0)+(d.distributor_clients||0))===0 ? 'grey' : 'red');

  setPulse('ring-money',  moneyC);
  setPulse('ring-stock',  stockC);
  setPulse('ring-people', peopleC);

  var ml={green:'FLOWING WELL',  yellow:'MOVING STEADY', red:'NEEDS ATTENTION', grey:'NO DATA YET'};
  var sl={green:'ALL STOCKED UP',yellow:'LOSING STEAM',  red:'RUNNING DRY',    grey:'NO RECORDS YET'};
  var pl={green:'ALL QUIET',     yellow:'SOME INTEREST', red:'HIGH VOLUME',    grey:'NO LEADS YET'};
  setStatusText('pulse-money-label',  ml[moneyC]||ml.grey,  moneyC);
  setStatusText('pulse-stock-label',  sl[stockC]||sl.grey,  stockC);
  setStatusText('pulse-people-label', pl[peopleC]||pl.grey, peopleC);
}
function setPulse(id,colour){ var el=document.getElementById(id); if(el) el.className='pulse-ring '+colour; }
function setStatusText(id,text,colour){
  var el=document.getElementById(id); if(!el) return;
  el.textContent=text; el.className='pulse-status-text pulse-text-'+colour;
}

function expandPulse(type){
  var d=APP.pulseData; if(!d) return;
  if(APP.openDrawer===type){ document.getElementById('drawer-'+type).classList.add('hidden'); APP.openDrawer=''; return; }
  ['money','stock-p','people-p'].forEach(function(t){ document.getElementById('drawer-'+t).classList.add('hidden'); });
  APP.openDrawer=type;
  var drawer=document.getElementById('drawer-'+type); drawer.classList.remove('hidden');
  if(type==='money'){
    var ch=d.money_change_pct||0, arr=ch>0?'▲':ch<0?'▼':'—', col=ch>0?'color:var(--green)':ch<0?'color:var(--red)':'';
    drawer.innerHTML='<div class="drawer-msg">'+esc(d.money_message)+'</div>'+
      drow('Money in this month','₦'+fmt(d.money_in_this_month))+
      drow('Last month','₦'+fmt(d.money_in_last_month))+
      drow('Change vs last month','<span style="'+col+'">'+arr+' '+Math.abs(ch)+'%</span>')+
      drow('People still owe you','₦'+fmt(d.people_still_owe_you))+
      drow('Monthly goal','₦'+fmt(d.monthly_target))+
      drow('Goal reached',d.target_reached_pct+'%');
  }
  if(type==='stock-p'){
    var items=d.items_running_low||[];
    var inner='<div class="drawer-msg">'+esc(d.stock_message)+'</div>'+
      drow('What your stock is worth','₦'+fmt(d.stock_worth))+
      drow('If you sell everything today','₦'+fmt(d.if_all_sold))+
      drow('Possible profit from all stock','₦'+fmt(d.possible_profit));
    if(items.length){
      inner+='<div class="drawer-detail" style="margin-top:10px;font-weight:800">Items running low:</div>';
      items.forEach(function(i){ inner+=drow(esc(i.name),'<span style="color:var(--red);font-weight:800">'+i.stock+' left</span> (alert at '+i.alert_level+')'); });
    }
    drawer.innerHTML=inner;
  }
  if(type==='people-p'){
    drawer.innerHTML='<div class="drawer-msg">'+esc(d.people_message)+'</div>'+
      drow('Small shops asking',d.retail_clients||0)+
      drow('Wholesalers asking',d.wholesale_clients||0)+
      drow('Distributors',d.distributor_clients||0)+
      drow('Follow-ups overdue',d.follow_ups_overdue||0);
  }
}
function drow(label,val){ return '<div class="drawer-row"><span>'+label+'</span><strong>'+val+'</strong></div>'; }

function renderMetricCards(d){
  var grid=document.getElementById('metric-grid'); if(!grid) return;
  grid.innerHTML=
    mCard('mc-money',  '₦'+fmt(d.money_in_this_month),'MONEY IN',
      'All-time: ₦'+fmt(d.total_money_in),'vs last month: '+(d.money_change_pct>0?'+':'')+(d.money_change_pct||0)+'%')+
    mCard('mc-orders', String(d.orders_waiting||0),'ORDERS WAITING',
      'Confirmed today: '+(d.confirmed_orders||0),'Fell through: '+(d.failed_orders||0))+
    mCard('mc-stock',  String(d.low_stock_count||0),'LOW ITEMS',
      'Active items: '+(d.total_products||0),'Stock worth: ₦'+fmt(d.stock_worth))+
    mCard('mc-people', String((d.retail_clients||0)+(d.wholesale_clients||0)+(d.distributor_clients||0)),
      'PEOPLE ASKING','Customers: '+(d.total_customers||0),'Overdue follow-ups: '+(d.follow_ups_overdue||0));
}
function mCard(cls,val,label,sub1,sub2){
  return '<div class="metric-card '+cls+'" onclick="toggleMcDetail(this)">'+
    '<div class="mc-val">'+val+'</div><div class="mc-label">'+label+'</div>'+
    '<div class="mc-detail">'+(sub1?'<div>'+sub1+'</div>':'')+(sub2?'<div style="margin-top:4px">'+sub2+'</div>':'')+'</div></div>';
}
function toggleMcDetail(card){ var d=card.querySelector('.mc-detail'); if(d) d.classList.toggle('open'); }

function renderTargetBar(d){
  var pct=d.target_reached_pct||0;
  var e1=document.getElementById('target-pct'),e2=document.getElementById('target-fill'),
      e3=document.getElementById('target-label'),e4=document.getElementById('target-sub');
  if(e1) e1.textContent=pct+'%';
  if(e2) e2.style.width=pct+'%';
  if(e3) e3.textContent='Monthly Revenue Goal — ₦'+fmt(d.monthly_target);
  if(e4) e4.textContent='₦'+fmt(d.money_in_this_month)+' earned so far this month';
}

function renderMonthlyChart(d){
  var chart=d.monthly_chart||[], el=document.getElementById('bar-chart-months'); if(!el) return;
  if(!chart.length){ el.innerHTML='<div style="color:var(--text3);font-size:12px;padding:16px 0">No data yet — confirm some sales first</div>'; return; }
  var max=Math.max.apply(null,chart.map(function(m){return m.revenue;}))||1;
  el.innerHTML=chart.map(function(m){
    var h=Math.max(4,Math.round((m.revenue/max)*90)), lbl=m.month?m.month.slice(5):'';
    return '<div class="bc-wrap"><div class="bc-bar" style="height:'+h+'px"><div class="bc-tip">₦'+fmt(m.revenue)+'</div></div><div class="bc-label">'+lbl+'</div></div>';
  }).join('');
}

function renderTopSellers(d){
  var sellers=d.top_sellers||[], el=document.getElementById('hbar-sellers'); if(!el) return;
  if(!sellers.length){ el.innerHTML='<div style="color:var(--text3);font-size:12px;padding:16px 0">No sales yet</div>'; return; }
  var max=sellers[0].qty||1;
  el.innerHTML=sellers.map(function(s){
    var w=Math.round((s.qty/max)*100);
    return '<div class="hbc-row">'+
      '<div class="hbc-name-wrap"><div class="hbc-name">'+esc(s.name)+'</div><div class="hbc-sub">'+s.qty+' sales</div></div>'+
      '<div class="hbc-bar-wrap"><div class="hbc-bar" style="width:'+w+'%"></div></div>'+
      '</div>';
  }).join('');
}

function renderLowStockBanner(d){
  var banner=document.getElementById('low-stock-banner'); if(!banner) return;
  var items=d.items_running_low||[];
  if(!items.length){ banner.classList.add('hidden'); return; }
  banner.innerHTML=
    '<div class="banner-content">'+
      '<span class="banner-icon">⚠️</span>'+
      '<div class="banner-text-wrap"><strong>'+items.length+' item'+(items.length>1?'s':'')+' running low</strong> — '+
        items.slice(0,3).map(function(i){return i.name+' ('+i.stock+' left)';}).join(', ')+
        (items.length>3?' and '+(items.length-3)+' more':'')+'</div>'+
      '<button class="banner-action" onclick="goto(\'stock\')">Restock Now →</button>'+
      '<button class="banner-dismiss" onclick="dismissLowStockBanner()">✕</button>'+
    '</div>';
  banner.classList.remove('hidden');
}
function dismissLowStockBanner(){ var b=document.getElementById('low-stock-banner'); if(b) b.classList.add('hidden'); }

function updateNavDots(d){
  var od=document.getElementById('dot-orders'), pd=document.getElementById('dot-people');
  if(od) od.className='sb-dot'+((d.orders_waiting||0)>0?' visible':'');
  if(pd) pd.className='sb-dot'+((d.retail_clients||0)+(d.wholesale_clients||0)+(d.distributor_clients||0)>0?' visible':'');
}

// ── WHATSAPP REPORT ───────────────────────────────────────────────────────────

function copyReport(){
  var d=APP.pulseData; if(!d){toast('Refresh the page first','bad');return;}
  var now=new Date().toLocaleDateString('en-NG');
  var lines=['╔══════════════════════════════════════╗',
    '║   📊 OA DRINKS & SNACKS — SHOP REPORT  ║',
    '╠══════════════════════════════════════╣','║  Date: '+padRight(now,30)+'║','╚══════════════════════════════════════╝','',
    '💰 MONEY THIS MONTH','────────────────────────────────────────',
    '  Money In:         ₦'+padLeft(fmt(d.money_in_this_month),15),
    '  vs Last Month:     '+padLeft((d.money_change_pct>0?'+':'')+(d.money_change_pct||0)+'%',16),
    '  Monthly Goal:      ₦'+padLeft(fmt(d.monthly_target),15),
    '  Goal Progress:     '+padLeft((d.target_reached_pct||0)+'% complete',16),
    '  People Still Owe:  ₦'+padLeft(fmt(d.people_still_owe_you),15),'',
    '📦 STOCK','────────────────────────────────────────',
    '  Stock Worth:       ₦'+padLeft(fmt(d.stock_worth),14),
    '  If All Sold:       ₦'+padLeft(fmt(d.if_all_sold),14),
    '  Possible Profit:   ₦'+padLeft(fmt(d.possible_profit),14),
    '  Items Running Low:  '+padLeft(String(d.low_stock_count||0),14)];
  if((d.items_running_low||[]).length){
    lines.push(''); lines.push('  ⚠️ LOW STOCK:');
    d.items_running_low.forEach(function(i){lines.push('    • '+padRight(i.name,20)+i.stock+' left');});
  }
  lines=lines.concat(['','🛒 ORDERS','────────────────────────────────────────',
    '  Waiting:           '+padLeft(String(d.orders_waiting||0),15),
    '  Confirmed Today:   '+padLeft(String(d.confirmed_orders||0),15),
    '  Customers Total:   '+padLeft(String(d.total_customers||0),15),
    '  Overdue Follow-up: '+padLeft(String(d.follow_ups_overdue||0),15),'',
    '════════════════════════════════════════','  Sent from OA Shop Book','════════════════════════════════════════']);
  navigator.clipboard.writeText(lines.join('\n'))
    .then(function(){toast('Report copied! Paste into WhatsApp','good');})
    .catch(function(){toast('Could not copy — try again','bad');});
}
function padRight(str,len){str=String(str);while(str.length<len)str+=' ';return str;}
function padLeft(str,len){str=String(str);while(str.length<len)str=' '+str;return str;}

// ── SALES & ORDERS ────────────────────────────────────────────────────────────

function loadOrders(tab){
  APP.currentOrderTab=tab||APP.currentOrderTab;
  var el=document.getElementById('orders-body');
  el.innerHTML='<div class="loading-msg">Loading orders…</div>';
  var actionMap={pending:'getPendingOrders',confirmed:'getConfirmedOrders',failed:'getFailedOrders'};
  call(actionMap[APP.currentOrderTab]).then(function(res){
    if(!res.success){el.innerHTML='<div class="loading-msg">Error loading orders.</div>';return;}
    var orders=res.data||[];
    // Summary bar (Kimi image 7)
    var todaySales=0;
    if(APP.currentOrderTab==='confirmed'){
      var today=new Date().toDateString();
      orders.forEach(function(o){if(new Date(o.confirmed_at).toDateString()===today) todaySales+=parseFloat(o.total)||0;});
    }
    var summaryBar='';
    if(APP.currentOrderTab==='pending')
      summaryBar='<div class="orders-summary-bar"><div class="osb-stat"><div class="osb-label">ORDERS WAITING</div><div class="osb-val">'+orders.length+'</div></div><div class="osb-stat"><div class="osb-label">ACTIVE TODAY</div><div class="osb-val">'+orders.length+'</div></div></div>';
    else if(APP.currentOrderTab==='confirmed')
      summaryBar='<div class="orders-summary-bar"><div class="osb-stat"><div class="osb-label">TODAY\'S SALES</div><div class="osb-val">₦'+fmt(todaySales)+'</div></div><div class="osb-stat"><div class="osb-label">CONFIRMED ORDERS</div><div class="osb-val">'+orders.length+'</div></div></div>';
    el.innerHTML=summaryBar+renderOrderCards(orders,APP.currentOrderTab)+renderOrderTable(orders,APP.currentOrderTab);
    if(APP.currentOrderTab==='pending'){
      var wBtn=document.querySelector('[onclick*="pending"]'); if(wBtn) wBtn.textContent='Waiting ('+orders.length+')';
    }
  }).catch(function(){el.innerHTML='<div class="loading-msg">Connection issue.</div>';});
}

function switchOrderTab(tab,btn){
  document.querySelectorAll('#page-orders .tab').forEach(function(t){t.classList.remove('active');});
  btn.classList.add('active'); loadOrders(tab);
}

function renderOrderCards(orders,tab){
  if(!orders.length) return '<div class="card-list"><div class="empty-msg">No '+(tab==='pending'?'orders waiting':tab==='confirmed'?'confirmed orders':'fell through orders')+' right now.</div></div>';
  var html='<div class="card-list">';
  orders.forEach(function(o){
    var name=o.buyer_name||o.name||'';
    var items=[]; try{var p=JSON.parse(o.items_json||'[]');if(Array.isArray(p))items=p;}catch(e){}
    var dBadge=tab==='confirmed'?badge(delivLabel(o.delivery_status),o.delivery_status||'getting_ready'):tab==='pending'?badge('WAITING','waiting'):badge('FELL THROUGH','fell_through');
    html+='<div class="order-card">';
    html+='<div class="order-card-head"><div><div class="order-ref">ORDER #'+esc(o.tracking_ref||o.id||'')+'</div><div class="order-name">'+esc(name)+'</div><div class="order-phone">📞 '+esc(o.phone||'')+'</div></div>'+dBadge+'</div>';
    if(o.landmark||o.state) html+='<div class="order-location">📍 '+(o.landmark?esc(o.landmark)+', ':'')+esc(o.state||'')+(o.lga?', '+esc(o.lga):'')+'</div>';
    // Itemised line items (Kimi image 7)
    if(items.length){
      html+='<div class="order-items-box">';
      items.forEach(function(item){ html+='<div class="order-item-row"><span>'+esc(item.qty||1)+'x '+esc(item.name||'')+'</span><span class="order-item-price">₦'+fmt((item.qty||1)*(item.price||0))+'</span></div>'; });
      html+='<div class="order-total-row"><span>TOTAL</span><span class="order-total-val">₦'+fmt(o.total)+'</span></div></div>';
    } else {
      html+='<div class="order-total-row standalone"><span>TOTAL</span><span class="order-total-val">₦'+fmt(o.total)+'</span></div>';
    }
    html+='<div class="order-card-actions">';
    if(tab==='pending'){
      html+='<button class="btn-confirm" onclick="confirmOrder(\''+esc(o.id)+'\')">✓ CONFIRM</button>';
      html+='<button class="btn-fail" onclick="openFailModal(\''+esc(o.id)+'\')">✗ FELL THROUGH</button>';
    }
    if(tab==='confirmed') html+='<button class="btn-edit" onclick="openDeliveryModal(\''+esc(o.id)+'\')">🚗 Send to Driver</button>';
    if(tab==='failed') html+='<span style="font-size:12px;color:var(--text3)">'+esc(o.reason||'')+'</span>';
    html+='</div></div>';
  });
  return html+'</div>';
}

function delivLabel(status){
  var map={getting_ready:'GETTING READY',on_the_way:'ON THE WAY',delivered:'DELIVERED ✓'};
  return map[status]||status||'GETTING READY';
}

function renderOrderTable(orders,tab){
  if(!orders.length) return '<div class="data-table-wrap"></div>';
  var html='<div class="data-table-wrap"><table class="data-table"><thead><tr><th>Ref</th><th>Customer</th><th>Phone</th><th>Location</th><th>Items</th><th>Total</th>';
  if(tab==='pending')   html+='<th>Action</th>';
  if(tab==='confirmed') html+='<th>Delivery</th><th>Action</th>';
  if(tab==='failed')    html+='<th>Reason</th>';
  html+='</tr></thead><tbody>';
  orders.forEach(function(o){
    var name=o.buyer_name||o.name||'';
    html+='<tr><td style="font-size:11px;color:var(--text3)">'+esc(o.tracking_ref||o.id||'')+'</td><td><strong>'+esc(name)+'</strong></td><td>'+esc(o.phone||'')+'</td>';
    html+='<td>'+esc(o.state||'')+(o.lga?', '+esc(o.lga):'')+'</td>';
    html+='<td style="font-size:11px;color:var(--text3);max-width:140px">'+esc(String(o.items_json||''))+'</td>';
    html+='<td><strong>₦'+fmt(o.total)+'</strong></td>';
    if(tab==='pending') html+='<td><div style="display:flex;gap:5px"><button class="btn-confirm" onclick="confirmOrder(\''+esc(o.id)+'\')">Confirm</button><button class="btn-fail" onclick="openFailModal(\''+esc(o.id)+'\')">Fell Through</button></div></td>';
    if(tab==='confirmed') html+='<td>'+badge(delivLabel(o.delivery_status),o.delivery_status||'getting_ready')+'</td><td><button class="btn-edit" onclick="openDeliveryModal(\''+esc(o.id)+'\')">Send to Driver</button></td>';
    if(tab==='failed') html+='<td style="font-size:12px;color:var(--text3)">'+esc(o.reason||'')+'</td>';
    html+='</tr>';
  });
  return html+'</tbody></table></div>';
}

function confirmOrder(id){
  call('decideOrder',{order_id:id,decision:'confirm',done_by:APP.name}).then(function(res){
    if(res.success){toast('Sale confirmed! Stock updated.','good');loadOrders('pending');loadToday();}
    else toast('Error: '+(res.error||'unknown'),'bad');
  }).catch(function(){toast('Connection issue','bad');});
}

function openFailModal(id){
  document.getElementById('fail-id').value=id;
  document.getElementById('fail-reason').value='';
  document.getElementById('fail-other').classList.add('hidden');
  document.getElementById('fail-other').value='';
  document.getElementById('modal-fail').classList.remove('hidden');
}
function checkOtherReason(){
  var v=document.getElementById('fail-reason').value, o=document.getElementById('fail-other');
  if(v==='Other') o.classList.remove('hidden'); else{o.classList.add('hidden');o.value='';}
}
function submitFail(){
  var id=document.getElementById('fail-id').value;
  var sel=document.getElementById('fail-reason').value;
  var other=document.getElementById('fail-other').value.trim();
  var reason=sel==='Other'?other:sel;
  if(!reason){toast('Please pick a reason','bad');return;}
  call('decideOrder',{order_id:id,decision:'fail',reason:reason,done_by:APP.name}).then(function(res){
    if(res.success){closeModal('modal-fail');toast('Order marked as fell through','good');loadOrders('pending');loadToday();}
    else toast('Error: '+(res.error||''),'bad');
  });
}

// ── DELIVERY / WAYBILL ────────────────────────────────────────────────────────

var _deliveryOrder=null;

function openDeliveryModal(orderId){
  call('getConfirmedOrders').then(function(res){
    if(!res.success){toast('Cannot load order data','bad');return;}
    var found=(res.data||[]).find(function(o){return o.id===orderId;});
    _deliveryOrder=found||{id:orderId};
    document.getElementById('del-order-id').value=orderId;
    document.getElementById('del-status').value=(found&&found.delivery_status)||'getting_ready';
    document.getElementById('del-driver-name').value='';
    document.getElementById('del-driver-phone').value='';
    document.getElementById('del-notes').value='';
    document.getElementById('waybill-preview').classList.add('hidden');
    document.getElementById('modal-delivery').classList.remove('hidden');
  });
}

function sendWaybill(){
  var orderId=document.getElementById('del-order-id').value;
  var status=document.getElementById('del-status').value;
  var driverName=document.getElementById('del-driver-name').value.trim();
  var driverPhone=document.getElementById('del-driver-phone').value.trim();
  var notes=document.getElementById('del-notes').value.trim();
  if(!driverName||!driverPhone){toast('Please enter driver name and phone number','bad');return;}
  call('updateDelivery',{order_id:orderId,delivery_status:status,driver_name:driverName,driver_phone:driverPhone,waybill_sent:'yes',delivery_notes:notes,done_by:APP.name}).then(function(res){
    if(!res.success){toast('Could not save delivery info','bad');return;}
    var o=_deliveryOrder||{};
    var clean=driverPhone.replace(/\D/g,''); if(clean.startsWith('0')) clean='234'+clean.slice(1);
    var msg='WAYBILL — OA Drinks & Snacks\n——————————————\nCustomer: '+(o.buyer_name||'')+'\nPhone: '+(o.phone||'')+'\nAddress: '+(o.address||'');
    if(o.landmark) msg+='\nLandmark: '+o.landmark;
    msg+='\nItems: '+(o.items_json||'')+'\nTotal to Collect: ₦'+fmt(o.total);
    if(notes) msg+='\nNote: '+notes;
    msg+='\n——————————————\nSent by OA Shop Book';
    var prev=document.getElementById('waybill-preview'); prev.textContent=msg; prev.classList.remove('hidden');
    navigator.clipboard.writeText(msg).catch(function(){});
    setTimeout(function(){
      window.open('https://wa.me/'+clean+'?text='+encodeURIComponent(msg),'_blank');
      closeModal('modal-delivery'); toast('Waybill sent to driver!','good'); loadOrders('confirmed');
    },600);
  });
}
