/* Qin Man portfolio — no dependencies, no background network requests to Feishu. */
(() => {
  'use strict';
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const root = document.documentElement;
  root.classList.add('js');
  const films = window.PORTFOLIO_FILMS;
  const reducedQuery = matchMedia('(prefers-reduced-motion: reduce)');
  const mobileQuery = matchMedia('(max-width:760px)');
  const clamp = (value) => Math.min(1, Math.max(0, value));
  const archive = 'https://vcn2kkcx4mq9.feishu.cn/wiki/Y9yRwKrlWitLOvkXZXhcXowSn4d';
  let motionEnabled = !reducedQuery.matches;
  let savedMotion = null;
  try { savedMotion = localStorage.getItem('qinman-motion'); } catch (_) { /* Storage can be unavailable in private/file contexts. */ }
  if (savedMotion !== null) motionEnabled = savedMotion === 'on' && !reducedQuery.matches;
  const behavior = () => motionEnabled && !reducedQuery.matches ? 'smooth' : 'instant';

  // Keep every work in the HTML so the archive remains usable without JavaScript.
  const library = $('#filmLibrary');
  const viewport = $('#filmViewport');
  const cards = $$('.film-card');
  const filterButtons = $$('[data-filter]');
  const otherCategories = ['转绘剧', '动作影像', '音乐影像', '自媒体', '3D 动画'];
  let shown = [...cards];
  let active = 0;
  let grid = false;
  let reelFrame = 0;
  let announceTimer = 0;

  function paintSelection(index, announce = true) {
    active = Math.max(0, Math.min(shown.length - 1, index));
    cards.forEach(card => card.classList.toggle('is-current', card === shown[active]));
    clearTimeout(announceTimer);
    const updateLabel = () => {
      const film = films[Number(shown[active].dataset.index)];
      const category = filterButtons.find(button => button.getAttribute('aria-pressed') === 'true').dataset.filter;
      $('#reelCategory').textContent = grid ? (category === '全部' ? '全部类型' : category) : film[1];
      $('#currentFilm strong').textContent = film[0];
    };
    if (announce) announceTimer = setTimeout(updateLabel, 120);
    else updateLabel();
    $('#prevFilm').disabled = $('#nextFilm').disabled = shown.length < 2;
  }
  function centerCard(index, smooth = true) {
    if (grid) return;
    const card = shown[index];
    const cardRect = card.getBoundingClientRect();
    const viewportRect = viewport.getBoundingClientRect();
    viewport.scrollTo({ left: viewport.scrollLeft + cardRect.left - viewportRect.left - (viewport.clientWidth - cardRect.width) / 2, behavior: smooth ? behavior() : 'instant' });
  }
  function select(index) {
    index = (index + shown.length) % shown.length;
    paintSelection(index);
    centerCard(index);
  }
  function updateFromScroll() {
    reelFrame = 0;
    if (grid) return;
    const bounds = viewport.getBoundingClientRect();
    const center = bounds.left + viewport.clientWidth / 2;
    let closest = 0;
    let distance = Infinity;
    shown.forEach((card, index) => {
      const rect = card.getBoundingClientRect();
      const delta = Math.abs(rect.left + rect.width / 2 - center);
      if (delta < distance) { closest = index; distance = delta; }
    });
    if (closest !== active) paintSelection(closest);
  }
  viewport.addEventListener('scroll', () => {
    if (!reelFrame) reelFrame = requestAnimationFrame(updateFromScroll);
  }, { passive: true });
  $('#prevFilm').addEventListener('click', () => select(active - 1));
  $('#nextFilm').addEventListener('click', () => select(active + 1));
  viewport.addEventListener('keydown', event => {
    if (grid || event.altKey || event.ctrlKey || event.metaKey) return;
    const actions = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: shown.length - 1 };
    if (event.key in actions) {
      event.preventDefault();
      select(actions[event.key]);
      shown[active].querySelector('a').focus({ preventScroll: true });
    }
  });
  filterButtons.forEach(button => button.addEventListener('click', () => {
    const category = button.dataset.filter;
    filterButtons.forEach(filter => filter.setAttribute('aria-pressed', String(filter === button)));
    cards.forEach(card => { card.hidden = !(category === '全部' || category === card.dataset.category || (category === '其他' && otherCategories.includes(card.dataset.category))); });
    shown = cards.filter(card => !card.hidden);
    paintSelection(0, false);
    requestAnimationFrame(() => centerCard(0, false));
  }));
  function setView(useGrid) {
    grid = useGrid;
    library.classList.toggle('is-grid', grid);
    $('#gridView').setAttribute('aria-pressed', String(grid));
    $('#reelView').setAttribute('aria-pressed', String(!grid));
    viewport.setAttribute('aria-label', grid ? '作品网格' : '作品胶卷，可用左右方向键切换');
    viewport.tabIndex = grid ? -1 : 0;
    $('#browseHint').textContent = grid ? '全部作品，一览即见' : '滑动胶卷，探索作品';
    paintSelection(active, false);
    requestAnimationFrame(() => centerCard(active, false));
  }
  $('#gridView').addEventListener('click', () => setView(true));
  $('#reelView').addEventListener('click', () => setView(false));
  viewport.addEventListener('focusin', event => {
    if (grid) return;
    const card = event.target.closest('.film-card');
    if (card && shown.includes(card)) { paintSelection(shown.indexOf(card)); centerCard(active, false); }
  });

  // Native touch scrolling; add drag support only for a mouse.
  let drag = null;
  let suppressClickUntil = 0;
  viewport.addEventListener('dragstart', event => event.preventDefault());
  viewport.addEventListener('pointerdown', event => {
    if (grid || event.pointerType !== 'mouse' || event.button !== 0) return;
    drag = { id: event.pointerId, x: event.clientX, start: viewport.scrollLeft, moved: false };
  });
  viewport.addEventListener('pointermove', event => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x;
    if (Math.abs(dx) > 6 && !drag.moved) {
      drag.moved = true;
      viewport.setPointerCapture(event.pointerId);
      viewport.classList.add('dragging');
    }
    if (drag.moved) { event.preventDefault(); viewport.scrollLeft = drag.start - dx; }
  });
  function endDrag() {
    if (!drag) return;
    const moved = drag.moved;
    if (moved) suppressClickUntil = performance.now() + 400;
    const id = drag.id;
    drag = null;
    if (viewport.hasPointerCapture(id)) viewport.releasePointerCapture(id);
    viewport.classList.remove('dragging');
    if (moved) { updateFromScroll(); centerCard(active); }
  }
  viewport.addEventListener('pointerup', endDrag);
  viewport.addEventListener('pointercancel', endDrag);
  viewport.addEventListener('lostpointercapture', endDrag);
  viewport.addEventListener('pointerleave', () => { if (drag && !drag.moved) drag = null; });
  viewport.addEventListener('click', event => {
    if (performance.now() < suppressClickUntil) { event.preventDefault(); event.stopPropagation(); }
  }, true);

  // Sound is opt-in and its state reflects actual playback, not just a click.
  const music = $('#backgroundMusic');
  const musicButton = $('#musicButton');
  const musicLabel = $('#musicLabel');
  let musicWanted = false;
  let musicFailed = false;
  function paintMusic() {
    const playing = !music.paused && !musicFailed;
    musicButton.setAttribute('aria-pressed', String(playing));
    musicButton.setAttribute('aria-label', playing ? '暂停背景音乐' : '播放背景音乐');
    musicLabel.textContent = musicFailed ? '音乐暂不可用' : playing ? '音乐开启' : '音乐关闭';
    musicButton.querySelector('path').setAttribute('d', playing ? 'M4 10h4l5-4v12l-5-4H4zM17 8a6 6 0 0 1 0 8M20 5a10 10 0 0 1 0 14' : 'M4 10h4l5-4v12l-5-4H4zM17 9l4 6M21 9l-4 6');
  }
  async function startMusic() {
    if (document.hidden || $('#videoDialog').open || !musicWanted) return;
    musicFailed = false;
    try { await music.play(); }
    catch (error) { if (error.name !== 'AbortError') { musicWanted = false; musicFailed = error.name !== 'NotAllowedError'; } }
    paintMusic();
  }
  music.volume = 0.38;
  musicButton.addEventListener('click', () => {
    musicWanted = !musicWanted;
    if (musicWanted) startMusic();
    else music.pause();
    paintMusic();
  });
  music.addEventListener('play', paintMusic);
  music.addEventListener('pause', paintMusic);
  music.addEventListener('error', () => { musicFailed = true; musicWanted = false; paintMusic(); });

  // Native dialogs provide focus trapping, Escape handling and focus restoration.
  const videoDialog = $('#videoDialog');
  const videoPlayer = $('#videoPlayer');
  const videoMessage = $('#videoMessage');
  let videoTimer = 0;
  let localFilm = false;
  let videoInvoker = null;
  function clearVideoMessage() { clearTimeout(videoTimer); videoMessage.hidden = true; }
  function showVideoError() {
    if (!videoDialog.open) return;
    clearTimeout(videoTimer);
    videoMessage.hidden = false;
    videoMessage.classList.add('is-error');
    $('#videoMessageTitle').textContent = '暂时无法播放这部影像';
    $('#videoMessageText').textContent = localFilm ? '请检查视频文件是否完整，或关闭预览继续浏览作品。' : '原片可能需要飞书登录权限，或当前网络暂时不可用。可前往作品库继续观看。';
    $('#videoFallback').hidden = localFilm;
  }
  function openVideo(title, category, url, isLocal = false, invoker = document.activeElement) {
    videoInvoker = invoker;
    localFilm = isLocal;
    $('#videoTitle').textContent = title;
    $('#videoCategory').textContent = category;
    $('#videoSource').href = url;
    $('#videoNote').textContent = isLocal ? 'QIN MAN / OPENING FILM' : '原片由飞书提供';
    $('#videoMessageTitle').textContent = '正在加载原片…';
    $('#videoMessageText').textContent = isLocal ? '即将进入影像世界。' : '首次加载可能需要几秒钟。';
    $('#videoFallback').href = archive;
    $('#videoFallback').hidden = true;
    videoMessage.classList.remove('is-error');
    videoMessage.hidden = false;
    videoPlayer.src = url;
    videoDialog.showModal();
    $('#videoClose').focus();
    music.pause();
    syncHero();
    videoTimer = setTimeout(showVideoError, 8000);
    videoPlayer.play().catch(error => {
      if (error.name === 'NotAllowedError') clearVideoMessage();
      else if (error.name !== 'AbortError') showVideoError();
    });
  }
  cards.forEach(card => card.querySelector('a').addEventListener('click', event => {
    if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    const film = films[Number(card.dataset.index)];
    paintSelection(shown.indexOf(card));
    openVideo(film[0], film[1] + ' · ' + film[2], event.currentTarget.href, false, event.currentTarget);
  }));
  $('#introButton').addEventListener('click', event => openVideo('秦漫 · 开场影像', 'QIN MAN / OPENING', mobileQuery.matches ? 'intro-mobile.mp4' : 'intro-desktop.mp4', true, event.currentTarget));
  $('#videoClose').addEventListener('click', () => videoDialog.close());
  videoDialog.addEventListener('close', () => {
    clearVideoMessage();
    videoPlayer.pause();
    videoPlayer.removeAttribute('src');
    videoPlayer.load();
    syncHero();
    if (musicWanted) startMusic();
    if (videoInvoker?.isConnected) videoInvoker.focus({ preventScroll: true });
  });
  videoPlayer.addEventListener('playing', clearVideoMessage);
  videoPlayer.addEventListener('canplay', clearVideoMessage);
  videoPlayer.addEventListener('error', showVideoError);
  videoDialog.addEventListener('click', event => {
    if (event.target !== videoDialog) return;
    const rect = videoDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) videoDialog.close();
  });
  const menu = $('#menuDialog');
  $('#menuButton').addEventListener('click', () => { menu.showModal(); $('#menuButton').setAttribute('aria-expanded', 'true'); });
  $('#menuClose').addEventListener('click', () => menu.close());
  menu.addEventListener('close', () => $('#menuButton').setAttribute('aria-expanded', 'false'));
  $$('#menuDialog a').forEach(link => link.addEventListener('click', () => {
    menu.close();
    const target = document.querySelector(link.hash);
    if (target) { target.tabIndex = -1; target.focus({ preventScroll: true }); }
  }));
  mobileQuery.addEventListener('change', () => { if (!mobileQuery.matches && menu.open) menu.close(); });

  // Only load ambient films near the viewport. No scrolling filters or full-page blur.
  const heroVideo = $('#heroVideo');
  const scrollVideo = $('#scrollVideo');
  const story = $('#motionStory');
  let heroVisible = false;
  let storyNearby = false;
  let desiredTime = 0;
  let sceneFrame = 0;
  let storyTop = 0;
  let storyRange = 1;
  let pageRange = 1;
  function syncHero() {
    if (heroVisible && motionEnabled && !document.hidden && !videoDialog.open) {
      if (!heroVideo.getAttribute('src')) heroVideo.src = 'hero-loop.mp4';
      heroVideo.play().catch(() => {});
    } else heroVideo.pause();
  }
  function loadStory() {
    if (!storyNearby || !motionEnabled) return;
    if (!scrollVideo.getAttribute('src')) {
      scrollVideo.src = mobileQuery.matches ? 'scroll-mobile.mp4' : 'scroll-desktop.mp4';
      scrollVideo.preload = 'auto';
      scrollVideo.load();
    }
  }
  function seekStory() {
    if (!motionEnabled || document.hidden || scrollVideo.seeking || !Number.isFinite(scrollVideo.duration)) return;
    if (Math.abs(scrollVideo.currentTime - desiredTime) > 0.05) scrollVideo.currentTime = desiredTime;
  }
  function measureScenes() {
    storyTop = story.offsetTop;
    storyRange = Math.max(story.offsetHeight - Math.min(innerHeight * .35, 300), 1);
    pageRange = Math.max(root.scrollHeight - innerHeight, 1);
    requestScene();
  }
  function paintScene() {
    sceneFrame = 0;
    $('#readingProgress').style.transform = 'scaleX(' + clamp(scrollY / pageRange) + ')';
    const progress = clamp((scrollY + innerHeight * .18 - storyTop) / storyRange);
    $('#motionProgress').style.transform = 'scaleX(' + progress + ')';
    if (Number.isFinite(scrollVideo.duration)) { desiredTime = progress * Math.max(0, scrollVideo.duration - .08); seekStory(); }
  }
  function requestScene() { if (!sceneFrame) sceneFrame = requestAnimationFrame(paintScene); }
  function paintMotion() {
    root.classList.toggle('motion-off', !motionEnabled);
    $('#motionButton').setAttribute('aria-pressed', String(!motionEnabled));
    $('#motionButton').setAttribute('aria-label', motionEnabled ? '暂停动态效果' : '开启动态效果');
    $('#motionButton').innerHTML = (motionEnabled ? 'Ⅱ' : '▶') + '<span>' + (motionEnabled ? '动态开启' : '动态暂停') + '</span>';
    syncHero();
    loadStory();
    measureScenes();
  }
  $('#motionButton').addEventListener('click', () => {
    motionEnabled = !motionEnabled;
    try { localStorage.setItem('qinman-motion', motionEnabled ? 'on' : 'off'); } catch (_) { /* Optional preference. */ }
    paintMotion();
  });
  reducedQuery.addEventListener('change', () => { motionEnabled = !reducedQuery.matches; paintMotion(); });
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(entries => { heroVisible = entries[0].isIntersecting; syncHero(); }, { threshold: .05 }).observe(heroVideo);
    new IntersectionObserver(entries => { storyNearby = entries[0].isIntersecting; loadStory(); }, { rootMargin: '250px 0px' }).observe(story);
    const navigationObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        $$('.desktop-nav a').forEach(link => {
          if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-20% 0px -55% 0px' });
    $$('main > section[id]').forEach(section => navigationObserver.observe(section));
  } else { heroVisible = storyNearby = true; }
  scrollVideo.addEventListener('loadeddata', requestScene);
  scrollVideo.addEventListener('seeked', seekStory);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) music.pause();
    else { if (musicWanted) startMusic(); requestScene(); }
    syncHero();
  });
  addEventListener('scroll', requestScene, { passive: true });
  addEventListener('resize', () => { measureScenes(); requestAnimationFrame(() => centerCard(active, false)); }, { passive: true });
  if ('ResizeObserver' in window) new ResizeObserver(measureScenes).observe(document.body);
  addEventListener('load', measureScenes, { once: true });
  paintMotion();
  paintSelection(0, false);

  $('#copyEmail').addEventListener('click', async () => {
    const email = '1146399107@qq.com';
    let copied = false;
    try { await navigator.clipboard.writeText(email); copied = true; }
    catch (_) {
      const input = document.createElement('textarea');
      input.value = email;
      input.setAttribute('readonly', '');
      input.style.cssText = 'position:fixed;top:0;left:-9999px';
      document.body.append(input);
      input.select();
      try { copied = document.execCommand('copy'); } catch (_) { /* Keep the visible selectable email as fallback. */ }
      input.remove();
      $('#copyEmail').focus({ preventScroll: true });
    }
    $('#copyStatus').textContent = copied ? '邮箱已复制' : '请长按或选中邮箱复制';
  });
})();
