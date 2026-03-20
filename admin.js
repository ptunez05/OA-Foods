// OA Shop Book — admin.js  v4.0 Supabase
// Auth, navigation, API, Shop Today, Sales & Orders, Offline Queue

// ── SUPABASE CONFIG ───────────────────────────────────────────────────────────

var SUPABASE_URL     = 'https://nxrlgxhfrwzkaaunhrvz.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54cmxneGhmcnd6a2FhdW5ocnZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTYyNTUsImV4cCI6MjA4OTU3MjI1NX0.9ibd0avm8N0BfgMJKq-MgJFMDkmmynuVakwZwDIQVZQ';
var PROJECT_ID       = 'oa_shop';

// Supabase JS client — loaded via CDN in admin.html
// Add this to your <head>:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
var _sb = null;
function sb() {
  if (!_sb) _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _sb;
}

// ── SESSION / APP STATE ───────────────────────────────────────────────────────

var SESSION_TIMEOUT   = 14400000; // 4 hours
var OFFLINE_QUEUE_KEY = 'oa_sb_offline_queue';

var APP = {
  role:'', name:'', userId:'', pulseData:null,
  currentOrderTab:'pending', currentPeopleTab:'retail',
  currentStockTab:'levels', currentSettingsTab:'general',
  allProducts:[], openDrawer:''
};

// ── BOOT ──────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function() {
  var theme = localStorage.getItem('oa_theme') || 'light';
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeBtn(theme);
  initOfflineHandling();
  initChartStates();

  var pw = document.getElementById('login-pw');
  if (pw) pw.addEventListener('keydown', function(e){ if(e.key==='Enter') doLogin(); });

  // Check for existing Supabase session
  sb().auth.getSession().then(function(res) {
    var session = res.data && res.data.session;
    if (session) {
      loadProfileAndBoot(session.user.id);
    }
  });

  // Listen for auth state changes (handles token refresh)
  sb().auth.onAuthStateChange(function(event, session) {
    if (event === 'SIGNED_OUT') {
      showLoginScreen();
    }
  });
});

function loadProfileAndBoot(userId) {
  sb().from('profiles')
    .select('display_name, role')
    .eq('id', userId)
    .eq('project_id', PROJECT_ID)
    .single()
    .then(function(res) {
      if (res.error || !res.data) { showLoginScreen(); return; }
      APP.role    = res.data.role;
      APP.name    = res.data.display_name;
      APP.userId  = userId;
      bootApp();
    });
}

// ── AUTH ──────────────────────────────────────────────────────────────────────

function doLogin() {
  var btn  = document.getElementById('login-btn');
  var txt  = document.getElementById('login-btn-text');
  var err  = document.getElementById('login-err');
  var email = document.getElementById('login-email') ?
              document.getElementById('login-email').value.trim() : '';
  var pw   = document.getElementById('login-pw').value.trim();

  if (!pw) return;
  err.classList.add('hidden');
  btn.disabled = true;
  txt.textContent = 'Checking…';

  // Support login by email field if present, otherwise use stored email
  // For single-user setups you can hardcode the email or add an email input
  var loginEmail = email || localStorage.getItem('oa_login_email') || '';
  if (!loginEmail) {
    // Prompt once and remember it — avoids needing a UI change
    loginEmail = prompt('Enter your email address:');
    if (!loginEmail) { btn.disabled=false; txt.textContent='Sign In'; return; }
    localStorage.setItem('oa_login_email', loginEmail);
  }

  sb().auth.signInWithPassword({ email: loginEmail, password: pw })
    .then(function(res) {
      if (res.error) {
        err.classList.remove('hidden');
        err.textContent = 'Wrong password or email. Try again.';
        btn.disabled = false;
        txt.textContent = 'Sign In';
        return;
      }
      loadProfileAndBoot(res.data.user.id);
    })
    .catch(function() {
      err.classList.remove('hidden');
      err.textContent = 'Could not connect. Check your internet.';
      btn.disabled = false;
      txt.textContent = 'Sign In';
    });
}

function bootApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  document.getElementById('sb-role').textContent = APP.role==='master' ? 'Full Admin' : APP.name || 'Staff';
  if (APP.role !== 'master') {
    document.querySelectorAll('.master-only').forEach(function(el){ el.style.display='none'; });
  }
  var av = document.getElementById('greeting-avatar');
  if (av && APP.name) av.textContent = initials(APP.name);
  loadToday();
  setupSessionRefresh();
}

function doLogout() {
  sb().auth.signOut();
  APP.role=''; APP.name=''; APP.userId='';
  showLoginScreen();
}

function showLoginScreen() {
  var app = document.getElementById('app');
  var login = document.getElementById('login-screen');
  if (app) app.classList.add('hidden');
  if (login) login.classList.remove('hidden');
  var pw = document.getElementById('login-pw');
  if (pw) pw.value = '';
  var err = document.getElementById('login-err');
  if (err) err.classList.add('hidden');
  var sb2 = document.getElementById('sidebar');
  if (sb2) sb2.classList.remove('open');
  var mn = document.getElementById('bn-more-menu');
  if (mn) mn.classList.remove('open');
}

// Supabase handles token refresh automatically.
// We just reset a local inactivity timer for the 4-hour UI timeout.
var _sessionTimer = null;
function setupSessionRefresh() {
  function resetTimer() {
    clearTimeout(_sessionTimer);
    _sessionTimer = setTimeout(function() {
      sb().auth.signOut();
      showLoginScreen();
      toast('You were signed out after 4 hours of inactivity', 'bad');
    }, SESSION_TIMEOUT);
  }
  resetTimer();
  ['click','scroll','keydown','input','touchstart'].forEach(function(evt) {
    var opts = (evt==='scroll'||evt==='touchstart') ? {passive:true} : false;
    document.addEventListener(evt, resetTimer, opts);
  });
}

// ── THEME ─────────────────────────────────────────────────────────────────────

function toggleTheme() {
  var cur  = document.documentElement.getAttribute('data-theme') || 'light';
  var next = cur === 'light' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', next);
  localStorage.setItem('oa_theme', next);
  updateThemeBtn(next);
}
function updateThemeBtn(theme) {
  var btn = document.getElementById('theme-btn');
  if (btn) btn.textContent = theme === 'light' ? '🌙' : '☀️';
}

