import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import type { Topic } from '../../src/domain/types';
import { sample } from '../fixtures';

test(
  'Part 2 topics interleave, filter, search and open independently on desktop/mobile',
  { timeout: 60000 },
  async (t) => {
    const catalog: Topic[] = JSON.parse(
      await readFile('content/catalog.json', 'utf8'),
    );
    const extension: Topic[] = catalog.map((p) => ({
      ...p,
      id: p.id + '-part-2',
      order: p.order + 100,
      part: 2,
      parentTopicId: p.id,
      nameEn: p.nameEn + ' (Part 2)',
      nameVi: p.nameVi + ' (Phần 2)',
    }));
    const server = createServer(async (req, res) => {
      const pathname = new URL(req.url ?? '/', 'http://localhost').pathname;
      const file = resolve(
        'dist',
        pathname === '/' ? 'index.html' : '.' + pathname,
      );
      if (!file.startsWith(resolve('dist') + '/')) {
        res.writeHead(404).end();
        return;
      }
      try {
        res.setHeader(
          'Content-Type',
          file.endsWith('.js')
            ? 'text/javascript'
            : file.endsWith('.css')
              ? 'text/css'
              : file.endsWith('.html')
                ? 'text/html'
                : file.endsWith('.svg')
                  ? 'image/svg+xml'
                  : file.endsWith('.png')
                    ? 'image/png'
                    : file.endsWith('.webp')
                      ? 'image/webp'
                      : 'application/octet-stream',
        );
        res.end(await readFile(file));
      } catch {
        res.writeHead(404).end();
      }
    });
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
    t.after(() => new Promise<void>((ok) => server.close(() => ok())));
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
      headless: true,
    });
    t.after(() => browser.close());
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1050 },
    });
    page.setDefaultTimeout(10000);
    const errors: string[] = [];
    const opened: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      let body: unknown = {};
      if (url.pathname === '/api/auth/me')
        body = {
          user: {
            id: 'part2-test',
            name: 'Learner',
            email: 'test@example.com',
            role: 'learner',
          },
        };
      else if (url.pathname === '/api/settings')
        body = {
          revision: 1,
          updatedAt: null,
          settings: {
            voiceURI: null,
            onlineLookupEnabled: true,
            learnBatchSize: 10,
            reviewBatchSize: 10,
            dailyNewWordTarget: 10,
          },
        };
      else if (url.pathname.endsWith('/active')) body = { session: null };
      else if (url.pathname === '/api/library/topic-summaries') {
        const c = url.searchParams.get('collection');
        // Deliberately send storage order, verifying the frontend sorts pairs itself.
        body = {
          topics: [...catalog, ...extension]
            .filter((p) => p.collectionId === c)
            .map((p) => ({
              ...p,
              total: 10,
              learned: p.part === 2 ? 0 : 10,
              processed: p.part === 2 ? 0 : 10,
            })),
        };
      } else if (url.pathname.endsWith('/entries')) {
        opened.push(url.pathname);
        body = { entries: [sample()] };
      }
      await route.fulfill({ json: body });
    });
    await page.goto(`http://127.0.0.1:${address.port}/?tab=learn`);
    await page.locator('.topic-row').nth(199).waitFor();
    assert.deepEqual(
      await page
        .locator('.topic-row strong')
        .allTextContents()
        .then((x) => x.slice(0, 4)),
      [
        'School Education',
        'School Education (Part 2)',
        'Higher Education',
        'Higher Education (Part 2)',
      ],
    );
    assert.equal(
      await page.locator('.topic-message').innerText(),
      '100 chủ đề · 200 phần học · 200 phần đã có nội dung',
    );
    assert.match(await page.locator('.topic-row').nth(0).innerText(), /10\/10/);
    assert.match(await page.locator('.topic-row').nth(1).innerText(), /0\/10/);
    await page.getByRole('button', { name: 'Part 2', exact: true }).click();
    assert.equal(await page.locator('.topic-row').count(), 100);
    await page.getByRole('searchbox').fill('Giáo dục phổ thông');
    assert.equal(await page.locator('.topic-row').count(), 1);
    await page.locator('.topic-row').click();
    await page.locator('.online-topic-words').waitFor();
    assert.equal(opened.at(-1), '/api/library/topics/ielts-001-part-2/entries');
    await page.getByRole('searchbox').fill('');
    await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
    await mkdir('.browser-check', { recursive: true });
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: '.browser-check/part2-desktop.png',
      animations: 'disabled',
    });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
      true,
    );
    await page
      .getByRole('button', { name: 'Giao tiếp hằng ngày', exact: true })
      .click();
    await page.waitForFunction(
      () =>
        document.querySelector('.topic-row strong')?.textContent ===
        'Introducing Yourself',
    );
    assert.deepEqual(
      (await page.locator('.topic-row strong').allTextContents()).slice(0, 2),
      ['Introducing Yourself', 'Introducing Yourself (Part 2)'],
    );
    await page.getByRole('button', { name: 'Part 1', exact: true }).click();
    assert.equal(await page.locator('.topic-row').count(), 100);
    await page.getByRole('button', { name: 'Tất cả', exact: true }).click();
    await page.locator('.topic-row').nth(1).scrollIntoViewIfNeeded();
    await page.mouse.move(0, 0);
    await page.screenshot({
      path: '.browser-check/part2-mobile.png',
      animations: 'disabled',
    });
    assert.deepEqual(errors, []);
  },
);
