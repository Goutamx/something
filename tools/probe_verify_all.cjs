#!/usr/bin/env node
// No application build step. These probes exercise the delivered HTML in Chromium.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { launch } = require('./browser.cjs');

const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.STUDYLEAGUE_URL || 'http://localhost:8101/something/';
const EXPECTED_MD5 = '58be2789e38ec23e1c173e7259612955';
const EXPECTED = {
  English: 19, History: 12, Geography: 17, PoliticalScience: 15, Math: 13,
  Physics: 14, Chemistry: 10, Biology: 13, Agriculture: 5, Accountancy: 10,
  BusinessStudies: 12, Economics: 8, ComputerScience: 7, Sociology: 9,
  Psychology: 7, PhysicalEducation: 10, Entrepreneurship: 6
};
const results = [];
const errors = [];
const contexts = new Set();
let browser;
let testName = '';
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function eventually(fn, message, timeout = 8000) {
  const until = Date.now() + timeout;
  let last;
  do {
    try { const value = await fn(); if (value) return value; }
    catch (error) { last = error; }
    await delay(60);
  } while (Date.now() < until);
  throw new Error(message + (last ? ': ' + last.message : ''));
}
async function makePage(options = {}) {
  const context = await browser.newContext({
    viewport: options.viewport || { width: 1440, height: 1000 },
    timezoneId: 'Asia/Kolkata',
    serviceWorkers: options.worker ? 'allow' : 'block'
  });
  contexts.add(context);
  const origin = new URL(BASE).origin;
  // Avoid external network and never touch a real student's Firebase data.
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    const css = route.request().resourceType() === 'stylesheet';
    return route.fulfill({ status: 200, contentType: css ? 'text/css' : 'application/javascript', body: '' });
  });
  if (options.mock !== false) await context.addInitScript({ path: path.join(__dirname, 'mockfb.js') });
  const subjects = options.subjects || ['English', 'History'];
  await context.addInitScript(({ subjects, theme, storage }) => {
    if (localStorage.getItem('__slProbeSeeded')) return;
    localStorage.setItem('__slProbeSeeded', '1');
    localStorage.setItem('appRegistration', JSON.stringify({ stream: subjects.length === 17 ? 'Custom' : 'Humanities', subjects, completed: true }));
    localStorage.setItem('leagueProfile', JSON.stringify({ name: 'Goutam', avatarColor: '#5E6AD2' }));
    localStorage.setItem('leagueCode', 'STUDY1');
    localStorage.setItem('theme', theme);
    for (const [key, value] of Object.entries(storage)) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
  }, { subjects, theme: options.theme || 'light', storage: options.storage || {} });
  const page = await context.newPage();
  const label = testName;
  page.on('pageerror', error => errors.push({ test: label, type: 'pageerror', text: error.stack || String(error) }));
  page.on('console', msg => { if (msg.type() === 'error') errors.push({ test: label, type: 'console', text: msg.text() }); });
  page.setDefaultTimeout(8000);
  await page.goto(BASE, { waitUntil: 'load' });
  await page.waitForFunction(() => typeof syllabus === 'object' && document.querySelectorAll('.v2-nav-item').length === 8);
  await page.waitForFunction(() => document.getElementById('app-loader').classList.contains('hidden'));
  return page;
}
async function nav(page, tab) {
  await page.locator(`[data-v2go="${tab}"]`).click();
  try {
    await page.waitForFunction(tab => {
      const active = [...document.querySelectorAll('.v2-nav-item.is-active')];
      return active.length === 1 && active[0].dataset.v2go === tab;
    }, tab);
  } catch (error) {
    const state = await page.evaluate(() => ({ heading:document.querySelector('#main h1').textContent, active:[...document.querySelectorAll('.v2-nav-item.is-active')].map(n=>n.dataset.v2go), body:document.querySelector('#chapterList').innerText.slice(0,600), lastView:localStorage.getItem('slLastView') }));
    throw new Error(`Navigation to ${tab} failed: ${JSON.stringify(state)}`, {cause:error});
  }
  await page.waitForTimeout(90);
}
async function visibleTexts(page, selector) {
  return page.locator(selector).evaluateAll(nodes => nodes.filter(n => {
    const r = n.getBoundingClientRect(); return r.width > 4 && r.height > 4;
  }).map(n => n.textContent.trim()));
}
async function openSection(page, subject = 'English', section = 'Flamingo') {
  await nav(page, 'subjects');
  await page.locator(`button[data-v2subject="${subject}"][data-v2sec="${section}"]`).click();
  await page.waitForFunction(() => !!document.querySelector('#chapterList .chapter-row'));
  await page.waitForTimeout(90);
}
async function test(name, run) {
  if (process.env.PROBE_FILTER && !name.startsWith(process.env.PROBE_FILTER)) return;
  testName = name;
  const start = Date.now();
  const previousErrors = errors.length;
  try {
    const detail = await run();
    assert.equal(errors.length, previousErrors, 'Unexpected browser errors: ' + JSON.stringify(errors.slice(previousErrors)));
    results.push({ name, pass: true, milliseconds: Date.now() - start, detail });
    console.log('PASS ' + name + ': ' + JSON.stringify(detail));
  } catch (error) {
    results.push({ name, pass: false, milliseconds: Date.now() - start, error: error.stack || String(error), detail: error.detail });
    console.error('FAIL ' + name + ': ' + (error.stack || error));
  } finally {
    for (const context of contexts) await context.close();
    contexts.clear();
  }
}