// ── NAVIGATION ────────────────────────────────────────────────────────────────

function goto(name, el) {
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active'); p.classList.add('hidden'); });
  document.querySelectorAll('.sb-link').forEach(function(l){ l.classList.remove('active'); });
  document.querySelectorAll('.bn-tab').forEach(function(b){ b.classList.remove('active'); });
  var page = document.getElementById('page-'+name);
  if (page) { page.classList.remove('hidden'); page.classList.add('active'); }
  if (el) el.classList.add('active');
  var titles = {today:'Shop Today',orders:'Sales & Orders',items:'Items in Shop',
    stock:'My Stock',people:'People Asking',customers:'My Customers',
    money:'Money Records',settings:'Shop Settings'};
  var tb = document.getElementById('tb-title');
  if (tb) tb.textContent = titles[name] || name;
  var sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.classList.remove('open');
  updateBottomNavForPage(name);
  if (name==='today')     loadToday();
  if (name==='orders')    loadOrders('pending');
  if (name==='items')     loadItems();
  if (name==='stock')     loadStock('levels');
  if (name==='people')    loadPeople('retail');
  if (name==='customers') loadCustomers();
  if (name==='money')     loadMoney();
  if (name==='settings')  loadSettings('general');
}
function toggleSidebar(){ var s=document.getElementById('sidebar'); if(s) s.classList.toggle('open'); }
function updateBottomNavForPage(name){
  var map={today:0,orders:1,items:2,people:3};
  if(map[name]!==undefined) updateBottomNav(map[name]);
}
function updateBottomNav(idx){
  document.querySelectorAll('.bn-tab').forEach(function(tab,i){
    if(i===idx) tab.classList.add('active'); else if(i<4) tab.classList.remove('active');
  });
}
function toggleMoreMenu(){ var m=document.getElementById('bn-more-menu'); if(m) m.classList.toggle('open'); }

// ── OFFLINE QUEUE ─────────────────────────────────────────────────────────────

function initOfflineHandling(){
  window.addEventListener('online',  function(){ showOfflineStatus(false); drainQueue(); });
  window.addEventListener('offline', function(){ showOfflineStatus(true); });
  if (!navigator.onLine) showOfflineStatus(true);
}
function showOfflineStatus(isOffline){
  var el = document.getElementById('offline-indicator'); if(!el) return;
  if (isOffline) el.classList.remove('hidden'); else el.classList.add('hidden');
}
function showSyncStatus(show, msg){
  var el = document.getElementById('sync-status'); if(!el) return;
  if (show) { el.textContent=msg||'Syncing…'; el.classList.remove('hidden'); }
  else el.classList.add('hidden');
}
function queueRequest(action, params){
  var q = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)||'[]');
  q.push({action:action, params:params, timestamp:Date.now(),
    id:'req_'+Date.now()+'_'+Math.random().toString(36).substr(2,9)});
  localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(q));
  showOfflineStatus(true);
  toast('Saved offline — will sync when you reconnect', 'bad');
  return Promise.resolve({success:false, offline:true, queued:true});
}
function drainQueue(){
  var q = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY)||'[]');
  if (!q.length) return;
  var total=q.length, failed=[];
  showSyncStatus(true, 'Sending '+total+' saved change'+(total>1?'s':'')+'…');
  var processAll = function(remaining){
    if (!remaining.length){
      if (failed.length){
        localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(failed));
        showSyncStatus(false);
        var sent = total-failed.length;
        toast((sent>0?sent+' change'+(sent>1?'s':'')+' sent, ':'')+failed.length+' could not send — will retry when online','bad');
      } else {
        localStorage.removeItem(OFFLINE_QUEUE_KEY);
        showSyncStatus(false);
        toast('All '+total+' change'+(total>1?'s':'')+' synced!','good');
        loadToday();
      }
      return;
    }
    var req = remaining.shift();
    sbCall(req.action, req.params).then(function(res){
      if (!res.success){ req._retries=(req._retries||0)+1; failed.push(req); }
      processAll(remaining);
    }).catch(function(){
      var requeue = [req].concat(remaining).concat(failed);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(requeue));
      showSyncStatus(false);
      toast('Sync paused — connection dropped. Will retry when back online.','bad');
    });
  };
  processAll(q.slice());
}

// ── SUPABASE API LAYER ────────────────────────────────────────────────────────
// sbCall() replaces the old call() function.
// It routes each action to the correct Supabase operation and always
// returns a Promise that resolves to { success, data?, error? }
// matching the shape the existing UI code already expects.

