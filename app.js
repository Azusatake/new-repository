'use strict';

// Navigation remains usable without JavaScript; collapse only after enhancement.
const menu = document.querySelector('.menu-toggle');
const links = document.querySelector('.nav-links');
const mobile = window.matchMedia('(max-width: 760px)');
function closeMenu(returnFocus = false) {
  menu.setAttribute('aria-expanded', 'false');
  links.classList.remove('is-open');
  if (returnFocus) menu.focus();
}
menu.hidden = false;
document.documentElement.classList.add('nav-ready');
menu.addEventListener('click', () => {
  const expanded = menu.getAttribute('aria-expanded') === 'true';
  menu.setAttribute('aria-expanded', String(!expanded));
  links.classList.toggle('is-open', !expanded);
});
links.addEventListener('click', event => {
  const link = event.target.closest('a');
  if (!link || !mobile.matches) return;
  closeMenu();
  const section = document.querySelector(link.hash);
  section?.setAttribute('tabindex', '-1');
  section?.focus({ preventScroll: true });
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') closeMenu(true);
});
document.addEventListener('click', event => {
  if (!event.target.closest('.nav')) closeMenu();
});
mobile.addEventListener('change', () => {
  if (!mobile.matches && document.activeElement === menu) links.querySelector('a').focus();
  if (mobile.matches && links.contains(document.activeElement)) menu.focus();
  closeMenu();
});

const data = window.AZUSA_SITE;
const grid = document.querySelector('#video-grid');
const filters = document.querySelector('.video-filters');
const empty = document.querySelector('.video-empty');
const dialog = document.querySelector('.video-dialog');
const container = document.querySelector('#player-container');
let videoTrigger;
function originalUrl(video) { return `https://www.bilibili.com/video/${video.bvid}/`; }
function openVideo(video, trigger) {
  videoTrigger = trigger;
  document.querySelector('#player-title').textContent = video.title || `视频作品 · ${video.bvid}`;
  document.querySelector('#player-original').href = originalUrl(video);
  const frame = document.createElement('iframe');
  frame.title = video.title || `桃梓 Azusa 的视频作品 ${video.bvid}`;
  frame.src = `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(video.bvid)}&page=1&autoplay=0`;
  frame.allowFullscreen = true;
  container.replaceChildren(frame);
  dialog.showModal();
  document.body.classList.add('dialog-open');
}
function renderVideos(category = '全部') {
  grid.replaceChildren();
  const videos = data.videos.filter(video => category === '全部' || video.category === category);
  empty.hidden = videos.length > 0;
  for (const video of videos) {
    const card = document.createElement('article');
    card.className = 'video-card';
    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'video-cover';
    play.setAttribute('aria-label', `播放：${video.title || video.bvid}`);
    const placeholder = () => {
      play.replaceChildren();
      const label = document.createElement('span');
      label.className = 'cover-placeholder';
      label.textContent = 'AZUSA / VIDEO';
      play.append(label);
      const note = document.createElement('small');
      note.className = 'cover-note';
      note.textContent = '作品封面待补充';
      play.append(note);
    };
    if (video.cover) {
      const image = document.createElement('img');
      image.src = video.cover;
      image.alt = ''; image.loading = 'lazy'; image.decoding = 'async';
      image.addEventListener('error', () => { placeholder(); addPlayIcon(); }, { once: true });
      play.append(image);
    } else placeholder();
    function addPlayIcon() {
      const icon = document.createElement('span');
      icon.className = 'play-icon'; icon.textContent = '▷'; icon.setAttribute('aria-hidden', 'true');
      play.append(icon);
    }
    addPlayIcon();
    play.addEventListener('click', () => openVideo(video, play));
    const meta = document.createElement('p'); meta.className = 'video-meta';
    meta.textContent = [video.category || '待分类', video.publishedAt, video.duration].filter(Boolean).join(' · ');
    const title = document.createElement('h3'); title.textContent = video.title || `视频作品 · ${video.bvid}`;
    const original = document.createElement('a');
    original.className = 'text-link'; original.href = originalUrl(video);
    original.target = '_blank'; original.rel = 'noopener noreferrer';
    original.textContent = 'Bilibili 观看 ↗'; original.setAttribute('aria-label', `${video.title || video.bvid}：在 Bilibili 观看（新窗口）`);
    card.append(play, meta, title, original); grid.append(card);
  }
}
for (const category of ['全部', ...data.videoCategories]) {
  const button = document.createElement('button'); button.type = 'button'; button.textContent = category;
  button.setAttribute('aria-pressed', String(category === '全部'));
  button.addEventListener('click', () => {
    for (const item of filters.children) item.setAttribute('aria-pressed', String(item === button));
    renderVideos(category);
  });
  filters.append(button);
}
filters.hidden = false;
renderVideos();
document.querySelector('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', event => {
  const bounds = dialog.getBoundingClientRect();
  if (event.target === dialog && (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom)) dialog.close();
});
dialog.addEventListener('close', () => {
  container.replaceChildren(); // Stop playback and release the third-party frame.
  document.body.classList.remove('dialog-open');
  videoTrigger?.focus();
});

// Content is visible by default, including when JS or IntersectionObserver fails.
const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
if ('IntersectionObserver' in window && !motion.matches) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) if (entry.isIntersecting) {
      entry.target.classList.remove('reveal-pending'); observer.unobserve(entry.target);
    }
  }, { threshold: 0.08 });
  for (const section of document.querySelectorAll('.reveal')) {
    section.classList.add('reveal-pending'); observer.observe(section);
  }
  motion.addEventListener('change', () => {
    if (motion.matches) {
      observer.disconnect();
      document.querySelectorAll('.reveal-pending').forEach(section => section.classList.remove('reveal-pending'));
    }
  });
}
