// Run against a local static server. External integrations are simulated, not live-tested.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const base = process.env.AZUSA_TEST_URL || 'http://127.0.0.1:8001/';
(async () => {
  const baseline = execFileSync('git', ['show', 'cfb9120:index.html'], { cwd: root, encoding: 'utf8' });
  const current = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  const config = html => html.match(/<script src="https:\/\/giscus.app\/client.js"[\s\S]*?<\/script>/)[0];
  assert.equal(config(current), config(baseline), 'Original Giscus configuration preserved');
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium', args: ['--no-sandbox'] });
  try {
    const page = await browser.newPage({ reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    let playerRequests = 0;
    await page.route('https://giscus.app/**', route => route.fulfill({ contentType: 'application/javascript', body: `const f=document.createElement('iframe'); f.title='评论（测试模拟）'; f.style.height='640px'; document.querySelector('.giscus').append(f);` }));
    await page.route('https://player.bilibili.com/**', route => { playerRequests++; return route.fulfill({ contentType: 'text/html', body: '<p>Player test stub</p>' }); });
    for (const width of [320, 375, 390, 600, 768, 1024, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const response = await page.goto(base, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      const before = playerRequests;
      assert.equal(await page.locator('#player-container iframe').count(), 0);
      const layout = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        images: [...document.images].every(i => i.complete && i.naturalWidth > 0),
        commentsHeight: document.querySelector('.giscus iframe').getBoundingClientRect().height,
        commentsRatio: getComputedStyle(document.querySelector('.giscus iframe')).aspectRatio,
        badLinks: [...document.querySelectorAll('a[href^="#"]')].filter(a => !document.getElementById(a.hash.slice(1))).length
      }));
      assert.equal(layout.overflow, false, `No page overflow at ${width}`);
      assert.equal(layout.images, true); assert.equal(layout.commentsHeight, 640); assert.equal(layout.commentsRatio, 'auto'); assert.equal(layout.badLinks, 0);
      if (width <= 760) {
        const menu = page.getByRole('button', { name: '菜单' });
        assert.equal(await page.locator('#nav-links').isVisible(), false);
        await menu.focus(); await page.keyboard.press('Enter');
        assert.equal(await menu.getAttribute('aria-expanded'), 'true');
        await page.keyboard.press('Escape'); assert.equal(await menu.getAttribute('aria-expanded'), 'false');
        await menu.click(); await page.locator('#nav-links a[href="#videos"]').click();
        assert.equal(await page.locator('#nav-links').isVisible(), false);
        assert.equal(await page.evaluate(() => document.activeElement.id), 'videos');
      }
      for (const name of ['直播切片', '翻唱作品', '精彩瞬间', '特别企划']) {
        await page.getByRole('button', { name, exact: true }).click();
        assert.equal(await page.locator('.video-card').count(), 0); assert.equal(await page.locator('.video-empty').isVisible(), true);
      }
      await page.getByRole('button', { name: '全部', exact: true }).click();
      assert.equal(await page.locator('.video-card').count(), 1);
      assert.equal(playerRequests, before, 'No player request before activation');
      await page.getByRole('button', { name: '播放：BV1hSngzHEe4', exact: true }).click();
      await page.locator('#player-container iframe').waitFor();
      assert.equal(await page.locator('dialog').evaluate(d => d.open), true);
      const src = new URL(await page.locator('#player-container iframe').getAttribute('src'));
      assert.equal(src.searchParams.get('bvid'), 'BV1hSngzHEe4'); assert.equal(src.searchParams.get('autoplay'), '0');
      await page.keyboard.press('Escape');
      await page.waitForFunction(() => !document.querySelector('#player-container iframe'));
      assert.equal(await page.locator('.video-cover').evaluate(el => el === document.activeElement), true);
      await page.locator('.video-cover').click(); await page.getByRole('button', { name: '关闭视频' }).click();
      await page.waitForFunction(() => !document.querySelector('#player-container iframe'));
      for (const link of await page.locator('a[href*="live.bilibili.com"]').all()) assert.equal(new URL(await link.getAttribute('href')).pathname, '/1702263460');
      assert.equal(await page.locator('.video-card a').getAttribute('href'), 'https://www.bilibili.com/video/BV1hSngzHEe4/');
      assert.equal(await page.locator('.comment-fallback a').getAttribute('href'), 'https://github.com/Azusatake/new-repository/discussions');
      console.log(`PASS ${width}px: layout, navigation, filters, player lifecycle, live links, comment frame`);
    }
    // Additional test-only entry checks multi-video grid/filtering without inventing site content.
    await page.evaluate(() => window.AZUSA_SITE.videos.push({ bvid: 'BVTESTFIXTURE', title: '<test title>', category: '翻唱作品', cover: 'assets/avatar-320.webp', publishedAt: null, duration: null }));
    await page.getByRole('button', { name: '全部', exact: true }).click();
    assert.equal(await page.locator('.video-card').count(), 2);
    await page.getByRole('button', { name: '翻唱作品', exact: true }).click();
    assert.equal(await page.locator('.video-card').count(), 1);
    assert.equal(await page.locator('.video-card h3').textContent(), '<test title>');
    await page.reload();
    await page.setViewportSize({ width: 320, height: 900 });
    await page.addStyleTag({ content: 'html {font-size: 200%}' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.equal(await page.locator('.star').first().evaluate(el => getComputedStyle(el).animationName), 'none');
    assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior), 'auto');
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 375, height: 900 } });
    const plain = await context.newPage(); await plain.goto(base);
    assert.equal(await plain.locator('#nav-links').isVisible(), true);
    assert.equal(await plain.locator('#videos noscript a').isVisible(), true);
    assert.equal(await plain.locator('#about').evaluate(el => getComputedStyle(el).opacity), '1');
    await context.close();
    // Normal-motion observer must reveal every section as it enters the viewport.
    await page.emulateMedia({ reducedMotion: 'no-preference' }); await page.goto(base);
    for (const section of await page.locator('.reveal').all()) {
      await section.scrollIntoViewIfNeeded();
      await page.waitForFunction(id => !document.getElementById(id).classList.contains('reveal-pending'), await section.getAttribute('id'));
    }
    await page.emulateMedia({ reducedMotion: 'reduce' }); await page.reload();
    if (process.env.AZUSA_SCREENSHOT_DIR) {
      const dir = process.env.AZUSA_SCREENSHOT_DIR; fs.mkdirSync(dir, { recursive: true });
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 1000 }); await page.goto(base, { waitUntil: 'networkidle' });
        await page.screenshot({ path: path.join(dir, `azusa-v2-${width}.png`), fullPage: true });
      }
    }
    assert.deepEqual(errors, []);
    console.log('PASS: original Giscus config; 200% text; reduced motion; JS-disabled fallback; scroll reveals; no JS errors. External playback/posting not verified.');
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