function sbCall(action, params) {
  if (!navigator.onLine) return queueRequest(action, params);
  params = params || {};

  // ── AUTH ──
  if (action === 'login') {
    // Handled directly in doLogin() — not routed through sbCall
    return Promise.resolve({success:false, error:'Use doLogin() for auth'});
  }

  // ── SHOP PULSE (Shop Today dashboard) ──
  if (action === 'getShopPulse') {
    return getShopPulse();
  }

  // ── PRODUCTS ──
  if (action === 'getProducts') {
    return sb().from('products')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('name')
      .then(function(r){ return r.error ? {success:false,error:r.error.message} : {success:true,data:r.data}; });
  }
  if (action === 'addProduct') {
    return addProduct(params);
  }
  if (action === 'updateProduct') {
    return updateProduct(params);
  }
  if (action === 'hideProduct') {
    return sb().from('products')
      .update({active:false, updated_at:'now()'})
      .eq('id', params.id)
      .eq('project_id', PROJECT_ID)
      .then(function(r){
        if (r.error) return {success:false, error:r.error.message};
        writeAudit('hide_product', 'Hid item from shop', 'product', params.id);
        return {success:true};
      });
  }

  // ── STOCK ──
  if (action === 'adjustStock') {
    return adjustStock(params);
  }
  if (action === 'getBatchRecords') {
    return sb().from('batch_records')
      .select('id, made_on, product_name, qty_made, expires_on, batch_note')
      .eq('project_id', PROJECT_ID)
      .order('made_on', {ascending:false})
      .then(function(r){ return r.error ? {success:false,error:r.error.message} : {success:true,data:r.data}; });
  }
  if (action === 'getStockLog') {
    return sb().from('stock_log')
      .select('recorded_at, product_name, change_qty, reason, done_by_name, stock_before, stock_after')
      .eq('project_id', PROJECT_ID)
      .order('recorded_at', {ascending:false})
      .limit(200)
      .then(function(r){
        if (r.error) return {success:false, error:r.error.message};
        var data = r.data.map(function(row){
          return Object.assign({}, row, {
            when: row.recorded_at ? new Date(row.recorded_at).toLocaleString('en-NG') : '',
            recorded_by: row.done_by_name || ''
          });
        });
        return {success:true, data:data};
      });
  }
  if (action === 'logBatch') {
    return logBatch(params);
  }

  // ── ORDERS ──
  if (action === 'getPendingOrders') {
    return getOrders('pending');
  }
  if (action === 'getConfirmedOrders') {
    return getOrders('confirmed');
  }
  if (action === 'getFailedOrders') {
    return getOrders('failed');
  }
  if (action === 'decideOrder') {
    return decideOrder(params);
  }
  if (action === 'updateDelivery') {
    return updateDelivery(params);
  }

  // ── CRM / PEOPLE ──
  if (action === 'getRetailClients') {
    return getClients('retail');
  }
  if (action === 'getWholesaleClients') {
    return getClients('wholesale');
  }
  if (action === 'getDistributors') {
    return getClients('distributor');
  }
  if (action === 'updateClientStatus') {
    return updateClientStatus(params);
  }
  if (action === 'recordPayment') {
    return recordPayment(params);
  }

  // ── CUSTOMERS ──
  if (action === 'getCustomers') {
    return sb().from('customers')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('total_spent', {ascending:false})
      .then(function(r){ return r.error ? {success:false,error:r.error.message} : {success:true,data:r.data}; });
  }

  // ── MONEY RECORDS ──
  if (action === 'getMoneyRecords') {
    return sb().from('money_records')
      .select('*')
      .eq('project_id', PROJECT_ID)
      .order('month', {ascending:false})
      .then(function(r){ return r.error ? {success:false,error:r.error.message} : {success:true,data:r.data}; });
  }
  if (action === 'addMoneyRecord') {
    return addMoneyRecord(params);
  }

  // ── SETTINGS ──
  if (action === 'getSettings') {
    return sb().from('settings')
      .select('key, value')
      .eq('project_id', PROJECT_ID)
      .then(function(r){
        if (r.error) return {success:false, error:r.error.message};
        var obj = {};
        (r.data||[]).forEach(function(row){ obj[row.key]=row.value; });
        return {success:true, data:obj};
      });
  }
  if (action === 'updateSetting') {
    return sb().from('settings')
      .upsert({project_id:PROJECT_ID, key:params.key, value:params.value, updated_at:'now()'}, {onConflict:'project_id,key'})
      .then(function(r){
        if (r.error) return {success:false, error:r.error.message};
        writeAudit('update_setting', 'Changed setting: '+params.key+' → '+params.value, 'setting', params.key);
        return {success:true};
      });
  }

  // ── STAFF ──
  if (action === 'getStaffList') {
    return sb().from('profiles')
      .select('id, display_name, role, is_active')
      .eq('project_id', PROJECT_ID)
      .order('display_name')
      .then(function(r){
        if (r.error) return {success:false, error:r.error.message};
        var data = r.data.map(function(s){
          return {id:s.id, name:s.display_name, role:s.role, active:s.is_active?'TRUE':'FALSE'};
        });
        return {success:true, data:data};
      });
  }
  if (action === 'addStaff') {
    return addStaff(params);
  }
  if (action === 'deactivateStaff') {
    return sb().from('profiles')
      .update({is_active:false})
      .eq('id', params.staff_id)
      .eq('project_id', PROJECT_ID)
      .then(function(r){
        if (r.error) return {success:false, error:r.error.message};
        writeAudit('deactivate_staff','Deactivated staff account','profile',params.staff_id);
        return {success:true};
      });
  }

  // ── PASSWORD ──
  if (action === 'changeMasterPassword') {
    return sb().auth.updateUser({password: params.new_password})
      .then(function(r){
        if (r.error) return {success:false, error:r.error.message};
        writeAudit('change_password','Master password changed','auth',APP.userId);
        return {success:true};
      });
  }

  // ── AUDIT LOG ──
  if (action === 'getAuditLog') {
    return sb().from('audit_log')
      .select('recorded_at, action, details, done_by_name')
      .eq('project_id', PROJECT_ID)
      .order('recorded_at', {ascending:false})
      .limit(100)
      .then(function(r){
        if (r.error) return {success:false, error:r.error.message};
        var data = r.data.map(function(row){
          return {
            when:    row.recorded_at ? new Date(row.recorded_at).toLocaleString('en-NG') : '',
            action:  row.action,
            details: row.details,
            done_by: row.done_by_name
          };
        });
        return {success:true, data:data};
      });
  }

  // ── BACKUP / RESET (Supabase version — export to JSON) ──
  if (action === 'backupNow') {
    return doSupabaseBackup();
  }
  if (action === 'factoryReset') {
    return doFactoryReset();
  }
  if (action === 'clearSection') {
    return clearSection(params);
  }

  return Promise.resolve({success:false, error:'Unknown action: '+action});
}

// Keep old call() as alias so nothing breaks
function call(action, params){ return sbCall(action, params); }

// ── SHOP PULSE ────────────────────────────────────────────────────────────────

