/* E-Sign smoke test: node tests/esign-smoke.js (serve the repo on :8765 first). Creates, signs in order, seals and checks the trail. */
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1300, height: 900 } }), p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push('PAGEERR ' + e.message)); p.on('console', m => m.type() === 'error' && !/net::|Failed to load/.test(m.text()) && errs.push('CONSOLE ' + m.text()));
  await ctx.route(/config\.js/, r => r.fulfill({ contentType: 'application/javascript', body: 'window.LS_CONFIG = {};' })); await ctx.route(/googleapis|gstatic|accounts\.google|fonts/, r => r.abort());
  await p.goto('http://localhost:8765/app.html'); await p.waitForFunction(() => window.LS && window.LSV);
  await p.evaluate(() => { const d = LS.seed(); d.session = { email: 'a@b.in', at: Date.now() }; d.user = { name: 'Adv. Test', title: 'Adv', role: 'Advocate', email: 'a@b.in', phone: '' }; d.firm.name = 'Test Chambers'; d.firm.kind = 'advocate'; d.firm.domain = 'general';
    d.sub = { plan: 'Firm', cycle: 'annual', status: 'active', since: LS.today(), renews: LS.addDays(LS.today(), 300), trialEnds: '', history: [] };
    d.cases.push({ id: 'c1', title: 'Sharma v. Verma', full: 'Sharma v. Verma', no: 'CS 1/2025', cnr: '', court: 'Delhi HC', status: 'active', team: ['Adv. Test'], stage: 'x' }); LS.save(d); });
  await p.reload(); await p.waitForTimeout(1500);
  await p.screenshot({ path: 'esign-shot.png' });
  await p.evaluate(() => location.hash = '#/esign'); await p.waitForTimeout(800);
  console.log('title:', await p.locator('h1').first().innerText().catch(e => 'noh1'));
  await p.getByRole('button', { name: '+ New request' }).click();
  await p.locator('.ls-backdrop select').first().selectOption('upload');
  const [fc] = await Promise.all([p.waitForEvent('filechooser'), p.getByRole('button', { name: 'Choose file' }).click()]);
  require('fs').writeFileSync('/tmp/ls-esign-agr.txt', 'Agreement v1'); await fc.setFiles('/tmp/ls-esign-agr.txt');
  const ins = p.locator('input[placeholder="Full name"]'); await ins.first().fill('Ravi Sharma'); await p.locator('input[placeholder="Email"]').first().fill('ravi@x.in');
  await p.getByRole('button', { name: '+ Add signer' }).click(); await p.locator('input[placeholder="Full name"]').nth(1).fill('Meera Verma'); await p.locator('input[placeholder="Email"]').nth(1).fill('meera@x.in');
  await p.locator('.ls-backdrop select').nth(2).selectOption('sequential');
  await p.getByRole('button', { name: 'Send for signature' }).click(); await p.waitForTimeout(800);
  console.log('rows:', await p.locator('.ls-row').count(), await p.locator('body').innerText().then(t => t.includes('Out for signature')));
  await p.getByRole('button', { name: 'Open' }).first().click(); await p.waitForTimeout(400);
  const waiting = await p.locator('text=Waiting for earlier signer').count(); console.log('sequential lock:', waiting);
  await p.getByRole('button', { name: 'Sign now' }).first().click(); await p.waitForTimeout(800);
  console.log('verified:', await p.locator('text=Document verified').count());
  const c = p.locator('canvas'); const bb = await c.boundingBox(); await p.mouse.move(bb.x + 30, bb.y + 60); await p.mouse.down(); await p.mouse.move(bb.x + 120, bb.y + 90, { steps: 8 }); await p.mouse.move(bb.x + 200, bb.y + 50, { steps: 8 }); await p.mouse.up();
  await p.locator('input[placeholder="ravi@x.in"]').fill('RAVI@x.in'); await p.locator('input[type=checkbox]').check();
  await p.getByRole('button', { name: 'Sign document' }).click(); await p.waitForTimeout(800);
  console.log('state1', JSON.stringify(await p.evaluate(() => LS.load().esign[0].signers.map(s => s.status))));
  // second signer via typed
  await p.getByRole('button', { name: 'Open' }).first().click(); await p.waitForTimeout(300);
  await p.getByRole('button', { name: 'Sign now' }).first().click(); await p.waitForTimeout(500);
  await p.getByRole('button', { name: 'Type', exact: true }).click(); await p.locator('input[placeholder="meera@x.in"]').fill('meera@x.in'); await p.locator('input[type=checkbox]').check();
  await p.getByRole('button', { name: 'Sign document' }).click(); await p.waitForTimeout(800);
  const e = await p.evaluate(() => { const e = LS.load().esign[0]; return { st: e.status, seal: !!e.seal, n: e.audit.length }; }); console.log('final', JSON.stringify(e));
  await p.getByRole('button', { name: 'Open' }).first().click(); await p.waitForTimeout(500);
  console.log('trail intact:', await p.locator('text=Audit trail intact').count()); await p.screenshot({ path: 'esign-shot.png' });
  const r = await p.evaluate(async () => { const e = LS.load().esign[0]; return { cert: LSV.esign.certificate(LS.load(), e).length, ok: await LSV.esign.auditOk(e), tampered: await (async () => { const c = JSON.parse(JSON.stringify(e)); c.audit[1].act = 'x'; return LSV.esign.auditOk(c); })() }; }); console.log(JSON.stringify(r));
  // tamper: replace stored file and ensure signing blocked on a new request
  console.log('errs', errs.slice(0, 5)); await b.close();
})();
