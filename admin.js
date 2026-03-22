// OA Shop Book — admin.js  v4.1 Supabase — P0 terminology + pulse fixes
// Auth, navigation, API, Shop Today, Orders, Offline Queue

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
  allProducts:[], openDrawer:'',
  // Phase 4 — auto-refresh
  _refreshTimer: null, _countdownTimer: null, _countdownSecs: 300,
  _realtimeDebounce: null,
  // Phase 5 — tracking thresholds
  thresholds: {
    active_days:     14,
    dormant_days:    30,
    loyal_orders:     5,
    bigspend_amount: 50000,
  },
  // Chart state
  _chartWindow:  6,
  _sellersMode: 'today',
  // Customer tab state — persists across navigation
  _custTab: '',
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

  // Load thresholds from settings before anything renders
  sbCall('getSettings').then(function(res) {
    var s = res.data || {};
    if (s.active_window_days)   APP.thresholds.active_days    = parseInt(s.active_window_days)||14;
    if (s.dormant_days)         APP.thresholds.dormant_days   = parseInt(s.dormant_days)||30;
    if (s.loyal_min_orders)     APP.thresholds.loyal_orders   = parseInt(s.loyal_min_orders)||5;
    if (s.high_value_min_spend) APP.thresholds.bigspend_amount= parseFloat(s.high_value_min_spend)||50000;
  });

  // Today loads immediately (visible on boot)
  loadToday();

  // All other sections preload silently in background after a short delay
  // so Today renders first without competing network requests
  setTimeout(function() {
    loadOrders('pending');
    loadItems();
    loadStock('levels');
    loadPeople('retail');
    loadCustomers();
    if (APP.role === 'master') loadMoney();
  }, 1800);

  setupSessionRefresh();
  startAutoRefresh();
  setupRealtime();
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

// ── AUTO-REFRESH (Phase 4) ────────────────────────────────────────────────────
// Refreshes the currently visible section every 5 minutes.
// Shows a visible countdown badge. Manual refresh button resets the timer.

var REFRESH_INTERVAL_SECS = 180; // 3 minutes

function startAutoRefresh() {
  clearInterval(APP._refreshTimer);
  clearInterval(APP._countdownTimer);
  APP._countdownSecs = REFRESH_INTERVAL_SECS;
  updateCountdownBadge();

  APP._countdownTimer = setInterval(function() {
    APP._countdownSecs--;
    if (APP._countdownSecs <= 0) {
      APP._countdownSecs = REFRESH_INTERVAL_SECS;
      refreshActivePage();
    }
    updateCountdownBadge();
  }, 1000);
}

function updateCountdownBadge() {
  var secs = APP._countdownSecs;
  var mins = Math.floor(secs / 60);
  var s    = secs % 60;
  var txt  = mins + ':' + (s < 10 ? '0' : '') + s;
  document.querySelectorAll('.refresh-countdown').forEach(function(el) {
    el.textContent = txt;
  });
}

function manualRefresh() {
  APP._countdownSecs = REFRESH_INTERVAL_SECS;
  updateCountdownBadge();
  // Visual + haptic feedback on the button itself
  var btns = document.querySelectorAll('.refresh-btn');
  btns.forEach(function(btn) {
    btn.classList.add('refresh-btn-active');
    setTimeout(function() { btn.classList.remove('refresh-btn-active'); }, 600);
  });
  // Haptic on mobile
  if (navigator.vibrate) navigator.vibrate(40);
  refreshActivePage();
}

function flashContentArea() {
  var active = document.querySelector('.page.active');
  if (!active) return;
  var body = active.querySelector('.section-body, #items-body, #orders-body, #stock-body, #people-body, #customers-body, #money-body, #settings-body, .metric-grid');
  if (body) {
    body.classList.add('refresh-flash');
    setTimeout(function() { body.classList.remove('refresh-flash'); }, 500);
  }
}

function refreshActivePage() {
  flashContentArea();
  var active = document.querySelector('.page.active');
  if (!active) return;
  var id = active.id;
  if (id === 'page-today')     loadToday();
  if (id === 'page-orders')    loadOrders(APP.currentOrderTab);
  if (id === 'page-items')     loadItems();
  if (id === 'page-stock')     loadStock(APP.currentStockTab);
  if (id === 'page-people')    loadPeople(APP.currentPeopleTab);
  if (id === 'page-customers') loadCustomers();
  if (id === 'page-money')     loadMoney();
  if (id === 'page-settings')  loadSettings(APP.currentSettingsTab);
}

// ── CUSTOMER STATE + LOYALTY TIER ENGINE (Phase 5) ───────────────────────────
// All logic is computed on read — nothing stored in the database.
// Thresholds are loaded from settings on boot and stored in APP.thresholds.

function customerDaysSinceOrder(lastOrderDate) {
  if (!lastOrderDate) return 9999;
  var last = new Date(lastOrderDate);
  var now  = new Date();
  return Math.floor((now - last) / 86400000);
}

function getCustomerState(c) {
  // c must have: last_order_date, total_orders, total_spent, prev_state (optional)
  var t    = APP.thresholds;
  var days = customerDaysSinceOrder(c.last_order_date || c.last_order);
  var orders = parseInt(c.total_orders) || 0;
  var spent  = parseFloat(c.total_spent)  || 0;

  // ── State ─────────────────────────────────────────────────────────────────
  var state;
  if (orders === 0) {
    state = 'no_orders';
  } else if (days <= t.active_days) {
    state = 'active';
  } else if (days <= t.dormant_days) {
    state = 'gone_quiet';
  } else {
    state = 'lost';
  }
  // Came Back: was lost/gone_quiet and just placed order (days <= active_days)
  // We detect this by checking if they have multiple orders but recent activity
  if (days <= t.active_days && orders >= 2) {
    // Could be reactivated — we flag it but keep state as 'active'
    // Full reactivation detection needs prev_state which requires history query
    // so we use a simple heuristic: active + orders >= 2 + gap in last_order visible
    state = 'active';
  }

  // ── Tier ──────────────────────────────────────────────────────────────────
  var tier;
  var wasLoyal = orders >= t.loyal_orders;
  var wasBig   = spent >= t.bigspend_amount;

  if (orders === 1) {
    tier = 'new';
  } else if (orders >= 2 && orders < t.loyal_orders) {
    tier = 'returning';
  } else if (orders >= t.loyal_orders && days <= t.active_days) {
    tier = 'loyal';
  } else if (spent >= t.bigspend_amount) {
    tier = 'big_spender';
  } else {
    tier = 'returning';
  }

  // At Risk: was Loyal or Big Spender, now Gone Quiet or Lost
  if ((wasLoyal || wasBig) && (state === 'gone_quiet' || state === 'lost')) {
    tier = 'at_risk';
  }

  return { state: state, tier: tier, days: days };
}

var _STATE_LABELS = {
  active:     'Active',
  gone_quiet: 'Gone Quiet',
  lost:       'Lost',
  no_orders:  'No Orders',
};
var _TIER_LABELS = {
  new:         'New',
  returning:   'Returning',
  loyal:       'Loyal',
  big_spender: 'Big Spender',
  at_risk:     'At Risk',
};

