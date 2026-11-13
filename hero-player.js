(() => {
  'use strict';
  const frameTarget = document.getElementById('hero-youtube-frame');
  const film = document.querySelector('.training-film');
  const toggle = document.getElementById('motion-toggle');
  if (!frameTarget || !film || !toggle) return;

  const poster = film.querySelector('.hero-player-poster');
  const playPrompt = document.getElementById('hero-play-prompt');
  const fallback = film.querySelector('.hero-player-fallback');
  const label = toggle.querySelector('[data-motion-label]');
  const icon = toggle.querySelector('[data-motion-icon]');
  const status = document.querySelector('[data-video-status]');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const connection = navigator.connection;
  const clipStart = 2;
  const clipEnd = 18;
  let wantsPlayback = !reducedMotion.matches && !connection?.saveData;
  let inView = film.getBoundingClientRect().bottom > 0 && film.getBoundingClientRect().top < window.innerHeight;
  let player;
  let ready = false;
  let loading = false;
  let failed = false;
  let hasPlayed = false;
  let nativeState = -1;
  let pendingPlay = false;
  let expectedPause = false;
  let pauseTimer;
  let loopTimer;
  let playTimer;
  let readyTimer;
  let apiPromise;
  let introAnimations = [];

  const eligible = () => wantsPlayback && inView && !document.hidden && !failed;
  const playing = () => nativeState === 1;

  function updateControls() {
    const active = eligible() && (loading || pendingPlay || playing() || nativeState === 3);
    label.textContent = failed ? 'Video unavailable' : active ? 'Pause footage' : hasPlayed ? 'Resume footage' : 'Play footage';
    icon.textContent = failed ? '—' : active ? 'Ⅱ' : '▷';
    toggle.disabled = failed;
    toggle.setAttribute('aria-label', failed ? 'Video unavailable; use the YouTube source link' : active ? 'Pause training footage and intro' : 'Play training footage');
    if (playPrompt) playPrompt.hidden = ready || active || failed;
    if (poster) poster.hidden = hasPlayed && !failed;
    if (fallback) fallback.hidden = !failed;
    film.classList.toggle('is-playing', eligible() && playing());
    film.classList.toggle('is-loading', active && (loading || pendingPlay));
    film.classList.toggle('is-player-ready', ready && !failed);
    film.querySelector('.hero-player-stage')?.classList.toggle('is-ready', ready && !failed);
    film.classList.toggle('is-video-unavailable', failed);
    if (status) status.textContent = failed ? 'Video unavailable · watch the source below'
      : active && (loading || pendingPlay) ? 'Loading padwork footage…'
      : active ? 'Padwork · Superbon × Trainer Gae'
      : reducedMotion.matches ? 'Motion paused · play to watch'
      : connection?.saveData ? 'Data saver on · play to watch'
      : 'Padwork · Superbon × Trainer Gae';
  }

  function stopLoop() {
    window.clearTimeout(loopTimer);
    loopTimer = undefined;
  }

  function finishIntro() {
    introAnimations.forEach(animation => animation.cancel());
    introAnimations = [];
  }

  function failPlayback() {
    if (failed) return;
    failed = true;
    wantsPlayback = false;
    loading = false;
    pendingPlay = false;
    stopLoop();
    window.clearTimeout(playTimer);
    window.clearTimeout(readyTimer);
    window.clearTimeout(pauseTimer);
    finishIntro();
    try {
      player?.stopVideo();
      if (player) player.getIframe().hidden = true;
    } catch (_) { /* Keep the still preview available. */ }
    updateControls();
  }

  function keepClipLooping() {
    stopLoop();
    if (!ready || !eligible() || !playing()) return;
    try {
      if (player.getCurrentTime() >= clipEnd - 0.2) player.seekTo(clipStart, true);
    } catch (_) {
      failPlayback();
      return;
    }
    loopTimer = window.setTimeout(keepClipLooping, 250);
  }

  function pausePlayer() {
    stopLoop();
    window.clearTimeout(playTimer);
    const playbackWasRequested = pendingPlay;
    pendingPlay = false;
    if (ready && (playbackWasRequested || nativeState === 1 || nativeState === 3)) {
      expectedPause = true;
      window.clearTimeout(pauseTimer);
      pauseTimer = window.setTimeout(() => { expectedPause = false; }, 1500);
      try { player.pauseVideo(); } catch (_) { failPlayback(); }
    }
    updateControls();
  }

  function requestPlayback() {
    if (!ready || !eligible()) return;
    if (playing() || pendingPlay) {
      updateControls();
      return;
    }
    pendingPlay = true;
    try {
      const time = player.getCurrentTime();
      if (time < clipStart || time >= clipEnd - 0.2) player.seekTo(clipStart, true);
      player.playVideo();
    } catch (_) {
      failPlayback();
      return;
    }
    window.clearTimeout(playTimer);
    playTimer = window.setTimeout(() => {
      if (pendingPlay && !playing()) {
        pendingPlay = false;
        wantsPlayback = false;
        finishIntro();
        updateControls();
      }
    }, 6000);
    updateControls();
  }

  function loadYouTubeAPI() {
    if (window.YT?.Player) return Promise.resolve();
    if (apiPromise) return apiPromise;
    apiPromise = new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error('YouTube API unavailable')), 12000);
      const previousReady = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        window.clearTimeout(timeout);
        try { if (typeof previousReady === 'function') previousReady(); } finally { resolve(); }
      };
      let script = document.querySelector('script[src="https://www.youtube.com/iframe_api"]');
      if (!script) {
        script = document.createElement('script');
        script.src = 'https://www.youtube.com/iframe_api';
        script.async = true;
        document.head.appendChild(script);
      }
      script.addEventListener('error', () => {
        window.clearTimeout(timeout);
        reject(new Error('YouTube API blocked'));
      }, { once: true });
    });
    return apiPromise;
  }

  function onPlayerState(event) {
    nativeState = event.data;
    if (nativeState === 1) {
      pendingPlay = false;
      window.clearTimeout(playTimer);
      // A native Play click is new user intent; a late commanded play is not.
      if (!wantsPlayback && !expectedPause && inView && !document.hidden) wantsPlayback = true;
      if (!eligible()) {
        pausePlayer();
        return;
      }
      expectedPause = false;
      window.clearTimeout(pauseTimer);
      hasPlayed = true;
      keepClipLooping();
    } else {
      stopLoop();
      if (nativeState === 2) {
        pendingPlay = false;
        window.clearTimeout(playTimer);
        if (!expectedPause && inView && !document.hidden) wantsPlayback = false;
        expectedPause = false;
        window.clearTimeout(pauseTimer);
        // A delayed visibility pause may arrive after the hero becomes visible again.
        if (eligible()) requestPlayback();
      } else if (nativeState === 0 && eligible()) {
        pendingPlay = false;
        requestPlayback();
      }
    }
    updateControls();
  }

  function createPlayer() {
    if (player || failed) return;
    readyTimer = window.setTimeout(failPlayback, 12000);
    player = new window.YT.Player('hero-youtube-frame', {
      host: 'https://www.youtube-nocookie.com',
      width: '100%',
      height: '100%',
      videoId: 'okmCnW489pg',
      playerVars: {
        autoplay: 0, controls: 1, playsinline: 1, mute: 1,
        start: clipStart, end: clipEnd, rel: 0,
        origin: window.location.origin
      },
      events: {
        onReady: () => {
          window.clearTimeout(readyTimer);
          ready = true;
          loading = false;
          const iframe = player.getIframe();
          iframe.title = 'Superbon training on pads with Trainer Gae — YouTube';
          player.mute();
          if (eligible()) requestPlayback();
          else pausePlayer();
          updateControls();
        },
        onStateChange: onPlayerState,
        onError: failPlayback,
        onAutoplayBlocked: () => {
          pendingPlay = false;
          wantsPlayback = false;
          window.clearTimeout(playTimer);
          finishIntro();
          updateControls();
        }
      }
    });
  }

  function syncPlayback() {
    if (!eligible()) {
      pausePlayer();
      return;
    }
    if (ready) {
      requestPlayback();
      return;
    }
    if (loading) {
      updateControls();
      return;
    }
    loading = true;
    updateControls();
    loadYouTubeAPI().then(() => {
      if (failed) return;
      if (eligible()) createPlayer();
      else loading = false;
      updateControls();
    }).catch(failPlayback);
  }

  function playFromButton() {
    if (failed) return;
    wantsPlayback = true;
    introAnimations.forEach(animation => animation.play());
    syncPlayback();
  }
  toggle.addEventListener('click', () => {
    if (failed) return;
    if (eligible() && (loading || pendingPlay || playing() || nativeState === 3)) {
      wantsPlayback = false;
      introAnimations.forEach(animation => animation.pause());
      pausePlayer();
    } else playFromButton();
  });
  playPrompt?.addEventListener('click', playFromButton);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) finishIntro();
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
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => {
      inView = entries[0].isIntersecting;
      if (!inView) finishIntro();
      syncPlayback();
    }, { threshold: 0 }).observe(film);
  }

  if (wantsPlayback && Element.prototype.animate) {
    const animate = (element, keyframes, delay = 0) => {
      if (element) introAnimations.push(element.animate(keyframes, {
        duration: 800, delay, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'both'
      }));
    };
    document.querySelectorAll('[data-hero-word]').forEach((word, index) => {
      animate(word, [{ transform: 'translateY(106%)' }, { transform: 'translateY(0)' }], 70 + index * 130);
    });
    animate(film, [{ opacity: 0, transform: 'translateY(18px)' }, { opacity: 1, transform: 'translateY(0)' }], 100);
    animate(document.querySelector('.film-title'), [{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }], 400);
    animate(document.querySelector('.film-chip'), [{ opacity: 0 }, { opacity: 1 }], 600);
    Promise.all(introAnimations.map(animation => animation.finished.catch(() => null))).then(finishIntro);
  }
  syncPlayback();
})();
