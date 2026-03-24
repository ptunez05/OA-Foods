// OA Drinks & Snacks — distributor.js v4.0 Supabase
// Location data loaded from locations.js (nigerianData alias)

// ── SUPABASE CONFIG ───────────────────────────────────────────────────────────
var SUPABASE_URL      = 'https://nxrlgxhfrwzkaaunhrvz.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54cmxneGhmcnd6a2FhdW5ocnZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTYyNTUsImV4cCI6MjA4OTU3MjI1NX0.9ibd0avm8N0BfgMJKq-MgJFMDkmmynuVakwZwDIQVZQ';
var PROJECT_ID        = 'oa_shop';

// ── OFFLINE QUEUE ─────────────────────────────────────────────────────────────
// Saves the application locally if network drops during the process.
// Replays automatically when connection returns.
// WhatsApp still opens regardless — applicant experience never blocked.

var _OA_DIST_QUEUE = 'oa_q_distributor';

function oaDistSend(payload) {
    if (!navigator.onLine) {
        try {
            var q = JSON.parse(localStorage.getItem(_OA_DIST_QUEUE) || '[]');
            q.push({ p: payload, ts: Date.now() });
            localStorage.setItem(_OA_DIST_QUEUE, JSON.stringify(q));
        } catch(e) {}
        return;
    }
    sendDistToSupabase(payload);
}

window.addEventListener('online', function() {
    try {
        var q = JSON.parse(localStorage.getItem(_OA_DIST_QUEUE) || '[]');
        if (!q.length) return;
        q.forEach(function(item) { sendDistToSupabase(item.p); });
        localStorage.removeItem(_OA_DIST_QUEUE);
    } catch(e) {}
});

// ── SUPABASE INSERT ───────────────────────────────────────────────────────────
// Saves distributor application as a CRM client entry (client_type = distributor).

function generateDistUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0;
        var v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function sendDistToSupabase(payload) {
    var headers = {
        'Content-Type':  'application/json',
        'apikey':         SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Prefer':        'return=minimal'
    };

    var clientId = payload.client_id || generateDistUUID();

    fetch(SUPABASE_URL + '/rest/v1/clients', {
        method:  'POST',
        headers: headers,
        body: JSON.stringify({
            id:           clientId,
            project_id:   PROJECT_ID,
            client_type:  'distributor',
            contact_name: payload.name,
            phone:        payload.phone,
            state:        payload.state,
            lga:          payload.lga,
            interest:     `${payload.qty} packs${payload.kit === 'Yes' ? ' + Success Kit' : ''}`,
            heard_from:   payload.heard_from || null,
            notes:        payload.notes || null,
            where_we_are: 'still_talking',
            tracking_ref: payload.tracking_ref || null,
        })
    })
    .then(function(r) {
        if (!r.ok) {
            r.text().then(function(t) {
                console.error('OA dist client insert failed:', r.status, t);
                // Common fix hint for 403 — run in Supabase SQL editor:
                // CREATE POLICY "clients_public_insert" ON clients FOR INSERT TO anon WITH CHECK (true);
            });
        }
    })
    .catch(function(e) { console.error('OA dist client fetch error:', e); });
}

// ── ORDER STATE ───────────────────────────────────────────────────────────────

