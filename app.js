(() => {
  'use strict';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const mobileViewport = window.matchMedia('(max-width: 760px)');
  const menuButton = document.querySelector('.menu-toggle');
  const menu = document.getElementById('main-nav');

  function closeMenu(returnFocus = false) {
    menu.classList.remove('is-open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.querySelector('[data-menu-label]').textContent = 'Menu';
    if (returnFocus) menuButton.focus();
  }
  menuButton.addEventListener('click', () => {
    const open = menuButton.getAttribute('aria-expanded') !== 'true';
    menu.classList.toggle('is-open', open);
    menuButton.setAttribute('aria-expanded', String(open));
    menuButton.querySelector('[data-menu-label]').textContent = open ? 'Close' : 'Menu';
  });
  menu.querySelectorAll('a').forEach(link => link.addEventListener('click', () => closeMenu()));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu.classList.contains('is-open')) closeMenu(true);
  });
  document.addEventListener('click', event => {
    if (!menu.contains(event.target) && !menuButton.contains(event.target)) closeMenu();
  });
  mobileViewport.addEventListener('change', () => closeMenu());

  const motionButton = document.getElementById('motion-toggle');
  const motionLabel = motionButton.querySelector('[data-motion-label]');
  const motionIcon = motionButton.querySelector('[data-motion-icon]');
  let heroAnimations = [];
  let animationRun = 0;
  let animationState = 'finished';

  function setMotionState(state) {
    animationState = state;
    const settings = {
      playing: ['Pause intro', 'Ⅱ', 'Pause hero animation'],
      paused: ['Resume intro', '▷', 'Resume hero animation'],
      finished: ['Replay intro', '↻', 'Replay hero animation'],
      reduced: ['Motion off', '—', 'Animation disabled by your reduced-motion preference']
    }[state];
    motionLabel.textContent = settings[0];
    motionIcon.textContent = settings[1];
    motionButton.setAttribute('aria-label', settings[2]);
    motionButton.disabled = state === 'reduced';
  }

  function playHero() {
    const thisRun = ++animationRun;
    heroAnimations.forEach(animation => animation.cancel());
    heroAnimations = [];
    if (reducedMotion.matches || !Element.prototype.animate) {
      setMotionState('reduced');
      return;
    }
    const add = (element, keyframes, duration, delay = 0) => {
      const animation = element.animate(keyframes, {
        duration, delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both'
      });
      heroAnimations.push(animation);
    };
    document.querySelectorAll('[data-hero-word]').forEach((word, index) => {
      add(word, [{ transform: 'translateY(106%)' }, { transform: 'translateY(0)' }], 720, 70 + index * 130);
    });
    add(document.querySelector('.ring-art'), [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], 1080, 80);
    document.querySelectorAll('.rope').forEach((rope, index) => {
      add(rope, [{ transform: 'rotate(-17deg) scaleX(0)' }, { transform: 'rotate(-17deg) scaleX(1)' }], 1050, 450 + index * 120);
    });
    add(document.querySelector('.art-title'), [{ opacity: 0, transform: 'translateY(15px)' }, { opacity: 1, transform: 'translateY(0)' }], 750, 450);
    add(document.querySelector('.one-to-one'), [{ opacity: 0, transform: 'translateY(35px)' }, { opacity: 1, transform: 'translateY(0)' }], 1000, 850);
    setMotionState('playing');
    Promise.all(heroAnimations.map(animation => animation.finished.catch(() => null))).then(() => {
      if (thisRun === animationRun && !reducedMotion.matches) {
        setMotionState('finished');
        heroAnimations.forEach(animation => animation.cancel());
        heroAnimations = [];
      }
    });
  }

  motionButton.addEventListener('click', () => {
    if (animationState === 'playing') {
      heroAnimations.forEach(animation => animation.pause());
      setMotionState('paused');
    } else if (animationState === 'paused') {
      heroAnimations.forEach(animation => animation.play());
      setMotionState('playing');
    } else playHero();
  });
  reducedMotion.addEventListener('change', () => {
    ++animationRun;
    heroAnimations.forEach(animation => animation.cancel());
    heroAnimations = [];
    setMotionState(reducedMotion.matches ? 'reduced' : 'finished');
  });
  playHero();

  const trainingContent = {
    foundations: {
      count: '01 / 03', stamp: 'START\nSTRONG.', title: 'Build from the ground up.',
      copy: 'Stance, guard, balance and footwork. Get familiar with the building blocks, then bring them together through focused practice and feedback.',
      tags: ['Stance & balance', 'Guard & footwork', 'Basic strikes']
    },
    technique: {
      count: '02 / 03', stamp: 'FIND\nYOUR EDGE.', title: 'Make the details count.',
      copy: 'Give your technique some undivided attention. Explore timing, distance and combinations with focused feedback on the things you want to improve.',
      tags: ['Timing & distance', 'Combinations', 'Technical feedback']
    },
    conditioning: {
      count: '03 / 03', stamp: 'MOVE\nFORWARD.', title: 'Give your effort a direction.',
      copy: 'Bring movement, striking practice and conditioning together. Talk through your current level and build a training focus around consistency and your personal goals.',
      tags: ['Striking practice', 'Movement', 'Consistency']
    }
  };
  const goalButtons = [...document.querySelectorAll('[data-goal]')];
  const goalPanel = document.getElementById('goal-panel');
  const focusStamp = document.querySelector('[data-focus-stamp]');
  function selectGoal(button, moveFocus = false) {
    const content = trainingContent[button.dataset.goal];
    goalButtons.forEach(other => {
      const selected = other === button;
      other.classList.toggle('active', selected);
      other.setAttribute('aria-selected', String(selected));
      other.tabIndex = selected ? 0 : -1;
    });
    goalPanel.setAttribute('aria-labelledby', button.id);
    document.querySelector('[data-focus-count]').textContent = content.count;
    focusStamp.textContent = content.stamp;
    document.querySelector('[data-focus-title]').textContent = content.title;
    document.querySelector('[data-focus-copy]').textContent = content.copy;
    const tags = document.querySelector('[data-focus-tags]');
    tags.replaceChildren(...content.tags.map(text => {
      const tag = document.createElement('span'); tag.textContent = text; return tag;
    }));
    if (!reducedMotion.matches && Element.prototype.animate) {
      focusStamp.animate([{ opacity: .2, transform: 'translateY(12px) rotate(-7deg)' }, { opacity: 1, transform: 'translateY(0) rotate(-7deg)' }], { duration: 330, easing: 'ease-out' });
    }
    if (moveFocus) button.focus();
  }
  goalButtons.forEach((button, index) => {
    button.addEventListener('click', () => selectGoal(button));
    button.addEventListener('keydown', event => {
      let target = index;
      if (event.key === 'ArrowDown' || event.key === 'ArrowRight') target = (index + 1) % goalButtons.length;
      else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') target = (index - 1 + goalButtons.length) % goalButtons.length;
      else if (event.key === 'Home') target = 0;
      else if (event.key === 'End') target = goalButtons.length - 1;
      else return;
      event.preventDefault(); selectGoal(goalButtons[target], true);
    });
  });

  if ('IntersectionObserver' in window) {
    const reveals = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        if (!reducedMotion.matches && Element.prototype.animate) {
          entry.target.animate([{ opacity: .3, transform: 'translateY(22px)' }, { opacity: 1, transform: 'translateY(0)' }], { duration: 620, easing: 'cubic-bezier(.16,1,.3,1)' });
        }
        reveals.unobserve(entry.target);
      });
    }, { threshold: .12 });
    document.querySelectorAll('[data-reveal]').forEach(section => reveals.observe(section));

    const stickyRequest = document.querySelector('.mobile-session-cta');
    let heroVisible = true;
    let requestVisible = false;
    const visibility = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.target.classList.contains('hero')) heroVisible = entry.isIntersecting;
        if (entry.target.id === 'request') requestVisible = entry.isIntersecting;
      });
      stickyRequest.classList.toggle('is-visible', !heroVisible && !requestVisible);
    }, { threshold: 0 });
    visibility.observe(document.querySelector('.hero'));
    visibility.observe(document.getElementById('request'));
  }

  const form = document.getElementById('session-form');
  const review = document.getElementById('request-review');
  const reviewStatus = document.getElementById('review-status');
  const emailDraft = document.getElementById('email-draft');
  const copyFallback = document.getElementById('copy-fallback');
  let emailBody = '';
  const contactEmail = 'contact@muaythaiarmyinc.com';
  form.querySelectorAll('input,textarea').forEach(field => field.addEventListener('input', () => field.setCustomValidity('')));
  form.addEventListener('submit', event => {
    event.preventDefault();
    for (const fieldName of ['name', 'email', 'goal']) {
      const field = form.elements.namedItem(fieldName);
      if (!field.value.trim()) {
        field.setCustomValidity('Please add this detail before continuing.');
        field.reportValidity(); return;
      }
    }
    if (!form.reportValidity()) return;
    const data = Object.fromEntries([...new FormData(form).entries()].map(([key, value]) => [key, String(value).trim()]));
    data.availability ||= 'Flexible / to discuss';
    document.querySelectorAll('[data-review]').forEach(element => { element.textContent = data[element.dataset.review]; });
    emailBody = `Hello Muay Thai Army,\n\nI'd like to discuss private Muay Thai training in Toronto.\n\nName: ${data.name}\nEmail: ${data.email}\nExperience: ${data.experience}\n\nWhat I'd like to work on:\n${data.goal}\n\nPreferred times: ${data.availability}\n\nPlease let me know the available coach, Toronto location, session length, rate and next steps.\n\nThank you,\n${data.name}`;
    emailDraft.href = `mailto:${contactEmail}?subject=${encodeURIComponent('Toronto private training — session request')}&body=${encodeURIComponent(emailBody)}`;
    form.hidden = true;
    review.hidden = false;
    copyFallback.hidden = true;
    reviewStatus.textContent = 'Nothing has been sent yet.';
    document.getElementById('review-title').focus({ preventScroll: true });
    review.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
  });
  form.querySelector('button[type="submit"]').disabled = false;
  document.getElementById('edit-request').addEventListener('click', () => {
    review.hidden = true; form.hidden = false; document.getElementById('full-name').focus({ preventScroll: true });
    form.scrollIntoView({ behavior: reducedMotion.matches ? 'auto' : 'smooth', block: 'start' });
  });
  emailDraft.addEventListener('click', () => {
    reviewStatus.textContent = 'Send the draft in your email app to complete your request. If no app opens, copy your request and email it to contact@muaythaiarmyinc.com.';
  });
  document.getElementById('copy-request').addEventListener('click', async () => {
    const text = `To: ${contactEmail}\nSubject: Toronto private training — session request\n\n${emailBody}`;
    try {
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(text);
      reviewStatus.textContent = 'Request copied. Paste it into an email to contact@muaythaiarmyinc.com and send when you’re ready.';
    } catch {
      copyFallback.hidden = false;
      const textarea = copyFallback.querySelector('textarea');
      textarea.value = text; textarea.focus(); textarea.select();
      reviewStatus.textContent = 'Select and copy the request below, then paste it into your email app.';
    }
  });
})();
