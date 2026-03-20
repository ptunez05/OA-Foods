// OA Drinks & Snacks — business.js v4.0 Supabase
// Location data loaded from locations.js (bizLocationData alias)

// ── SUPABASE CONFIG ───────────────────────────────────────────────────────────
var SUPABASE_URL      = 'https://nxrlgxhfrwzkaaunhrvz.supabase.co';
var SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im54cmxneGhmcnd6a2FhdW5ocnZ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5OTYyNTUsImV4cCI6MjA4OTU3MjI1NX0.9ibd0avm8N0BfgMJKq-MgJFMDkmmynuVakwZwDIQVZQ';
var PROJECT_ID        = 'oa_shop';

// ── OFFLINE QUEUE ─────────────────────────────────────────────────────────────
// Saves the enquiry locally if network drops during checkout.
// Replays automatically when connection returns.
// WhatsApp still opens regardless — customer experience never blocked.

var _OA_BIZ_QUEUE = 'oa_q_business';

function oaBizSend(payload) {
    if (!navigator.onLine) {
        try {
            var q = JSON.parse(localStorage.getItem(_OA_BIZ_QUEUE) || '[]');
            q.push({ p: payload, ts: Date.now() });
            localStorage.setItem(_OA_BIZ_QUEUE, JSON.stringify(q));
        } catch(e) {}
        return;
    }
    sendBizToSupabase(payload);
}

window.addEventListener('online', function() {
    try {
        var q = JSON.parse(localStorage.getItem(_OA_BIZ_QUEUE) || '[]');
        if (!q.length) return;
        q.forEach(function(item) { sendBizToSupabase(item.p); });
        localStorage.removeItem(_OA_BIZ_QUEUE);
    } catch(e) {}
});

// ── SUPABASE INSERT ───────────────────────────────────────────────────────────
// Saves business enquiry as a CRM client entry.
// Maps to the clients table — client_type is retail or wholesale.

function sendBizToSupabase(payload) {
    var headers = {
        'Content-Type':  'application/json',
        'apikey':         SUPABASE_ANON_KEY,
        'Authorization': 'Bearer ' + SUPABASE_ANON_KEY,
        'Prefer':        'return=minimal'
    };

    fetch(SUPABASE_URL + '/rest/v1/clients', {
        method:  'POST',
        headers: headers,
        body: JSON.stringify({
            project_id:   PROJECT_ID,
            client_type:  payload.buyer_type === 'retailer' ? 'retail' : 'wholesale',
            contact_name: payload.name,
            shop_name:    payload.biz_name || null,
            phone:        payload.phone,
            state:        payload.state,
            lga:          payload.lga,
            interest:     payload.interest || null,
            heard_from:   payload.heard_from || null,
            notes:        payload.notes || null,
            where_we_are: 'still_talking',
        })
    }).catch(function() {});
}

// ── ORDER STATE ───────────────────────────────────────────────────────────────

