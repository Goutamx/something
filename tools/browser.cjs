const { chromium: playwright } = require('playwright');
const { dirname, join } = require('node:path');
const { pathToFileURL } = require('node:url');
const { tmpdir } = require('node:os');

// npm carries the browser and its NSS/NSPR libraries, so this setup needs only
// registry.npmjs.org, not the Playwright CDN or apt. Large binaries stay in
// ignored node_modules and /tmp; they must never be committed.
exports.launch = async () => {
  if (process.env.CHROMIUM_PATH) {
    return playwright.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox'] });
  }
  const { default: chromium } = await import('@sparticuz/chromium');
  const entry = require.resolve('@sparticuz/chromium');
  const { inflate } = await import(pathToFileURL(join(dirname(entry), 'lambdafs.js')).href);
  await inflate(join(dirname(entry), '..', 'bin', 'al2023.tar.br'));
  return playwright.launch({
    executablePath: await chromium.executablePath(),
    headless: true,
    args: chromium.args.filter(arg => !['--single-process', '--disable-web-security', '--allow-running-insecure-content'].includes(arg)),
    env: { ...process.env, LD_LIBRARY_PATH: [join(tmpdir(), 'al2023', 'lib'), process.env.LD_LIBRARY_PATH].filter(Boolean).join(':') }
  });
};