function stateTag(state) {
  var lbl = _STATE_LABELS[state] || state;
  return '<span class="cust-state-badge state-'+state+'">'+lbl+'</span>';
}
function tierTag(tier) {
  var lbl = _TIER_LABELS[tier] || tier;
  return '<span class="cust-tier-badge tier-'+tier+'">'+lbl+'</span>';
}



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
  var titles = {today:'Shop Today',orders:'Orders',items:'My Products',
    stock:'My Stock',people:'My Customers',customers:'My Customers',
    money:'My Cash Book',settings:'Shop Settings',history:'Past Records',
    followups:'Reminders'};
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
  if (name==='history')   initHistoryPage();
  if (name==='followups') loadFollowUps();
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
  var todayStart = now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+String(now.getDate()).padStart(2,'0')+'T00:00:00';
  // 12-month window for revenue trend
  var twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth()-11, 1).toISOString();

  return Promise.all([
    // [0] Active products
    sb().from('products').select('id,name,stock_qty,low_stock_alert,cost_price,consumer_price,active').eq('project_id',PROJECT_ID),
    // [1] Money records (manual entries — kept for profit/cost data)
    sb().from('money_records').select('month,total_collected,final_profit').eq('project_id',PROJECT_ID),
    // [2] Pending orders
    sb().from('orders').select('id,total,created_at').eq('project_id',PROJECT_ID).eq('status','pending'),
    // [3] Confirmed orders this month (for monthly revenue + metric cards)
    sb().from('orders').select('id,total,created_at,buyer_name').eq('project_id',PROJECT_ID).eq('status','confirmed').gte('created_at',monthStart),
    // [4] Failed orders this month
    sb().from('orders').select('id').eq('project_id',PROJECT_ID).eq('status','failed').gte('created_at',monthStart),
    // [5] CRM clients
    sb().from('clients').select('id,client_type,where_we_are,remind_me_on').eq('project_id',PROJECT_ID).neq('where_we_are','not_interested'),
    // [6] Clients with outstanding balance
    sb().from('clients').select('balance_owed').eq('project_id',PROJECT_ID).gt('balance_owed',0),
    // [7] Settings
    sb().from('settings').select('key,value').eq('project_id',PROJECT_ID),
    // [8] Confirmed orders last 12 months with items — for revenue chart + top sellers by product
    sb().from('orders').select('id,total,created_at,order_items(product_name,qty,unit_price)').eq('project_id',PROJECT_ID).eq('status','confirmed').gte('created_at',twelveMonthsAgo),
    // [9] All confirmed orders for total customer count
    sb().from('orders').select('buyer_name').eq('project_id',PROJECT_ID).eq('status','confirmed'),
    // [10] Customers view for recovery signals
    sb().from('customers').select('id,buyer_name,phone,total_orders,total_spent,last_order_date').eq('project_id',PROJECT_ID),
    // [11] Today's confirmed orders for money pulse + today's sales card
    sb().from('orders').select('id,total,created_at,order_items(product_name,qty,unit_price)').eq('project_id',PROJECT_ID).eq('status','confirmed').gte('created_at',todayStart),
  ]).then(function(results) {
    var products     = (results[0].data||[]);
    var moneyRows    = (results[1].data||[]);
    var pending      = (results[2].data||[]);
    var confirmedMo  = (results[3].data||[]);
    var failed       = (results[4].data||[]);
    var clients      = (results[5].data||[]);
    var debtors      = (results[6].data||[]);
    var settRows     = (results[7].data||[]);
    var allConfirmed = (results[8].data||[]);
    var allOrders    = (results[9].data||[]);
    var customers    = (results[10].data||[]);
    var todayOrders  = (results[11].data||[]);

    // Settings map
    var sett = {};
    settRows.forEach(function(s){ sett[s.key]=s.value; });
    var monthlyTarget   = parseFloat(sett.monthly_target||0);
    var lowStockDefault = parseInt(sett.low_stock_default||20);

    // ── Money ─────────────────────────────────────────────────────────────────
    // Primary source: live confirmed orders (not money_records which is manual)
    var moneyThisMonth = confirmedMo.reduce(function(s,o){ return s+(parseFloat(o.total)||0); },0);
    var todaySalesAmt  = todayOrders.reduce(function(s,o){ return s+(parseFloat(o.total)||0); },0);
    var todaySalesQty  = todayOrders.reduce(function(s,o){
      return s + (o.order_items||[]).reduce(function(q,i){ return q+(parseInt(i.qty)||1); },0);
    },0);

    // Last month from confirmed orders
    var lastMonthStart = lastMK+'-01';
    var lastMonthEnd   = thisMK+'-01';
    var moneyLastMonth = allConfirmed.filter(function(o){
      return o.created_at >= lastMonthStart && o.created_at < lastMonthEnd;
    }).reduce(function(s,o){ return s+(parseFloat(o.total)||0); },0);

    var moneyChangePct = moneyLastMonth>0 ? Math.round(((moneyThisMonth-moneyLastMonth)/moneyLastMonth)*100) : 0;
    var totalMoneyIn   = allOrders.length > 0
      ? allConfirmed.reduce(function(s,o){ return s+(parseFloat(o.total)||0); },0)
      : moneyRows.reduce(function(s,r){ return s+(parseFloat(r.total_collected)||0); },0);

    // ── Stock ─────────────────────────────────────────────────────────────────
    var activeProducts = products.filter(function(p){ return p.active; });
    var stockWorth=0, ifAllSold=0, lowItems=[];
    activeProducts.forEach(function(p){
      var qty   = parseInt(p.stock_qty)||0;
      var cost  = parseFloat(p.cost_price)||0;
      var sell  = parseFloat(p.consumer_price)||0;
      var alert = parseInt(p.low_stock_alert)||lowStockDefault;
      stockWorth += qty*cost;
      ifAllSold  += qty*sell;
      if (qty < alert) lowItems.push({name:p.name, stock:qty, alert_level:alert});
    });
    var possibleProfit = ifAllSold - stockWorth;

    // ── People / CRM ──────────────────────────────────────────────────────────
    var retailC=0, wholesaleC=0, distributorC=0, overdueFollowups=0, todayFollowUps=0;
    var todayDate = new Date(); todayDate.setHours(0,0,0,0);
    var tomorrowDate = new Date(todayDate); tomorrowDate.setDate(tomorrowDate.getDate()+1);
    clients.forEach(function(c){
      if (c.client_type==='retail')      retailC++;
      if (c.client_type==='wholesale')   wholesaleC++;
      if (c.client_type==='distributor') distributorC++;
      if (c.remind_me_on && c.where_we_are !== 'not_interested') {
        var rd = new Date(c.remind_me_on); rd.setHours(0,0,0,0);
        if (rd < todayDate)       overdueFollowups++;
        else if (rd < tomorrowDate) todayFollowUps++;
      }
    });
    var peopleStillOwe = debtors.reduce(function(s,r){ return s+(parseFloat(r.balance_owed)||0); },0);

    // ── Orders confirmed today ─────────────────────────────────────────────────
    var confirmedTodayCount = todayOrders.length;

    // ── Unique customers ───────────────────────────────────────────────────────
    var uniqueCustomers = {};
    allOrders.forEach(function(o){ if(o.buyer_name) uniqueCustomers[o.buyer_name]=1; });

    // ── Revenue trend — from live orders, last 12 months ──────────────────────
    var chartMap = {};
    allConfirmed.forEach(function(o){
      var m = (o.created_at||'').slice(0,7); // 'YYYY-MM'
      if (!m) return;
      if (!chartMap[m]) chartMap[m]=0;
      chartMap[m] += parseFloat(o.total)||0;
    });
    var monthlyChart = Object.keys(chartMap).sort().map(function(m){ return {month:m,revenue:chartMap[m]}; });

    // ── Top sellers — by product name from order_items ────────────────────────
    // TODAY sellers
    var todaySellerMap = {};
    todayOrders.forEach(function(o){
      (o.order_items||[]).forEach(function(i){
        var k = i.product_name||'Unknown';
        if (!todaySellerMap[k]) todaySellerMap[k] = {qty:0, revenue:0};
        todaySellerMap[k].qty     += parseInt(i.qty)||1;
        todaySellerMap[k].revenue += (parseFloat(i.unit_price)||0)*(parseInt(i.qty)||1);
      });
    });
    var topSellersToday = Object.keys(todaySellerMap).map(function(k){
      return {name:k, qty:todaySellerMap[k].qty, revenue:todaySellerMap[k].revenue};
    }).sort(function(a,b){ return b.qty-a.qty; }).slice(0,8);

    // ALL TIME (last 12 months) sellers
    var allSellerMap = {};
    allConfirmed.forEach(function(o){
      (o.order_items||[]).forEach(function(i){
        var k = i.product_name||'Unknown';
        if (!allSellerMap[k]) allSellerMap[k] = {qty:0, revenue:0};
        allSellerMap[k].qty     += parseInt(i.qty)||1;
        allSellerMap[k].revenue += (parseFloat(i.unit_price)||0)*(parseInt(i.qty)||1);
      });
    });
    var topSellersAll = Object.keys(allSellerMap).map(function(k){
      return {name:k, qty:allSellerMap[k].qty, revenue:allSellerMap[k].revenue};
    }).sort(function(a,b){ return b.qty-a.qty; }).slice(0,8);

    // ── Pulse colours ─────────────────────────────────────────────────────────
    // No grey states — every circle must drive an action
    var targetPct   = monthlyTarget>0 ? Math.min(100,Math.round((moneyThisMonth/monthlyTarget)*100)) : 0;
    var moneyPulse  = todaySalesAmt>0 ? 'green' : moneyThisMonth>0 ? 'yellow' : 'yellow'; // yellow = no sales today / yellow = nothing yet this month
    var stockPulse  = lowItems.length===0 ? 'green' : lowItems.length<3 ? 'yellow' : 'red';
    var peoplePulse = overdueFollowups>0 ? 'red' : todayFollowUps>0 ? 'yellow' : (retailC+wholesaleC+distributorC)===0 ? 'yellow' : 'green';

    // ── Recovery signals ──────────────────────────────────────────────────────
    var recoveryGoneQuiet=[], recoveryAtRisk=[];
    customers.forEach(function(c){
      var cs=getCustomerState(c);
      if(cs.state==='gone_quiet') recoveryGoneQuiet.push({name:c.buyer_name||'Customer',phone:c.phone||'',days:cs.days,spent:c.total_spent});
      if(cs.tier==='at_risk')     recoveryAtRisk.push({name:c.buyer_name||'Customer',phone:c.phone||'',days:cs.days,spent:c.total_spent});
    });
    recoveryGoneQuiet.sort(function(a,b){ return b.days-a.days; });
    recoveryAtRisk.sort(function(a,b){ return (parseFloat(b.spent)||0)-(parseFloat(a.spent)||0); });

    return {success:true, data:{
      // Money
      money_in_this_month:   moneyThisMonth,
      money_in_last_month:   moneyLastMonth,
      money_change_pct:      moneyChangePct,
      total_money_in:        totalMoneyIn,
      monthly_target:        monthlyTarget,
      target_reached_pct:    targetPct,
      people_still_owe_you:  peopleStillOwe,
      money_pulse:           moneyPulse,
      money_message:         todaySalesAmt>0 ? 'Money came in today — '+confirmedTodayCount+' order'+(confirmedTodayCount!==1?'s':'')+' accepted.' : moneyThisMonth>0 ? 'No orders accepted yet today. Check if walk-in sales happened.' : 'No accepted orders this month yet. Add your first entry.',
      // Today's sales (for metric card)
      today_sales_amount:    todaySalesAmt,
      today_sales_qty:       todaySalesQty,
      today_orders_count:    confirmedTodayCount,
      // Stock
      stock_worth:           stockWorth,
      if_all_sold:           ifAllSold,
      possible_profit:       possibleProfit,
      low_stock_count:       lowItems.length,
      items_running_low:     lowItems,
      total_products:        activeProducts.length,
      stock_pulse:           stockPulse,
      stock_message:         lowItems.length===0?'All items stocked up.':'Some items need restocking.',
      // Orders
      orders_waiting:        pending.length,
      confirmed_orders:      confirmedTodayCount,
      failed_orders:         failed.length,
      total_customers:       Object.keys(uniqueCustomers).length,
      // People
      retail_clients:        retailC,
      wholesale_clients:     wholesaleC,
      distributor_clients:   distributorC,
      follow_ups_overdue:    overdueFollowups,
      follow_ups_today:      todayFollowUps,
      people_pulse:          peoplePulse,
      people_message:        overdueFollowups>0 ? overdueFollowups+' reminder'+(overdueFollowups!==1?'s':'')+' overdue — follow up now.' : todayFollowUps>0 ? todayFollowUps+' reminder'+(todayFollowUps!==1?'s':'')+' due today.' : (retailC+wholesaleC+distributorC)===0 ? 'No contacts added yet. Add your first customer.' : 'All reminders up to date.',
      // Charts
      monthly_chart:         monthlyChart,
      top_sellers_today:     topSellersToday,
      top_sellers_all:       topSellersAll,
      // Recovery
      recovery_gone_quiet:   recoveryGoneQuiet.slice(0,5),
      recovery_at_risk:      recoveryAtRisk.slice(0,5),
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
  var profit   = (packs*sold) - (packs*cost) - (spoilt*cost);

  // Manual entry always saves as entered — this is the source of truth
  // for production cost and spoilage data that orders alone can't provide.
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
    // Also sync live revenue from confirmed orders for this month as a reference
    // (returned in the toast so admin can compare manual vs actual)
    var monthStart = params.month+'-01T00:00:00';
    var nextMonth  = params.month.slice(0,4)+'-'+String((parseInt(params.month.slice(5,7))||1)+1).padStart(2,'0')+'-01T00:00:00';
    return sb().from('orders').select('total').eq('project_id',PROJECT_ID).eq('status','confirmed').gte('created_at',monthStart).lt('created_at',nextMonth)
      .then(function(r2){
        var liveRev = (r2.data||[]).reduce(function(s,o){ return s+(parseFloat(o.total)||0); },0);
        return {success:true, final_profit:profit, live_revenue:liveRev};
      });
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

// ── REALTIME SUBSCRIPTIONS ─────────────────────────────────────────────────────
// Auto-refreshes Shop Today whenever orders or products change in Supabase.
// Money circle + stock circle update the moment you confirm an order.

function setupRealtime() {
  try {
    sb().channel('oa-realtime')
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'orders',
        filter: 'project_id=eq.' + PROJECT_ID
      }, function() {
        clearTimeout(APP._realtimeDebounce);
        APP._realtimeDebounce = setTimeout(function() {
          var active = document.querySelector('.page.active');
          if (active && active.id === 'page-today') loadToday();
          if (active && active.id === 'page-orders') loadOrders(APP.currentOrderTab);
        }, 800);
      })
      .on('postgres_changes', {
        event:  '*',
        schema: 'public',
        table:  'products',
        filter: 'project_id=eq.' + PROJECT_ID
      }, function() {
        clearTimeout(APP._realtimeDebounce);
        APP._realtimeDebounce = setTimeout(function() {
          var active = document.querySelector('.page.active');
          if (active && active.id === 'page-today') loadToday();
          if (active && active.id === 'page-items') loadItems();
          if (active && active.id === 'page-stock') loadStock(APP.currentStockTab);
        }, 800);
      })
      .subscribe();
  } catch(e) {
    console.warn('OA Realtime unavailable — auto-refresh covers it:', e.message);
  }
}


// ── SHOP HISTORY ──────────────────────────────────────────────────────────────
// Date-range query across orders, clients, products.
// Returns a structured report the admin can copy for WhatsApp, plain text, or CSV.

var _historyData = null;

function initHistoryPage() {
  // Default to yesterday → today on first open
  var today = new Date();
  var yest  = new Date(today); yest.setDate(yest.getDate()-1);
  var todayStr = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  var yestStr  = yest.getFullYear()+'-'+String(yest.getMonth()+1).padStart(2,'0')+'-'+String(yest.getDate()).padStart(2,'0');
  var fromEl = document.getElementById('hist-from');
  var toEl   = document.getElementById('hist-to');
  if (fromEl && !fromEl.value) fromEl.value = yestStr;
  if (toEl   && !toEl.value)   toEl.value   = todayStr;
  // Set max to today, min to 1 year ago
  var oneYearAgo = new Date(today); oneYearAgo.setFullYear(oneYearAgo.getFullYear()-1);
  var minStr = oneYearAgo.getFullYear()+'-'+String(oneYearAgo.getMonth()+1).padStart(2,'0')+'-'+String(oneYearAgo.getDate()).padStart(2,'0');
  if (fromEl) { fromEl.max = todayStr; fromEl.min = minStr; }
  if (toEl)   { toEl.max   = todayStr; toEl.min   = minStr; }
}

function setHistoryRange(days) {
  var today = new Date();
  var from  = new Date(today); from.setDate(from.getDate()-days);
  var todayStr = today.getFullYear()+'-'+String(today.getMonth()+1).padStart(2,'0')+'-'+String(today.getDate()).padStart(2,'0');
  var fromStr  = from.getFullYear()+'-'+String(from.getMonth()+1).padStart(2,'0')+'-'+String(from.getDate()).padStart(2,'0');
  var fromEl = document.getElementById('hist-from');
  var toEl   = document.getElementById('hist-to');
  if (fromEl) fromEl.value = fromStr;
  if (toEl)   toEl.value   = todayStr;
  // Highlight active shortcut
  document.querySelectorAll('.hist-shortcut').forEach(function(b){ b.classList.remove('active'); });
  // Find which button was clicked by days value
  var labels = {1:'Yesterday',7:'Last 7 days',30:'Last 30 days',90:'Last 3 months',365:'Full year'};
  document.querySelectorAll('.hist-shortcut').forEach(function(b){
    if (b.textContent.trim() === (labels[days]||'')) b.classList.add('active');
  });
  loadHistory();
}

function loadHistory() {
  var fromVal = document.getElementById('hist-from') && document.getElementById('hist-from').value;
  var toVal   = document.getElementById('hist-to')   && document.getElementById('hist-to').value;
  var body    = document.getElementById('history-body');
  var actions = document.getElementById('history-actions');
  if (!fromVal || !toVal) { toast('Pick a date range first','bad'); return; }
  if (fromVal > toVal) { toast('Start date must be before end date','bad'); return; }
  // Enforce 1-year max window
  var diffMs   = new Date(toVal) - new Date(fromVal);
  var diffDays = diffMs / 86400000;
  if (diffDays > 366) { toast('Maximum range is 1 year','bad'); return; }

  body.innerHTML = '<div class="loading-msg">Pulling history…</div>';
  if (actions) actions.classList.add('hidden');

  var fromISO = fromVal + 'T00:00:00';
  var toISO   = toVal   + 'T23:59:59';

  Promise.all([
    // Confirmed orders in range
    sb().from('orders').select('id,tracking_ref,buyer_name,phone,state,buyer_type,total,created_at,order_items(product_name,qty,unit_price)').eq('project_id',PROJECT_ID).eq('status','confirmed').gte('created_at',fromISO).lte('created_at',toISO).order('created_at',{ascending:false}),
    // Failed orders in range
    sb().from('orders').select('id,tracking_ref,buyer_name,total,created_at').eq('project_id',PROJECT_ID).eq('status','failed').gte('created_at',fromISO).lte('created_at',toISO),
    // New clients in range
    sb().from('clients').select('id,client_type,contact_name,shop_name,state,where_we_are,created_at').eq('project_id',PROJECT_ID).gte('created_at',fromISO).lte('created_at',toISO),
    // Stock changes in range
    sb().from('stock_log').select('product_name,change_qty,reason,done_by_name,recorded_at').eq('project_id',PROJECT_ID).gte('recorded_at',fromISO).lte('recorded_at',toISO).order('recorded_at',{ascending:false}),
  ]).then(function(results) {
    var confirmed = results[0].data||[];
    var failed    = results[1].data||[];
    var clients   = results[2].data||[];
    var stockLog  = results[3].data||[];

    // Compute totals
    var totalRev    = confirmed.reduce(function(s,o){ return s+(parseFloat(o.total)||0); },0);
    var totalOrders = confirmed.length;
    var totalFailed = failed.length;
    var totalNewLeads = clients.length;

    // Product breakdown
    var productMap = {};
    confirmed.forEach(function(o){
      (o.order_items||[]).forEach(function(i){
        var k = i.product_name||'Unknown';
        if (!productMap[k]) productMap[k] = {qty:0, revenue:0};
        productMap[k].qty     += parseInt(i.qty)||1;
        productMap[k].revenue += (parseFloat(i.unit_price)||0)*(parseInt(i.qty)||1);
      });
    });
    var products = Object.keys(productMap).map(function(k){ return Object.assign({name:k},productMap[k]); }).sort(function(a,b){ return b.qty-a.qty; });

    _historyData = { confirmed:confirmed, failed:failed, clients:clients, stockLog:stockLog,
      from:fromVal, to:toVal, totalRev:totalRev, totalOrders:totalOrders, products:products,
      totalFailed:totalFailed, totalNewLeads:totalNewLeads };

    renderHistoryReport(_historyData);
    if (actions) actions.classList.remove('hidden');
  }).catch(function(e){
    body.innerHTML = '<div class="loading-msg">Error loading history: '+esc(e.message||'')+'</div>';
  });
}

function renderHistoryReport(d) {
  var body = document.getElementById('history-body');
  var html = '';

  // Header summary cards
  html += '<div class="hist-summary-strip">';
  html += '<div class="hist-sum-card"><div class="hist-sum-val">₦'+fmtK(d.totalRev)+'</div><div class="hist-sum-label">Total Sales</div></div>';
  html += '<div class="hist-sum-card"><div class="hist-sum-val">'+d.totalOrders+'</div><div class="hist-sum-label">Orders Accepted</div></div>';
  html += '<div class="hist-sum-card"><div class="hist-sum-val">'+d.totalFailed+'</div><div class="hist-sum-label">Cancelled</div></div>';
  html += '<div class="hist-sum-card"><div class="hist-sum-val">'+d.totalNewLeads+'</div><div class="hist-sum-label">New Leads</div></div>';
  html += '</div>';

  // Top products
  if (d.products.length) {
    html += '<div class="hist-section-title">Items Sold</div>';
    html += '<div class="hist-product-list">';
    d.products.forEach(function(p,i){
      html += '<div class="hist-product-row"><span class="hist-rank">'+(i+1)+'</span><div class="hist-prod-info"><div class="hist-prod-name">'+esc(p.name)+'</div><div class="hist-prod-meta">'+p.qty+' sold</div></div><div class="hist-prod-rev">₦'+fmtK(p.revenue)+'</div></div>';
    });
    html += '</div>';
  }

  // Confirmed orders list
  if (d.confirmed.length) {
    html += '<div class="hist-section-title">Accepted Orders</div>';
    html += '<div class="hist-orders-list">';
    d.confirmed.slice(0,20).forEach(function(o){
      var dt = o.created_at ? new Date(o.created_at).toLocaleDateString('en-NG') : '';
      html += '<div class="hist-order-row"><div class="hist-order-info"><div class="hist-order-name">'+esc(o.buyer_name||'')+'</div><div class="hist-order-meta">'+esc(o.tracking_ref||'')+' · '+dt+'</div></div><div class="hist-order-amt">₦'+fmtK(o.total)+'</div></div>';
    });
    if (d.confirmed.length > 20) html += '<div class="hist-more">+' +(d.confirmed.length-20)+' more orders — copy for full list</div>';
    html += '</div>';
  }

  // New leads
  if (d.clients.length) {
    html += '<div class="hist-section-title">New Leads ('+d.clients.length+')</div>';
    html += '<div class="hist-leads-list">';
    d.clients.slice(0,10).forEach(function(c){
      var typeLabel = c.client_type==='retail'?'Small Shop':c.client_type==='wholesale'?'Wholesaler':'Distributor';
      html += '<div class="hist-lead-row"><span class="hist-lead-type">'+typeLabel+'</span><span>'+esc(c.contact_name||c.shop_name||'')+'</span><span class="hist-lead-state">'+esc(c.state||'')+'</span></div>';
    });
    html += '</div>';
  }

  if (!d.confirmed.length && !d.clients.length) {
    html += '<div class="hist-empty">No activity found in this date range.</div>';
  }

  body.innerHTML = html;
}

function copyHistoryReport(format) {
  if (!_historyData) { toast('No report loaded yet','bad'); return; }
  var d = _historyData;
  var label = d.from + ' to ' + d.to;
  var text  = '';

  if (format === 'whatsapp') {
    text  = '📊 *OA SHOP HISTORY REPORT*\n';
    text += '📅 *Period:* '+label+'\n';
    text += '━━━━━━━━━━━━━━━━━━━━━━━━\n';
    text += '💰 *Total Sales:* ₦'+fmtK(d.totalRev)+'\n';
    text += '✅ *Orders Accepted:* '+d.totalOrders+'\n';
    text += '❌ *Orders Cancelled:* '+d.totalFailed+'\n';
    text += '🤝 *New Leads:* '+d.totalNewLeads+'\n';
    if (d.products.length) {
      text += '📦 *Items Sold:*\n';
      d.products.forEach(function(p,i){ text += (i+1)+'. '+p.name+' — '+p.qty+' sold (₦'+fmtK(p.revenue)+')\n'; });
      text += '\n';
    }
    if (d.confirmed.length) {
      text += '🧾 *Order Summary:*\n';
      d.confirmed.slice(0,10).forEach(function(o){
        var dt = o.created_at ? new Date(o.created_at).toLocaleDateString('en-NG') : '';
        text += '• '+esc(o.buyer_name||'')+' — ₦'+fmtK(o.total)+' ('+dt+')\n';
      });
      if (d.confirmed.length > 10) text += '...and '+(d.confirmed.length-10)+' more\n';
    }
    text += '\n_Generated by OA Shop Book_';

  } else if (format === 'csv') {
    text = 'Date,Customer,Tracking Ref,Type,Amount (₦)\n';
    d.confirmed.forEach(function(o){
      var dt = o.created_at ? new Date(o.created_at).toLocaleDateString('en-NG') : '';
      text += [dt, o.buyer_name||'', o.tracking_ref||'', o.buyer_type||'', parseFloat(o.total)||0].join(',')+'\n';
    });

  } else {
    // Plain text — good for pasting into Word/spreadsheet notes
    text  = 'OA SHOP HISTORY — '+label+'\n';
    text += '='.repeat(40)+'\n';
    text += 'Total Sales:         ₦'+fmtK(d.totalRev)+'\n';
    text += 'Orders Accepted:     '+d.totalOrders+'\n';
    text += 'Orders Cancelled:    '+d.totalFailed+'\n';
    text += 'New Leads:           '+d.totalNewLeads+'\n';
    if (d.products.length) {
      text += 'ITEMS SOLD:\n';
      d.products.forEach(function(p,i){ text += (i+1)+'. '+p.name+' — '+p.qty+' packs (₦'+fmtK(p.revenue)+')\n'; });
      text += '\n';
    }
    if (d.confirmed.length) {
      text += 'ORDERS:\n';
      d.confirmed.forEach(function(o){
        var dt = o.created_at ? new Date(o.created_at).toLocaleDateString('en-NG') : '';
        text += dt+' | '+esc(o.buyer_name||'')+' | ₦'+fmtK(o.total)+' | '+(o.tracking_ref||'')+'\n';
      });
    }
  }

  navigator.clipboard.writeText(text).then(function(){
    toast('Copied! Ready to paste','good');
  }).catch(function(){
    // Fallback for older Android
    var ta = document.createElement('textarea');
    ta.value = text; ta.style.position='fixed'; ta.style.opacity='0';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    toast('Copied!','good');
  });
}

// ── CHART COLLAPSE ────────────────────────────────────────────────────────────

function initChartStates(){
  ['chart-months','chart-sellers'].forEach(function(id){
    var block=document.getElementById(id);
    if(block&&localStorage.getItem('oa_'+id+'_collapsed')==='true') block.classList.add('collapsed');
  });
}
function toggleChart(chartId){
  var block=document.getElementById(chartId); if(!block) return;
  // Don't collapse if a toggle button inside was clicked
  var c=block.classList.toggle('collapsed');
  localStorage.setItem('oa_'+chartId+'_collapsed',c);
}
// Prevent toggle strip button clicks from bubbling up to collapse handler
document.addEventListener('click', function(e){
  if(e.target.closest('.chart-window-btn')||e.target.closest('.sellers-mode-btn')){
    e.stopPropagation();
  }
});

// ── SHOP TODAY ────────────────────────────────────────────────────────────────

function loadToday(){
  renderGreeting();
  renderRefreshBar('today');
  sbCall('getShopPulse').then(function(res){
    if(!res.success){toast('Could not load shop data','bad');return;}
    APP.pulseData=res.data;
    renderPulseRings(res.data); renderMetricCards(res.data); renderTargetBar(res.data);
    renderMonthlyChart(res.data); renderTopSellers(res.data);
    renderLowStockBanner(res.data); updateNavDots(res.data);
    renderRecoverySignals(res.data);
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
  var moneyC  = d.money_pulse  || 'grey';
  var stockC  = d.stock_pulse  || 'grey';
  var peopleC = d.people_pulse || 'grey';
  // Money ring — master only
  var moneyCard = document.querySelector('.pulse-card-money');
  if (moneyCard) moneyCard.style.display = APP.role==='master' ? '' : 'none';

  // Set ring colour class (drives border + glow animation)
  setPulse('ring-money', moneyC);
  setPulse('ring-stock', stockC);
  setPulse('ring-people', peopleC);

  // Set SVG stroke colour to match ring state
  ['ring-money','ring-stock','ring-people'].forEach(function(id){
    var ring = document.getElementById(id);
    if (!ring) return;
    var svg = ring.querySelector('svg');
    if (!svg) return;
    var colMap = {green:'#16a34a', yellow:'#d97706', red:'#c8000f', grey:'#d97706'}; // grey maps to yellow — no dead states
    var col = id==='ring-money' ? colMap[moneyC] : id==='ring-stock' ? colMap[stockC] : colMap[peopleC];
    svg.style.stroke = col;
  });

  var ml={green:'MONEY FLOWING',yellow:'CHECK SALES',red:'CHECK NOW',grey:'CHECK SALES'};
  var sl={green:'ALL STOCKED',yellow:'SOME LOW',red:'RUNNING DRY',grey:'CHECK STOCK'};
  var pl={green:'UP TO DATE',yellow:'FOLLOW UP',red:'OVERDUE',grey:'ADD CONTACTS'};
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
      drow("Today\'s sales",'₦'+fmt(d.today_sales_amount))+
      drow('This month so far','₦'+fmt(d.money_in_this_month))+
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
      drow('Possible profit','₦'+fmt(d.possible_profit));
    if(items.length){
      inner+='<div class="drawer-detail" style="margin-top:10px;font-weight:800">Running low:</div>';
      items.forEach(function(i){inner+=drow(esc(i.name),'<span style="color:var(--red);font-weight:800">'+i.stock+' left</span> (alert at '+i.alert_level+')');});
    }
    drawer.innerHTML=inner;
  }
  if(type==='people-p'){
    drawer.innerHTML='<div class="drawer-msg">'+esc(d.people_message)+'</div>'+
      drow('Small shops',d.retail_clients||0)+
      drow('Wholesalers',d.wholesale_clients||0)+
      drow('Distributors',d.distributor_clients||0)+
      drow('Reminders overdue',d.follow_ups_overdue||0)+
      drow('Reminders due today',d.follow_ups_today||0);
  }
}
function drow(label,val){ return '<div class="drawer-row"><span>'+label+'</span><strong>'+val+'</strong></div>'; }

function renderMetricCards(d){
  var grid=document.getElementById('metric-grid'); if(!grid) return;

  // 1. Cash In Today — money confirmed today from orders
  var todayAmt  = d.today_sales_amount||0;
  var todayCnt  = d.today_orders_count||0;

  // 2. Needs Your Attention — pending orders right now
  var waiting   = d.orders_waiting||0;
  var failed    = d.failed_orders||0;

  // 3. Running Low — items below alert level
  var lowCount  = d.low_stock_count||0;
  var owedAmt   = d.people_still_owe_you||0;
  var overdue   = d.follow_ups_overdue||0;
  var lowNames  = (d.items_running_low||[]).map(function(i){return i.name;}).slice(0,2).join(', ');

  // 4. This Month Progress — vs last month (simple up/down)
  var thisMonth = d.money_in_this_month||0;
  var chgPct    = d.money_change_pct||0;
  var chgTxt    = chgPct>0 ? '+'+chgPct+'% vs last month' : chgPct<0 ? chgPct+'% vs last month' : 'Same as last month';
  var chgCls    = chgPct>0 ? 'mc-trend-up' : chgPct<0 ? 'mc-trend-down' : '';

  grid.innerHTML =
    mCard('mc-cash',
      fmtK(todayAmt),
      'CASH IN TODAY',
      todayCnt>0 ? todayCnt+' order'+(todayCnt!==1?'s':'')+' accepted' : 'No accepted orders yet',
      todayAmt===0 ? 'Tap to accept pending orders' : null,
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>',
      '', 'orders'
    )+
    mCard('mc-pending',
      String(waiting),
      'WAITING FOR YOU',
      waiting===0 ? 'No pending orders' : waiting+' order'+(waiting!==1?'s':'')+' need a decision',
      failed>0 ? failed+' cancelled this month' : null,
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',
      '', 'orders'
    )+
    mCard('mc-stock',
      lowCount===0 ? '✓' : String(lowCount),
      lowCount===0 ? 'STOCK ALL GOOD' : 'RESTOCK NEEDED',
      lowCount===0 ? 'All '+(d.total_products||0)+' items stocked up' : lowNames||'Check items below',
      lowCount>0 ? 'Tap to restock now' : null,
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
      '', 'stock'
    )+
    mCard('mc-owed',
      owedAmt>0 ? fmtK(owedAmt) : '₦0',
      'PEOPLE OWE YOU',
      owedAmt===0 ? 'No outstanding balances' : overdue+' reminder'+(overdue!==1?'s':'')+' overdue',
      owedAmt>0 ? 'Collect before month end' : null,
      '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      owedAmt>0 ? 'mc-owed-alert' : '', 'followups'
    );
}
function mCard(cls, val, label, sub1, sub2, icon, extraCls, navTarget){
  var nav = navTarget ? 'onclick="goto(\''+navTarget+'\')"' : 'onclick="toggleMcDetail(this)"';
  return '<div class="metric-card '+cls+(extraCls?' '+extraCls:'')+'" '+nav+'>'+
    '<div class="mc-head">'+
      '<div class="mc-icon-wrap">'+(icon||'')+'</div>'+
      '<div class="mc-val">'+val+'</div>'+
      (navTarget ? '<div class="mc-arrow"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg></div>' : '')+
    '</div>'+
    '<div class="mc-label">'+label+'</div>'+
    '<div class="mc-detail open">'+
      (sub1?'<div class="mc-sub1">'+sub1+'</div>':'')+
      (sub2?'<div class="mc-sub2">'+sub2+'</div>':'')+
    '</div></div>';
}
function toggleMcDetail(card){ var det=card.querySelector('.mc-detail'); if(det) det.classList.toggle('open'); }

function renderTargetBar(d){
  var pct=d.target_reached_pct||0;
  var e1=document.getElementById('target-pct'),e2=document.getElementById('target-fill'),
      e3=document.getElementById('target-label'),e4=document.getElementById('target-sub');
  if(e1) e1.textContent=pct+'%';
  if(e2) e2.style.width=pct+'%';
  if(e3) e3.textContent='Monthly Goal — ₦'+fmt(d.monthly_target);
  if(e4) e4.textContent='₦'+fmt(d.money_in_this_month)+' earned · ₦'+fmt(Math.max(0,(d.monthly_target||0)-(d.money_in_this_month||0)))+' to go';
}

function renderMonthlyChart(d){
  var chart=d.monthly_chart||[], el=document.getElementById('bar-chart-months'); if(!el) return;
  // Show last 6 months as summary cards with actual ₦ amounts
  var months=chart.slice(-6);
  if(!months.length){
    el.innerHTML='<div style="color:var(--text3);font-size:12px;padding:16px 0;text-align:center">No accepted orders yet — sales will appear here once you start accepting orders</div>';
    return;
  }
  var monthNames=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var max=Math.max.apply(null,months.map(function(m){return m.revenue;}))||1;
  el.innerHTML=months.map(function(m,i){
    var prev=months[i-1];
    var pct=prev&&prev.revenue>0?Math.round(((m.revenue-prev.revenue)/prev.revenue)*100):null;
    var bar=Math.max(8,Math.round((m.revenue/max)*100));
    var isCurrentMonth=(m.month===new Date().toISOString().slice(0,7));
    var mo=m.month?parseInt(m.month.slice(5))-1:0;
    var yr=m.month?m.month.slice(2,4):'';
    var trend=pct===null?'':pct>0?
      '<span class="mc-rev-up">▲'+pct+'%</span>':pct<0?
      '<span class="mc-rev-down">▼'+Math.abs(pct)+'%</span>':
      '<span class="mc-rev-flat">—</span>';
    return '<div class="mc-rev-card'+(isCurrentMonth?' mc-rev-current':'')+'">'+ 
      '<div class="mc-rev-month">'+monthNames[mo]+' \''+yr+'</div>'+
      '<div class="mc-rev-amt">'+fmtK(m.revenue)+'</div>'+
      '<div class="mc-rev-bar-wrap"><div class="mc-rev-bar" style="width:'+bar+'%"></div></div>'+
      '<div class="mc-rev-trend">'+trend+'</div>'+
    '</div>';
  }).join('');
}

function setChartWindow(months,btn){
  APP._chartWindow=months;
  document.querySelectorAll('.chart-window-btn').forEach(function(b){b.classList.remove('active');});
  if(btn) btn.classList.add('active');
  renderMonthlyChart(APP.pulseData||{});
}

function renderTopSellers(d){
  var el=document.getElementById('hbar-sellers'); if(!el) return;
  var mode=APP._sellersMode||'today';
  var sellers=mode==='today'?(d.top_sellers_today||[]):(d.top_sellers_all||[]);
  if(!sellers.length){
    el.innerHTML='<div style="color:var(--text3);font-size:12px;padding:16px 0">'+(mode==='today'?'No sales confirmed today yet':'No sales data yet')+'</div>';
    return;
  }
  var max=sellers[0].qty||1;
  // Show product name + qty only — clean, no revenue clutter
  el.innerHTML=sellers.map(function(s){
    var w=Math.round((s.qty/max)*100);
    return '<div class="hbc-row">'+
      '<div class="hbc-name-wrap">'+
        '<div class="hbc-name">'+esc(s.name)+'</div>'+
        '<div class="hbc-qty-badge">'+s.qty+' sold</div>'+
      '</div>'+
      '<div class="hbc-bar-wrap"><div class="hbc-bar" style="width:'+w+'%"><span class="hbc-pct">'+w+'%</span></div></div>'+
    '</div>';
  }).join('');
}

function setSellersMode(mode,btn){
  APP._sellersMode=mode;
  document.querySelectorAll('.sellers-mode-btn').forEach(function(b){b.classList.remove('active');});
  if(btn) btn.classList.add('active');
  var rangeDiv=document.getElementById('sellers-date-range');
  if(rangeDiv){
    if(mode==='range'){ rangeDiv.classList.remove('hidden'); }
    else { rangeDiv.classList.add('hidden'); }
  }
  if(mode==='range'){
    loadSellersByRange();
  } else {
    renderTopSellers(APP.pulseData||{});
  }
}

function loadSellersByRange(){
  var fromEl = document.getElementById('sellers-range-from');
  var toEl   = document.getElementById('sellers-range-to');
  var el     = document.getElementById('hbar-sellers');
  if (!fromEl||!toEl||!el) return;
  var fromVal = fromEl.value;
  var toVal   = toEl.value;
  if (!fromVal||!toVal){ el.innerHTML='<div style="color:var(--text3);font-size:12px;padding:8px 0">Pick a date range above</div>'; return; }
  el.innerHTML='<div style="color:var(--text3);font-size:12px;padding:8px 0">Loading…</div>';
  var fromISO = fromVal+'T00:00:00';
  var toISO   = toVal+'T23:59:59';
  sb().from('orders')
    .select('order_items(product_name,qty)')
    .eq('project_id',PROJECT_ID).eq('status','confirmed')
    .gte('created_at',fromISO).lte('created_at',toISO)
    .then(function(r){
      var map={};
      (r.data||[]).forEach(function(o){
        (o.order_items||[]).forEach(function(i){
          var k=i.product_name||'Unknown';
          map[k]=(map[k]||0)+(parseInt(i.qty)||1);
        });
      });
      var sellers=Object.keys(map).map(function(k){return {name:k,qty:map[k]};}).sort(function(a,b){return b.qty-a.qty;}).slice(0,8);
      if(!sellers.length){el.innerHTML='<div style="color:var(--text3);font-size:12px;padding:8px 0">No confirmed sales in this period</div>';return;}
      var max=sellers[0].qty||1;
      el.innerHTML=sellers.map(function(s){
        var w=Math.round((s.qty/max)*100);
        return '<div class="hbc-row">'+
          '<div class="hbc-name-wrap">'+
            '<div class="hbc-name">'+esc(s.name)+'</div>'+
            '<div class="hbc-qty-badge">'+s.qty+' sold</div>'+
          '</div>'+
          '<div class="hbc-bar-wrap"><div class="hbc-bar" style="width:'+w+'%"><span class="hbc-pct">'+w+'%</span></div></div>'+
        '</div>';
      }).join('');
    }).catch(function(){el.innerHTML='<div style="color:var(--text3);font-size:12px;padding:8px 0">Error loading data</div>';});
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

// ── RECOVERY SIGNALS PANEL (Phase 5) ─────────────────────────────────────────
function renderRecoverySignals(d) {
  var panel = document.getElementById('recovery-panel');
  if (!panel) return;

  var gq = d.recovery_gone_quiet || [];
  var ar = d.recovery_at_risk    || [];

  if (!gq.length && !ar.length) {
    // No signals — hide the panel completely. No need to show "all clear" every time.
    panel.classList.add('hidden');
    panel.innerHTML = '';
    return;
  }

  var html = '<div class="recovery-title">⚡ Recovery Signals</div>';

  if (gq.length) {
    html += '<div class="recovery-section-label">Gone Quiet — reach out now</div>';
    gq.forEach(function(c) {
      var waNum = (c.phone||'').replace(/\D/g,'');
      if (waNum.startsWith('0')) waNum = '234' + waNum.slice(1);
      var waLink = waNum ? '<a class="btn-wa-xs" href="https://wa.me/'+waNum+'" target="_blank">WhatsApp</a>' : '';
      html += '<div class="recovery-row">'+
        '<div class="recovery-info">'+
          '<div class="recovery-name">'+esc(c.name)+'</div>'+
          '<div class="recovery-meta">Silent for <strong>'+c.days+' days</strong> · spent ₦'+fmtK(c.spent)+'</div>'+
        '</div>'+
        waLink+
      '</div>';
    });
  }

  if (ar.length) {
    html += '<div class="recovery-section-label" style="margin-top:12px">At Risk — were loyal, now quiet</div>';
    ar.forEach(function(c) {
      var waNum = (c.phone||'').replace(/\D/g,'');
      if (waNum.startsWith('0')) waNum = '234' + waNum.slice(1);
      var waLink = waNum ? '<a class="btn-wa-xs" href="https://wa.me/'+waNum+'" target="_blank">WhatsApp</a>' : '';
      html += '<div class="recovery-row">'+
        '<div class="recovery-info">'+
          '<div class="recovery-name">'+esc(c.name)+'</div>'+
          '<div class="recovery-meta">Silent for <strong>'+c.days+' days</strong> · lifetime ₦'+fmtK(c.spent)+'</div>'+
        '</div>'+
        waLink+
      '</div>';
    });
  }

  panel.innerHTML = html;
  panel.classList.remove('hidden');
}

// ── REFRESH BAR (Phase 4) ─────────────────────────────────────────────────────
// Injects a slim refresh bar into the section header of a given page.
// Called at the top of every loadX() function.
function renderRefreshBar(pageKey) {
  var barId = 'refresh-bar-' + pageKey;
  var bar   = document.getElementById(barId);
  if (!bar) return;
  bar.innerHTML =
    '<span class="refresh-label">Auto-refresh in</span>'+
    '<span class="refresh-countdown">5:00</span>'+
    '<button class="refresh-btn" onclick="manualRefresh()" title="Refresh now">↺</button>';
  updateCountdownBadge();
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
    '  Accepted Today:    '+padLeft(String(d.confirmed_orders||0),15),
    '  Customers Total:   '+padLeft(String(d.total_customers||0),15),
    '  Overdue Reminders: '+padLeft(String(d.follow_ups_overdue||0),15),'',
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
  renderRefreshBar('orders');
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
  if(!orders.length) return '<div class="card-list"><div class="empty-msg">No '+(tab==='pending'?'orders waiting':tab==='confirmed'?'accepted orders':'cancelled orders')+' right now.</div></div>';
  var html='<div class="card-list">';
  orders.forEach(function(o){
    var name=o.buyer_name||o.name||'';
    var items=[]; try{var parsed=JSON.parse(o.items_json||'[]');if(Array.isArray(parsed))items=parsed;}catch(e){}
    var dBadge=tab==='confirmed'?badge(delivLabel(o.delivery_status),o.delivery_status||'getting_ready'):tab==='pending'?badge('WAITING','waiting'):badge('CANCELLED','fell_through');
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
      html+='<button class="btn-confirm" onclick="confirmOrder(\''+esc(o.id)+'\')">'+
        '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> ACCEPT</button>';
      html+='<button class="btn-fail" onclick="openFailModal(\''+esc(o.id)+'\')">'+
        '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> CANCEL</button>';
    }
    if(tab==='confirmed') html+='<button class="btn-edit" onclick="openDeliveryModal(\''+esc(o.id)+'\')">'+
      '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg> Send to Driver</button>';
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
    if(tab==='pending') html+='<td><div style="display:flex;gap:5px"><button class="btn-confirm" onclick="confirmOrder(\''+esc(o.id)+'\')">Accept</button><button class="btn-fail" onclick="openFailModal(\''+esc(o.id)+'\')">Cancel</button></div></td>';
    if(tab==='confirmed') html+='<td>'+badge(delivLabel(o.delivery_status),o.delivery_status||'getting_ready')+'</td><td><button class="btn-edit" onclick="openDeliveryModal(\''+esc(o.id)+'\')">Send to Driver</button></td>';
    if(tab==='failed') html+='<td style="font-size:12px;color:var(--text3)">'+esc(o.reason||'')+'</td>';
    html+='</tr>';
  });
  return html+'</tbody></table></div>';
}

function confirmOrder(id){
  sbCall('decideOrder',{order_id:id,decision:'confirm',done_by:APP.name}).then(function(res){
    if(res.success){toast('Order accepted! Stock updated.','good');loadOrders('pending');loadToday();}
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
    if(res.success){closeModal('modal-fail');toast('Order marked as cancelled','good');loadOrders('pending');loadToday();}
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

// ── FOLLOW-UP TRACKER ─────────────────────────────────────────────────────────
// Aggregates all action items from orders, clients, and customers into one view.
// Admin can send follow-up, promo, or retention messages via WhatsApp.

var _WA_TEMPLATES = {
  followup_order:   'Hello {name}! 👋 This is OA Drinks & Snacks. We noticed your order {ref} is still pending. Ready to confirm? Reply YES or tap the link to place your order. 🙏',
  followup_payment: 'Hello {name}, just a friendly reminder from OA Drinks & Snacks. You have an outstanding balance of ₦{amount}. Kindly settle at your earliest convenience. Thank you! 🙏',
  followup_enquiry: 'Hello {name}! 👋 You reached out about our products. Are you still interested? We have fresh stock available — Zobo, Tiger Nut Milk, Chin Chin, Kulikuli. Reply to order or ask any questions!',
  promo_general:    'Hello {name}! 🎉 Special offer from OA Drinks & Snacks! Order 5+ packs of any product and get 10% off your total. Fresh, natural, delivered to you. WhatsApp us now to order!',
  retention_quiet:  'Hello {name}! 😊 We miss you at OA Drinks & Snacks! It\'s been a while since your last order. Come back and enjoy our fresh Zobo, Tiger Nut Milk, and more. Special discount waiting for you!',
  fell_through:     'Hello {name}! This is OA Drinks & Snacks. We saw your order {ref} did not go through. Was there a problem? We\'d love to help — reply to this message and we\'ll sort it out quickly. 🙏',
};

function buildWaTemplateMsg(templateKey, vars) {
  var msg = _WA_TEMPLATES[templateKey] || '';
  Object.keys(vars||{}).forEach(function(k){ msg = msg.replace(new RegExp('{'+k+'}','g'), vars[k]||''); });
  return msg;
}

function waLink(phone, msg) {
  var num = (phone||'').replace(/\D/g,'');
  if (num.startsWith('0')) num = '234'+num.slice(1);
  if (!num) return null;
  return 'https://wa.me/'+num+'?text='+encodeURIComponent(msg);
}

function loadFollowUps() {
  renderRefreshBar('followups');
  var el = document.getElementById('followups-body');
  if (!el) return;
  el.innerHTML = '<div class="loading-msg">Loading reminders…</div>';

  var now        = new Date();
  var thirtyDays = new Date(now); thirtyDays.setDate(thirtyDays.getDate()-30);
  var thirtyISO  = thirtyDays.toISOString();

  Promise.all([
    // Pending orders — need decision
    sb().from('orders').select('id,tracking_ref,buyer_name,phone,total,created_at,buyer_type').eq('project_id',PROJECT_ID).eq('status','pending').order('created_at',{ascending:false}),
    // Fell-through orders — last 30 days
    sb().from('orders').select('id,tracking_ref,buyer_name,phone,total,created_at,reason,buyer_type').eq('project_id',PROJECT_ID).eq('status','failed').gte('created_at',thirtyISO).order('created_at',{ascending:false}),
    // Active CRM leads with overdue follow-ups
    sb().from('clients').select('id,client_type,contact_name,shop_name,phone,where_we_are,remind_me_on,balance_owed').eq('project_id',PROJECT_ID).neq('where_we_are','not_interested').lte('remind_me_on',now.toISOString().slice(0,10)),
    // Clients with outstanding balance
    sb().from('clients').select('id,client_type,contact_name,shop_name,phone,balance_owed').eq('project_id',PROJECT_ID).gt('balance_owed',0),
    // Gone-quiet customers (use APP.pulseData if loaded)
  ]).then(function(results){
    var pending  = results[0].data||[];
    var failed   = results[1].data||[];
    var overdue  = results[2].data||[];
    var debtors  = results[3].data||[];
    // Gone quiet from pulseData
    var quiet    = (APP.pulseData && APP.pulseData.recovery_gone_quiet)||[];

    var sections = [];

    if (pending.length) {
      sections.push(renderFuSection(
        'Orders Waiting for Your Decision',
        'pending-orders',
        pending.map(function(o){
          var msg = buildWaTemplateMsg('followup_order',{name:o.buyer_name||'Customer',ref:o.tracking_ref||''});
          var link = waLink(o.phone,msg);
          return fuRow(o.buyer_name||'',o.phone||'',
            'Placed '+fmtDateTime(o.created_at),
            fmtK(o.total),
            link, 'Follow Up', 'followup_order',
            o.buyer_name||'', o.tracking_ref||'', o.phone||'', ''
          );
        })
      ));
    }

    if (failed.length) {
      sections.push(renderFuSection(
        'Cancelled — Try Again',
        'fell-through',
        failed.map(function(o){
          var msg = buildWaTemplateMsg('fell_through',{name:o.buyer_name||'Customer',ref:o.tracking_ref||''});
          var link = waLink(o.phone,msg);
          return fuRow(o.buyer_name||'',o.phone||'',
            'Cancelled '+(o.reason?'· '+o.reason:''),
            fmtK(o.total),
            link, 'Win Back', 'fell_through',
            o.buyer_name||'', o.tracking_ref||'', o.phone||'', ''
          );
        })
      ));
    }

    if (overdue.length) {
      sections.push(renderFuSection(
        'Overdue Reminders — My Customers',
        'overdue-leads',
        overdue.map(function(c){
          var name = c.contact_name||c.shop_name||'Customer';
          var msg  = buildWaTemplateMsg('followup_enquiry',{name:name});
          var link = waLink(c.phone,msg);
          var typLabel = {retail:'Small Shop',wholesale:'Wholesaler',distributor:'Distributor'}[c.client_type]||c.client_type||'';
          return fuRow(name,c.phone||'',
            typLabel+' · Overdue since '+(c.remind_me_on||''),
            null, link, 'Follow Up', 'followup_enquiry',
            name, '', c.phone||'', ''
          );
        })
      ));
    }

    if (debtors.length) {
      sections.push(renderFuSection(
        'People Owe You — Collect Now',
        'debtors',
        debtors.map(function(c){
          var name = c.contact_name||c.shop_name||'Customer';
          var msg  = buildWaTemplateMsg('followup_payment',{name:name,amount:fmtK(c.balance_owed)});
          var link = waLink(c.phone,msg);
          return fuRow(name,c.phone||'',
            'Owes '+fmtK(c.balance_owed),
            fmtK(c.balance_owed),
            link, 'Request Payment', 'followup_payment',
            name, '', c.phone||'', fmtK(c.balance_owed)
          );
        })
      ));
    }

    if (quiet.length) {
      sections.push(renderFuSection(
        'Gone Quiet — Win Them Back',
        'gone-quiet',
        quiet.map(function(c){
          var msg  = buildWaTemplateMsg('retention_quiet',{name:c.name||'Customer'});
          var link = waLink(c.phone,msg);
          return fuRow(c.name||'',c.phone||'',
            'Silent for '+c.days+' days · spent ₦'+fmtK(c.spent),
            null, link, 'Retention', 'retention_quiet',
            c.name||'', '', c.phone||'', ''
          );
        })
      ));
    }

    if (!sections.length) {
      el.innerHTML = '<div class="fu-empty"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity:0.25;margin-bottom:10px"><polyline points="20 6 9 17 4 12"/></svg><div>All reminders are up to date. Well done!</div></div>';
      return;
    }

    el.innerHTML = sections.join('');
  }).catch(function(e){
    el.innerHTML='<div class="loading-msg">Error: '+esc(e.message||'')+'</div>';
  });
}

function renderFuSection(title, cls, rows){
  return '<div class="fu-section fu-'+cls+'">'+
    '<div class="fu-section-title">'+title+'</div>'+
    '<div class="fu-rows">'+rows.join('')+'</div>'+
  '</div>';
}

function fuRow(name, phone, meta, amount, waUrl, btnLabel, templateKey, tplName, tplRef, tplPhone, tplAmount){
  var waBtn = waUrl
    ? '<a class="btn-wa-fu" href="'+waUrl+'" target="_blank">'+
        '<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 1 1-7.6-11.7 8.38 8.38 0 0 1 3.8.9L21 3z"/></svg>'+
        esc(btnLabel)+
      '</a>'
    : '';
  var customBtn = phone
    ? '<button class="btn-wa-custom" onclick="openCustomMsgModal(\''+esc(templateKey)+'\',\''+esc(tplName)+'\',\''+esc(tplRef)+'\',\''+esc(tplPhone)+'\',\''+esc(tplAmount)+'\')">Custom</button>'
    : '';
  return '<div class="fu-row">'+
    '<div class="fu-avatar"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg></div>'+
    '<div class="fu-info">'+
      '<div class="fu-name">'+esc(name)+'</div>'+
      '<div class="fu-meta">'+esc(meta)+(amount?'<span class="fu-amount"> · '+esc(amount)+'</span>':'')+'</div>'+
    '</div>'+
    '<div class="fu-actions">'+waBtn+customBtn+'</div>'+
  '</div>';
}

function openCustomMsgModal(templateKey, name, ref, phone, amount){
  var modal = document.getElementById('modal-custom-msg');
  if(!modal) return;
  document.getElementById('custom-msg-phone').value = phone;
  var msg = buildWaTemplateMsg(templateKey,{name:name,ref:ref,amount:amount});
  document.getElementById('custom-msg-text').value = msg;
  modal.classList.remove('hidden');
}

function sendCustomMsg(){
  var phone = document.getElementById('custom-msg-phone').value;
  var msg   = document.getElementById('custom-msg-text').value.trim();
  if(!phone||!msg){ toast('Phone and message required','bad'); return; }
  var link = waLink(phone, msg);
  if(!link){ toast('Invalid phone number','bad'); return; }
  window.open(link,'_blank');
  closeModal('modal-custom-msg');
}

// ── MISSING RECEIPT + DATETIME FUNCTIONS ─────────────────────────────────────
// These were referenced in renderOrderCards but need to exist as globals.

function fmtDateTime(iso){
  if(!iso) return '—';
  var d = new Date(iso);
  return d.toLocaleDateString('en-NG',{day:'2-digit',month:'short',year:'numeric'})+
         ' · '+d.toLocaleTimeString('en-NG',{hour:'2-digit',minute:'2-digit',hour12:true});
}

function buildReceiptWaMsg(o, extraComment){
  var items=[];
  try{var p=JSON.parse(o.items_json||'[]');if(Array.isArray(p))items=p;}catch(e){}
  var msg = '*OA DRINKS & SNACKS — ORDER RECEIPT*\n';
  msg += '———————————————————\n';
  msg += 'Ref: '+(o.tracking_ref||o.id||'')+'\n';
  msg += 'Customer: '+(o.buyer_name||o.name||'')+'\n';
  msg += 'Phone: '+(o.phone||'')+'\n';
  if(o.address||o.state) msg += 'Address: '+((o.address||'')+', '+(o.lga||'')+', '+(o.state||'')).replace(/^,\s*/,'').replace(/,\s*,/g,',')+'\n';
  msg += 'Date: '+fmtDateTime(o.decided_at||o.created_at)+'\n';
  msg += '———————————————————\n';
  if(items.length){
    msg += '*Items:*\n';
    items.forEach(function(i){ msg += '  '+(i.qty||1)+'x '+(i.name||'')+' — ₦'+(((i.qty||1)*(i.price||0)).toLocaleString('en-NG'))+'\n'; });
    msg += '———————————————————\n';
  }
  msg += '*TOTAL: ₦'+((parseFloat(o.total)||0).toLocaleString('en-NG'))+'*\n';
  if(extraComment) msg += '\n'+extraComment+'\n';
  msg += '\nThank you for ordering from OA Drinks & Snacks! 🙏';
  return msg;
}

function openReceiptModal(orderId){
  var modal=document.getElementById('modal-receipt');
  var hiddenId=document.getElementById('receipt-order-id');
  if(!modal||!hiddenId) return;
  hiddenId.value=orderId;
  var commentEl=document.getElementById('receipt-extra-comment');
  if(commentEl) commentEl.value='';
  modal.classList.remove('hidden');
  previewReceipt();
}

function previewReceipt(){
  var orderId=document.getElementById('receipt-order-id').value;
  var comment=(document.getElementById('receipt-extra-comment').value||'').trim();
  var allOrders=APP._lastLoadedOrders||[];
  var o=allOrders.filter(function(x){return x.id===orderId;})[0];
  var preview=document.getElementById('receipt-preview');
  if(!o||!preview) return;
  preview.textContent=buildReceiptWaMsg(o,comment);
}

function sendReceiptViaWa(){
  var orderId=document.getElementById('receipt-order-id').value;
  var comment=(document.getElementById('receipt-extra-comment').value||'').trim();
  var allOrders=APP._lastLoadedOrders||[];
  var o=allOrders.filter(function(x){return x.id===orderId;})[0];
  if(!o){toast('Order not found','bad');return;}
  var waNum=(o.phone||'').replace(/\D/g,'');
  if(waNum.startsWith('0')) waNum='234'+waNum.slice(1);
  if(!waNum){toast('No phone number on this order','bad');return;}
  var msg=buildReceiptWaMsg(o,comment);
  window.open('https://wa.me/'+waNum+'?text='+encodeURIComponent(msg),'_blank');
  closeModal('modal-receipt');
}

// ── DEBT CLOSURE ──────────────────────────────────────────────────────────────
// Extends recordPayment with:
// 1. markDebtPaid(clientId, name) — closes the full balance in one tap
// 2. writeOffDebt(clientId, name, amount) — admin forgives debt, logs to audit
// Both refresh People Asking + Follow-Ups + Today after completing.

function markDebtPaid(clientId, name, currentBalance) {
  if (!confirm('Mark '+name+' as fully paid? This will set their balance to ₦0.')) return;
  sbCall('recordPayment',{
    client_id: clientId,
    amount:    currentBalance,
    done_by:   APP.name
  }).then(function(res){
    if(res.success){
      toast(name+' — fully paid. Balance cleared.','good');
      writeAudit('debt_closed', name+' balance cleared in full — ₦'+fmt(currentBalance),'client',clientId);
      _refreshAfterDebt();
    } else {
      toast('Error: '+(res.error||''),'bad');
    }
  });
}

function writeOffDebt(clientId, name, currentBalance) {
  if (!confirm('Write off ₦'+fmt(currentBalance)+' owed by '+name+'?\n\nThis forgives the debt and records a write-off in your audit log.')) return;
  // Set balance to 0 without recording a cash payment — log as write-off
  Promise.all([
    sb().from('clients').update({balance_owed:0, updated_at:'now()'})
      .eq('id',clientId).eq('project_id',PROJECT_ID),
    sb().from('payments').insert({
      project_id:     PROJECT_ID,
      client_id:      clientId,
      client_name:    name,
      amount:         0,
      balance_before: currentBalance,
      balance_after:  0,
      done_by:        APP.userId||null,
      done_by_name:   APP.name||null,
      notes:          'WRITE-OFF — debt forgiven by '+APP.name,
    })
  ]).then(function(){
    writeAudit('debt_writeoff', name+' — ₦'+fmt(currentBalance)+' written off by '+APP.name,'client',clientId);
    toast(name+' — debt written off and recorded.','good');
    _refreshAfterDebt();
  }).catch(function(){
    toast('Error writing off debt','bad');
  });
}

function openPartialPaymentModal(clientId, name, currentBalance) {
  var modal = document.getElementById('modal-payment');
  if(!modal) return;

  document.getElementById('pay-client-id').value = clientId;
  document.getElementById('pay-sheet').value = APP.currentPeopleTab||'retail';

  var sub = document.getElementById('pay-sub');
  if(sub) sub.innerHTML =
    '<strong>'+esc(name)+'</strong> currently owes <strong style="color:var(--red)">₦'+fmt(currentBalance)+'</strong>';

  // Wire the static HTML buttons to current clientId/name/balance
  var closeBtn = document.getElementById('debt-close-btn');
  var writeBtn = document.getElementById('debt-writeoff-btn');
  if(closeBtn) closeBtn.onclick = function(){ closeModal('modal-payment'); markDebtPaid(clientId, name, currentBalance); };
  if(writeBtn) writeBtn.onclick = function(){ closeModal('modal-payment'); writeOffDebt(clientId, name, currentBalance); };

  document.getElementById('pay-amount').value = '';
  modal.classList.remove('hidden');
}

function _refreshAfterDebt(){
  // Refresh all sections that show balance data
  loadPeople(APP.currentPeopleTab);
  loadToday();
  var active = document.querySelector('.page.active');
  if(active && active.id==='page-followups') loadFollowUps();
}