function getShopPulse() {
  var now   = new Date();
  var thisMK = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
  var lastMD = new Date(now.getFullYear(), now.getMonth()-1, 1);
  var lastMK = lastMD.getFullYear()+'-'+String(lastMD.getMonth()+1).padStart(2,'0');
  var monthStart = thisMK+'-01';

  return Promise.all([
    // Active products
    sb().from('products').select('id,name,stock_qty,low_stock_alert,cost_price,consumer_price,active').eq('project_id',PROJECT_ID),
    // Money records this month and last
    sb().from('money_records').select('month,total_collected,final_profit').eq('project_id',PROJECT_ID),
    // Pending orders
    sb().from('orders').select('id,total,created_at').eq('project_id',PROJECT_ID).eq('status','pending'),
    // Confirmed orders this month
    sb().from('orders').select('id,total,created_at,buyer_name').eq('project_id',PROJECT_ID).eq('status','confirmed').gte('created_at',monthStart),
    // Failed orders this month
    sb().from('orders').select('id').eq('project_id',PROJECT_ID).eq('status','failed').gte('created_at',monthStart),
    // CRM clients (active stages only)
    sb().from('clients').select('id,client_type,where_we_are,remind_me_on').eq('project_id',PROJECT_ID).neq('where_we_are','not_interested'),
    // Clients with outstanding balance
    sb().from('clients').select('balance_owed').eq('project_id',PROJECT_ID).gt('balance_owed',0),
    // Settings
    sb().from('settings').select('key,value').eq('project_id',PROJECT_ID),
    // Monthly revenue — last 6 months for chart
    sb().from('money_records').select('month,total_collected').eq('project_id',PROJECT_ID).order('month',{ascending:false}).limit(12),
    // Confirmed orders all time for customers count
    sb().from('orders').select('buyer_name').eq('project_id',PROJECT_ID).eq('status','confirmed'),
  ]).then(function(results) {
    var products   = (results[0].data||[]);
    var moneyRows  = (results[1].data||[]);
    var pending    = (results[2].data||[]);
    var confirmed  = (results[3].data||[]);
    var failed     = (results[4].data||[]);
    var clients    = (results[5].data||[]);
    var debtors    = (results[6].data||[]);
    var settRows   = (results[7].data||[]);
    var chartRows  = (results[8].data||[]);
    var allOrders  = (results[9].data||[]);

    // Settings map
    var sett = {};
    settRows.forEach(function(s){ sett[s.key]=s.value; });
    var monthlyTarget = parseFloat(sett.monthly_target||0);
    var lowStockDefault = parseInt(sett.low_stock_default||20);

    // Money aggregates
    var moneyThisMonth=0, moneyLastMonth=0;
    moneyRows.forEach(function(r){
      var amt = parseFloat(r.total_collected)||0;
      if (r.month===thisMK) moneyThisMonth+=amt;
      if (r.month===lastMK) moneyLastMonth+=amt;
    });
    var moneyChangePct = moneyLastMonth>0 ? Math.round(((moneyThisMonth-moneyLastMonth)/moneyLastMonth)*100) : 0;
    var totalMoneyIn = moneyRows.reduce(function(s,r){return s+(parseFloat(r.total_collected)||0);},0);

    // Stock aggregates
    var activeProducts = products.filter(function(p){return p.active;});
    var stockWorth=0, ifAllSold=0, lowItems=[];
    activeProducts.forEach(function(p){
      var qty  = parseInt(p.stock_qty)||0;
      var cost = parseFloat(p.cost_price)||0;
      var sell = parseFloat(p.consumer_price)||0;
      var alert = parseInt(p.low_stock_alert)||lowStockDefault;
      stockWorth += qty*cost;
      ifAllSold  += qty*sell;
      if (qty < alert) lowItems.push({name:p.name, stock:qty, alert_level:alert});
    });
    var possibleProfit = ifAllSold - stockWorth;

    // People / CRM
    var retailC=0, wholesaleC=0, distributorC=0;
    var today = new Date().toDateString();
    var overdueFollowups = 0;
    clients.forEach(function(c){
      if (c.client_type==='retail')      retailC++;
      if (c.client_type==='wholesale')   wholesaleC++;
      if (c.client_type==='distributor') distributorC++;
      if (c.remind_me_on) {
        var rd = new Date(c.remind_me_on);
        if (rd < new Date() && c.where_we_are !== 'not_interested') overdueFollowups++;
      }
    });

    // Outstanding balances
    var peopleStillOwe = debtors.reduce(function(s,r){return s+(parseFloat(r.balance_owed)||0);},0);

    // Orders confirmed today
    var confirmedToday = confirmed.filter(function(o){
      return new Date(o.created_at).toDateString()===today;
    }).length;

    // Unique customers
    var uniqueCustomers = {};
    allOrders.forEach(function(o){ if(o.buyer_name) uniqueCustomers[o.buyer_name]=1; });

    // Monthly chart — aggregate by month
    var chartMap = {};
    chartRows.forEach(function(r){
      if (!chartMap[r.month]) chartMap[r.month]=0;
      chartMap[r.month]+= parseFloat(r.total_collected)||0;
    });
    var monthlyChart = Object.keys(chartMap).sort().map(function(m){return {month:m,revenue:chartMap[m]};});

    // Top sellers from confirmed orders this month
    var sellerMap = {};
    confirmed.forEach(function(o){
      var k = o.buyer_name||'Unknown';
      sellerMap[k] = (sellerMap[k]||0)+1;
    });
    var topSellers = Object.keys(sellerMap).map(function(k){return {name:k,qty:sellerMap[k]};})
      .sort(function(a,b){return b.qty-a.qty;}).slice(0,5);

    // Pulse colours
    var targetPct = monthlyTarget>0 ? Math.min(100,Math.round((moneyThisMonth/monthlyTarget)*100)) : 0;
    var moneyPulse  = moneyThisMonth>=monthlyTarget*0.8?'green':moneyThisMonth>0?'yellow':'grey';
    var stockPulse  = lowItems.length===0?'green':lowItems.length<3?'yellow':'red';
    var peoplePulse = (retailC+wholesaleC+distributorC)===0?'grey':overdueFollowups>0?'red':'green';

    return {success:true, data:{
      // Money
      money_in_this_month:  moneyThisMonth,
      money_in_last_month:  moneyLastMonth,
      money_change_pct:     moneyChangePct,
      total_money_in:       totalMoneyIn,
      monthly_target:       monthlyTarget,
      target_reached_pct:   targetPct,
      people_still_owe_you: peopleStillOwe,
      money_pulse:          moneyPulse,
      money_message:        moneyChangePct>10?'Money is growing — great month so far.':moneyChangePct<-10?'Revenue is down vs last month. Keep pushing.':'Business is steady this month.',
      // Stock
      stock_worth:          stockWorth,
      if_all_sold:          ifAllSold,
      possible_profit:      possibleProfit,
      low_stock_count:      lowItems.length,
      items_running_low:    lowItems,
      total_products:       activeProducts.length,
      stock_pulse:          stockPulse,
      stock_message:        lowItems.length===0?'All items are well stocked.':'Some items need restocking soon.',
      // Orders
      orders_waiting:       pending.length,
      confirmed_orders:     confirmedToday,
      failed_orders:        failed.length,
      total_customers:      Object.keys(uniqueCustomers).length,
      // People
      retail_clients:       retailC,
      wholesale_clients:    wholesaleC,
      distributor_clients:  distributorC,
      follow_ups_overdue:   overdueFollowups,
      people_pulse:         peoplePulse,
      people_message:       overdueFollowups>0?overdueFollowups+' follow-up(s) overdue.':'All follow-ups are up to date.',
      // Charts
      monthly_chart:        monthlyChart,
      top_sellers:          topSellers,
    }};
  }).catch(function(e){
    return {success:false, error:e.message||'Could not load shop data'};
  });
}

