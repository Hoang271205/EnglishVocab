import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { sample } from '../fixtures';

test(
  'motion preserves input, confirmed saves, reduced motion and responsive interaction',
  { timeout: 90000 },
  async (t) => {
    const server = createServer(async (req, res) => {
      const path = new URL(req.url ?? '/', 'http://localhost').pathname;
      const file = resolve('dist', path === '/' ? 'index.html' : '.' + path);
      if (!file.startsWith(resolve('dist') + '/'))
        return void res.writeHead(404).end();
      try {
        const body = await readFile(file);
        res.setHeader(
          'Content-Type',
          file.endsWith('.js')
            ? 'text/javascript'
            : file.endsWith('.css')
              ? 'text/css'
              : file.endsWith('.webp')
                ? 'image/webp'
                : file.endsWith('.svg')
                  ? 'image/svg+xml'
                  : 'text/html',
        );
        res.end(body);
      } catch {
        res.writeHead(404).end();
      }
    });
    await new Promise<void>((ok) => server.listen(0, '127.0.0.1', ok));
    t.after(() => new Promise<void>((ok) => server.close(() => ok())));
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const origin = `http://127.0.0.1:${address.port}`;
    const browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
      headless: true,
    });
    t.after(() => browser.close());
    const page = await browser.newPage({
      hasTouch: true,
      viewport: { width: 390, height: 844 },
    });
    page.setDefaultTimeout(8000);
    const cdp = await page.context().newCDPSession(page);
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const entry = sample();
    let mode: 'none' | 'review' = 'none';
    let signedIn = true;
    let index = 0,
      phase = 'question',
      revision = 0;
    let heldSave: (() => void) | undefined;
    let saveWrites = 0;
    const user = () => ({
      id: 'motion-user',
      name: 'Learner',
      email: 'test@example.com',
      role: 'learner',
      profileRevision: revision,
    });
    const session = () => ({
      id: 'motion-session',
      mode: 'review',
      version: index * 2 + (phase === 'feedback' ? 2 : 1),
      phase,
      index,
      total: 30,
      paused: false,
      draftAnswer: '',
      createdAt: 1,
      question:
        phase === 'question'
          ? {
              attemptId: `attempt-${index}`,
              meaningVi: 'sở thích',
              partOfSpeech: 'noun',
              prefix: 'My favorite ',
              suffix: ' is reading.',
              cells: Array.from({ length: 5 }, () => ({ kind: 'blank' })),
            }
          : null,
      feedback:
        phase === 'feedback'
          ? {
              entry,
              example: entry.examples[0],
              event: { id: `event-${index}`, correct: true },
              progress: { level: 2, nextReviewAt: Date.now() + 7200000 },
            }
          : null,
      reviewedCount: phase === 'complete' ? 1 : undefined,
      correctCount: phase === 'complete' ? 1 : undefined,
    });
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown;
      if (path === '/api/auth/me') {
        if (!signedIn) {
          await route.fulfill({
            status: 401,
            json: { error: { message: 'Unauthenticated' } },
          });
          return;
        }
        body = { user: user() };
      } else if (path === '/api/settings')
        body = {
          revision: 1,
          settings: {
            voiceURI: null,
            onlineLookupEnabled: false,
            learnBatchSize: 10,
            reviewBatchSize: 10,
            dailyNewWordTarget: 10,
          },
        };
      else if (path === '/api/auth/profile') {
        saveWrites++;
        await new Promise<void>((ok) => {
          heldSave = ok;
        });
        revision++;
        body = { user: user() };
      } else if (path.endsWith('/active'))
        body = {
          session:
            mode === 'review' && path.includes('/review/') ? session() : null,
        };
      else if (path === '/api/study/review/motion-session')
        body = { session: session() };
      else if (path.endsWith('/answer')) {
        phase = 'feedback';
        body = {
          kind: 'committed',
          event: { id: `event-${index}`, correct: true },
          session: session(),
        };
      } else if (path.endsWith('/action')) {
        index++;
        phase = 'question';
        body = { session: session() };
      } else if (path === '/api/library/topic-summaries')
        body = {
          topics: [
            {
              id: 'topic',
              collectionId: 'ielts',
              order: 1,
              nameEn: 'Hobbies',
              nameVi: 'Sở thích',
              entryIds: [entry.id],
              total: 1,
              learned: 0,
              processed: 0,
            },
          ],
        };
      else if (path.endsWith('/entries')) body = { entries: [entry] };
      else if (path === '/api/notebook/list')
        body = {
          rows: [{ entry, progress: null, reviewEnabled: true, saved: true }],
          total: 1,
          enabledCount: 1,
          disabledCount: 0,
          scopeCount: 1,
          allCount: 1,
          page: 1,
          pageSize: 50,
        };
      else if (path === '/api/notebook/entries/' + entry.id)
        body = {
          row: { entry, progress: null, reviewEnabled: true, saved: true },
        };
      else if (path === '/api/transfers/sources/' + entry.id)
        body = { sources: [] };
      else if (path === '/api/progress/summary')
        body = {
          summary: {
            learnedCount: 1,
            masteredCount: 0,
            dueCount: 1,
            enabledCount: 1,
            disabledCount: 0,
            nextReviewAt: null,
            serverTime: Date.now(),
            levels: { 1: 1, 2: 0, 3: 0, 4: 0, 5: 0 },
          },
        };
      else throw new Error(`Unexpected request: ${path}`);
      await route.fulfill({ json: body });
    });
    const out = '.browser-check/motion';
    await mkdir(out, { recursive: true });
    await page.goto(origin + '/?tab=settings');
    await page.getByLabel('Tên hiển thị').fill('Learner');
    await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
    await page.waitForFunction(() =>
      document.querySelector('button[aria-busy="true"]'),
    );
    assert.equal(
      await page.locator('.ui-message--success').count(),
      0,
      'no optimistic success',
    );
    assert.equal(saveWrites, 1);
    assert.ok(heldSave);
    heldSave();
    await page.locator('.ui-message--success').waitFor();
    assert.equal(await page.locator('.save-success-icon').count(), 1);
    await page.screenshot({ path: out + '/saved-mobile.png', fullPage: true });

    const main = await page.locator('#workspace-content').elementHandle();
    const header = await page.locator('.site-header').elementHandle();
    for (const [label, tab] of [
      ['Ôn tập', 'review'],
      ['Học từ mới', 'learn'],
      ['Sổ tay', 'notebook'],
      ['Ôn tập', 'review'],
    ] as const) {
      await page
        .getByRole('navigation', { name: 'Điều hướng chính' })
        .getByRole('button', { name: label, exact: true })
        .click();
      assert.equal(
        await page
          .locator('#workspace-content')
          .getAttribute('data-workspace-view'),
        tab,
      );
      assert.equal(
        await page
          .locator('#workspace-content')
          .evaluate((el, original) => el === original, main),
        true,
      );
      assert.equal(
        await page
          .locator('.site-header')
          .evaluate((el, original) => el === original, header),
        true,
      );
      assert.equal(
        await page
          .locator('#workspace-content')
          .evaluate((el) => getComputedStyle(el).animationName),
        `workspace-${tab}-in`,
      );
      assert.equal(
        await page
          .locator('.site-header')
          .evaluate((el) => getComputedStyle(el).animationName),
        'none',
      );
    }
    await page.goBack();
    assert.equal(
      await page
        .locator('#workspace-content')
        .getAttribute('data-workspace-view'),
      'notebook',
    );
    await page.goForward();
    await page
      .getByRole('button', { name: 'Giải thích Level', exact: true })
      .waitFor();
    for (const width of [320, 390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      const info = page.getByRole('button', {
        name: 'Giải thích Level',
        exact: true,
      });
      await info.focus();
      await page.keyboard.press('Enter');
      const panel = page.getByRole('region', { name: 'Về Level', exact: true });
      await panel.waitFor();
      const box = await panel.boundingBox();
      assert.ok(box && box.x >= 15 && box.x + box.width <= width - 15);
      await page.keyboard.press('Escape');
      assert.equal(await info.getAttribute('aria-expanded'), 'false');
      assert.equal(
        await info.evaluate((el) => el === document.activeElement),
        true,
      );
      await info.tap();
      await panel.waitFor();
      await panel.getByRole('button', { name: 'Đóng giải thích' }).click();
      assert.equal(
        await info.evaluate((el) => el === document.activeElement),
        true,
      );
    }
    await page.setViewportSize({ width: 390, height: 844 });
    const info = page.getByRole('button', {
      name: 'Giải thích CEFR',
      exact: true,
    });
    await info.tap();
    await page.getByRole('region', { name: 'Về CEFR' }).waitFor();
    const cefrBox = await page
      .getByRole('region', { name: 'Về CEFR' })
      .boundingBox();
    assert.ok(cefrBox && cefrBox.y >= 0 && cefrBox.y + cefrBox.height <= 844);
    await page
      .getByRole('region', { name: 'Về CEFR' })
      .evaluate((el) =>
        Promise.all(
          el
            .getAnimations()
            .map((animation) => animation.finished.catch(() => {})),
        ),
      );
    await page.screenshot({
      path: out + '/cefr-popover-mobile.png',
      fullPage: false,
    });
    assert.equal(
      await page.getByRole('region', { name: 'Về CEFR' }).isVisible(),
      true,
    );
    await page.locator('.site-header').click({ position: { x: 12, y: 12 } });
    assert.equal(await info.getAttribute('aria-expanded'), 'false');
    const menu = page.getByRole('button', {
      name: 'Menu tài khoản của Learner',
    });
    await menu.focus();
    await page.keyboard.press('ArrowDown');
    const settings = page.getByRole('menuitem', { name: 'Cài đặt cá nhân' });
    await settings.waitFor();
    assert.equal(
      await settings.evaluate((el) => el === document.activeElement),
      true,
    );
    await page.keyboard.press('End');
    assert.equal(
      await page
        .getByRole('menuitem', { name: 'Đăng xuất' })
        .evaluate((el) => el === document.activeElement),
      true,
    );
    await page.keyboard.press('Home');
    await page.keyboard.press('Escape');
    assert.equal(
      await menu.evaluate((el) => el === document.activeElement),
      true,
    );
    await menu.tap();
    assert.equal(
      await page
        .locator('.account-menu-panel')
        .evaluate((el) => getComputedStyle(el).animationName),
      'contextual-panel-in',
    );
    await page.keyboard.press('Escape');

    for (const tab of ['learn', 'notebook']) {
      await page.goto(origin + `/?tab=${tab}`);
      await page
        .locator(tab === 'learn' ? '.topic-row' : '.cloud-word-select')
        .first()
        .click();
      const detail = page.locator(
        tab === 'learn' ? '.topic-dropdown' : '.cloud-entry-details',
      );
      await detail.waitFor();
      assert.equal(
        await detail.evaluate((el) => getComputedStyle(el).animationName),
        'hci-surface-in',
      );
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      if (tab === 'notebook') {
        await page
          .getByRole('button', { name: 'Giải thích CEFR', exact: true })
          .tap();
        await page.getByRole('region', { name: 'Về CEFR' }).waitFor();
        await page.keyboard.press('Escape');
      }
    }
    mode = 'review';
    await page.goto(origin + '/?tab=review');
    await page
      .getByRole('button', { name: 'Tiếp tục ôn', exact: true })
      .click();
    await page.locator('.cloze-cell input').first().waitFor();
    await page.evaluate(() => {
      Object.assign(window, { cardStarts: 0 });
      document.addEventListener('animationstart', (e) => {
        if ((e.target as Element).matches('.study-card'))
          (window as unknown as { cardStarts: number }).cardStarts++;
      });
    });
    await page
      .locator('.study-card')
      .evaluate((el) =>
        Promise.all(el.getAnimations().map((a) => a.finished.catch(() => {}))),
      );
    const starts = await page.evaluate(
      () => (window as unknown as { cardStarts: number }).cardStarts,
    );
    const first = await page
      .locator('.cloze-cell input')
      .first()
      .elementHandle();
    for (const value of ['h', 'o', 'b', 'b', 'y'])
      await page.keyboard.type(value);
    assert.equal(
      await page
        .locator('.cloze-cell input')
        .first()
        .evaluate((el, other) => el === other, first),
      true,
    );
    assert.equal(
      await page.evaluate(
        () => (window as unknown as { cardStarts: number }).cardStarts,
      ),
      starts,
      'typing must not restart animation',
    );
    const report = [];
    // Warm the real question/feedback components before comparing steady-state motion.
    for (let warm = 0; warm < 2; warm++) {
      const inputs = page.locator('.cloze-cell input');
      for (let i = 0; i < 5; i++) await inputs.nth(i).fill('hobby'[i]!);
      await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click();
      await page.getByText('Đúng rồi!', { exact: true }).waitFor();
      await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
      await page.locator('.cloze-cell input').first().waitFor();
    }
    for (const motion of ['no-preference', 'reduce'] as const) {
      await page.emulateMedia({ reducedMotion: motion });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
      await page.evaluate(`(() => {
        const metrics = { frames: [], longTasks: [], running: true, last: 0 };
        window.motionMetrics = metrics;
        const observer = new PerformanceObserver(list => list.getEntries().forEach(e => metrics.longTasks.push(e.duration)));
        observer.observe({entryTypes: ['longtask']});
        function frame(now) {
          if(metrics.last) metrics.frames.push(now - metrics.last);
          metrics.last = now;
          if(metrics.running) requestAnimationFrame(frame);
          else observer.disconnect();
        }
        requestAnimationFrame(frame);
      })()`);
      for (let n = 0; n < 6; n++) {
        const inputs = page.locator('.cloze-cell input');
        for (let i = 0; i < 5; i++) await inputs.nth(i).fill('hobby'[i]!);
        await page
          .getByRole('button', { name: 'Kiểm tra', exact: true })
          .click();
        await page.getByText('Đúng rồi!', { exact: true }).waitFor();
        assert.equal(
          await page.locator('.learning-confetti').count(),
          0,
          'per-answer confetti must not run',
        );
        if (motion === 'reduce')
          assert.equal(
            await page
              .locator('.feedback-status-icon')
              .evaluate((el) => getComputedStyle(el).animationName),
            'none',
          );
        await page
          .getByRole('button', { name: 'Tiếp tục', exact: true })
          .click();
        await page.locator('.cloze-cell input').first().waitFor();
        if (motion === 'reduce')
          assert.equal(
            await page
              .locator('.study-card')
              .evaluate((el) => getComputedStyle(el).animationName),
            'none',
          );
      }
      const measured = await page.evaluate(() => {
        const m = (
          window as unknown as {
            motionMetrics: {
              frames: number[];
              longTasks: number[];
              running: boolean;
            };
          }
        ).motionMetrics;
        m.running = false;
        const frames = [...m.frames].sort((a, b) => a - b);
        return {
          frameCount: frames.length,
          p95FrameMs: frames[Math.floor(frames.length * 0.95)],
          maxFrameMs: Math.max(...frames),
          longTasks: m.longTasks,
        };
      });
      report.push({ motion, cpuThrottle: 4, ...measured });
    }
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.evaluate(() => {
      document.documentElement.dataset.motion = 'reduced';
    });
    assert.equal(
      await page
        .locator('.study-card')
        .evaluate((el) => getComputedStyle(el).animationName),
      'none',
    );
    assert.equal(
      await page
        .getByText('Đang xử lý thao tác của bạn…', { exact: true })
        .count(),
      0,
    );
    await page.screenshot({
      path: out + '/question-mobile.png',
      fullPage: true,
    });
    await page.evaluate(() => {
      document.documentElement.dataset.motion = 'system';
    });
    phase = 'complete';
    await page.goto(origin + '/?tab=review');
    await page
      .getByRole('button', { name: 'Tiếp tục ôn', exact: true })
      .click();
    await page
      .locator('.session-summary .mascot[data-gesture="celebrate"]')
      .waitFor();
    assert.equal(
      await page
        .locator('.session-summary .mascot img')
        .evaluate((el) => getComputedStyle(el).animationIterationCount),
      '1',
    );
    await page.screenshot({
      path: out + '/completed-mobile.png',
      fullPage: true,
    });
    await page.reload();
    await page
      .getByRole('button', { name: 'Tiếp tục ôn', exact: true })
      .click();
    await page.locator('.session-summary .mascot img').waitFor();
    assert.equal(
      await page
        .locator('.session-summary .mascot')
        .getAttribute('data-gesture'),
      null,
      'completion does not replay after reload',
    );
    signedIn = false;
    mode = 'none';
    await page.goto(origin);
    await page
      .locator('.welcome-mascot-button .mascot[data-gesture="greet"]')
      .waitFor();
    await page.getByRole('button', { name: 'Chào linh thú đồng hành' }).click();
    assert.equal(
      await page
        .locator('.welcome-mascot-button .mascot img')
        .evaluate((el) => getComputedStyle(el).animationIterationCount),
      '1',
    );
    await page.reload();
    await page.locator('.welcome-mascot-button .mascot img').waitFor();
    assert.equal(
      await page
        .locator('.welcome-mascot-button .mascot')
        .getAttribute('data-gesture'),
      null,
      'greeting does not replay after reload',
    );
    assert.deepEqual(errors, []);
    await writeFile(
      out + '/performance.json',
      JSON.stringify(
        {
          note: 'Actual built app; intercepted API fixtures; synthetic 4x CPU throttle, not physical mobile benchmark. Frame intervals include browser automation, layout and existing mascot activity.',
          report,
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify(report));
  },
);
