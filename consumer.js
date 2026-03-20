// OA Drinks & Snacks — consumer.js v3.1
// Location data removed — loaded from locations.js (shared across all pages)
// statesAndLGAs alias is defined in locations.js — no search function changes needed

var OA_API_URL = 'https://script.google.com/macros/s/AKfycbzBsrATkHIq6v4TtiFXsXEBxPbdHSpmDwp10a0LavYJnnMa12BMHNLbsnhO2rQtCwdOGw/exec';


var cart = {};
var cartItems = {};
var maxQty = 99;  // Maximum quantity per product
var conActiveState = '';
var conSelectedSex = 'Male';
var trackingID = 'OA-' + Math.random().toString(36).substr(2, 6).toUpperCase();


// ── Offline queue ─────────────────────────────────────────────────────────────
// Saves the order locally if network is down during a 30-second MTN outage.
// Replays automatically the moment connection is restored.
// Does NOT block the WhatsApp flow — customer experience is never interrupted.

var _OA_CON_QUEUE = 'oa_q_consumer';

function oaSend(payload) {
    if (!navigator.onLine) {
        try {
            var q = JSON.parse(localStorage.getItem(_OA_CON_QUEUE) || '[]');
            q.push({ p: payload, ts: Date.now() });
            localStorage.setItem(_OA_CON_QUEUE, JSON.stringify(q));
        } catch(e) {}
        return;
    }
    fetch(OA_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: JSON.stringify(payload)
    }).catch(function() {});
}

window.addEventListener('online', function() {
    try {
        var q = JSON.parse(localStorage.getItem(_OA_CON_QUEUE) || '[]');
        if (!q.length) { return; }
        q.forEach(function(item) {
            fetch(OA_API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain' },
                body: JSON.stringify(item.p)
            }).catch(function() {});
        });
        localStorage.removeItem(_OA_CON_QUEUE);
    } catch(e) {}
});

// ─── Cart state ────────────────────────────────────────────────────────────────
function showToast(message) {
    const existingToast = document.querySelector('.cart-toast');
    if (existingToast) existingToast.remove();

    const toast = document.createElement('div');
    toast.className = 'cart-toast';
    toast.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"/>
        </svg>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2000);
}

function calculateTotal(items) {
    let subtotal = 0;
    let zoboQty = 0;

    Object.entries(items).forEach(([id, item]) => {
        subtotal += item.price * item.quantity;
        if (id === 'zobo-12') zoboQty += item.quantity;
    });

    // 10% discount applies only to zobo-12 packs (5+ qualifies)
    const zoboPrice    = (items['zobo-12']?.price || 10000);
    const zoboBase     = zoboQty * zoboPrice;
    const zoboDiscount = zoboQty >= 5 ? zoboBase * 0.1 : 0;
    const total        = subtotal - zoboDiscount;

    return { subtotal, total, zoboQty, discountApplied: zoboQty >= 5, zoboDiscount };
}

function showZoboDiscountToast(zoboQty) {
    // Remove any existing zobo toast
    const existing = document.querySelector('.zobo-discount-toast');
    if (existing) { existing.remove(); }

    let label, msg;
    if (zoboQty >= 5) {
        label = '🎉 Discount unlocked!';
        msg   = '10% off applied to your Zobo order';
    } else {
        const need = 5 - zoboQty;
        label = 'Bulk deal';
        msg   = `Add ${need} more Zobo pack${need > 1 ? 's' : ''} to unlock 10% off`;
    }

    const toast = document.createElement('div');
    toast.className = 'zobo-discount-toast';
    toast.innerHTML = `
        <div class="zt-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </div>
        <div class="zt-text">
          <span class="zt-label">${label}</span>
          <span class="zt-msg">${msg}</span>
        </div>`;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 2800);
}