// ── PRODUCTS ──────────────────────────────────────────────────────────────────

function addProduct(p) {
  return sb().from('products').insert({
    project_id:        PROJECT_ID,
    name:              p.name,
    category:          p.category||'Drinks',
    cost_price:        parseFloat(p.cost_price)||0,
    consumer_price:    parseFloat(p.consumer_price)||0,
    retail_price:      parseFloat(p.retail_price)||0,
    wholesale_price:   parseFloat(p.wholesale_price)||0,
    distributor_price: parseFloat(p.distributor_price)||0,
    stock_qty:         parseInt(p.stock_qty)||0,
    low_stock_alert:   parseInt(p.low_stock_alert)||20,
    image_url:         p.image_file||null,
    description:       p.description||null,
    active:            true,
    created_by:        APP.userId||null,
  }).select('id').single()
    .then(function(r){
      if (r.error) return {success:false, error:r.error.message};
      writeAudit('add_product','Added new item: '+p.name,'product',r.data.id);
      return {success:true};
    });
}

function updateProduct(p) {
  var updates = {updated_at:'now()'};
  if (p.name !== undefined)             updates.name              = p.name;
  if (p.category !== undefined)         updates.category          = p.category;
  if (p.cost_price !== undefined)       updates.cost_price        = parseFloat(p.cost_price)||0;
  if (p.consumer_price !== undefined)   updates.consumer_price    = parseFloat(p.consumer_price)||0;
  if (p.retail_price !== undefined)     updates.retail_price      = parseFloat(p.retail_price)||0;
  if (p.wholesale_price !== undefined)  updates.wholesale_price   = parseFloat(p.wholesale_price)||0;
  if (p.stock_qty !== undefined)        updates.stock_qty         = parseInt(p.stock_qty)||0;
  if (p.low_stock_alert !== undefined)  updates.low_stock_alert   = parseInt(p.low_stock_alert)||20;
  if (p.image_file !== undefined)       updates.image_url         = p.image_file||null;
  if (p.description !== undefined)      updates.description       = p.description||null;
  if (p.active !== undefined)           updates.active            = p.active==='TRUE'||p.active===true;

  return sb().from('products').update(updates)
    .eq('id', p.id)
    .eq('project_id', PROJECT_ID)
    .then(function(r){
      if (r.error) return {success:false, error:r.error.message};
      writeAudit('update_product','Updated item: '+(p.name||p.id),'product',p.id);
      return {success:true};
    });
}

// ── STOCK ─────────────────────────────────────────────────────────────────────

function adjustStock(params) {
  var pid     = params.product_id;
  var change  = parseInt(params.change_qty)||0;
  var reason  = params.reason||'Manual adjustment';

  // Fetch current stock first
  return sb().from('products').select('stock_qty,name')
    .eq('id', pid).eq('project_id', PROJECT_ID).single()
    .then(function(r) {
      if (r.error) return {success:false, error:r.error.message};
      var before = parseInt(r.data.stock_qty)||0;
      var after  = Math.max(0, before+change);
      var pname  = r.data.name;

      // Update product stock
      return sb().from('products').update({stock_qty:after, updated_at:'now()'})
        .eq('id', pid).eq('project_id', PROJECT_ID)
        .then(function(r2) {
          if (r2.error) return {success:false, error:r2.error.message};
          // Write stock log
          sb().from('stock_log').insert({
            project_id:   PROJECT_ID,
            product_id:   pid,
            product_name: pname,
            change_qty:   change,
            stock_before: before,
            stock_after:  after,
            reason:       reason,
            done_by:      APP.userId||null,
            done_by_name: APP.name||null,
          });
          writeAudit('adjust_stock', pname+': '+(change>0?'+':'')+change+' packs. '+reason, 'product', pid);
          return {success:true, after:after};
        });
    });
}

function logBatch(params) {
  var pid = params.product_id;
  var qty = parseInt(params.qty_made)||0;

  return sb().from('products').select('stock_qty,name')
    .eq('id', pid).eq('project_id', PROJECT_ID).single()
    .then(function(r) {
      if (r.error) return {success:false, error:r.error.message};
      var pname  = r.data.name;
      var before = parseInt(r.data.stock_qty)||0;
      var after  = before+qty;

      return Promise.all([
        sb().from('batch_records').insert({
          project_id:   PROJECT_ID,
          product_id:   pid,
          product_name: pname,
          qty_made:     qty,
          made_on:      new Date().toISOString().split('T')[0],
          expires_on:   params.expires_on||null,
          batch_note:   params.batch_note||null,
          done_by:      APP.userId||null,
        }),
        sb().from('products').update({stock_qty:after, updated_at:'now()'})
          .eq('id', pid).eq('project_id', PROJECT_ID),
        sb().from('stock_log').insert({
          project_id:   PROJECT_ID,
          product_id:   pid,
          product_name: pname,
          change_qty:   qty,
          stock_before: before,
          stock_after:  after,
          reason:       'Batch production',
          done_by:      APP.userId||null,
          done_by_name: APP.name||null,
        })
      ]).then(function(){
        writeAudit('log_batch', pname+': batch of '+qty+' packs recorded', 'product', pid);
        return {success:true};
      });
    });
}

// ── ORDERS ────────────────────────────────────────────────────────────────────

function getOrders(status) {
  return sb().from('orders')
    .select('*, order_items(product_name, qty, unit_price)')
    .eq('project_id', PROJECT_ID)
    .eq('status', status)
    .order('created_at', {ascending: status==='pending'})
    .then(function(r) {
      if (r.error) return {success:false, error:r.error.message};
      var data = r.data.map(function(o) {
        // Rebuild items_json from order_items for compatibility with existing render code
        var items = (o.order_items||[]).map(function(i){
          return {name:i.product_name, qty:i.qty, price:i.unit_price};
        });
        return Object.assign({}, o, {items_json: JSON.stringify(items)});
      });
      return {success:true, data:data};
    });
}

