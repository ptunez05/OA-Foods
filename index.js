// ── Dark mode: apply BEFORE first paint to prevent flash ──────────────────────
(function () {
    if (localStorage.getItem('theme') === 'dark') {
        document.documentElement.classList.add('dark-mode');
        document.body && document.body.classList.add('dark-mode');
    }
})();

document.addEventListener('DOMContentLoaded', () => {

    // Re-apply dark mode to body (IIFE covers documentElement; body may not exist yet)
    if (localStorage.getItem('theme') === 'dark') {
        document.body.classList.add('dark-mode');
    }

    // ── 0. Desktop parallax — subtle translateY on fixed-height hero ────────────
    // Mobile hero is position:relative so parallax is skipped entirely there.
    var isMobile = window.innerWidth < 768;
    var hero = document.querySelector('.parallax-hero');
    var ticking = false;

    window.addEventListener('resize', function() {
        isMobile = window.innerWidth < 768;
        if (isMobile && hero) hero.style.transform = '';
    }, { passive: true });

    function updateParallax() {
        if (!hero || isMobile) return;
        // Cap translateY so hero image never scrolls beyond its own height (520px)
        var scrolled = Math.min(window.scrollY, 520);
        hero.style.transform = 'translateY(' + (scrolled * 0.3) + 'px)';
        ticking = false;
    }

    window.addEventListener('scroll', function() {
        if (!ticking && !isMobile) {
            window.requestAnimationFrame(updateParallax);
            ticking = true;
        }
    }, { passive: true });

    // ── 1. Preloader: hide on window load, not blind timeout ──────────────────
    const loader = document.getElementById('preloader');
    if (loader) {
        const hideLoader = () => {
            loader.style.opacity = '0';
            setTimeout(() => { loader.style.display = 'none'; }, 600);
        };

        if (document.readyState === 'complete') {
            // Already loaded by the time DOMContentLoaded fires
            setTimeout(hideLoader, 200);
        } else {
            window.addEventListener('load', hideLoader);
            // Safety fallback: never block the user longer than 3s
            setTimeout(hideLoader, 3000);
        }
    }

    // ── 2. Navigation & sticky header ────────────────────────────────────────
    const header  = document.querySelector('.header');
    const trigger = document.querySelector('.nav-trigger-wrapper');
    const ham     = document.querySelector('.hamburger');
    const menu    = document.querySelector('.mobile-menu');

    window.addEventListener('scroll', () => {
        if (!header) return;
        if (window.scrollY > 150) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }, { passive: true });

    if (trigger && ham && menu) {
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            ham.classList.toggle('active');
            menu.classList.toggle('active');
        });

        menu.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                ham.classList.remove('active');
                menu.classList.remove('active');
            });
        });

        document.addEventListener('click', (e) => {
            if (menu.classList.contains('active')) {
                if (!menu.contains(e.target) && !trigger.contains(e.target)) {
                    ham.classList.remove('active');
                    menu.classList.remove('active');
                }
            }
        });
    }

    // ── 3. Hero word animation — fires on IntersectionObserver, not blind timeout
    const heroSection = document.querySelector('.parallax-hero');
    const words = document.querySelectorAll('.hero-title .word');
    let heroAnimated = false;

    function animateHeroWords() {
        if (heroAnimated || !words.length) return;
        heroAnimated = true;

        const wordArray = Array.from(words);
        // Fisher-Yates shuffle for random reveal order
        for (let i = wordArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [wordArray[i], wordArray[j]] = [wordArray[j], wordArray[i]];
        }
        wordArray.forEach((word, index) => {
            setTimeout(() => word.classList.add('visible'), index * 180);
        });
    }

    if (heroSection && words.length) {
        const heroObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Small delay so page has settled before animating
                    setTimeout(animateHeroWords, 400);
                    heroObserver.disconnect();
                }
            });
        }, { threshold: 0.1 });
        heroObserver.observe(heroSection);
    }

    // ── 4. Multi-stat counter animation ─────────────────────────────────────
    const counterStats = [
        { id: 'counter-customers', target: 200, suffix: '+', duration: 2200 },
        { id: 'counter-years',     target: 15,  suffix: '+', duration: 1800 },
        { id: 'counter-products',  target: 4,   suffix: '',  duration: 1200 },
        { id: 'counter-states',    target: 36,  suffix: '',  duration: 2000 },
    ];

    function animateStat({ id, target, suffix, duration }) {
        const el = document.getElementById(id);
        if (!el || el.dataset.done === 'true') return;
        el.dataset.done = 'true';
        let startTimestamp = null;
        const step = (timestamp) => {
            if (!startTimestamp) startTimestamp = timestamp;
            const progress = Math.min((timestamp - startTimestamp) / duration, 1);
            const eased    = 1 - Math.pow(1 - progress, 3);
            el.innerText   = Math.floor(eased * target) + suffix;
            if (progress < 1) window.requestAnimationFrame(step);
        };
        window.requestAnimationFrame(step);
    }

    function runCounter() {
        counterStats.forEach(stat => animateStat(stat));
    }

    // ── 5. IntersectionObserver — lower threshold, covers tall cards ──────────
    const observerOptions = { threshold: 0.08, rootMargin: '0px 0px -40px 0px' };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Counter trigger
                if (entry.target.id === 'counter-trigger') {
                    runCounter();
                }
            }
        });
    }, observerOptions);

    document.querySelectorAll('.slide-in').forEach(el => observer.observe(el));
    // counter-trigger is now the section itself
    const counterTrigger = document.getElementById('counter-trigger');
    if (counterTrigger) observer.observe(counterTrigger);

    // ── 6. Product cards — only Buy It button navigates, not whole card ───────
    // Remove the card-level click; wire only the button
    document.querySelectorAll('.mini-card').forEach(card => {
        // Card itself: no navigation
        card.style.cursor = 'default';
    });
    document.querySelectorAll('.buy-it-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            window.location.href = 'consumer.html';
        });
    });

    // ── 7. Testimonial slider — auto + swipe + dots ───────────────────────────
    let currentReview  = 0;
    let sliderPaused   = false;
    let sliderInterval = null;
    let touchStartX    = 0;
    let touchEndX      = 0;
    const track = document.getElementById('testimonial-track');
    const cards = document.querySelectorAll('.testimonial-card');
    const dots  = document.querySelectorAll('.t-dot');

    function goToSlide(index) {
        if (index < 0) index = cards.length - 1;
        if (index >= cards.length) index = 0;
        currentReview = index;
        if (track) track.style.transform = `translateX(-${currentReview * 100}%)`;
        dots.forEach((d, i) => d.classList.toggle('active', i === currentReview));
    }

    function startSlider() {
        if (sliderInterval) clearInterval(sliderInterval);
        sliderInterval = setInterval(() => {
            if (!sliderPaused && cards.length > 0) {
                goToSlide((currentReview + 1) % cards.length);
            }
        }, 5000);
    }

    if (track && cards.length > 0) {
        startSlider();

        const sliderEl = document.querySelector('.testimonial-wrapper');
        if (sliderEl) {
            sliderEl.addEventListener('mouseenter', () => { sliderPaused = true; });
            sliderEl.addEventListener('mouseleave', () => { sliderPaused = false; });

            sliderEl.addEventListener('touchstart', (e) => {
                sliderPaused = true;
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });

            sliderEl.addEventListener('touchend', (e) => {
                touchEndX = e.changedTouches[0].screenX;
                if (touchEndX < touchStartX - 50) goToSlide(currentReview + 1);
                if (touchEndX > touchStartX + 50) goToSlide(currentReview - 1);
                setTimeout(() => { sliderPaused = false; }, 4000);
            }, { passive: true });

            sliderEl.addEventListener('click', () => {
                sliderPaused = true;
                setTimeout(() => { sliderPaused = false; }, 4000);
            });
        }

        dots.forEach((dot, i) => {
            dot.addEventListener('click', (e) => {
                e.stopPropagation();
                goToSlide(i);
                sliderPaused = true;
                setTimeout(() => { sliderPaused = false; }, 4000);
            });
        });
    }

    // ── 8. Dark mode toggle — swaps moon ↔ sun icon on all pages ────────────
    const themeToggle = document.getElementById('theme-toggle');

    const _moonSVG = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
    const _sunSVG  = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;

    function _syncThemeIcon() {
        if (!themeToggle) return;
        themeToggle.innerHTML = document.body.classList.contains('dark-mode') ? _sunSVG : _moonSVG;
    }

    // Sync icon to current mode on load
    _syncThemeIcon();

    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
            const isDark = document.body.classList.contains('dark-mode');
            localStorage.setItem('theme', isDark ? 'dark' : 'light');
            _syncThemeIcon();
        });
    }

    // ── 9. Sticky shop pill — appears after hero scrolls out of view ──────────
    const shopPill = document.getElementById('sticky-shop-pill');
    if (shopPill) {
        window.addEventListener('scroll', () => {
            const heroH = window.innerHeight;
            if (window.scrollY > heroH * 0.85) {
                shopPill.classList.add('visible');
            } else {
                shopPill.classList.remove('visible');
            }
        }, { passive: true });
    }

});