let distQty         = 20;
const packPrice     = 6000;
const kitPrice      = 30000;
let selectedSex     = 'Male';
let selectedVehicle = 'No';
let activeState     = '';
let pendingWAMsg    = '';
const trackingID    = `OA-PART-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;

// ── THEME SVGs ────────────────────────────────────────────────────────────────
const moonSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
const sunSVG  = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

function updateThemeIcon() {
    const toggle = document.getElementById('theme-toggle'); if (!toggle) return;
    toggle.innerHTML = document.body.classList.contains('dark-mode') ? sunSVG : moonSVG;
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('dist-id').innerText = `ID: ${trackingID}`;
    loadSavedData();
    calculateDistTotal();
    document.getElementById('kit-toggle').checked = true;
    calculateDistTotal();
    updateThemeIcon();
    const themeBtn = document.getElementById('theme-toggle');
    if (themeBtn) themeBtn.addEventListener('click', () => setTimeout(updateThemeIcon, 10));
});

// ── PHONE FORMATTER ───────────────────────────────────────────────────────────
function formatPhone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 7)      value = value.slice(0,4) + ' ' + value.slice(4,8) + ' ' + value.slice(8);
    else if (value.length > 4) value = value.slice(0,4) + ' ' + value.slice(4);
    input.value = value;
}

// ── SEARCHABLE POPOVER ────────────────────────────────────────────────────────
function handleSearch(type, query) {
    const resultsDiv = document.getElementById(`${type}-results`);
    resultsDiv.innerHTML = '';
    if (!query) { resultsDiv.classList.remove('show'); return; }
    let items = [];
    if (type === 'state') items = Object.keys(nigerianData).filter(s => s.toLowerCase().includes(query.toLowerCase())).sort();
    else if (type === 'region' && activeState) items = nigerianData[activeState].filter(r => r.toLowerCase().includes(query.toLowerCase()));
    if (items.length > 0) {
        resultsDiv.classList.add('show');
        items.forEach(item => {
            const div = document.createElement('div'); div.className = 'popover-item'; div.innerText = item;
            div.onclick = () => selectItem(type, item);
            resultsDiv.appendChild(div);
        });
    } else { resultsDiv.classList.remove('show'); }
}

function selectItem(type, val) {
    document.getElementById(`p-${type}`).value = val;
    document.getElementById(`${type}-results`).classList.remove('show');
    if (type === 'state') { activeState = val; document.getElementById('p-region').value = ''; }
}

document.addEventListener('click', (e) => {
    ['state-results','region-results'].forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.closest('.form-group').contains(e.target)) el.classList.remove('show');
    });
});

// ── SEGMENTED CONTROL ─────────────────────────────────────────────────────────
function selectSegment(type, value, element) {
    const parent = element.parentElement;
    parent.querySelectorAll('.segment-option').forEach(opt => opt.classList.remove('active'));
    element.classList.add('active');
    if (type === 'sex')     selectedSex     = value;
    if (type === 'vehicle') selectedVehicle = value;
}

// ── STOCK QTY ─────────────────────────────────────────────────────────────────
function updateDistStock(change) {
    distQty = Math.max(20, distQty + change);
    document.getElementById('dist-qty').innerText = distQty;
    const badge = document.getElementById('deal-badge-qty');
    if (badge) badge.innerText = `${distQty} packs`;
    calculateDistTotal();
}

// ── INVESTMENT CALCULATOR ─────────────────────────────────────────────────────
function calculateDistTotal() {
    const hasKit     = document.getElementById('kit-toggle').checked;
    const stockCost  = distQty * packPrice;
    const kitCost    = hasKit ? kitPrice : 0;
    const grandTotal = stockCost + kitCost;
    document.getElementById('d-cost').innerText  = `₦${stockCost.toLocaleString()}`;
    document.getElementById('d-kit').innerText   = `₦${kitCost.toLocaleString()}`;
    document.getElementById('d-total').innerText = `₦${grandTotal.toLocaleString()}`;
    const barTotal = document.getElementById('bar-total'); if (barTotal) barTotal.innerText = `₦${grandTotal.toLocaleString()}`;
    const barQty   = document.getElementById('bar-qty');   if (barQty)   barQty.innerText   = distQty;
    if (!hasKit) showToast('Success Kit includes banners, training & priority support – highly recommended!');
}

// ── COPY RECEIPT ──────────────────────────────────────────────────────────────
function copyDistReceipt() {
    const total = document.getElementById('d-total').innerText;
    const kit   = document.getElementById('kit-toggle').checked ? 'Yes (₦30,000)' : 'No (opted out)';
    const text  = [`OA PARTNER INVESTMENT QUOTE`, `ID: ${trackingID}`, `Volume: ${distQty} Packs`, `Success Kit: ${kit}`, `Total to Start: ${total}`].join('\n');
    navigator.clipboard.writeText(text).then(() => showToast('Quote Copied!'));
}

// ── TOAST ─────────────────────────────────────────────────────────────────────
function showToast(message) {
    const toast = document.getElementById('copy-toast'); if (!toast) return;
    toast.textContent = message; toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── OPEN APPLY MODAL ──────────────────────────────────────────────────────────
function openApplyModal() {
    const name   = document.getElementById('p-name').value.trim();
    const state  = document.getElementById('p-state').value.trim();
    const region = document.getElementById('p-region').value.trim();
    const phone  = document.getElementById('p-phone').value.trim();
    if (!name)   { showToast('Please enter your full name'); return; }
    if (!state)  { showToast('Please search and select your state'); return; }
    if (!region) { showToast('Please search and select your LGA'); return; }
    if (!phone)  { showToast('Please enter your phone number'); return; }
    const cleanPhone = phone.replace(/\s/g, '');
    if (!/^\d{11}$/.test(cleanPhone) || !cleanPhone.startsWith('0')) { showToast('Please enter a valid 11-digit Nigerian phone number'); return; }
    calculateDistTotal();
    const hasKit     = document.getElementById('kit-toggle').checked;
    const stockCost  = distQty * packPrice;
    const kitCost    = hasKit ? kitPrice : 0;
    const grandTotal = stockCost + kitCost;
    const qtyLabel  = document.getElementById('modal-qty-label');
    const stockEl   = document.getElementById('modal-stock-cost');
    const kitEl     = document.getElementById('modal-kit-cost');
    const totalEl   = document.getElementById('modal-total');
    if (qtyLabel) qtyLabel.innerText = distQty;
    if (stockEl)  stockEl.innerText  = `₦${stockCost.toLocaleString()}`;
    if (kitEl)    kitEl.innerText    = `₦${kitCost.toLocaleString()}`;
    if (totalEl)  totalEl.innerText  = `₦${grandTotal.toLocaleString()}`;
    const recap = document.getElementById('modal-detail-recap');
    if (recap) {
        recap.innerHTML = `
            <div><strong>Name</strong><br>${name} (${selectedSex})</div>
            <div style="margin-top:8px"><strong>Location</strong><br>${region}, ${state}</div>
            <div style="margin-top:8px"><strong>Phone</strong><br>${phone}</div>
            <div style="margin-top:8px"><strong>Vehicle</strong><br>${selectedVehicle}</div>`;
    }
    const modal = document.getElementById('apply-modal');
    modal.classList.add('active'); modal.style.display = 'flex';
    const bar = document.getElementById('dist-bar'); if (bar) bar.classList.remove('active');
}

function closeApplyModal() {
    const modal = document.getElementById('apply-modal');
    if (modal) { modal.classList.remove('active'); modal.style.display = 'none'; }
}

// ── BUILD & SEND WHATSAPP APPLICATION ─────────────────────────────────────────
function processWhatsAppApplication() {
    const name     = document.getElementById('p-name').value.trim();
    const state    = document.getElementById('p-state').value.trim();
    const region   = document.getElementById('p-region').value.trim();
    const phone    = document.getElementById('p-phone').value.trim().replace(/\s/g, '');
    const comments = document.getElementById('p-comments').value.trim();
    const hasKit   = document.getElementById('kit-toggle').checked ? 'YES (Included)' : 'NO (Opted out)';
    const total    = document.getElementById('d-total').innerText;
    if (!name || !state || !region || !phone) { showToast('Please complete all required fields'); return; }
    saveData();

    // Save application to Supabase — uses offline queue if network is down
    oaDistSend({
        name:         name,
        phone:        phone,
        state:        state,
        lga:          region,
        qty:          distQty,
        kit:          document.getElementById('kit-toggle').checked ? 'Yes' : 'No',
        heard_from:   document.getElementById('p-referral')?.value || '',
        notes:        comments || '',
        tracking_ref: trackingID,
    });

    let msg = `*NEW DISTRIBUTOR APPLICATION: ${trackingID}*\n----------------------------------\n`;
    msg += `*Partner:* ${name} (${selectedSex})\n*Phone:* ${phone}\n*Location:* ${region}, ${state}\n`;
    msg += `*Vehicle:* ${selectedVehicle}\n*Volume:* ${distQty} Packs\n*Success Kit:* ${hasKit}\n`;
    msg += `*Total Investment:* ${total}\n`;
    if (comments) msg += `*Note:* ${comments}\n`;
    msg += `----------------------------------\nReady to secure my regional slot. Please confirm next steps.`;

    pendingWAMsg = msg;
    const ctaBtn = document.getElementById('wa-apply-btn');
    if (ctaBtn) ctaBtn.href = `https://wa.me/2348140226282?text=${encodeURIComponent(msg)}`;

    closeApplyModal();
    const distBar      = document.getElementById('dist-bar');
    const successModal = document.getElementById('success-modal');
    if (distBar)      distBar.classList.remove('active');
    if (successModal) { successModal.classList.add('active'); successModal.style.display = 'flex'; }
}