function decideOrder(params) {
  var orderId  = params.order_id;
  var decision = params.decision; // 'confirm' or 'fail'

  if (decision === 'fail') {
    return sb().from('orders')
      .update({status:'failed', reason:params.reason||'', decided_by:APP.userId||null, decided_at:'now()', updated_at:'now()'})
      .eq('id', orderId).eq('project_id', PROJECT_ID)
      .then(function(r){
        if (r.error) return {success:false, error:r.error.message};
        writeAudit('fail_order','Order fell through: '+orderId+'. Reason: '+(params.reason||''),'order',orderId);
        return {success:true};
      });
  }

  // confirm — fetch order items and deduct stock
  return sb().from('orders')
    .select('*, order_items(product_id, product_name, qty)')
    .eq('id', orderId).eq('project_id', PROJECT_ID).single()
    .then(function(r) {
      if (r.error) return {success:false, error:r.error.message};
      var items = r.data.order_items||[];

      // Update order status
      var updateOrder = sb().from('orders')
        .update({status:'confirmed', decided_by:APP.userId||null, decided_at:'now()', updated_at:'now()'})
        .eq('id', orderId).eq('project_id', PROJECT_ID);

      // Deduct stock for each item
      var stockUpdates = items.map(function(item) {
        if (!item.product_id) return Promise.resolve();
        return adjustStock({
          product_id: item.product_id,
          change_qty: -(item.qty||1),
          reason:     'Order confirmed: '+orderId,
        });
      });

      return Promise.all([updateOrder].concat(stockUpdates)).then(function(){
        writeAudit('confirm_order','Order confirmed: '+orderId,'order',orderId);
        return {success:true};
      });
    });
}

function updateDelivery(params) {
  return sb().from('orders').update({
    delivery_status: params.delivery_status,
    driver_name:     params.driver_name||null,
    driver_phone:    params.driver_phone||null,
    waybill_sent:    true,
    delivery_notes:  params.delivery_notes||null,
    updated_at:      'now()',
  }).eq('id', params.order_id).eq('project_id', PROJECT_ID)
    .then(function(r){
      if (r.error) return {success:false, error:r.error.message};
      writeAudit('update_delivery','Delivery updated for order '+params.order_id+'. Status: '+params.delivery_status,'order',params.order_id);
      return {success:true};
    });
}

// ── CRM / PEOPLE ──────────────────────────────────────────────────────────────

function getClients(type) {
  return sb().from('clients')
    .select('*')
    .eq('project_id', PROJECT_ID)
    .eq('client_type', type)
    .neq('where_we_are', 'not_interested')
    .order('updated_at', {ascending:false})
    .then(function(r){ return r.error ? {success:false,error:r.error.message} : {success:true,data:r.data}; });
}

function updateClientStatus(params) {
  var clientId = params.client_id;
  var updates  = {updated_at:'now()'};
  if (params.where_we_are) updates.where_we_are = params.where_we_are;
  if (params.remind_me_on) updates.remind_me_on  = params.remind_me_on;
  if (params.notes)        updates.notes         = params.notes;

  return Promise.all([
    sb().from('clients').update(updates).eq('id', clientId).eq('project_id', PROJECT_ID),
    sb().from('client_notes').insert({
      project_id:   PROJECT_ID,
      client_id:    clientId,
      stage_set_to: params.where_we_are||null,
      note:         params.notes||null,
      remind_me_on: params.remind_me_on||null,
      done_by:      APP.userId||null,
      done_by_name: APP.name||null,
    })
  ]).then(function(results){
    if (results[0].error) return {success:false, error:results[0].error.message};
    writeAudit('update_client','Client updated: '+clientId+' → '+(params.where_we_are||''),'client',clientId);
    return {success:true};
  });
}

function recordPayment(params) {
  var clientId = params.client_id;
  var amount   = parseFloat(params.amount)||0;

  return sb().from('clients').select('balance_owed, contact_name')
    .eq('id', clientId).eq('project_id', PROJECT_ID).single()
    .then(function(r) {
      if (r.error) return {success:false, error:r.error.message};
      var before = parseFloat(r.data.balance_owed)||0;
      var after  = Math.max(0, before-amount);
      var cname  = r.data.contact_name||clientId;

      return Promise.all([
        sb().from('clients').update({balance_owed:after, updated_at:'now()'})
          .eq('id', clientId).eq('project_id', PROJECT_ID),
        sb().from('payments').insert({
          project_id:     PROJECT_ID,
          client_id:      clientId,
          client_name:    cname,
          amount:         amount,
          balance_before: before,
          balance_after:  after,
          done_by:        APP.userId||null,
          done_by_name:   APP.name||null,
        })
      ]).then(function(){
        writeAudit('record_payment',cname+' paid ₦'+amount+'. Balance: ₦'+before+' → ₦'+after,'client',clientId);
        return {success:true, still_owes:after, status:after<=0?'paid_in_full':'partial'};
      });
    });
}

// ── MONEY RECORDS ─────────────────────────────────────────────────────────────

function addMoneyRecord(params) {
  var packs    = parseInt(params.packs_sold)||0;
  var cost     = parseFloat(params.cost_per_pack)||0;
  var sold     = parseFloat(params.sold_per_pack)||0;
  var spoilt   = parseInt(params.spoilt_packs)||0;
  // Computed columns handle this in DB but we return profit for the toast
  var profit   = (packs*sold) - (packs*cost) - (spoilt*cost);

  return sb().from('money_records').insert({
    project_id:    PROJECT_ID,
    month:         params.month,
    product_name:  params.product_name,
    packs_sold:    packs,
    cost_per_pack: cost,
    sold_per_pack: sold,
    spoilt_packs:  spoilt,
    notes:         params.notes||null,
    done_by:       APP.userId||null,
  }).then(function(r){
    if (r.error) return {success:false, error:r.error.message};
    writeAudit('add_money_record',params.product_name+' for '+params.month,'money_record',null);
    return {success:true, final_profit:profit};
  });
}

// ── STAFF ─────────────────────────────────────────────────────────────────────