function updateQty(productId, change, price, productName) {
    const qtyEl = document.getElementById(`qty-${productId}`);
    let current = parseInt(qtyEl.innerText) || 0;
    let newQty = Math.max(0, Math.min(maxQty, current + change));

    if (newQty === maxQty && change > 0) {
        showToast(`Maximum ${maxQty} units per product`);
        return;
    }

    qtyEl.innerText = newQty;

    if (change > 0) {
        if (!cartItems[productId]) {
            cartItems[productId] = { id: productId, name: productName, price, quantity: 0 };
        }
        cartItems[productId].quantity = newQty;
        cart[productId] = newQty;

        showToast('Added to cart!');

        // Show zobo-specific discount nudge toast
        if (productId === 'zobo-12' && newQty > 0 && newQty < 8) {
            showZoboDiscountToast(newQty);
        }

        updateCartDisplay();
        showCartBar();
    } else if (change < 0 && cartItems[productId]) {
        cartItems[productId].quantity = newQty;
        cart[productId] = newQty;

        if (cartItems[productId].quantity <= 0) {
            delete cartItems[productId];
            delete cart[productId];
        }

        updateCartDisplay();

        if (Object.keys(cartItems).length === 0) {
            hideCartBar();
        }
    }

    // Persist cart state to sessionStorage
    sessionStorage.setItem('cart', JSON.stringify(cart));
    sessionStorage.setItem('cartItems', JSON.stringify(cartItems));
}

function updateCartDisplay() {
    const totalEl    = document.getElementById('cart-total-amount');
    const qtyCountEl = document.getElementById('cart-qty-count');

    const { total, zoboQty } = calculateTotal(cartItems);
    const totalPacks = Object.values(cartItems).reduce((s, i) => s + i.quantity, 0);

    totalEl.textContent = `₦${total.toLocaleString()}`;
    if (qtyCountEl) qtyCountEl.textContent = totalPacks;
}

function showCartBar() {
    document.getElementById('cart-bar').classList.add('active');
}

function hideCartBar() {
    document.getElementById('cart-bar').classList.remove('active');
}

function removeItemFromCheckout(productId) {
    if (cartItems[productId]) {
        const qtyEl = document.getElementById(`qty-${productId}`);
        if (qtyEl) qtyEl.textContent = '0';
        
        delete cartItems[productId];
        delete cart[productId];
        updateCartDisplay();
        
        // Persist updated cart state
        sessionStorage.setItem('cart', JSON.stringify(cart));
        sessionStorage.setItem('cartItems', JSON.stringify(cartItems));
        
        if (Object.keys(cartItems).length === 0) {
            closeCheckoutModal();
            hideCartBar();
        } else {
            openCheckoutModal();
        }
    }
}

function openCheckoutModal() {
    hideCartBar();

    const modal = document.getElementById('checkout-modal');
    const list = document.getElementById('checkout-items-list');
    const subtotalEl = document.getElementById('checkout-subtotal-amount');
    const discountEl = document.getElementById('checkout-discount-info');
    const totalEl = document.getElementById('checkout-total-amount');
    const idEl = document.getElementById('modal-order-id');
    const timeEl = document.getElementById('modal-order-datetime');

    idEl.textContent = trackingID;
    timeEl.textContent = new Date().toLocaleString();

    list.innerHTML = '';
    const { subtotal, total, zoboQty, discountApplied, zoboDiscount } = calculateTotal(cartItems);

    Object.entries(cartItems).forEach(([id, item]) => {
        const itemTotal = item.price * item.quantity;
        const div = document.createElement('div');
        div.className = 'checkout-item';
        div.innerHTML = `
            <div class="checkout-item-left">
                <div>
                    <div class="checkout-item-name">${item.name}</div>
                    <div class="checkout-item-qty">×${item.quantity}</div>
                </div>
            </div>
            <div class="checkout-item-price">₦${itemTotal.toLocaleString()}</div>
            <button class="checkout-item-remove" onclick="removeItemFromCheckout('${id}')">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
            </button>
        `;
        list.appendChild(div);
    });

    subtotalEl.textContent = `₦${subtotal.toLocaleString()}`;
    if (discountApplied) {
        discountEl.textContent = `10% Zobo bulk discount (−₦${zoboDiscount.toLocaleString()})`;
        discountEl.style.display = 'flex';
    } else {
        discountEl.style.display = 'none';
    }
    totalEl.textContent = `₦${total.toLocaleString()}`;

    // Reset popover inputs
    const stateInput = document.getElementById('form-state');
    const lgaInput   = document.getElementById('form-lga');
    if (stateInput) stateInput.value = '';
    if (lgaInput)   lgaInput.value   = '';
    conActiveState = '';
    ['con-state-results','con-lga-results'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('show'); el.style.display = 'none'; }
    });
    // Reset segmented sex to default
    conSelectedSex = 'Male';
    document.querySelectorAll('#con-sex-seg .con-segment-opt').forEach((el, i) => el.classList.toggle('active', i === 0));

    modal.classList.add('active');
}

