/* ═══════════════════════════════════════════════════════════════════════════
   OA Drinks & Snacks — Site Bot v2  (bot.js)
   Chat-thread panel · Per-page conversational content · Scroll hints
   ═══════════════════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── SVG helpers ─────────────────────────────────────────────────────────── */
  const IC = {
    arrow: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>`,
    arrowLeft: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>`,
    arrowRight: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"/></svg>`,
    close: `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`,
    wa: `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.117 1.523 5.845L.057 23.273a.75.75 0 0 0 .92.92l5.43-1.466A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.006-1.369l-.36-.214-3.724 1.006 1.006-3.724-.213-.36A9.818 9.818 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182S21.818 6.57 21.818 12 17.43 21.818 12 21.818z"/></svg>`,
  };

  /* ── Per-page content ────────────────────────────────────────────────────── */
  const PAGE_DATA = {

    /* ═══════════════════════════ HOME ═══════════════════════════════════════ */
    home: {
      bubbleText: "Hey there! 👋 Tap me, let me show you around!",
      chipLabel: 'Home',
      chipIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
      slides: [
        [
          {
            type: 'text',
            text: `Hey there! 👋 Welcome to OA Drinks. We make real Nigerian drinks and snacks — no funny preservatives, just fresh ingredients like you'd prep at home.`
          }
        ],
        [
          {
            type: 'text',
            text: `Here's the good stuff we make:`
          },
          {
            type: 'products',
            items: [
              {
                name: 'Zobo Drink', price: '₦10k / 12-pack',
                desc: 'Brewed with dried hibiscus leaves and fresh ginger. It’s naturally tart, perfectly sweet, and cools you down instantly.',
                badge: '🔥 Best Seller'
              },
              {
                name: 'Tiger Nut Milk', price: '₦4,500 / 12-pack',
                desc: 'Pressed from raw tiger nuts. It’s 100% dairy-free, super creamy, and packed with vitamins for the body.',
                badge: '💪 High Nutrient'
              },
              {
                name: 'Chin Chin (Large 1kg)', price: '₦3,500',
                desc: 'Oven-baked, golden, and seriously crunchy. The ultimate snack for movies or parties.',
                badge: '🎉 Party Fav'
              }
            ]
          }
        ],
        [
          {
            type: 'text',
            text: `Not sure where to head next?`
          },
          {
            type: 'steps',
            items: [
              { text: `Tap <em>Shop Now</em> below to order for your house` },
              { text: `Running a business? Check the menu for <em>Wholesale</em> for bulk prices` },
              { text: `Check out <em>Distributors</em> to own a supply route in your area` }
            ]
          },
          {
            type: 'tip',
            text: `💡 We deliver nationwide! Plus, same-day delivery is available if you're in Lagos.`
          }
        ]
      ],
      cta: { label: 'Shop Now', href: 'consumer.html' },
      wa: true,
      footerHint: '📦 Delivering to all 36 states + FCT'
    },

    /* ══════════════════════════ CONSUMER ════════════════════════════════════ */
    consumer: {
      bubbleText: "Save 10% when you buy 5+ Zobo packs! 🛍️",
      chipLabel: 'Shop',
      chipIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>`,
      slides: [
        [
          {
            type: 'text',
            text: `Welcome to the Shop! 🛒 You’re just a few taps away from getting fresh drinks delivered straight to your door.`
          }
        ],
        [
          {
            type: 'text',
            text: `Here's what you can grab today:`
          },
          {
            type: 'products',
            items: [
              {
                name: 'Zobo Drink', price: '₦10,000 / 12-pack',
                desc: 'Real dried hibiscus leaves, fresh ginger, natural sweeteners. Zero artificial colors. Served best when chilled.',
                badge: '🎁 Buy 5+ = 10% off'
              },
              {
                name: 'Tiger Nut Milk', price: '₦4,500 / 12-pack',
                desc: 'Cold-pressed from raw tiger nuts. Naturally sweet, dairy-free, and great for the whole family.',
                badge: '🌿 Dairy-Free'
              },
              {
                name: 'Chin Chin (Large 1kg)', price: '₦3,500',
                desc: 'Classic crunchy, golden baked chin chin. The 1kg bag is perfect for having at home or sharing.',
                badge: '🎉 Party Size'
              }
            ]
          }
        ],
        [
          {
            type: 'text',
            text: `Ordering is super easy:`
          },
          {
            type: 'steps',
            items: [
              { text: `Tap <em>+</em> on any product to add to your cart` },
              { text: `Tap <em>Checkout</em> on the bottom bar` },
              { text: `Drop your address and hit Complete Order` },
              { text: `Send the WhatsApp message — we'll confirm and deliver within 1 hour in Lagos!` }
            ]
          }
        ],
        [
          {
            type: 'rows',
            items: [
              { key: 'Delivery (Lagos)',       val: '₦1,500 – ₦3,000' },
              { key: 'Delivery (Outside)',     val: '₦3,000 – ₦5,500' },
              { key: 'Same-day delivery',       val: 'Lagos only', cls: 'iv-green' }
            ]
          },
          {
            type: 'tip',
            text: `💰 Pro tip: Add 5 or more Zobo packs to your cart and a 10% discount applies automatically! No code needed.`
          }
        ]
      ],
      cta: null,
      wa: true,
      footerHint: '🎉 5+ Zobo packs = 10% off, calculated at checkout'
    },

    /* ══════════════════════════ BUSINESS ════════════════════════════════════ */
    business: {
      bubbleText: "Check out the margin calculator! 📈",
      chipLabel: 'Wholesale',
      chipIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/></svg>`,
      slides: [
        [
          {
            type: 'text',
            text: `Welcome to the Wholesale Hub! 🤝 If you run a shop, canteen, or supermarket, we’ve got the margins to keep your business smiling.`
          }
        ],
        [
          {
            type: 'text',
            text: `We have two main tiers. The more you buy, the more you make:`
          },
          {
            type: 'rows',
            items: [
              { key: 'Retailer (5 – 9 packs)', val: '₦9,500 / pack', cls: 'iv-red' },
              { key: 'Wholesale (10+ packs)',   val: '₦9,000 / pack', cls: 'iv-red' },
              { key: 'Your selling price',      val: 'You decide!' }
            ]
          }
        ],
        [
          {
            type: 'text',
            text: `See that <strong>Margin Calculator</strong> on this page? It's a game-changer.`
          },
          {
            type: 'steps',
            items: [
              { text: `Select your tier (Retailer or Wholesale)` },
              { text: `Type in the price you want to sell a bottle for` },
              { text: `It instantly calculates your total cost, expected revenue, and pure profit!` }
            ]
          },
          {
            type: 'tip',
            text: `💡 Try it now: Pick the wholesale tier, enter ₦1,200 as your selling price and watch the profit jump.`
          }
        ],
        [
          {
            type: 'text',
            text: `Ready to restock?`
          },
          {
            type: 'steps',
            items: [
              { text: `Set your quantity and tap <em>Request Supply</em> below` },
              { text: `Fill in your shop details and choose Pay on Delivery or Pay Now` },
              { text: `Send the WhatsApp message — we confirm within an hour.` }
            ]
          }
        ]
      ],
      cta: null,
      wa: true,
      footerHint: '200+ wholesale partners already stocking OA'
    },

    /* ═════════════════════════ DISTRIBUTOR ══════════════════════════════════ */
    distributor: {
      bubbleText: "Own your area and make real money! 🤝",
      chipLabel: 'Partner',
      chipIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>`,
      slides: [
        [
          {
            type: 'text',
            text: `Welcome to the Partnership page! 🚀 If you've been looking for a solid business to run in your state or local area, this is it.`
          },
          {
            type: 'text',
            text: `As an OA Distributor, you own the supply route. We handle the production, you handle the sales and keep the profits.`
          }
        ],
        [
          {
            type: 'rows',
            items: [
              { key: 'Starter stock (20 packs)',    val: '₦120,000', cls: 'iv-red' },
              { key: 'Optional Success Kit',        val: '₦30,000' },
              { key: '3-month revenue potential',   val: '₦550,000+', cls: 'iv-green' }
            ]
          },
          {
            type: 'tip',
            text: `💡 Do the math: Supplying just 5 Zobo packs weekly for 3 months easily puts over ₦550,000 in your pocket. Real money from a product people already love.`
          }
        ],
        [
          {
            type: 'text',
            text: `Here’s how to apply right now:`
          },
          {
            type: 'steps',
            items: [
              { text: `Use the <em>+ / −</em> buttons to pick your starting packs` },
              { text: `Tick the <em>Success Kit</em> box if you want branded marketing materials` },
              { text: `Fill in your details and tap <em>"Yes, I'm Interested!"</em>` },
              { text: `Send your application via WhatsApp. Our team responds same day!` }
            ]
          }
        ]
      ],
      cta: null,
      wa: true,
      footerHint: '🏆 OA handles production. You own your market.'
    }
  };

  /* ── Page detection ──────────────────────────────────────────────────────── */
  function getPage() {
    const dp = document.body.getAttribute('data-page');
    if (dp && PAGE_DATA[dp]) return dp;
    const path = window.location.pathname;
    if (path.includes('business'))    return 'business';
    if (path.includes('consumer'))    return 'consumer';
    if (path.includes('distributor')) return 'distributor';
    return 'home';
  }

  /* ── HTML builders ───────────────────────────────────────────────────────── */
  function buildMsgContent(msg) {
    let inner = '';

    switch (msg.type) {

      case 'text':
        inner = `<p class="bot-bubble-text">${msg.text}</p>`;
        break;

      case 'products':
        inner = `<div class="bot-product-row">${msg.items.map(p => `
          <div class="bot-product-item">
            <div class="bot-product-name">
              <span>${p.name}</span>
              <span class="bot-product-price">${p.price}</span>
            </div>
            <div class="bot-product-desc">${p.desc}</div>
            ${p.badge ? `<span class="bot-product-badge">${p.badge}</span>` : ''}
          </div>`).join('')}</div>`;
        break;

      case 'steps':
        inner = `<div class="bot-step-list">${msg.items.map((s, i) => `
          <div class="bot-step-row">
            <div class="bot-step-num">${i + 1}</div>
            <div class="bot-step-label">${s.text}</div>
          </div>`).join('')}</div>`;
        break;

      case 'rows':
        inner = `<div class="bot-info-rows">${msg.items.map(r => `
          <div class="bot-info-row">
            <span class="bot-info-key">${r.key}</span>
            <span class="bot-info-val ${r.cls || ''}">${r.val}</span>
          </div>`).join('')}</div>`;
        break;

      case 'pills':
        inner = `<div class="bot-pills">${msg.items.map(p =>
          `<span class="bot-pill">${p}</span>`).join('')}</div>`;
        break;

      case 'tip':
        inner = `<div class="bot-tip-box">${msg.text}</div>`;
        break;
    }

    return inner;
  }

  function buildPanelHTML(data) {
    const ctaBtn = data.cta ? `
      <a href="${data.cta.href}" class="bot-cta-btn bot-cta-primary">
        ${data.cta.label} ${IC.arrowRight}
      </a>` : '';

    const waBtn = data.wa ? `
      <a href="https://wa.me/2348140226282" target="_blank" rel="noopener noreferrer"
         class="bot-cta-btn bot-cta-wa">
        ${IC.wa} Chat with Us on WhatsApp
      </a>` : '';

    const dotsHTML = data.slides.map((_, i) => `<div class="bot-nav-dot ${i === 0 ? 'active' : ''}"></div>`).join('');

    return `
    <div class="bot-panel-header">
      <div class="bot-panel-avatar">
        <img src="logo.png" alt="OA Bot" draggable="false">
      </div>
      <div class="bot-panel-info">
        <div class="bot-panel-name">OA Assistant</div>
        <div class="bot-panel-status">Online now</div>
      </div>
      <button class="bot-close-btn" id="bot-panel-close" aria-label="Close">
        ${IC.close}
      </button>
    </div>

    <div class="bot-chat-wrap" id="bot-chat-wrap">
      <div class="bot-page-chip">${data.chipIcon} ${data.chipLabel}</div>
      
      <div class="bot-chat-msg">
        <div class="bot-msg-avatar">
          <img src="logo.png" alt="OA" draggable="false">
        </div>
        <div class="bot-chat-bubble" id="bot-slide-content"></div>
      </div>
      
      <div class="bot-chat-nav">
        <button class="bot-nav-btn" id="bot-nav-prev">${IC.arrowLeft} Prev</button>
        <div class="bot-nav-dots" id="bot-nav-dots">${dotsHTML}</div>
        <button class="bot-nav-btn" id="bot-nav-next">Next ${IC.arrowRight}</button>
      </div>
    </div>

    <div class="bot-panel-footer">
      ${ctaBtn}
      ${waBtn}
      <p class="bot-footer-hint">${data.footerHint}</p>
    </div>`;
  }

  /* ── Drag (touch + mouse) ────────────────────────────────────────────────── */
  function makeDraggable(root) {
    let dragging = false;
    let startX, startY, startRight, startBottom;

    const getRight  = () => parseInt(root.style.right  || '20', 10);
    const getBottom = () => parseInt(root.style.bottom || '90', 10);

    function onDown(cx, cy) {
      dragging = true;
      startX = cx; startY = cy;
      startRight = getRight(); startBottom = getBottom();
    }
    function onMove(cx, cy) {
      if (!dragging) return;
      const r = Math.max(4, Math.min(window.innerWidth  - 70, startRight  + (startX - cx)));
      const b = Math.max(4, Math.min(window.innerHeight - 70, startBottom + (startY - cy)));
      root.style.right  = r + 'px';
      root.style.bottom = b + 'px';
    }
    function onUp() { dragging = false; }

    const aw = root.querySelector('.bot-avatar-wrap');
    aw.addEventListener('mousedown',  (e) => { if (e.button === 0) { onDown(e.clientX, e.clientY); e.preventDefault(); } });
    document.addEventListener('mousemove', (e) => onMove(e.clientX, e.clientY));
    document.addEventListener('mouseup', onUp);

    aw.addEventListener('touchstart', (e) => { const t = e.touches[0]; onDown(t.clientX, t.clientY); }, { passive: true });
    document.addEventListener('touchmove',  (e) => { const t = e.touches[0]; onMove(t.clientX, t.clientY); }, { passive: true });
    document.addEventListener('touchend', onUp);
  }

  /* ── Init ────────────────────────────────────────────────────────────────── */
  function init() {
    const page = getPage();
    const data = PAGE_DATA[page];

    /* Avatar root */
    const root = document.createElement('div');
    root.id = 'oa-bot-root';
    root.innerHTML = `
      <div class="bot-avatar-wrap" id="bot-avatar-wrap" role="button" aria-label="OA Assistant" tabindex="0">
        <div class="bot-wave"></div>
        <div class="bot-wave"></div>
        <div class="bot-wave"></div>
        <div class="bot-avatar">
          <img src="logo.png" alt="OA Drinks" draggable="false">
        </div>
        <div class="bot-online-dot"></div>
      </div>
      <div class="bot-toast" id="bot-bubble" role="status" aria-live="polite">
        <div class="bot-toast-icon"><img src="logo.png" alt="OA" draggable="false"></div>
        <div class="bot-toast-body">
          <div class="bot-toast-title">OA Assistant</div>
          <div class="bot-toast-text">${data.bubbleText}</div>
        </div>
      </div>`;
    document.body.appendChild(root);

    /* Panel — sibling of root so fixed positioning works independently */
    const panel = document.createElement('div');
    panel.className = 'bot-panel';
    panel.id = 'oa-bot-panel';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-label', 'OA Assistant panel');
    panel.innerHTML = buildPanelHTML(data);
    document.body.appendChild(panel);

    const avatarWrap = root.querySelector('#bot-avatar-wrap');
    const bubble     = root.querySelector('#bot-bubble');
    let panelOpen = false;
    let bubbleTimer = null;
    let currentSlide = 0;

    function renderSlide(index) {
      const slideData = data.slides[index];
      const html = slideData.map(buildMsgContent).join('');
      const contentEl = panel.querySelector('#bot-slide-content');

      contentEl.style.opacity = 0;
      setTimeout(() => {
        contentEl.innerHTML = html;
        contentEl.style.opacity = 1;
      }, 150);

      panel.querySelector('#bot-nav-prev').disabled = (index === 0);
      panel.querySelector('#bot-nav-next').disabled = (index === data.slides.length - 1);

      panel.querySelectorAll('.bot-nav-dot').forEach((dot, i) => {
        dot.classList.toggle('active', i === index);
      });
    }

    renderSlide(0);

    panel.querySelector('#bot-nav-prev').addEventListener('click', () => {
      if (currentSlide > 0) {
        currentSlide--;
        renderSlide(currentSlide);
      }
    });

    panel.querySelector('#bot-nav-next').addEventListener('click', () => {
      if (currentSlide < data.slides.length - 1) {
        currentSlide++;
        renderSlide(currentSlide);
      }
    });

    function openPanel() {
      panelOpen = true;
      panel.classList.add('panel-open');
      bubble.classList.remove('toast-visible');
      if (bubbleTimer) { clearTimeout(bubbleTimer); bubbleTimer = null; }
    }
    function closePanel() {
      panelOpen = false;
      panel.classList.remove('panel-open');
    }
    function togglePanel() { panelOpen ? closePanel() : openPanel(); }

    /* Tap vs drag threshold */
    let pdX = 0, pdY = 0;
    avatarWrap.addEventListener('pointerdown', (e) => { pdX = e.clientX; pdY = e.clientY; });
    avatarWrap.addEventListener('pointerup',   (e) => {
      if (Math.hypot(e.clientX - pdX, e.clientY - pdY) < 8) togglePanel();
    });
    avatarWrap.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); togglePanel(); }
    });

    /* Panel close btn */
    panel.querySelector('#bot-panel-close').addEventListener('click', closePanel);

    /* Outside click */
    document.addEventListener('pointerdown', (e) => {
      if (panelOpen && !panel.contains(e.target) && !root.contains(e.target)) closePanel();
    });

    /* Bubble tap opens panel */
    bubble.addEventListener('click', openPanel);

    /* ── Timing ── */
    setTimeout(() => {
      root.classList.add('bot-visible');

      /* Toast appears 3s after avatar, stays 8s */
      bubbleTimer = setTimeout(() => {
        bubble.classList.add('toast-visible');
        bubbleTimer = setTimeout(() => {
          bubble.classList.remove('toast-visible');
          bubbleTimer = null;
        }, 8000);   /* ← 8 seconds on page */
      }, 3000);

    }, 5000); /* ← avatar appears 5s after load */

    makeDraggable(root);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();