function addStaff(params) {
  // In Supabase, adding staff = creating an Auth user + a profiles row.
  // The cleanest mobile-friendly approach: use admin invite (requires service role key
  // which we don't expose on frontend). Instead, we create the Auth user via
  // signUp and immediately mark them in profiles.
  // Staff will receive a confirmation email — disable email confirmation in
  // Supabase Auth settings for frictionless onboarding.
  var email = params.email || (params.name.toLowerCase().replace(/\s+/g,'.')+'@oashopbook.internal');
  return sb().auth.signUp({email:email, password:params.pin})
    .then(function(r){
      if (r.error) return {success:false, error:r.error.message};
      var uid = r.data.user && r.data.user.id;
      if (!uid) return {success:false, error:'Could not create staff account'};
      return sb().from('profiles').insert({
        id:           uid,
        project_id:   PROJECT_ID,
        display_name: params.name,
        role:         params.role||'staff',
        is_active:    true,
      }).then(function(r2){
        if (r2.error) return {success:false, error:r2.error.message};
        writeAudit('add_staff','New staff added: '+params.name,'profile',uid);
        return {success:true};
      });
    });
}

// ── BACKUP / RESET ────────────────────────────────────────────────────────────

function doSupabaseBackup() {
  // Download all key tables as a JSON file to the user's device
  return Promise.all([
    sb().from('products').select('*').eq('project_id',PROJECT_ID),
    sb().from('orders').select('*').eq('project_id',PROJECT_ID),
    sb().from('clients').select('*').eq('project_id',PROJECT_ID),
    sb().from('money_records').select('*').eq('project_id',PROJECT_ID),
    sb().from('settings').select('*').eq('project_id',PROJECT_ID),
  ]).then(function(results){
    var stamp = new Date().toISOString().replace(/[:.]/g,'-').slice(0,19);
    var backup = {
      stamp:        stamp,
      project_id:   PROJECT_ID,
      products:     results[0].data||[],
      orders:       results[1].data||[],
      clients:      results[2].data||[],
      money_records:results[3].data||[],
      settings:     results[4].data||[],
    };
    var blob = new Blob([JSON.stringify(backup,null,2)],{type:'application/json'});
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'oa-shopbook-backup-'+stamp+'.json';
    a.click();
    writeAudit('backup','Manual backup downloaded','system',null);
    return {success:true, stamp:stamp};
  });
}

function doFactoryReset() {
  // Deletes all transactional data but keeps products and settings
  var tables = ['order_items','orders','stock_log','batch_records','client_notes','payments','audit_log','money_records'];
  var deletes = tables.map(function(t){
    return sb().from(t).delete().eq('project_id',PROJECT_ID);
  });
  return Promise.all(deletes).then(function(){
    return {success:true, stamp:new Date().toISOString()};
  }).catch(function(e){
    return {success:false, error:e.message};
  });
}

function clearSection(params) {
  var tableMap = {
    orders:    ['order_items','orders'],
    stock_log: ['stock_log'],
    crm:       ['client_notes','clients'],
    customers: [], // customers is a view — clear via orders
    audit:     ['audit_log'],
    money:     ['money_records'],
  };
  var tables = tableMap[params.section]||[];
  if (!tables.length) return Promise.resolve({success:false, error:'Unknown section'});
  var deletes = tables.map(function(t){
    return sb().from(t).delete().eq('project_id',PROJECT_ID);
  });
  return Promise.all(deletes).then(function(){
    writeAudit('clear_section','Section cleared: '+params.section,'system',null);
    return {success:true};
  });
}

// ── AUDIT HELPER ──────────────────────────────────────────────────────────────

function writeAudit(action, details, entityType, entityId) {
  sb().from('audit_log').insert({
    project_id:   PROJECT_ID,
    action:       action,
    details:      details,
    entity_type:  entityType||null,
    entity_id:    entityId ? String(entityId) : null,
    done_by:      APP.userId||null,
    done_by_name: APP.name||null,
  }).then(function(){}); // fire and forget
}

// ── UI HELPERS ────────────────────────────────────────────────────────────────

function toast(msg, type){
  var t = document.getElementById('toast'); if(!t) return;
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
  sbCall('getShopPulse').then(function(res){
    if(!res.success){toast('Could not load shop data','bad');return;}
    APP.pulseData=res.data;
    renderPulseRings(res.data); renderMetricCards(res.data); renderTargetBar(res.data);
    renderMonthlyChart(res.data); renderTopSellers(res.data);
    renderLowStockBanner(res.data); updateNavDots(res.data);
  }).catch(function(){toast('Connection issue — check internet','bad');});
}

function renderGreeting(){
  var el=document.getElementById('today-greeting'); if(!el) return;
  var h=new Date().getHours();
  var period=h<12?'MORNING':h<17?'AFTERNOON':'EVENING';
  var name=APP.name?', '+APP.name.split(' ')[0]:', MANAGER';
  el.textContent=period+name;
}

function renderPulseRings(d){
  var moneyC  = d.money_pulse  || ((!d.money_in_this_month||d.money_in_this_month===0)?'grey':'red');
  var stockC  = d.stock_pulse  || ((!d.stock_worth||d.stock_worth===0)?'grey':'red');
  var peopleC = d.people_pulse || (((d.retail_clients||0)+(d.wholesale_clients||0)+(d.distributor_clients||0))===0?'grey':'red');
  setPulse('ring-money',moneyC); setPulse('ring-stock',stockC); setPulse('ring-people',peopleC);
  var ml={green:'FLOWING WELL',yellow:'MOVING STEADY',red:'NEEDS ATTENTION',grey:'NO DATA YET'};
  var sl={green:'ALL STOCKED UP',yellow:'LOSING STEAM',red:'RUNNING DRY',grey:'NO RECORDS YET'};
  var pl={green:'ALL QUIET',yellow:'SOME INTEREST',red:'HIGH VOLUME',grey:'NO LEADS YET'};
  setStatusText('pulse-money-label',ml[moneyC]||ml.grey,moneyC);
  setStatusText('pulse-stock-label',sl[stockC]||sl.grey,stockC);
  setStatusText('pulse-people-label',pl[peopleC]||pl.grey,peopleC);
}
function setPulse(id,colour){ var el=document.getElementById(id); if(el) el.className='pulse-ring '+colour; }
function setStatusText(id,text,colour){ var el=document.getElementById(id); if(!el) return; el.textContent=text; el.className='pulse-status-text pulse-text-'+colour; }