function closeCheckoutModal() {
    document.getElementById('checkout-modal').classList.remove('active');
    ['con-state-results','con-lga-results'].forEach(id => {
        const el = document.getElementById(id);
        if (el) { el.classList.remove('show'); el.style.display = 'none'; }
    });
}

function processWhatsAppOrder() {
    const confirmBtn = document.querySelector('.checkout-confirm-btn');
    if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Preparing order...';
    }
    const restoreBtn = () => {
        if (confirmBtn) {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Complete Order';
        }
    };

    const state   = document.getElementById('form-state')?.value.trim() || '';
    const lga     = document.getElementById('form-lga')?.value.trim() || '';
    const name    = document.getElementById('form-name')?.value.trim() || '';
    const phone   = document.getElementById('form-phone')?.value.replace(/\s/g, '').trim() || '';
    const address = document.getElementById('form-address')?.value.trim() || '';
    const referral = document.getElementById('form-referral')?.value || '';
    const sex     = conSelectedSex;

    if (!name) { showToast('Please enter your full name'); restoreBtn(); return; }
    if (!phone || !/^\d{11}$/.test(phone) || !phone.startsWith('0')) {
        showToast('Enter a valid 11-digit Nigerian phone number');
        restoreBtn(); return;
    }
    if (!state || !statesAndLGAs[state]) { showToast('Please select a valid State'); restoreBtn(); return; }
    if (!lga)     { showToast('Please select an LGA'); restoreBtn(); return; }
    if (!address) { showToast('Please enter your street address'); restoreBtn(); return; }

    let msg = `*New Order ${trackingID}*\n`;
    msg += `Date: ${new Date().toLocaleString()}\n\n`;
    msg += `*Customer Details:*\n`;
    msg += `Name: ${name}\n`;
    msg += `Phone: ${phone}\n`;
    msg += `Address: ${address}, ${lga}, ${state}\n\n`;
    msg += `*Items Ordered:*\n`;

    const { subtotal, total, discountApplied, zoboDiscount } = calculateTotal(cartItems);

    // Build structured items array for automated stock deduction
    var structuredItems = [];
    Object.values(cartItems).forEach(item => {
        msg += `${item.name} x ${item.quantity} = N${(item.price * item.quantity).toLocaleString()}\n`;
        structuredItems.push({ id: item.id, name: item.name, qty: item.quantity });
    });

    if (discountApplied) {
        msg += `\n10% Zobo Bulk Discount Applied!\n`;
        msg += `Discount: -N${zoboDiscount.toLocaleString()}\n`;
    }
    msg += `\nTotal Amount: N${total.toLocaleString()}\n\n`;
    msg += `Please confirm my delivery details and product availability. Thank you!`;

    // Save to Pending_Orders — uses offline queue if network is down
    oaSend({
        action:          'saveOrder',
        name:            name,
        phone:           phone,
        email:           '',
        state:           state,
        lga:             lga,
        address:         address,
        landmark:        document.getElementById('form-landmark')?.value.trim() || '',
        items:           JSON.stringify(structuredItems),
        subtotal:        subtotal,
        total:           total,
        buyer_type:      'consumer',
        tracking:        trackingID,
        heard_from:      referral,
        notes:           ''
    });

    const waURL = `https://wa.me/2348140226282?text=${encodeURIComponent(msg)}`;
    const ctaBtn = document.getElementById('whatsapp-cta-btn');
    if (ctaBtn) ctaBtn.href = waURL;

    closeCheckoutModal();
    hideCartBar();
    document.getElementById('success-modal').classList.add('active');
}

// Called when the user manually taps the WhatsApp CTA on the success screen
function handleWhatsAppSend() {
    // Allow the native anchor href to open WhatsApp, then clean up after a short delay
    setTimeout(() => {
        document.getElementById('success-modal').classList.remove('active');
        resetCart();
    }, 600);
}

