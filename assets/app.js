(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  const STORAGE = {
    users: 'kernwise.users',
    session: 'kernwise.session',
    messages: 'kernwise.messages',
    subscribers: 'kernwise.subscribers',
    subscription: 'kernwise.subscription'
  };

  const PLAN_DATA = {
    Starter: { mo: 0, yr: 0, labelMo: 'Free', labelYr: 'Free' },
    Pro: { mo: 19, yr: 15, labelMo: '$19', labelYr: '$15' },
    Team: { mo: 49, yr: 39, labelMo: '$49', labelYr: '$39' }
  };

  const readJSON = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch { return fallback; }
  };
  const writeJSON = (key, value) => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
  };

  function simpleHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h + str.charCodeAt(i)) | 0;
    }
    return 'h' + Math.abs(h).toString(36);
  }

  (function seedDemoAccount() {
    const users = readJSON(STORAGE.users, {});
    if (!users['demo@kernwise.app']) {
      users['demo@kernwise.app'] = {
        name: 'Demo User',
        hash: simpleHash('demo1234'),
        created: Date.now()
      };
      writeJSON(STORAGE.users, users);
    }
  })();

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  function setFieldError(input, message) {
    if (!input) return;
    const field = input.closest('.field');
    input.classList.toggle('invalid', Boolean(message));
    const errEl = field ? $('.field-error', field) : null;
    if (errEl) errEl.textContent = message || '';
  }

  function getSession() { return readJSON(STORAGE.session, null); }
  function isSignedIn() { const s = getSession(); return !!(s && s.email); }

  const toast = $('#toast');
  let toastTimer;
  function showToast(msg, type = 'success') {
    if (!toast) return;
    clearTimeout(toastTimer);
    toast.textContent = msg;
    toast.classList.remove('error');
    if (type === 'error') toast.classList.add('error');
    toast.classList.add('show');
    toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
  }

  function setPending(plan, billing) {
    try {
      sessionStorage.setItem('kernwise.pendingPlan', plan);
      sessionStorage.setItem('kernwise.billing', billing);
    } catch {}
  }

  function getPending() {
    try {
      const plan = sessionStorage.getItem('kernwise.pendingPlan');
      let billing = sessionStorage.getItem('kernwise.billing') || 'monthly';
      if (billing !== 'yearly' && billing !== 'monthly') billing = 'monthly';
      return { plan, billing };
    } catch {
      return { plan: null, billing: 'monthly' };
    }
  }

  function clearPending() {
    try {
      sessionStorage.removeItem('kernwise.pendingPlan');
    } catch {}
  }

  function getRedirectParam() {
    const params = new URLSearchParams(window.location.search);
    return params.get('redirect');
  }

  function safeRedirectTarget(fallback = 'index.html') {
    const redirect = getRedirectParam();
    if (!redirect) return fallback;
    if (redirect === 'checkout' || redirect.startsWith('checkout.html')) {
      return 'checkout.html';
    }
    return redirect;
  }

  const userSlot = $('#userSlot');
  const userBadge = $('#userBadge');
  const userEmail = $('#userEmail');
  const signOutBtn = $('#signOutBtn');

  function renderSession() {
    if (!userSlot || !userBadge) return;
    const session = getSession();
    if (session && session.email) {
      userSlot.classList.add('hidden');
      userBadge.classList.remove('hidden');
      if (userEmail) userEmail.textContent = session.email;
    } else {
      userSlot.classList.remove('hidden');
      userBadge.classList.add('hidden');
    }
  }

  if (signOutBtn) {
    signOutBtn.addEventListener('click', () => {
      localStorage.removeItem(STORAGE.session);
      renderSession();
      showToast('Signed out.');
    });
  }

  const burger = $('#burger');
  const mobileMenu = $('#mobileMenu');

  function closeMobileMenu() {
    if (!burger || !mobileMenu) return;
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-label', 'Open menu');
    mobileMenu.setAttribute('aria-hidden', 'true');
    mobileMenu.classList.remove('open');
  }

  if (burger && mobileMenu) {
    burger.addEventListener('click', () => {
      const open = burger.getAttribute('aria-expanded') === 'true';
      if (open) closeMobileMenu();
      else {
        burger.setAttribute('aria-expanded', 'true');
        burger.setAttribute('aria-label', 'Close menu');
        mobileMenu.setAttribute('aria-hidden', 'false');
        mobileMenu.classList.add('open');
      }
    });
    $$('.mobile-anchor').forEach(link => link.addEventListener('click', closeMobileMenu));
  }

  const header = $('#siteHeader');
  if (header) {
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 10);
    }, { passive: true });
  }

  const billSwitch = $('#billSwitch');
  const billMonthly = $('#billMonthly');
  const billYearly = $('#billYearly');
  let yearly = false;

  function updatePrices() {
    const mode = yearly ? 'yr' : 'mo';
    $$('.cost-num').forEach(el => { el.textContent = el.dataset[mode]; });
    $$('.cost-per').forEach(el => { el.textContent = el.dataset[mode]; });
    if (billMonthly) billMonthly.classList.toggle('on', !yearly);
    if (billYearly) billYearly.classList.toggle('on', yearly);
    if (billSwitch) billSwitch.setAttribute('aria-checked', String(yearly));
  }

  if (billSwitch) {
    billSwitch.addEventListener('click', () => { yearly = !yearly; updatePrices(); });
    billSwitch.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        yearly = !yearly;
        updatePrices();
      }
    });
  }
  if (billMonthly) billMonthly.addEventListener('click', () => { if (yearly) { yearly = false; updatePrices(); } });
  if (billYearly) billYearly.addEventListener('click', () => { if (!yearly) { yearly = true; updatePrices(); } });

  $$('[data-plan-cta]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const plan = link.dataset.planCta;
      const billing = yearly ? 'yearly' : 'monthly';

      setPending(plan, billing);

      if (!isSignedIn()) {
        window.location.href = 'signin.html?redirect=checkout';
        return;
      }

      window.location.href = 'checkout.html';
    });
  });

  function renderSubscriptionHighlight() {
    const sub = readJSON(STORAGE.subscription, null);
    $$('.price-card').forEach(card => {
      const name = card.dataset.plan;
      if (!name) return;
      const btn = $('.plan-btn', card);
      if (!btn) return;
      if (sub && sub.plan === name && isSignedIn()) {
        card.classList.add('subscribed');
        btn.textContent = 'Current plan';
      } else {
        card.classList.remove('subscribed');
        if (name === 'Starter') btn.textContent = 'Get started free';
        else if (name === 'Pro') btn.textContent = 'Start free trial';
        else if (name === 'Team') btn.textContent = 'Choose Team';
      }
    });
  }

  const signinForm = $('#signinForm');
  if (signinForm) {
    const note = $('#signinNote');

    signinForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailInput = $('#si-email');
      const passwordInput = $('#si-password');
      let ok = true;

      if (!EMAIL_RE.test(emailInput.value.trim())) { setFieldError(emailInput, 'Enter a valid email address.'); ok = false; }
      else setFieldError(emailInput, '');
      if (passwordInput.value.length < 8) { setFieldError(passwordInput, 'Use at least 8 characters.'); ok = false; }
      else setFieldError(passwordInput, '');

      if (!ok) {
        note.textContent = 'Fix the highlighted fields.';
        note.className = 'form-note error';
        return;
      }

      const email = emailInput.value.trim().toLowerCase();
      const password = passwordInput.value;
      const users = readJSON(STORAGE.users, {});
      const user = users[email];

      if (!user) {
        note.textContent = 'No account with that email. Redirecting to signup…';
        note.className = 'form-note error';
        setTimeout(() => {
          window.location.href = `signup.html?email=${encodeURIComponent(email)}&redirect=${encodeURIComponent(safeRedirectTarget('index.html'))}`;
        }, 900);
        return;
      }
      if (user.hash !== simpleHash(password)) {
        note.textContent = 'That password doesn\u2019t match. Try again.';
        note.className = 'form-note error';
        return;
      }

      writeJSON(STORAGE.session, { email, at: Date.now() });
      note.textContent = `Signed in as ${user.name}. Redirecting…`;
      note.className = 'form-note success';

      setTimeout(() => {
        window.location.href = safeRedirectTarget('index.html');
      }, 500);
    });

    const demoBtn = $('#useDemoAccount');
    if (demoBtn) {
      demoBtn.addEventListener('click', () => {
        $('#si-email').value = 'demo@kernwise.app';
        $('#si-password').value = 'demo1234';
        setFieldError($('#si-email'), '');
        setFieldError($('#si-password'), '');
        showToast('Demo credentials filled. Hit Sign in.');
      });
    }
  }

  const signupForm = $('#signupForm');
  if (signupForm) {
    const note = $('#signupNote');

    const params = new URLSearchParams(window.location.search);
    const prefillEmail = params.get('email');
    if (prefillEmail && $('#su-email')) $('#su-email').value = prefillEmail;

    signupForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('#su-name');
      const emailInput = $('#su-email');
      const passwordInput = $('#su-password');
      let ok = true;

      if (nameInput.value.trim().length < 2) { setFieldError(nameInput, 'Please enter your name.'); ok = false; }
      else setFieldError(nameInput, '');
      if (!EMAIL_RE.test(emailInput.value.trim())) { setFieldError(emailInput, 'Enter a valid email address.'); ok = false; }
      else setFieldError(emailInput, '');
      if (passwordInput.value.length < 8) { setFieldError(passwordInput, 'Use at least 8 characters.'); ok = false; }
      else setFieldError(passwordInput, '');

      if (!ok) {
        note.textContent = 'Fix the highlighted fields.';
        note.className = 'form-note error';
        return;
      }

      const email = emailInput.value.trim().toLowerCase();
      const name = nameInput.value.trim();
      const password = passwordInput.value;

      const users = readJSON(STORAGE.users, {});
      if (users[email]) {
        note.textContent = 'That email already has an account. Try signing in instead.';
        note.className = 'form-note error';
        return;
      }

      users[email] = { name, hash: simpleHash(password), created: Date.now() };
      writeJSON(STORAGE.users, users);
      writeJSON(STORAGE.session, { email, at: Date.now() });

      note.textContent = `Welcome, ${name}. Redirecting…`;
      note.className = 'form-note success';

      setTimeout(() => {
        window.location.href = safeRedirectTarget('index.html');
      }, 600);
    });
  }

  const checkoutSummary = $('#checkoutPlan');
  if (checkoutSummary) {
    const params = new URLSearchParams(window.location.search);
    const urlPlan = params.get('plan');
    const pending = getPending();
    const planName = (urlPlan && PLAN_DATA[urlPlan]) ? urlPlan : pending.plan;
    const billing = pending.billing;

    if (!planName || !PLAN_DATA[planName]) {
      $('#checkoutSub').textContent = 'No plan selected.';
      $('#checkoutPlan').textContent = '—';
      $('#checkoutBilling').textContent = '—';
      $('#checkoutPrice').textContent = '—';
      $('#checkoutNeedSignin').classList.add('hidden');
      $('#checkoutConfirm').classList.add('hidden');
      $('#checkoutNote').textContent = 'Go back to pricing and pick a plan.';
      $('#checkoutNote').className = 'form-note error';
    } else {
      const data = PLAN_DATA[planName];
      const priceLabel = billing === 'yearly'
        ? (data.yr === 0 ? 'Free' : `${data.labelYr} / mo billed yearly`)
        : (data.mo === 0 ? 'Free' : `${data.labelMo} / mo`);

      $('#checkoutPlan').textContent = planName;
      $('#checkoutBilling').textContent = billing === 'yearly' ? 'Yearly (20% off)' : 'Monthly';
      $('#checkoutPrice').textContent = priceLabel;
      $('#checkoutSub').textContent = planName === 'Starter'
        ? 'Starter is free — confirm to activate.'
        : `Review and activate your ${planName} subscription.`;

      const session = getSession();
      const accountEl = $('#checkoutAccount');
      if (session && session.email) {
        accountEl.textContent = session.email;
        $('#checkoutNeedSignin').classList.add('hidden');
        $('#checkoutConfirm').classList.remove('hidden');
      } else {
        accountEl.textContent = 'Not signed in';
        $('#checkoutNeedSignin').classList.remove('hidden');
        $('#checkoutConfirm').classList.add('hidden');
        const signinLink = $('a[href^="signin.html"]', $('#checkoutNeedSignin'));
        const signupLink = $('a[href^="signup.html"]', $('#checkoutNeedSignin'));
        if (signinLink) signinLink.href = 'signin.html?redirect=checkout';
        if (signupLink) signupLink.href = 'signup.html?redirect=checkout';
      }

      const confirmBtn = $('#confirmCheckout');
      if (confirmBtn) {
        confirmBtn.addEventListener('click', () => {
          const s = getSession();
          if (!s || !s.email) return;

          writeJSON(STORAGE.subscription, {
            email: s.email,
            plan: planName,
            billing,
            price: billing === 'yearly' ? data.yr : data.mo,
            startedAt: Date.now()
          });

          clearPending();

          $('#checkoutNote').textContent = planName === 'Starter'
            ? 'Starter activated. Redirecting…'
            : `${planName} activated (${billing}). Redirecting…`;
          $('#checkoutNote').className = 'form-note success';
          confirmBtn.disabled = true;

          setTimeout(() => {
            window.location.href = 'index.html#pricing';
          }, 900);
        });
      }
    }
  }

  const faqTriggers = $$('.faq-trigger');
  faqTriggers.forEach(trigger => {
    trigger.addEventListener('click', () => {
      const expanded = trigger.getAttribute('aria-expanded') === 'true';
      const body = trigger.nextElementSibling;
      faqTriggers.forEach(t => {
        if (t !== trigger) {
          t.setAttribute('aria-expanded', 'false');
          t.nextElementSibling.style.maxHeight = null;
          t.nextElementSibling.classList.remove('open');
        }
      });
      if (expanded) {
        trigger.setAttribute('aria-expanded', 'false');
        body.style.maxHeight = null;
        body.classList.remove('open');
      } else {
        trigger.setAttribute('aria-expanded', 'true');
        body.style.maxHeight = body.scrollHeight + 'px';
        body.classList.add('open');
      }
    });
  });

  const ptabs = $$('.ptab');
  const panes = $$('.pane');
  ptabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.dataset.pane;
      ptabs.forEach(t => {
        t.classList.remove('active');
        t.setAttribute('aria-selected', 'false');
      });
      tab.classList.add('active');
      tab.setAttribute('aria-selected', 'true');
      panes.forEach(p => p.classList.remove('active'));
      const pane = $('#pane-' + target);
      if (pane) pane.classList.add('active');
    });
  });

  $$('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (!target) return;
      e.preventDefault();
      const headerOffset = 72;
      const offset = target.getBoundingClientRect().top + window.pageYOffset - headerOffset;
      window.scrollTo({ top: offset, behavior: 'smooth' });
    });
  });

  const contactForm = $('#contactForm');
  if (contactForm) {
    const note = $('#contactNote');
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('#cf-name');
      const emailInput = $('#cf-email');
      const messageInput = $('#cf-message');
      let ok = true;

      if (nameInput.value.trim().length < 2) { setFieldError(nameInput, 'Please enter your name.'); ok = false; }
      else setFieldError(nameInput, '');
      if (!EMAIL_RE.test(emailInput.value.trim())) { setFieldError(emailInput, 'Enter a valid email address.'); ok = false; }
      else setFieldError(emailInput, '');
      if (messageInput.value.trim().length < 10) { setFieldError(messageInput, 'Please add a bit more detail (10+ characters).'); ok = false; }
      else setFieldError(messageInput, '');

      if (!ok) {
        note.textContent = 'Fix the highlighted fields and try again.';
        note.className = 'form-note error';
        return;
      }

      const btn = contactForm.querySelector('.contact-submit');
      btn.disabled = true;
      btn.textContent = 'Sending…';

      setTimeout(() => {
        const messages = readJSON(STORAGE.messages, []);
        messages.push({
          name: nameInput.value.trim(),
          email: emailInput.value.trim().toLowerCase(),
          message: messageInput.value.trim(),
          at: Date.now()
        });
        writeJSON(STORAGE.messages, messages);

        contactForm.reset();
        btn.disabled = false;
        btn.textContent = 'Send message';
        note.textContent = 'Message sent. We\u2019ll reply within one business day.';
        note.className = 'form-note success';
        showToast('Message sent.');
      }, 500);
    });
  }

  const newsletterForm = $('#newsletterForm');
  if (newsletterForm) {
    const note = $('#newsletterNote');
    const nlEmail = $('#nl-email');
    newsletterForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (!EMAIL_RE.test(nlEmail.value.trim())) {
        nlEmail.classList.add('invalid');
        note.textContent = 'Enter a valid email.';
        note.className = 'form-note error';
        return;
      }
      nlEmail.classList.remove('invalid');
      const email = nlEmail.value.trim().toLowerCase();
      const subs = readJSON(STORAGE.subscribers, []);
      if (!subs.includes(email)) {
        subs.push(email);
        writeJSON(STORAGE.subscribers, subs);
      }
      nlEmail.value = '';
      note.textContent = 'Subscribed. See you in the next issue.';
      note.className = 'form-note success';
      showToast('Subscribed to the newsletter.');
    });
  }

  renderSession();
  updatePrices();
  renderSubscriptionHighlight();

})();