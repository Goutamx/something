#!/usr/bin/env node
// Reproduce the screenshot's baseline defect and measure the real rendered fix.
// Firebase is isolated in-memory; this never writes to production.
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { launch } = require('./browser.cjs');
const ROOT = path.resolve(__dirname, '..');
const BASE = process.env.STUDYLEAGUE_URL || 'http://localhost:8101/something/';
const BASELINE = process.env.NOTES_BASELINE_REF || 'b9a032bb188fbcba204312fda7b3c3cc61f192e7';
const rounded = n => Math.round(n * 1000) / 1000;

async function measure(page, avatarSelector, nameSelector) {
  return page.evaluate(({ avatarSelector, nameSelector }) => {
    const avatar = document.querySelector(avatarSelector);
    if (!avatar) throw new Error('Missing avatar: ' + avatarSelector);
    const name = nameSelector && document.querySelector(nameSelector);
    if (nameSelector && !name) throw new Error('Missing centered author-name wrapper: ' + nameSelector);
    const range = document.createRange();
    if (name) range.selectNodeContents(name);
    else {
      // Build 8.0's author is a bare text node after the avatar.
      const text = avatar.nextSibling;
      range.setStart(text, 0); range.setEnd(text, 'Goutam'.length);
    }
    const a = avatar.getBoundingClientRect(), t = range.getBoundingClientRect();
    const n = name ? name.getBoundingClientRect() : t;
    const c = avatar.closest('.sl-note-author');
    const row = c ? c.getBoundingClientRect() : avatar.parentElement.getBoundingClientRect();
    const glyphRange = document.createRange(); glyphRange.selectNodeContents(avatar);
    const g = glyphRange.getBoundingClientRect();
    const cy = r => r.y + r.height / 2;
    const round = n => Math.round(n * 1000) / 1000;
    return {
      avatarSize: [round(a.width), round(a.height)],
      avatarMinusTextCenterPx: round(cy(a) - cy(t)),
      avatarMinusNameBoxCenterPx: round(cy(a) - cy(n)),
      glyphMinusAvatarCenterPx: round(cy(g) - cy(a)),
      rowDisplay: c && getComputedStyle(c).display,
      rowAlignment: c && getComputedStyle(c).alignItems,
      name: name ? name.textContent : 'Goutam',
      contained: a.left >= row.left - 1 && a.right <= row.right + 1 && n.right <= row.right + 1,
      nameLeft: round(n.left), avatarRight: round(a.right)
    };
  }, { avatarSelector, nameSelector });
}

