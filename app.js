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
  const heroVideo = document.getElementById('hero-video');

  if (motionButton && heroVideo) {
    const motionLabel = motionButton.querySelector('[data-motion-label]');
    const motionIcon = motionButton.querySelector('[data-motion-icon]');
    const film = document.querySelector('.training-film');
    const videoStatus = document.querySelector('[data-video-status]');
    const connection = navigator.connection;
    let wantsPlayback = !reducedMotion.matches && !connection?.saveData;
    let videoVisible = true;
    let pendingPlay = false;
    let playbackRun = 0;
    let sourceLoaded = false;
    let hasPlayed = false;
    let videoFailed = false;
    let heroAnimations = [];
    let introRun = 0;

    function mayPlay() {
      return wantsPlayback && videoVisible && !document.hidden && !videoFailed;
    }

    function updateMotionControl() {
      const active = mayPlay() && (pendingPlay || !heroVideo.paused);
      motionLabel.textContent = videoFailed ? 'Still preview' : active ? 'Pause footage' : hasPlayed ? 'Resume footage' : 'Play footage';
      motionIcon.textContent = videoFailed ? '—' : active ? 'Ⅱ' : '▷';
      motionButton.disabled = videoFailed;
      motionButton.setAttribute('aria-label', videoFailed ? 'Training footage unavailable; still preview shown' : active ? 'Pause training footage and intro' : 'Play training footage');
      film?.classList.toggle('is-playing', active && !pendingPlay);
      film?.classList.toggle('is-video-unavailable', videoFailed);
      if (videoStatus) {
        videoStatus.textContent = videoFailed ? 'Training footage unavailable. Still preview shown.'
          : active ? (pendingPlay ? 'Loading training footage…' : 'Training film · sound off')
          : reducedMotion.matches ? 'Motion paused · play to watch'
          : connection?.saveData ? 'Data saver on · play to watch'
          : 'Training film · sound off';
      }
    }

    function finishIntro() {
      ++introRun;
      heroAnimations.forEach(animation => animation.cancel());
      heroAnimations = [];
    }

    function playIntro() {
      if (reducedMotion.matches || connection?.saveData || !Element.prototype.animate) return;
      const thisRun = ++introRun;
      const add = (element, frames, duration, delay = 0) => {
        if (!element) return;
        heroAnimations.push(element.animate(frames, {
          duration, delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both'
        }));
      };
      document.querySelectorAll('[data-hero-word]').forEach((word, index) => {
        add(word, [{ transform: 'translateY(106%)' }, { transform: 'translateY(0)' }], 720, 70 + index * 130);
      });
      add(film, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], 900, 100);
      add(document.querySelector('.film-title'), [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], 700, 400);
      add(document.querySelector('.film-chip'), [{ opacity: 0 }, { opacity: 1 }], 600, 600);
      Promise.all(heroAnimations.map(animation => animation.finished.catch(() => null))).then(() => {
        if (thisRun === introRun) finishIntro();
      });
    }

    function pausePlayback() {
      ++playbackRun;
      pendingPlay = false;
      heroVideo.pause();
      updateMotionControl();
    }

    function syncPlayback() {
      if (!mayPlay()) {
        pausePlayback();
        return;
      }
      if (pendingPlay || !heroVideo.paused) {
        updateMotionControl();
        return;
      }
      if (!sourceLoaded) {
        heroVideo.querySelectorAll('source[data-src]').forEach(source => {
          source.src = source.dataset.src;
        });
        if (heroVideo.dataset.src) heroVideo.src = heroVideo.dataset.src;
        sourceLoaded = true;
        heroVideo.load();
      }
      heroVideo.muted = true;
      heroVideo.defaultMuted = true;
      heroVideo.playsInline = true;
      const thisRun = ++playbackRun;
      pendingPlay = true;
      updateMotionControl();
      let playback;
      try {
        playback = heroVideo.play();
      } catch (error) {
        playback = Promise.reject(error);
      }
      Promise.resolve(playback).then(() => {
        if (thisRun !== playbackRun) {
          if (!mayPlay()) heroVideo.pause();
          return;
        }
        pendingPlay = false;
        if (!mayPlay()) {
          heroVideo.pause();
        } else {
          hasPlayed = true;
        }
        updateMotionControl();
      }).catch(() => {
        if (thisRun !== playbackRun) return;
        pendingPlay = false;
        wantsPlayback = false;
        finishIntro();
        updateMotionControl();
      });
    }

    function showStillPreview() {
      // Empty, deliberately deferred media can emit an error before loading begins.
      if (videoFailed || !sourceLoaded) return;
      videoFailed = true;
      wantsPlayback = false;
      pausePlayback();
      finishIntro();
      // Reset a failed stream to its poster, including failures after playback began.
      heroVideo.removeAttribute('src');
      heroVideo.querySelectorAll('source').forEach(source => source.removeAttribute('src'));
      heroVideo.load();
      updateMotionControl();
    }

    heroVideo.addEventListener('error', showStillPreview);
    heroVideo.querySelectorAll('source').forEach(source => source.addEventListener('error', showStillPreview));
    heroVideo.addEventListener('playing', () => {
      if (!mayPlay()) {
        heroVideo.pause();
        return;
      }
      hasPlayed = true;
      pendingPlay = false;
      updateMotionControl();
    });
    heroVideo.addEventListener('pause', updateMotionControl);
    motionButton.addEventListener('click', () => {
      if (videoFailed) return;
      const active = mayPlay() && (pendingPlay || !heroVideo.paused);
      wantsPlayback = !active;
      if (wantsPlayback) {
        heroAnimations.forEach(animation => animation.play());
      } else {
        heroAnimations.forEach(animation => animation.pause());
      }
      syncPlayback();
    });
    reducedMotion.addEventListener('change', () => {
      finishIntro();
      if (reducedMotion.matches) wantsPlayback = false;
      syncPlayback();
    });
    connection?.addEventListener?.('change', () => {
      if (connection.saveData) {
        wantsPlayback = false;
        finishIntro();
      }
      syncPlayback();
    });
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) finishIntro();
      syncPlayback();
    });
    playIntro();
    if ('IntersectionObserver' in window) {
      const bounds = (film || heroVideo).getBoundingClientRect();
      videoVisible = bounds.bottom > 0 && bounds.top < window.innerHeight;
      const filmObserver = new IntersectionObserver(entries => {
        videoVisible = entries[0].isIntersecting;
        if (!videoVisible) finishIntro();
        syncPlayback();
      }, { threshold: 0 });
      filmObserver.observe(film || heroVideo);
    }
    syncPlayback();
  }

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