function expandPulse(type){
  var d=APP.pulseData; if(!d) return;
  if(APP.openDrawer===type){document.getElementById('drawer-'+type).classList.add('hidden');APP.openDrawer='';return;}
  ['money','stock-p','people-p'].forEach(function(t){document.getElementById('drawer-'+t).classList.add('hidden');});
  APP.openDrawer=type;
  var drawer=document.getElementById('drawer-'+type); drawer.classList.remove('hidden');
  if(type==='money'){
    var ch=d.money_change_pct||0,arr=ch>0?'▲':ch<0?'▼':'—',col=ch>0?'color:var(--green)':ch<0?'color:var(--red)':'';
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
      items.forEach(function(i){inner+=drow(esc(i.name),'<span style="color:var(--red);font-weight:800">'+i.stock+' left</span> (alert at '+i.alert_level+')');});
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
    mCard('mc-money','₦'+fmt(d.money_in_this_month),'MONEY IN','All-time: ₦'+fmt(d.total_money_in),'vs last month: '+(d.money_change_pct>0?'+':'')+(d.money_change_pct||0)+'%')+
    mCard('mc-orders',String(d.orders_waiting||0),'ORDERS WAITING','Confirmed today: '+(d.confirmed_orders||0),'Fell through: '+(d.failed_orders||0))+
    mCard('mc-stock',String(d.low_stock_count||0),'LOW ITEMS','Active items: '+(d.total_products||0),'Stock worth: ₦'+fmt(d.stock_worth))+
    mCard('mc-people',String((d.retail_clients||0)+(d.wholesale_clients||0)+(d.distributor_clients||0)),'PEOPLE ASKING','Customers: '+(d.total_customers||0),'Overdue follow-ups: '+(d.follow_ups_overdue||0));
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
  var chart=d.monthly_chart||[],el=document.getElementById('bar-chart-months'); if(!el) return;
  if(!chart.length){el.innerHTML='<div style="color:var(--text3);font-size:12px;padding:16px 0">No data yet — confirm some sales first</div>';return;}
  var max=Math.max.apply(null,chart.map(function(m){return m.revenue;}))||1;
  el.innerHTML=chart.map(function(m){
    var h=Math.max(4,Math.round((m.revenue/max)*90)),lbl=m.month?m.month.slice(5):'';
    return '<div class="bc-wrap"><div class="bc-bar" style="height:'+h+'px"><div class="bc-tip">₦'+fmt(m.revenue)+'</div></div><div class="bc-label">'+lbl+'</div></div>';
  }).join('');
}

function renderTopSellers(d){
  var sellers=d.top_sellers||[],el=document.getElementById('hbar-sellers'); if(!el) return;
  if(!sellers.length){el.innerHTML='<div style="color:var(--text3);font-size:12px;padding:16px 0">No sales yet</div>';return;}
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
  if(!items.length){banner.classList.add('hidden');return;}
  banner.innerHTML='<div class="banner-content">'+
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
  var od=document.getElementById('dot-orders'),pd=document.getElementById('dot-people');
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
    lines.push('');lines.push('  ⚠️ LOW STOCK:');
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
  sbCall(actionMap[APP.currentOrderTab]).then(function(res){
    if(!res.success){el.innerHTML='<div class="loading-msg">Error loading orders.</div>';return;}
    var orders=res.data||[];
    var todaySales=0;
    if(APP.currentOrderTab==='confirmed'){
      var today=new Date().toDateString();
      orders.forEach(function(o){if(new Date(o.decided_at||o.created_at).toDateString()===today) todaySales+=parseFloat(o.total)||0;});
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
    var items=[]; try{var parsed=JSON.parse(o.items_json||'[]');if(Array.isArray(parsed))items=parsed;}catch(e){}
    var dBadge=tab==='confirmed'?badge(delivLabel(o.delivery_status),o.delivery_status||'getting_ready'):tab==='pending'?badge('WAITING','waiting'):badge('FELL THROUGH','fell_through');
    html+='<div class="order-card">';
    html+='<div class="order-card-head"><div><div class="order-ref">ORDER #'+esc(o.tracking_ref||o.id||'')+'</div><div class="order-name">'+esc(name)+'</div><div class="order-phone">📞 '+esc(o.phone||'')+'</div></div>'+dBadge+'</div>';
    if(o.landmark||o.state) html+='<div class="order-location">📍 '+(o.landmark?esc(o.landmark)+', ':'')+esc(o.state||'')+(o.lga?', '+esc(o.lga):'')+'</div>';
    if(items.length){
      html+='<div class="order-items-box">';
      items.forEach(function(item){html+='<div class="order-item-row"><span>'+esc(item.qty||1)+'x '+esc(item.name||'')+'</span><span class="order-item-price">₦'+fmt((item.qty||1)*(item.price||0))+'</span></div>';});
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
  sbCall('decideOrder',{order_id:id,decision:'confirm',done_by:APP.name}).then(function(res){
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
  var v=document.getElementById('fail-reason').value,o=document.getElementById('fail-other');
  if(v==='Other') o.classList.remove('hidden'); else{o.classList.add('hidden');o.value='';}
}
function submitFail(){
  var id=document.getElementById('fail-id').value;
  var sel=document.getElementById('fail-reason').value;
  var other=document.getElementById('fail-other').value.trim();
  var reason=sel==='Other'?other:sel;
  if(!reason){toast('Please pick a reason','bad');return;}
  sbCall('decideOrder',{order_id:id,decision:'fail',reason:reason,done_by:APP.name}).then(function(res){
    if(res.success){closeModal('modal-fail');toast('Order marked as fell through','good');loadOrders('pending');loadToday();}
    else toast('Error: '+(res.error||''),'bad');
  });
}

// ── DELIVERY / WAYBILL ────────────────────────────────────────────────────────

var _deliveryOrder=null;

function openDeliveryModal(orderId){
  sbCall('getConfirmedOrders').then(function(res){
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
  sbCall('updateDelivery',{order_id:orderId,delivery_status:status,driver_name:driverName,driver_phone:driverPhone,waybill_sent:'yes',delivery_notes:notes,done_by:APP.name}).then(function(res){
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