let selectedTier        = 'retailer';
let currentQty          = 0;
let pricePerPack        = 9500;
const bizOrderRef       = `OA-BIZ-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
let bizActiveState      = '';
let bizSelectedSex      = 'Male';
let bizSelectedPayment  = 'Pay on Delivery';

document.addEventListener('DOMContentLoaded', () => {
    const receiptEl = document.getElementById('receipt-id');
    if (receiptEl) receiptEl.innerText = `ID: ${bizOrderRef}`;
    const modal = document.getElementById('checkout-modal');
    if (modal) modal.addEventListener('click', e => { if (e.target === e.currentTarget) closeCheckoutModal(); });
    currentQty = 5;
    selectTier('retailer', true);
    populateDropdowns();
});

window.selectTier = function(tier, silent = false) {
    selectedTier = tier;
    const cardRetail    = document.getElementById('card-retailer');
    const cardWholesale = document.getElementById('card-wholesaler');
    if (cardRetail && cardWholesale) {
        cardRetail.classList.remove('active'); cardWholesale.classList.remove('active');
        const badge   = document.getElementById('tier-badge');
        const label   = document.getElementById('calc-label');
        const moqText = document.getElementById('moq-text');
        const title   = document.getElementById('receipt-title');
        if (tier === 'retailer') {
            cardRetail.classList.add('active'); pricePerPack = 9500;
            if (badge)   badge.innerText   = 'Retailer Tier';
            if (label)   label.innerText   = 'Your Selling Price (Per Bottle)';
            if (moqText) moqText.innerHTML = '<i>Range: 5–9 Packs &nbsp;&bull;&nbsp; 1 pack = 12 bottles</i>';
            if (title)   title.innerText   = 'RETAILER INVOICE QUOTE';
            if (currentQty < 5) { currentQty = 5; if (!silent) showToast('Minimum 5 packs for Retailer tier'); }
        } else {
            cardWholesale.classList.add('active'); pricePerPack = 9000;
            if (badge)   badge.innerText   = 'Wholesale Tier';
            if (label)   label.innerText   = 'Your Selling Price (Per Pack)';
            if (moqText) moqText.innerHTML = '<i>Minimum Order: 10 Packs</i>';
            if (title)   title.innerText   = 'WHOLESALE INVOICE QUOTE';
            if (currentQty < 10) { currentQty = 10; if (!silent) showToast('Minimum 10 packs for Wholesale tier'); }
        }
    }
    const qtyDisplay = document.getElementById('wholesale-qty');
    if (qtyDisplay) qtyDisplay.innerText = currentQty;
    const hookEl = document.getElementById('brand-hook-msg');
    if (hookEl) {
        hookEl.textContent = tier === 'retailer'
            ? '5 packs = 60 bottles. Price each at ₦1,200 and pocket ₦24,500 profit before your next order arrives. One stock, one weekend, done.'
            : '10 packs at ₦90,000. Move them to your sub-dealers at ₦13,000 each — ₦40,000 margin, clean. Volume is where the real business happens.';
    }
    calculateProfit(); renderBizBar();
};

window.updateStock = function(change) {
    let newQty = Math.max(0, currentQty + change);
    currentQty = newQty;
    const qtyDisplay = document.getElementById('wholesale-qty');
    if (qtyDisplay) qtyDisplay.innerText = currentQty;
    if (currentQty >= 10 && selectedTier === 'retailer') { selectTier('wholesaler'); showToast('Switched to Wholesale Pricing!'); }
    else if (currentQty <= 9 && currentQty > 0 && selectedTier === 'wholesaler') { selectTier('retailer'); showToast('Switched to Retailer Pricing'); }
    calculateProfit(); renderBizBar();
};

let calculateProfitDebounce;
window.calculateProfit = function() {
    clearTimeout(calculateProfitDebounce);
    calculateProfitDebounce = setTimeout(() => {
        const saleInput  = document.getElementById('sale-price');
        const salePrice  = saleInput ? (parseFloat(saleInput.value) || 0) : 0;
        const totalCost  = currentQty * pricePerPack;
        let totalRevenue = 0;
        if (selectedTier === 'retailer') totalRevenue = (salePrice * 12) * currentQty;
        else totalRevenue = salePrice * currentQty;
        const profit = Math.max(0, totalRevenue - totalCost);
        const costEl = document.getElementById('r-cost');
        const revEl  = document.getElementById('r-rev');
        const profitEl = document.getElementById('r-profit');
        if (costEl)   costEl.innerText   = `₦${totalCost.toLocaleString()}`;
        if (revEl)    revEl.innerText    = `₦${totalRevenue.toLocaleString()}`;
        if (profitEl) profitEl.innerText = `₦${profit.toLocaleString()}`;
    }, 300);
};

window.renderBizBar = function() {
    const bar = document.getElementById('biz-bar');
    if (!bar) return;
    if (currentQty > 0) {
        bar.classList.add('active');
        const qtyEl   = document.getElementById('biz-qty-count');
        const totalEl = document.getElementById('biz-total-amount');
        if (qtyEl)   qtyEl.textContent   = currentQty;
        if (totalEl) totalEl.textContent = `₦${(currentQty * pricePerPack).toLocaleString()}`;
        const min = (selectedTier === 'retailer') ? 5 : 10;
        const cta = document.getElementById('biz-checkout-cta');
        if (cta) {
            if (currentQty < min) {
                cta.classList.add('locked');
                cta.innerHTML = `Add ${min - currentQty} more pack${min - currentQty > 1 ? 's' : ''} to unlock
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>`;
            } else {
                cta.classList.remove('locked');
                cta.innerHTML = `Request Supply
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`;
            }
        }
    } else { bar.classList.remove('active'); }
};

window.hideBizBar = function() {
    const bar = document.getElementById('biz-bar');
    if (bar) bar.classList.remove('active');
};

window.copyReceipt = function() {
    const text = `${document.getElementById('receipt-title').innerText}\nID: ${bizOrderRef}\nQty: ${currentQty} Packs\nCost: ${document.getElementById('r-cost').innerText}\nProfit: ${document.getElementById('r-profit').innerText}`;
    navigator.clipboard.writeText(text).then(() => showToast('Quote Copied to Clipboard!'));
};

function showToast(message) {
    const existingToast = document.querySelector('.toast-popup');
    if (existingToast) existingToast.remove();
    const toast = document.createElement('div');
    toast.className = 'toast-popup'; toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 2000);
}

window.openCheckoutModal = function() {
    const min = (selectedTier === 'retailer') ? 5 : 10;
    if (currentQty < min) { showToast(`Minimum order is ${min} packs`); return; }
    loadSavedData();
    const modal  = document.getElementById('checkout-modal');
    const idEl   = document.getElementById('modal-order-id');
    const timeEl = document.getElementById('modal-order-datetime');
    const list   = document.getElementById('checkout-items-list');
    const totalEl = document.getElementById('checkout-total-amount');
    if (idEl)   idEl.textContent   = bizOrderRef;
    if (timeEl) timeEl.textContent = new Date().toLocaleString();
    if (list) {
        list.innerHTML = '';
        const itemTotal = currentQty * pricePerPack;
        const div = document.createElement('div');
        div.className = 'checkout-item';
        div.innerHTML = `
            <div class="checkout-item-left"><div>
                <div class="checkout-item-name">${selectedTier === 'retailer' ? 'Retailer Bundle' : 'Wholesale Bundle'}</div>
                <div class="checkout-item-qty">×${currentQty} Packs</div>
            </div></div>
            <div class="checkout-item-price">₦${itemTotal.toLocaleString()}</div>`;
        list.appendChild(div);
        if (totalEl) totalEl.textContent = `₦${itemTotal.toLocaleString()}`;
    }
    const stateInput = document.getElementById('form-state');
    const lgaInput   = document.getElementById('form-lga');
    if (stateInput) stateInput.value = '';
    if (lgaInput)   lgaInput.value   = '';
    bizActiveState = '';
    ['biz-state-results','biz-lga-results'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('show'); el.style.display = 'none'; }
    });
    bizSelectedSex = 'Male'; bizSelectedPayment = 'Pay on Delivery';
    document.querySelectorAll('#biz-sex-seg .biz-segment-opt').forEach((el, i) => el.classList.toggle('active', i === 0));
    document.querySelectorAll('#biz-payment-seg .biz-segment-opt').forEach((el, i) => el.classList.toggle('active', i === 0));
    const hint = document.getElementById('payment-bank-hint');
    if (hint) hint.style.display = 'none';
    modal.classList.add('active'); modal.style.display = 'flex';
    const bar = document.getElementById('biz-bar'); if (bar) bar.classList.remove('active');
};

window.closeCheckoutModal = function() {
    const modal = document.getElementById('checkout-modal');
    if (modal) { modal.classList.remove('active'); modal.style.display = 'none'; }
    document.querySelectorAll('.shadcn-dropdown').forEach(d => d.classList.remove('open'));
    const hint = document.getElementById('payment-bank-hint');
    if (hint) hint.style.display = 'none';
    renderBizBar();
};

// ── DROPDOWN HELPERS (unchanged) ──────────────────────────────────────────────
function anchorMenuToTrigger(menu, trigger) {
    const rect = trigger.getBoundingClientRect();
    menu.style.position = 'fixed'; menu.style.top = `${rect.bottom + 4}px`;
    menu.style.left = `${rect.left}px`; menu.style.width = `${rect.width}px`;
    menu.style.zIndex = '10000'; menu.style.maxHeight = '220px';
}
function releaseMenuAnchor(menu) {
    menu.style.position = ''; menu.style.top = ''; menu.style.left = '';
    menu.style.width = ''; menu.style.zIndex = ''; menu.style.maxHeight = '';
}
function closeAllDropdowns() {
    document.querySelectorAll('.shadcn-dropdown.open').forEach(d => {
        const m = d.querySelector('.shadcn-dropdown-menu');
        if (m) releaseMenuAnchor(m); d.classList.remove('open');
    });
}
function initDropdown(dropdownId, getItemsFn, onSelect) {
    const dropdown = document.getElementById(dropdownId); if (!dropdown) return;
    if (dropdown.dataset.initialized === 'true') return;
    dropdown.dataset.initialized = 'true';
    const trigger   = dropdown.querySelector('.shadcn-dropdown-trigger');
    const menu      = dropdown.querySelector('.shadcn-dropdown-menu');
    const valueSpan = dropdown.querySelector('.selected-value');
    function populateMenu() {
        const items = getItemsFn(); menu.innerHTML = '';
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'shadcn-dropdown-item'; div.textContent = item; div.dataset.value = item;
            div.addEventListener('click', (e) => {
                e.stopPropagation(); valueSpan.textContent = item;
                releaseMenuAnchor(menu); dropdown.classList.remove('open');
                if (onSelect) onSelect(item);
            });
            menu.appendChild(div);
        });
    }
    trigger.addEventListener('click', (e) => {
        if (trigger.disabled) return; e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');
        closeAllDropdowns();
        if (!isOpen) { populateMenu(); dropdown.classList.add('open'); anchorMenuToTrigger(menu, trigger); }
    });
    document.addEventListener('click', (e) => { if (!dropdown.contains(e.target) && !menu.contains(e.target)) { releaseMenuAnchor(menu); dropdown.classList.remove('open'); } });
    document.addEventListener('touchstart', (e) => { if (!dropdown.contains(e.target) && !menu.contains(e.target)) { releaseMenuAnchor(menu); dropdown.classList.remove('open'); } }, { passive: true });
}

function populateDropdowns() {
    document.addEventListener('click', (e) => {
        ['biz-state-results','biz-lga-results'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !e.target.closest(`[oninput*="handleBizSearch"]`) && !el.contains(e.target)) {
                el.classList.remove('show'); el.style.display = 'none';
            }
        });
        document.querySelectorAll('.shadcn-dropdown.open').forEach(d => {
            const m = d.querySelector('.shadcn-dropdown-menu');
            if (m) m.style.display = ''; d.classList.remove('open');
        });
    });
}

// ── PHONE FORMATTER ───────────────────────────────────────────────────────────
function formatBizPhone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 7)      value = value.slice(0,4) + ' ' + value.slice(4,8) + ' ' + value.slice(8);
    else if (value.length > 4) value = value.slice(0,4) + ' ' + value.slice(4);
    input.value = value;
}

// ── SEARCHABLE POPOVER ────────────────────────────────────────────────────────
function handleBizSearch(type, query) {
    const input      = document.getElementById(`form-${type}`);
    const resultsDiv = document.getElementById(`biz-${type}-results`);
    resultsDiv.innerHTML = '';
    if (!query) { resultsDiv.classList.remove('show'); resultsDiv.style.display = 'none'; return; }
    const rect = input.getBoundingClientRect();
    resultsDiv.style.top = (rect.bottom + 3) + 'px'; resultsDiv.style.left = rect.left + 'px'; resultsDiv.style.width = rect.width + 'px';
    let items = [];
    if (type === 'state')       items = Object.keys(bizLocationData).filter(s => s.toLowerCase().includes(query.toLowerCase())).sort();
    else if (type === 'lga' && bizActiveState) items = bizLocationData[bizActiveState].filter(r => r.toLowerCase().includes(query.toLowerCase()));
    if (items.length > 0) {
        resultsDiv.classList.add('show'); resultsDiv.style.display = 'block';
        items.forEach(item => {
            const div = document.createElement('div'); div.className = 'popover-item'; div.innerText = item;
            div.onmousedown = (e) => { e.preventDefault(); selectBizItem(type, item); };
            resultsDiv.appendChild(div);
        });
    } else { resultsDiv.classList.remove('show'); resultsDiv.style.display = 'none'; }
}

function selectBizItem(type, val) {
    document.getElementById(`form-${type}`).value = val;
    const resultsDiv = document.getElementById(`biz-${type}-results`);
    resultsDiv.classList.remove('show'); resultsDiv.style.display = 'none';
    if (type === 'state') { bizActiveState = val; const lgaInput = document.getElementById('form-lga'); if (lgaInput) lgaInput.value = ''; }
}

// ── SEGMENTED CONTROL ─────────────────────────────────────────────────────────
function selectBizSegment(type, value, el) {
    const parent = el.parentElement;
    parent.querySelectorAll('.biz-segment-opt').forEach(opt => opt.classList.remove('active'));
    el.classList.add('active');
    if (type === 'sex')     bizSelectedSex = value;
    if (type === 'payment') {
        bizSelectedPayment = value;
        const hint = document.getElementById('payment-bank-hint');
        if (hint) hint.style.display = value === 'Pay Now' ? 'flex' : 'none';
    }
}

function loadSavedData() {
    try {
        const saved = JSON.parse(localStorage.getItem('oa_biz_user') || '{}');
        const fields = { 'form-shop-name': 'shopName', 'form-address': 'address', 'form-phone': 'phone',
                         'form-contact-person': 'contactPerson', 'form-date': 'preferredDate',
                         'form-comments': 'comments' };
        Object.entries(fields).forEach(([id, key]) => {
            const el = document.getElementById(id); if (el && saved[key]) el.value = saved[key];
        });
        const stateInput = document.getElementById('form-state');
        const lgaInput   = document.getElementById('form-lga');
        if (stateInput && saved.state) { stateInput.value = saved.state; bizActiveState = saved.state; }
        if (lgaInput && saved.lga)     lgaInput.value = saved.lga;
    } catch(e) {}
}

window.processWhatsAppOrder = function() {
    const confirmBtn = document.querySelector('.checkout-confirm-btn');
    if (confirmBtn) { if (confirmBtn.disabled) return; confirmBtn.disabled = true; confirmBtn.textContent = 'Preparing order…'; }
    function restoreBtn() { if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Complete Order'; } }
    const shopName      = document.getElementById('form-shop-name')?.value.trim() || '';
    const state         = document.getElementById('form-state')?.value.trim() || '';
    const lga           = document.getElementById('form-lga')?.value.trim() || '';
    const contactPerson = document.getElementById('form-contact-person')?.value.trim() || '';
    const phone         = document.getElementById('form-phone')?.value.replace(/\s/g, '').trim() || '';
    const preferredDate = document.getElementById('form-date')?.value || '';
    const address       = document.getElementById('form-address')?.value.trim() || '';
    const comments      = document.getElementById('form-comments')?.value.trim() || '';
    const payment       = bizSelectedPayment;
    const phoneValid    = /^\d{11}$/.test(phone) && phone.startsWith('0');
    if (!state || !lga || !address) { showToast('Please complete State, LGA and Delivery Address'); restoreBtn(); return; }
    if (!phone || !phoneValid)      { showToast('Enter a valid 11-digit Nigerian phone number'); restoreBtn(); return; }

    let msg = `*New Wholesale Order ${bizOrderRef}*\nDate: ${new Date().toLocaleString()}\n\n`;
    msg += `*Business Details:*\n`;
    if (shopName)      msg += `• Shop/Brand: ${shopName}\n`;
    msg += `• Location: ${address}, ${lga}, ${state}\n`;
    if (contactPerson) msg += `• Contact Person: ${contactPerson}\n`;
    msg += `• Phone: ${phone}\n`;
    if (preferredDate) msg += `• Preferred Date: ${preferredDate}\n`;
    if (comments)      msg += `• Instructions: ${comments}\n`;
    msg += `• Payment Method: ${payment}\n\n`;
    msg += `*Order Summary:*\n• Tier: ${selectedTier === 'retailer' ? 'Retailer' : 'Wholesale'}\n`;
    msg += `• Quantity: ${currentQty} Packs\n• Total Cost: ₦${(currentQty * pricePerPack).toLocaleString()}\n\n`;
    msg += `Please confirm availability, delivery timeline, and next steps. Thank you!`;

    try {
        localStorage.setItem('oa_biz_user', JSON.stringify({
            shopName, address, phone, contactPerson, preferredDate, comments, state, lga, sex: bizSelectedSex
        }));
    } catch(e) {}

    // Save enquiry to Supabase — uses offline queue if network is down
    oaBizSend({
        buyer_type:  selectedTier === 'retailer' ? 'retailer' : 'wholesale',
        name:        contactPerson || shopName || 'Unknown',
        phone:       phone,
        biz_name:    shopName,
        state:       state,
        lga:         lga,
        landmark:    document.getElementById('form-landmark')?.value.trim() || '',
        interest:    (selectedTier === 'retailer' ? 'Retailer' : 'Wholesale') + ' — ' + currentQty + ' packs @ ₦' + (currentQty * pricePerPack).toLocaleString(),
        heard_from:  document.getElementById('form-referral')?.value || '',
        notes:       comments || '',
    });

    const waURL  = `https://wa.me/2348140226282?text=${encodeURIComponent(msg)}`;
    const ctaBtn = document.getElementById('whatsapp-cta-btn');
    if (ctaBtn) ctaBtn.href = waURL;

    const checkoutModal = document.getElementById('checkout-modal');
    const successModal  = document.getElementById('success-modal');
    const bizBar = document.getElementById('biz-bar');
    if (checkoutModal) { checkoutModal.classList.remove('active'); checkoutModal.style.display = 'none'; }
    if (bizBar) bizBar.classList.remove('active');
    if (successModal)  { successModal.classList.add('active'); successModal.style.display = 'flex'; }
};

window.handleWhatsAppSend = function() {
    setTimeout(() => {
        const successModal = document.getElementById('success-modal');
        if (successModal) { successModal.classList.remove('active'); successModal.style.display = 'none'; }
        currentQty = 0;
        const qtyDisplay = document.getElementById('wholesale-qty'); if (qtyDisplay) qtyDisplay.innerText = 0;
        const bizQtyCount = document.getElementById('biz-qty-count'); if (bizQtyCount) bizQtyCount.textContent = '0';
        const bizTotalEl = document.getElementById('biz-total-amount'); if (bizTotalEl) bizTotalEl.textContent = '₦0';
        const salePriceInput = document.getElementById('sale-price'); if (salePriceInput) salePriceInput.value = '';
        ['r-cost','r-rev','r-profit'].forEach(id => { const el = document.getElementById(id); if (el) el.innerText = '₦0'; });
        const confirmBtn = document.querySelector('.checkout-confirm-btn');
        if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = 'Complete Order'; }
        renderBizBar();
        currentQty = 5; selectTier('retailer', true);
    }, 600);
};