window.handleWAApplicationSend = function() {
    setTimeout(() => {
        const successModal = document.getElementById('success-modal');
        if (successModal) { successModal.classList.remove('active'); successModal.style.display = 'none'; }
        distQty = 20;
        document.getElementById('dist-qty').innerText = 20;
        const badge = document.getElementById('deal-badge-qty'); if (badge) badge.innerText = '20 packs';
        document.getElementById('kit-toggle').checked = true;
        calculateDistTotal();
        const bar = document.getElementById('dist-bar'); if (bar) bar.classList.add('active');
    }, 600);
};

// ── LOCAL STORAGE ─────────────────────────────────────────────────────────────
function loadSavedData() {
    try {
        const saved = JSON.parse(localStorage.getItem('oa_dist_user') || '{}');
        if (saved.name)     document.getElementById('p-name').value     = saved.name;
        if (saved.phone)    document.getElementById('p-phone').value    = saved.phone;
        if (saved.comments) document.getElementById('p-comments').value = saved.comments;
        if (saved.state)  { document.getElementById('p-state').value  = saved.state; activeState = saved.state; }
        if (saved.region)   document.getElementById('p-region').value   = saved.region;
        if (saved.sex) {
            selectedSex = saved.sex;
            document.querySelectorAll('[onclick*=\'sex\']').forEach(el => {
                el.classList.toggle('active', el.querySelector('span')?.innerText.trim() === saved.sex);
            });
        }
        if (saved.vehicle) {
            selectedVehicle = saved.vehicle;
            document.querySelectorAll('[onclick*=\'vehicle\']').forEach(el => {
                el.classList.toggle('active', el.querySelector('span')?.innerText.trim() === saved.vehicle);
            });
        }
    } catch(e) {}
}

function saveData() {
    try {
        localStorage.setItem('oa_dist_user', JSON.stringify({
            name:     document.getElementById('p-name').value.trim(),
            state:    document.getElementById('p-state').value.trim(),
            region:   document.getElementById('p-region').value.trim(),
            phone:    document.getElementById('p-phone').value.trim(),
            comments: document.getElementById('p-comments').value.trim(),
            sex:      selectedSex,
            vehicle:  selectedVehicle,
        }));
    } catch(e) {}
}
