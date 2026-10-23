import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { sample } from '../fixtures';

// Run after build:frontend. Uses a separate, headless Chrome profile and mock APIs.
test(
  'page navigation reuses data, refreshes stale views and invalidates after writes',
  { timeout: 60_000 },
  async (t) => {
    const files = new Map<string, Buffer>(
      await Promise.all(
        ['index.html', 'app.js', 'app.css'].map(
          async (name) =>
            [
              `/${name === 'index.html' ? '' : name}`,
              await readFile(new URL(`../../dist/${name}`, import.meta.url)),
            ] as const,
        ),
      ),
    );
    const server = createServer((request, response) => {
      const body = files.get(request.url ?? '/');
      response.writeHead(body ? 200 : 404, {
        'Content-Type': request.url?.endsWith('.js')
          ? 'text/javascript'
          : request.url?.endsWith('.css')
            ? 'text/css'
            : 'text/html',
      });
      response.end(body);
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    t.after(
      () => new Promise<void>((resolve) => server.close(() => resolve())),
    );
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
      headless: true,
    });
    t.after(() => browser.close());
    const page = await browser.newPage();
    await page.setViewportSize({ width: 1440, height: 1000 });
    const screenshots = new URL('../../.browser-check/', import.meta.url);
    await mkdir(screenshots, { recursive: true });
    let releaseAuth!: () => void;
    const authReady = new Promise<void>((resolve) => {
      releaseAuth = resolve;
    });
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    let now = Date.now();
    await page.clock.setFixedTime(now);
    const counts = new Map<string, number>();
    let reviewEnabled = true;
    let account = 'Alice';
    let failNotebook = false;
    let holdNotebook: Promise<void> | null = null;
    const entry = sample();
    const settings = {
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
    await page.route('**/api/**', async (route) => {
      const url = new URL(route.request().url());
      const key = `${route.request().method()} ${url.pathname}${url.search}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
      let body: unknown;
      if (
        url.pathname === '/api/auth/me' ||
        url.pathname === '/api/auth/login'
      ) {
        if (url.pathname === '/api/auth/me') await authReady;
        body = {
          user: {
            id: account,
            name: account,
            email: 'test@example.com',
            role: 'learner',
          },
        };
      } else if (url.pathname === '/api/auth/logout') {
        body = {};
      } else if (url.pathname === '/api/settings') {
        body = settings;
      } else if (url.pathname.endsWith('/active')) {
        body = { session: null };
      } else if (url.pathname === '/api/progress/summary') {
        body = {
          summary: {
            learnedCount: 1,
            masteredCount: 0,
            enabledCount: reviewEnabled ? 1 : 0,
            disabledCount: reviewEnabled ? 0 : 1,
            dueCount: reviewEnabled ? 1 : 0,
            nextReviewAt: null,
            serverTime: now,
            levels: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 0 },
          },
        };
      } else if (url.pathname === '/api/library/topic-summaries') {
        const collection = url.searchParams.get('collection');
        body = {
          topics: [
            {
              id: `${collection}-topic`,
              collectionId: collection,
              order: 1,
              nameEn: `${collection} topic`,
              nameVi: `Chủ đề ${collection}`,
              entryIds: [entry.id],
              total: 1,
              learned: 0,
              processed: 0,
            },
          ],
        };
      } else if (url.pathname.endsWith('/entries')) {
        body = { entries: [entry] };
      } else if (url.pathname.endsWith('/review-preference')) {
        reviewEnabled = JSON.parse(route.request().postData()!).reviewEnabled;
        body = { preference: { entryId: entry.id, reviewEnabled } };
      } else if (url.pathname === '/api/notebook') {
        if (holdNotebook) await holdNotebook;
        if (failNotebook) {
          await route.fulfill({
            status: 503,
            json: { error: { message: 'Test unavailable' } },
          });
          return;
        }
        body = {
          rows: [
            {
              entry,
              reviewEnabled,
              saved: true,
              progress: {
                entryId: entry.id,
                level: 1,
                learnedAt: now,
                lastReviewedAt: null,
                nextReviewAt: now,
                correctCount: 0,
                wrongCount: 0,
                version: 1,
              },
            },
          ],
        };
      } else if (url.pathname.startsWith('/api/transfers/sources/')) {
        body = { sources: [] };
      } else {
        throw new Error(`Unexpected API request: ${key}`);
      }
      await route.fulfill({ json: body });
    });
    const count = (path: string) => counts.get(`GET ${path}`) ?? 0;
    const nav = (name: string) =>
      page
        .getByRole('navigation')
        .getByRole('button', { name, exact: true })
        .click();
    const word = () => page.locator('.cloud-word-select');
    await page.goto(`http://127.0.0.1:${address.port}`);
    await t.test(
      'authentication uses a responsive, accessible skeleton with reduced motion support',
      async () => {
        const skeleton = page.locator('.loading-skeleton--auth');
        await skeleton.waitFor();
        assert.equal(await skeleton.getAttribute('role'), 'status');
        assert.equal(await skeleton.getAttribute('aria-busy'), 'true');
        assert.equal(await page.locator('.ui-message').count(), 0);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(
          await skeleton
            .locator('.skeleton-block')
            .first()
            .evaluate(
              (element) => getComputedStyle(element, '::after').animationName,
            ),
          'none',
        );
        await page.screenshot({
          path: fileURLToPath(
            new URL('skeleton-auth-desktop.png', screenshots),
          ),
          fullPage: true,
        });
        await page.setViewportSize({ width: 390, height: 844 });
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= window.innerWidth,
          ),
        );
        await page.screenshot({
          path: fileURLToPath(new URL('skeleton-auth-mobile.png', screenshots)),
          fullPage: true,
        });
        await page.setViewportSize({ width: 1440, height: 1000 });
        await page.emulateMedia({ reducedMotion: 'no-preference' });
        assert.equal(
          await skeleton
            .locator('.skeleton-block')
            .first()
            .evaluate(
              (element) => getComputedStyle(element, '::after').animationName,
            ),
          'skeleton-shimmer',
        );
      },
    );
    releaseAuth();
    await page.getByRole('heading', { name: 'Bắt đầu ôn tập' }).waitFor();

    await t.test(
      'all three main pages reuse completed requests during rapid navigation',
      async () => {
        await nav('Học từ mới');
        await page.getByRole('button', { name: /ielts topic/ }).waitFor();
        let release!: () => void;
        holdNotebook = new Promise<void>((resolve) => {
          release = resolve;
        });
        const firstNotebookRequest = page.waitForRequest('**/api/notebook');
        await nav('Sổ tay');
        await firstNotebookRequest;
        await nav('Ôn tập');
        await nav('Sổ tay');
        assert.equal(count('/api/notebook'), 1);
        await page.locator('.loading-skeleton--list').waitFor();
        await page.screenshot({
          path: fileURLToPath(
            new URL('skeleton-notebook-desktop.png', screenshots),
          ),
          fullPage: true,
        });
        release();
        holdNotebook = null;
        await word().waitFor();
        await page.evaluate(() => {
          const flashes: string[] = [];
          Object.assign(window, { loadingFlashes: flashes });
          new MutationObserver(() => {
            if (document.querySelector('.loading-skeleton')) {
              flashes.push(document.body.textContent ?? '');
            }
          }).observe(document.body, { childList: true, subtree: true });
        });
        for (let index = 0; index < 4; index++) {
          await nav('Ôn tập');
          await page.getByRole('heading', { name: 'Bắt đầu ôn tập' }).waitFor();
          await nav('Học từ mới');
          await page.getByRole('button', { name: /ielts topic/ }).waitFor();
          await nav('Sổ tay');
          await word().waitFor();
        }
        assert.equal(count('/api/progress/summary'), 1);
        assert.equal(count('/api/library/topic-summaries?collection=ielts'), 1);
        assert.equal(count('/api/notebook'), 1);
        assert.deepEqual(await page.evaluate('window.loadingFlashes'), []);
        const manualRefresh = page.waitForResponse('**/api/notebook');
        await page
          .getByRole('button', { name: 'Làm mới', exact: true })
          .click();
        await manualRefresh;
        await nav('Ôn tập');
        await page.getByRole('heading', { name: 'Bắt đầu ôn tập' }).waitFor();
        await nav('Học từ mới');
        await page.getByRole('button', { name: /ielts topic/ }).waitFor();
        await nav('Sổ tay');
        await word().waitFor();
        assert.equal(count('/api/notebook'), 2);
        assert.equal(count('/api/progress/summary'), 1);
        assert.equal(count('/api/library/topic-summaries?collection=ielts'), 1);
      },
    );

    await t.test(
      'collections and reopened topic/word details also reuse cached data',
      async () => {
        await word().click();
        await page.getByRole('heading', { name: 'Chi tiết từ' }).waitFor();
        await page.getByRole('button', { name: 'Đóng chi tiết' }).click();
        await word().click();
        await page.getByRole('heading', { name: 'Chi tiết từ' }).waitFor();
        assert.equal(count(`/api/transfers/sources/${entry.id}`), 1);
        await nav('Học từ mới');
        await page.getByRole('button', { name: /ielts topic/ }).click();
        await page
          .getByRole('button', { name: 'Bắt đầu học', exact: true })
          .waitFor();
        await page
          .getByRole('button', { name: 'Đóng thông tin chủ đề' })
          .click();
        await page.getByRole('button', { name: /ielts topic/ }).click();
        await page
          .getByRole('button', { name: 'Bắt đầu học', exact: true })
          .waitFor();
        assert.equal(count('/api/library/topics/ielts-topic/entries'), 1);
        await page
          .getByRole('button', { name: 'Giao tiếp hằng ngày', exact: true })
          .click();
        await page.getByRole('button', { name: /daily topic/ }).waitFor();
        await page
          .getByRole('button', { name: 'IELTS Vocabulary', exact: true })
          .click();
        await page.getByRole('button', { name: /ielts topic/ }).waitFor();
        assert.equal(count('/api/library/topic-summaries?collection=ielts'), 1);
        assert.equal(count('/api/library/topic-summaries?collection=daily'), 1);
      },
    );

    await t.test(
      'stale data stays visible during refresh and after a network error',
      async () => {
        now += 31_000;
        await page.clock.setFixedTime(now);
        let release!: () => void;
        holdNotebook = new Promise<void>((resolve) => {
          release = resolve;
        });
        failNotebook = true;
        const response = page.waitForResponse('**/api/notebook');
        await nav('Sổ tay');
        await word().waitFor();
        assert.equal(await page.locator('.loading-skeleton').count(), 0);
        release();
        holdNotebook = null;
        await response;
        await page.getByText('Test unavailable', { exact: true }).waitFor();
        assert.equal(await word().isVisible(), true);
        failNotebook = false;
        const retry = page.waitForResponse('**/api/notebook');
        await page
          .getByRole('button', { name: 'Làm mới', exact: true })
          .click();
        await retry;
        await page
          .getByText('Test unavailable', { exact: true })
          .waitFor({ state: 'hidden' });
        assert.equal(await word().isVisible(), true);
      },
    );

    await t.test(
      'writes invalidate cached progress, topics and notebook immediately',
      async () => {
        const summaryBefore = count('/api/progress/summary');
        const topicsBefore = count(
          '/api/library/topic-summaries?collection=ielts',
        );
        const notebookRefresh = page.waitForResponse('**/api/notebook');
        // The controlled checkbox reflects server confirmation after the reload.
        await page.locator('.cloud-row-actions input[type=checkbox]').click();
        await notebookRefresh;
        await page.waitForFunction(
          () =>
            document.querySelector<HTMLInputElement>(
              '.cloud-row-actions input[type=checkbox]',
            )?.checked === false,
        );
        await nav('Ôn tập');
        await page.getByRole('heading', { name: 'Bắt đầu ôn tập' }).waitFor();
        assert.equal(count('/api/progress/summary'), summaryBefore + 1);
        assert.equal(
          await page
            .locator('.dashboard-stats article')
            .filter({ hasText: 'Từ đến hạn' })
            .locator('strong')
            .textContent(),
          '0',
        );
        await nav('Học từ mới');
        await page.getByRole('button', { name: /ielts topic/ }).waitFor();
        assert.equal(
          count('/api/library/topic-summaries?collection=ielts'),
          topicsBefore + 1,
        );
      },
    );

    await t.test(
      'logout and login do not reuse the previous account cache',
      async () => {
        const before = count('/api/settings');
        await page
          .getByRole('button', { name: 'Đăng xuất', exact: true })
          .click();
        await page
          .getByLabel('Email', { exact: true })
          .fill('test@example.com');
        await page
          .getByLabel('Mật khẩu', { exact: true })
          .fill('test-password-only');
        account = 'Bob';
        await page
          .getByRole('button', { name: 'Đăng nhập', exact: true })
          .click();
        await page.getByRole('heading', { name: 'Chào Bob!' }).waitFor();
        await page.getByRole('heading', { name: 'Bắt đầu ôn tập' }).waitFor();
        assert.ok(count('/api/settings') > before);
        await nav('Sổ tay');
        await word().waitFor();
      },
    );
    assert.deepEqual(errors, []);
  },
);