(async () => {
  const baseline = execFileSync('git', ['show', BASELINE + ':index.html'], { cwd:ROOT, maxBuffer:2*1024*1024 });
  assert.equal(crypto.createHash('md5').update(baseline).digest('hex'), '58be2789e38ec23e1c173e7259612955');
  const browser = await launch();
  const errors = [], results = [];
  try {
    async function run({ label, html, theme, width, height, name, comment }) {
      const context = await browser.newContext({ viewport:{width,height}, timezoneId:'Asia/Kolkata', serviceWorkers:'block' });
      try {
        const origin = new URL(BASE).origin;
        await context.route('**/*', route => {
          if (new URL(route.request().url()).origin !== origin) return route.fulfill({status:200, contentType:route.request().resourceType()==='stylesheet'?'text/css':'application/javascript', body:''});
          if (html && route.request().isNavigationRequest()) return route.fulfill({status:200, contentType:'text/html; charset=utf-8', body:html});
          return route.continue();
        });
        await context.addInitScript({path:path.join(__dirname,'mockfb.js')});
        await context.addInitScript(({theme}) => {
          localStorage.setItem('appRegistration',JSON.stringify({stream:'Humanities',subjects:['English','History'],completed:true}));
          localStorage.setItem('leagueProfile',JSON.stringify({name:'Goutam',avatarColor:'#5E6AD2'}));
          localStorage.setItem('leagueCode','STUDY1'); localStorage.setItem('theme',theme);
        }, {theme});
        const page = await context.newPage();
        page.setDefaultTimeout(8000);
        page.on('pageerror', error => errors.push({label,type:'pageerror',text:String(error)}));
        page.on('console', message => { if (message.type()==='error') errors.push({label,type:'console',text:message.text()}); });
        await page.goto(BASE,{waitUntil:'load'});
        await page.waitForFunction(() => document.getElementById('app-loader').classList.contains('hidden'));
        await page.evaluate(({name,comment}) => {
          __mockFB.seed('leagues/STUDY1/sharedNotes/alignment',{
            title:'the third level',content:'asdfghj',subjectKey:'English',book:'Flamingo',chapter:'1. The Last Lesson',
            authorUid:'goutam',authorName:name,votes:{goutam:1},commentsCount:1,createdAt:Date.now()
          });
          __mockFB.seed('leagues/STUDY1/sharedNotes/alignment/comments/example',{
            text:comment,authorUid:'goutam',authorName:name,createdAt:Date.now()
          });
        }, {name,comment});
        await page.locator('[data-v2go="notes"]').click();
        const card = page.locator('[data-note="alignment"]');
        await card.waitFor({state:'visible'});
        const fixed = !html;
        const cardMetric = await measure(page,'[data-note="alignment"] .sl-mono-chip',fixed?'[data-note="alignment"] .sl-note-author-name':null);
        await card.click();
        await page.locator('#noteModal').waitFor({state:'visible'});
        await page.locator('#noteComments .sl-mono-chip').waitFor({state:'visible'});
        const modalMetric = await measure(page,'#noteModalBody > .league-bio .sl-mono-chip',fixed?'#noteModalBody .sl-note-byline .sl-note-author-name':null);
        const commentMetric = await measure(page,'#noteComments .sl-mono-chip',fixed?'#noteComments .sl-note-author-name':'#noteComments .feed-item > div > b');
        const metrics = {card:cardMetric,modal:modalMetric,comment:commentMetric};
        const row = {label,theme,width,height,metrics}; results.push(row);
        console.log(JSON.stringify(row));
        if (fixed) {
          for (const [location,m] of Object.entries(metrics)) {
            assert.deepEqual(m.avatarSize,[18,18],label+' '+location+' avatar size');
            assert.equal(m.name,name,label+' '+location+' author');
            assert.equal(m.rowAlignment,'center',label+' '+location+' row alignment');
            assert(Math.abs(m.avatarMinusNameBoxCenterPx)<=0.5,label+' '+location+' box centers: '+m.avatarMinusNameBoxCenterPx);
            assert(Math.abs(m.avatarMinusTextCenterPx)<=1,label+' '+location+' text centers: '+m.avatarMinusTextCenterPx);
            assert(Math.abs(m.glyphMinusAvatarCenterPx)<=1,label+' '+location+' monogram center: '+m.glyphMinusAvatarCenterPx);
            assert(m.contained,label+' '+location+' author row overflow');
            assert(m.nameLeft>=m.avatarRight+5,label+' '+location+' avatar/name overlap');
          }
          const commentLayout = await page.evaluate(() => {
            const body=document.querySelector('#noteComments .sl-note-comment-text');
            const range=document.createRange(); range.selectNodeContents(body);
            return {textLeft:range.getBoundingClientRect().left,nameLeft:document.querySelector('#noteComments .sl-note-author-name').getBoundingClientRect().left,
              nameMarkup:document.querySelector('#noteComments .sl-note-author-name').children.length,
              deleteVisible:document.querySelector('[data-del-comment]').getBoundingClientRect().width>4,
              modalWidth:document.querySelector('#noteModal .modal-content').getBoundingClientRect().width,viewport:innerWidth};
          });
          assert(Math.abs(commentLayout.textLeft-commentLayout.nameLeft)<=1,label+' comment text indent');
          assert.equal(commentLayout.nameMarkup,0,'Author names must remain escaped text');
          assert(commentLayout.deleteVisible,'Own-comment Delete missing');
          assert(commentLayout.modalWidth<=commentLayout.viewport,'Modal viewport overflow');
          // Prove the markup refactor did not break voting, comment posting/deletion.
          await page.locator('#noteVoteDown').click();
          await page.waitForFunction(() => __mockFB.read('leagues/STUDY1/sharedNotes/alignment').votes.goutam===-1);
          await page.waitForFunction(() => document.querySelector('#noteModalBody .vote-row > b').textContent==='-1');
          await page.locator('#noteComments [data-del-comment="example"]').click();
          await page.waitForFunction(() => !__mockFB.read('leagues/STUDY1/sharedNotes/alignment/comments/example'));
          await page.locator('#noteCommentInput').fill('Alignment regression comment');
          await page.locator('#noteCommentForm button').click();
          await page.waitForFunction(() => document.querySelector('#noteComments').textContent.includes('Alignment regression comment'));
        }
        return row;
      } finally { await context.close(); }
    }
    const before = await run({label:'8.0 baseline',html:baseline,theme:'dark',width:1366,height:687,name:'Goutam',comment:'sdf'});
    assert(before.metrics.card.avatarMinusTextCenterPx>4);
    assert(before.metrics.modal.avatarMinusTextCenterPx>4);
    assert(before.metrics.comment.avatarMinusTextCenterPx < -1);
    for (const theme of ['dark','light']) for (const viewport of [{width:1366,height:687},{width:390,height:844}]) for (const long of [false,true]) {
      await run({label:`8.1 ${theme} ${viewport.width} ${long?'long':'short'}`,theme,...viewport,
        name:long?'GoutamChandraprakashSharmaSingh':'Goutam',
        comment:long?'A longer comment with several lines of revision details about the chapter. '.repeat(6):'sdf'});
    }
    assert.equal(errors.length,0,JSON.stringify(errors));
    const after=results.slice(1).flatMap(row=>Object.values(row.metrics));
    const report={timestamp:new Date().toISOString(),baselineRef:BASELINE,base:BASE,backend:'mock',externalFonts:'isolated; browser fallback',before:before.metrics,
      variants:results.length-1,alignmentChecks:after.length,maxTextCenterDeltaPx:rounded(Math.max(...after.map(m=>Math.abs(m.avatarMinusTextCenterPx)))),
      maxBoxCenterDeltaPx:rounded(Math.max(...after.map(m=>Math.abs(m.avatarMinusNameBoxCenterPx)))),browserErrors:errors,results};
    fs.mkdirSync(path.join(__dirname,'results'),{recursive:true});
    fs.writeFileSync(path.join(__dirname,'results','notes-alignment.json'),JSON.stringify(report,null,2)+'\n');
    console.log(`PASS ${report.alignmentChecks} alignment checks across ${report.variants} variants; max text delta ${report.maxTextCenterDeltaPx}px; browser errors ${errors.length}`);
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1});