(async () => {
  browser = await launch();
  console.log('Chromium ' + browser.version() + ' | ' + BASE + ' | Firebase and font requests isolated');

  await test('01 Build identity and deploy assets', async () => {
    const page = await makePage();
    const identity = await page.evaluate(async () => {
      const bytes = await (await fetch('index.html')).arrayBuffer();
      const sw = await (await fetch('sw.js')).text();
      const manifest = await (await fetch('manifest.webmanifest')).json();
      const icons = await Promise.all(['icon-192.png', 'icon-512.png', 'studyleague-logo.png'].map(async src => {
        const image = new Image(); image.src = src; await image.decode();
        return { src, width: image.naturalWidth, height: image.naturalHeight };
      }));
      return { build: document.documentElement.dataset.slBuild,
        label: document.getElementById('slBuildLine').textContent.trim(), bytes: bytes.byteLength,
        swCache: sw.match(/const CACHE = '([^']+)'/)[1], manifest, icons };
    });
    assert.equal(identity.build, '8.0');
    assert.match(identity.label, /App build 8\.0 · offline cache studyleague-v21/);
    assert.equal(identity.bytes, 655659);
    assert.equal(identity.swCache, 'studyleague-v21');
    assert.equal(identity.manifest.name, 'StudyLeague — Class 12 Syllabus Tracker');
    assert.equal(identity.manifest.start_url, '.');
    assert.equal(identity.manifest.scope, '.');
    assert.deepEqual(identity.icons.map(x => [x.width, x.height]), [[192,192],[512,512],[512,512]]);
    const md5 = crypto.createHash('md5').update(fs.readFileSync(path.join(ROOT, 'index.html'))).digest('hex');
    assert.equal(md5, EXPECTED_MD5);
    await page.locator('#settingsBtn').click();
    assert(await page.locator('#slBuildLine').isVisible(), 'Build footer must be readable in Settings');
    return { build: identity.build, bytes: identity.bytes, md5, cache: identity.swCache, iconDimensions: identity.icons, manifest: identity.manifest.name };
  });

  await test('02 Complete rationalised syllabus', async () => {
    const page = await makePage({ subjects: Object.keys(EXPECTED) });
    const actual = await page.evaluate(() => Object.fromEntries(Object.entries(syllabus).map(([k, groups]) => [k, Object.values(groups).reduce((n, chapters) => n + chapters.length, 0)])));
    assert.deepEqual(actual, EXPECTED);
    const details = await page.evaluate(() => ({
      subjects: Object.keys(syllabus).length,
      chapters: Object.values(syllabus).flatMap(x => Object.values(x)).flat().length,
      total: computeOverallProgress().total,
      english: Object.values(syllabus.English).flat(),
      geography: Object.values(syllabus.Geography).flat()
    }));
    assert.equal(details.subjects, 17); assert.equal(details.chapters, 187); assert.equal(details.total, 748);
    assert(details.english.some(x => x.endsWith('The Rattrap')));
    assert(!details.english.some(x => /Elementary School Classroom/.test(x)));
    assert(!details.geography.some(x => /Population Composition/.test(x)));
    return { subjects: details.subjects, chapters: details.chapters, tasks: details.total, counts: actual };
  });

  await test('03 All 17 subjects render every section', async () => {
    const page = await makePage({ subjects: Object.keys(EXPECTED) });
    await nav(page, 'subjects');
    assert.equal((await visibleTexts(page, '#chapterList .v2-subject-name')).length, 17);
    const sections = await page.locator('#chapterList button[data-v2subject]').evaluateAll(nodes => nodes.map(n => ({ subject: n.dataset.v2subject, section: n.dataset.v2sec })));
    let total = 0;
    const bySubject = {};
    for (const {subject, section} of sections) {
      await openSection(page, subject, section);
      const expected = await page.evaluate(({subject, section}) => syllabus[subject][section], {subject, section});
      // Animation staggers chapter rows; wait for the last title to have dimensions.
      await page.waitForFunction(() => [...document.querySelectorAll('#chapterList .chapter-title')].every(n => n.getBoundingClientRect().height > 4));
      const titles = await visibleTexts(page, '#chapterList .chapter-title');
      assert.deepEqual(titles, expected, `${subject}/${section}`);
      assert.equal(await page.locator('#chapterList .chapter-row input[type="checkbox"]').count(), expected.length * 4);
      total += titles.length;
      bySubject[subject] = (bySubject[subject] || 0) + titles.length;
    }
    assert.equal(total, 187); assert.deepEqual(bySubject, EXPECTED);
    return { sections: sections.length, renderedChapters: total, checkboxes: total * 4, bySubject };
  });

  await test('04 Home and Subjects match registration', async () => {
    const page = await makePage();
    await nav(page, 'overview');
    const home = await visibleTexts(page, '#chapterList .subject-card .title');
    await nav(page, 'subjects');
    const subjects = await visibleTexts(page, '#chapterList .v2-subject-name');
    assert.deepEqual(home, ['English', 'History']);
    assert.deepEqual(subjects, ['English', 'History']);
    await page.locator('#settingsBtn').click();
    const regButtons = await page.locator('#settingsModal button').evaluateAll(nodes => nodes.map(n => ({ id: n.id, text: n.textContent })));
    return { home, subjects, chosen: await page.evaluate(() => slChosenSubjects()), registrationControls: regButtons.filter(x => /subject|stream/i.test(x.text)) };
  });

  await test('05 Scoped progress, XP and persisted checklists', async () => {
    // Deliberately seed a fully-complete chapter in an unregistered subject.
    const page = await makePage({ storage: { syllabusProgress: { Physics: { All: { '1. Electric Charges and Fields': { Done: true, Note: true, OneShot: true, OneShotNotes: true } } } } } });
    assert.deepEqual(await page.evaluate(() => computeOverallProgress()), { total: 124, completed: 0, percent: 0 });
    assert.equal((await page.evaluate(() => l5cChapterCounts())).totalChapters, 31);
    await openSection(page);
    const inputs = page.locator('#chapterList .chapter-row').first().locator('input[type="checkbox"]');
    for (let i = 0; i < 4; i++) await inputs.nth(i).check();
    assert.deepEqual(await page.evaluate(() => computeOverallProgress()), { total: 124, completed: 4, percent: 3 });
    assert.equal((await page.evaluate(() => l5cChapterCounts())).doneChapters, 1);
    await eventually(() => page.evaluate(() => __mockFB.read('leagues/STUDY1/members/goutam').xp === 60), 'One full registered chapter should publish 60 XP');
    await nav(page, 'overview');
    const homeStats = await visibleTexts(page, '#chapterList .subject-card .progress-stats');
    assert.deepEqual(homeStats, ['4 of 76 completed', '0 of 48 completed']);
    await page.reload({ waitUntil: 'load' });
    await openSection(page);
    assert.equal(await page.locator('#chapterList .chapter-row').first().locator('input:checked').count(), 4);
    return { registeredChapters: 31, tasks: 124, completed: 4, percent: 3, xp: 60, survivesReload: true, homeStats };
  });

  await test('06 Eight nav tabs and Profile routing', async () => {
    const page = await makePage();
    const tabs = ['overview','subjects','focus','exams','league','activity','messages','notes'];
    const headings = { overview:'Home',subjects:'Subjects',focus:'Focus & Time',exams:'Exams',league:'Leaderboard',activity:'Activity',messages:'Messages',notes:'Notes' };
    const visited = [], failures = [];
    for (let round = 0; round < 2; round++) {
      for (const tab of tabs) {
        try {
          await nav(page, tab);
          const actual = (await page.locator('#main h1').textContent()).trim();
          assert.equal(actual, headings[tab]);
          assert((await page.locator('#chapterList').innerText()).trim().length > 0, `${tab} must not be blank`);
          visited.push(tab);
        } catch (error) { failures.push({ round:round + 1, tab, error:error.message }); }
      }
    }
    await page.locator('.v2-avatar-btn').click();
    await page.waitForFunction(() => document.querySelector('#main h1').textContent.trim() === 'My Profile');
    // The duplicate .v2-profile-head is deliberately never appended. The
    // visible editor card and stats are the actual Profile UI in this build.
    await page.locator('#chapterList #socialProfileCard').waitFor({ state:'visible' });
    await page.locator('#v2p_xp').waitFor({ state:'visible' });
    const detail = { navTabs:8, attemptedTransitions:16, successfulTransitions:visited.length, failures, profile:'My Profile' };
    if (failures.length) { const error = new Error(JSON.stringify(detail)); error.detail = detail; throw error; }
    return detail;
  });

  await test('07 Section Back button returns to Subjects', async () => {
    const page = await makePage();
    await openSection(page);
    await page.locator('[data-sl-back]').waitFor({ state: 'visible' });
    assert.match(await page.locator('[data-sl-back]').innerText(), /Back to Subjects/);
    await page.locator('[data-sl-back]').click();
    await page.waitForFunction(() => document.querySelector('#main h1').textContent.trim() === 'Subjects');
    assert.deepEqual(await visibleTexts(page, '#chapterList .v2-subject-name'), ['English','History']);
    assert.equal(await page.locator('[data-sl-back]').count(), 0);
    await page.reload({ waitUntil: 'load' });
    // View restoration is scheduled at 250 ms, after the initial Home render.
    await page.waitForFunction(() => document.querySelector('#main h1').textContent.trim() === 'Subjects');
    assert.equal((await page.locator('#main h1').textContent()).trim(), 'Subjects');
    return { backButtonsInSection: 1, backButtonsOnSubjects: 0, subjectsAfterReload: 2 };
  });

  await test('08 Unticking removes ghost scores and publishes zero', async () => {
    const event = { id: 'ghost', ts: Date.now(), subject:'English', sub:'Flamingo', chapter:'1. The Last Lesson', activity:'Done', checked:true, credit:0.85 };
    const page = await makePage({ storage: { studyEvents: [event] } });
    const weekScores = () => page.evaluate(() => Object.entries(__mockFB.dump()).filter(([p]) => /\/weekly\/[^/]+\/scores\/goutam$/.test(p)).map(([,v]) => v));
    await eventually(async () => (await weekScores()).length > 0, 'Initial weekly score');
    const initial = (await weekScores())[0];
    assert.equal(initial.wps, 0); assert.equal(initial.earnedWC, 0);
    await openSection(page);
    const tick = page.locator('#chapterList .chapter-row').first().locator('input').first();
    await tick.check();
    await eventually(() => page.evaluate(() => __mockFB.read('leagues/STUDY1/members/goutam').xp === 10), 'Tick should publish 10 XP');
    const afterTick = (await weekScores())[0];
    assert(afterTick.wps > 0);
    await tick.uncheck();
    await eventually(() => page.evaluate(() => __mockFB.read('leagues/STUDY1/members/goutam').xp === 0), 'Untick should publish honest zero XP');
    const afterUntick = (await weekScores())[0];
    assert.equal(afterUntick.wps, 0); assert.equal(afterUntick.earnedWC, 0);
    assert.equal(await page.evaluate(() => localStorage.getItem('slDidUntick')), 'goutam');
    assert.equal(await page.evaluate(() => computeOverallProgress().completed), 0);
    return { ghostWps: initial.wps, tickWps: afterTick.wps, untickWps: afterUntick.wps, xpSequence: [0,10,0], didUntick: 'goutam' };
  });

  await test('09 Messages merge duplicate and nameless rows', async () => {
    const page = await makePage();
    await nav(page, 'messages');
    await page.waitForFunction(() => document.querySelectorAll('#slConvos .sl-convo').length === 4);
    const names = await visibleTexts(page, '#slConvos .sl-cn > b');
    assert.deepEqual(names, ['Class 12 — League','Priya','Kabir','Madhaw']);
    const ids = await page.locator('#slConvos [data-conv]').evaluateAll(nodes => nodes.map(n => n.dataset.conv));
    assert(ids.includes('dm:madhaw-new')); assert(!ids.includes('dm:madhaw-old'));
    assert(!names.includes('Student')); assert(!names.includes('Anonymous ghost'));
    await page.locator('#slTabDirect').click();
    assert.equal((await visibleTexts(page, '#slConvos .sl-cn > b')).length, 3);
    return { names, keeps: 'madhaw-new', directRows: 3, namelessRows: 0 };
  });

  await test('10 Group and direct message write paths', async () => {
    const page = await makePage();
    await nav(page, 'messages');
    await page.locator('#slMsgInput').fill('Playwright group probe');
    await page.locator('#slSend').click();
    await eventually(() => page.evaluate(() => Object.entries(__mockFB.dump()).some(([p,v]) => /^leagues\/STUDY1\/messages\/[^/]+$/.test(p) && v.text === 'Playwright group probe')), 'Group write missing');
    await page.waitForFunction(() => document.querySelector('#slMsgs').textContent.includes('Playwright group probe'));
    await page.locator('[data-conv="dm:priya"]').click();
    await page.locator('#slMsgInput').fill('Playwright private probe');
    await page.locator('#slMsgInput').press('Enter');
    await eventually(() => page.evaluate(() => Object.entries(__mockFB.dump()).some(([p,v]) => /^leagues\/STUDY1\/dms\/goutam_priya\/messages\/[^/]+$/.test(p) && v.text === 'Playwright private probe')), 'Direct write missing');
    await page.waitForFunction(() => document.querySelector('#slMsgs').textContent.includes('Playwright private probe'));
    const notifications = await page.evaluate(() => Object.entries(__mockFB.dump()).filter(([p,v]) => p.startsWith('leagues/STUDY1/notifications/') && v.recipientUid === 'priya' && v.type === 'dm').length);
    assert.equal(notifications, 1);
    return { groupWritten: 1, directWritten: 1, dmNotifications: notifications, backend: 'mock only' };
  });

  await test('11 Notes and Focus controls', async () => {
    const page = await makePage();
    await nav(page, 'notes');
    await page.locator('#snGrid .note-card').waitFor({ state: 'visible' });
    const avatar = await page.locator('#snGrid .sl-mono-chip').evaluate(el => ({ text:el.textContent, width:el.getBoundingClientRect().width, height:el.getBoundingClientRect().height, font:getComputedStyle(el).fontSize }));
    assert.deepEqual(avatar, { text:'P', width:18, height:18, font:'11px' });
    await page.locator('#snTitle').fill('Probe revision note');
    await page.locator('#snContent').fill('A test-only shared note.');
    await page.locator('#snForm button[type="submit"]').click();
    await page.waitForFunction(() => document.querySelector('#snGrid').textContent.includes('Probe revision note'));
    await page.locator('[data-note="history-note"] [data-vote="1"]').click();
    await eventually(() => page.evaluate(() => __mockFB.read('leagues/STUDY1/sharedNotes/history-note').votes.goutam === 1), 'Vote update missing');
    await nav(page, 'focus');
    assert.equal((await page.locator('#timerDisplay').textContent()).trim(), '25:00');
    await page.locator('#startPauseBtn').click();
    assert.equal((await page.locator('#startPauseBtn').textContent()).trim(), 'Pause');
    await page.locator('#startPauseBtn').click();
    // The shipped control is labelled Start when paused (not Resume).
    assert.equal((await page.locator('#startPauseBtn').textContent()).trim(), 'Start');
    assert.equal(await page.evaluate(() => timerState.running), false);
    await page.locator('#resetBtn').click();
    assert.equal((await page.locator('#timerDisplay').textContent()).trim(), '25:00');
    return { noteAvatar: avatar, notesPublished: 1, votesWritten: 1, focus: 'start / pause / reset' };
  });

  await test('12 PWA cache update, offline reload, dark phone DOM', async () => {
    const page = await makePage({ worker: true, mock: false, theme:'dark', viewport:{width:390,height:844} });
    await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout:10000 });
    const cache = await page.evaluate(async () => ({ names:await caches.keys(), urls:(await (await caches.open('studyleague-v21')).keys()).map(r => new URL(r.url).pathname) }));
    assert(cache.names.includes('studyleague-v21'));
    for (const file of ['index.html','manifest.webmanifest','icon-192.png','icon-512.png','studyleague-logo.png']) assert(cache.urls.some(url => url.endsWith('/'+file)), `${file} not precached`);
    await nav(page, 'subjects');
    await openSection(page);
    await page.locator('#chapterList .chapter-row').first().locator('input').first().check();
    await page.context().setOffline(true);
    const response = await page.reload({ waitUntil:'load' });
    assert.equal(response.status(), 200); assert(response.fromServiceWorker());
    await page.waitForFunction(() => document.querySelectorAll('#chapterList .chapter-row').length > 0);
    assert.equal(await page.locator('#chapterList .chapter-row').first().locator('input:checked').count(), 1);
    const dark = await page.evaluate(() => ({
      theme:document.documentElement.dataset.theme,
      viewport:innerWidth, documentWidth:document.documentElement.scrollWidth,
      mainWidth:document.querySelector('#main').getBoundingClientRect().width,
      build:document.documentElement.dataset.slBuild, completed:computeOverallProgress().completed
    }));
    assert.equal(dark.theme,'dark'); assert.equal(dark.build,'8.0'); assert.equal(dark.completed,1);
    assert(dark.documentWidth <= dark.viewport + 1, 'Phone document must not overflow horizontally');
    await page.locator('[data-sl-back]').click();
    assert.deepEqual(await visibleTexts(page,'#chapterList .v2-subject-name'),['English','History']);
    await page.context().setOffline(false);
    await page.evaluate(async () => {
      await caches.open('studyleague-v19');
      const registration = await navigator.serviceWorker.getRegistration();
      await registration.unregister();
      await navigator.serviceWorker.register('sw.js?probe=v21');
    });
    await eventually(() => page.evaluate(async () => !(await caches.keys()).includes('studyleague-v19')), 'New worker must delete v19 cache');
    return { cache, offlineStatus:response.status(), fromServiceWorker:true, preservedTicks:1, darkPhone:dark, staleCacheRemoved:true, firebaseSDK:'unavailable, local-only fallback exercised' };
  });

  await browser.close();
  const failed = results.filter(x => !x.pass).length;
  const report = { timestamp:new Date().toISOString(), base:BASE, build:'8.0', expectedMd5:EXPECTED_MD5, firebase:'in-memory mock; no live OAuth, security-rules or real multi-user claims', results, browserErrors:errors, failed };
  fs.mkdirSync(path.join(__dirname,'results'),{recursive:true});
  const reportName = process.env.PROBE_FILTER ? `regression-${process.env.PROBE_FILTER}.json` : 'regression.json';
  fs.writeFileSync(path.join(__dirname,'results',reportName),JSON.stringify(report,null,2)+'\n');
  console.log(`FAILED: ${failed} of ${results.length}; browser errors: ${errors.length}`);
  process.exitCode = failed || errors.length ? 1 : 0;
})().catch(async error => {
  console.error(error);
  if (browser) await browser.close();
  process.exitCode = 1;
});