function resetCart() {
    cart = {};
    cartItems = {};
    document.querySelectorAll('[id^="qty-"]').forEach(el => el.textContent = '0');
    ['form-name','form-phone','form-address','form-state','form-lga'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = '';
    });
    conActiveState = '';
    conSelectedSex = 'Male';
    document.querySelectorAll('#con-sex-seg .con-segment-opt').forEach((el, i) => el.classList.toggle('active', i === 0));
    hideCartBar();
    sessionStorage.removeItem('cart');
    sessionStorage.removeItem('cartItems');
}

// ── Phone formatter ──────────────────────────────────────────────────────────
function formatConPhone(input) {
    let value = input.value.replace(/\D/g, '');
    if (value.length > 11) value = value.slice(0, 11);
    if (value.length > 7)      value = value.slice(0,4) + ' ' + value.slice(4,8) + ' ' + value.slice(8);
    else if (value.length > 4) value = value.slice(0,4) + ' ' + value.slice(4);
    input.value = value;
}

// ── Searchable popover — fixed-position to escape overflow:auto container ───
function handleConSearch(type, query) {
    const input      = document.getElementById(`form-${type}`);
    const resultsDiv = document.getElementById(`con-${type}-results`);
    resultsDiv.innerHTML = '';

    if (!query) { resultsDiv.classList.remove('show'); resultsDiv.style.display = 'none'; return; }

    const rect = input.getBoundingClientRect();
    resultsDiv.style.top   = (rect.bottom + 3) + 'px';
    resultsDiv.style.left  = rect.left + 'px';
    resultsDiv.style.width = rect.width + 'px';

    let items = [];
    if (type === 'state') {
        items = Object.keys(statesAndLGAs)
            .filter(s => s.toLowerCase().includes(query.toLowerCase())).sort();
    } else if (type === 'lga' && conActiveState) {
        items = statesAndLGAs[conActiveState]
            .filter(r => r.toLowerCase().includes(query.toLowerCase()));
    }

    if (items.length > 0) {
        resultsDiv.classList.add('show');
        resultsDiv.style.display = 'block';
        items.forEach(item => {
            const div = document.createElement('div');
            div.className = 'popover-item';
            div.innerText = item;
            div.onmousedown = (e) => { e.preventDefault(); selectConItem(type, item); };
            resultsDiv.appendChild(div);
        });
    } else {
        resultsDiv.classList.remove('show');
        resultsDiv.style.display = 'none';
    }
}

function selectConItem(type, val) {
    document.getElementById(`form-${type}`).value = val;
    const resultsDiv = document.getElementById(`con-${type}-results`);
    resultsDiv.classList.remove('show');
    resultsDiv.style.display = 'none';
    if (type === 'state') {
        conActiveState = val;
        const lgaInput = document.getElementById('form-lga');
        if (lgaInput) lgaInput.value = '';
    }
}

// ── Segmented control — Sex ──────────────────────────────────────────────────
function selectConSegment(value, el) {
    el.parentElement.querySelectorAll('.con-segment-opt').forEach(opt => opt.classList.remove('active'));
    el.classList.add('active');
    conSelectedSex = value;
}

function initConFormListeners() {
    // Close popovers on outside click
    document.addEventListener('click', (e) => {
        ['con-state-results','con-lga-results'].forEach(id => {
            const el = document.getElementById(id);
            if (el && !e.target.closest('[oninput*="handleConSearch"]') && !el.contains(e.target)) {
                el.classList.remove('show');
                el.style.display = 'none';
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    // Restore cart state from sessionStorage
    const savedCart = sessionStorage.getItem('cart');
    const savedCartItems = sessionStorage.getItem('cartItems');
    if (savedCart && savedCartItems) {
        cart = JSON.parse(savedCart);
        cartItems = JSON.parse(savedCartItems);
        Object.entries(cartItems).forEach(([id, item]) => {
            const qtyEl = document.getElementById(`qty-${id}`);
            if (qtyEl) qtyEl.textContent = item.quantity;
        });
        updateCartDisplay();
        if (Object.keys(cartItems).length > 0) {
            showCartBar();
        }
    }

    initConFormListeners();

    document.getElementById('checkout-modal').addEventListener('click', e => {
        if (e.target === e.currentTarget) closeCheckoutModal();
    });
});