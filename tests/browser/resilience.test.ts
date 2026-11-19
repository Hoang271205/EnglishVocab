import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createServer } from 'node:http';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

test(
  'study recovery, URL navigation and chunk error fallback in the built app',
  { timeout: 90000 },
  async (t) => {
    const server = createServer(async (request, response) => {
      const path = new URL(request.url ?? '/', 'http://localhost').pathname;
      const file = resolve('dist', path === '/' ? 'index.html' : '.' + path);
      if (!file.startsWith(resolve('dist') + '/')) {
        response.writeHead(404).end();
        return;
      }
      try {
        const body = await readFile(file);
        response.setHeader(
          'Content-Type',
          file.endsWith('.js')
            ? 'text/javascript'
            : file.endsWith('.css')
              ? 'text/css'
              : 'text/html',
        );
        response.end(body);
      } catch {
        response.writeHead(404).end();
      }
    });
    await new Promise<void>((resolve) =>
      server.listen(0, '127.0.0.1', resolve),
    );
    t.after(
      () => new Promise<void>((resolve) => server.close(() => resolve())),
    );
    const address = server.address();
    assert.ok(address && typeof address === 'object');
    const origin = `http://127.0.0.1:${address.port}`;
    const browser = await chromium.launch({
      channel: process.env.PLAYWRIGHT_CHANNEL ?? 'chrome',
      headless: true,
    });
    t.after(() => browser.close());
    const page = await browser.newPage();
    page.setDefaultTimeout(10000);
    let owner = 'alice';
    let mode: 'learn' | 'review' = 'learn';
    let pending = true;
    let version = 1;
    let failWrite = false;
    let profileRevision = 0;
    let displayName = '';
    let passwordWrites = 0;
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    function session() {
      const base = {
        id: mode + '-1',
        mode,
        version,
        phase: mode === 'learn' ? 'recall' : 'question',
        index: 0,
        total: 1,
        paused: false,
        draftAnswer: '',
        createdAt: 1,
      };
      return mode === 'learn'
        ? {
            ...base,
            skippedCount: 0,
            topicId: null,
            attemptId: 'attempt-1',
            front: null,
            hint: { meaningVi: 'xin chào', partOfSpeech: 'noun' },
          }
        : {
            ...base,
            question: {
              attemptId: 'attempt-1',
              meaningVi: 'xin chào',
              partOfSpeech: 'noun',
              prefix: '',
              suffix: '',
              cells: [{ kind: 'blank' }, { kind: 'blank' }],
            },
            feedback: null,
          };
    }
    await page.route('**/api/**', async (route) => {
      const path = new URL(route.request().url()).pathname;
      let body: unknown;
      if (path === '/api/auth/me')
        body = {
          user: {
            id: owner,
            name: displayName || owner,
            profileRevision,
            email: 'test@example.com',
            role: 'learner',
          },
        };
      else if (path === '/api/auth/profile') {
        const command = JSON.parse(route.request().postData()!);
        assert.equal(command.expectedRevision, profileRevision);
        displayName = command.name;
        assert.equal('avatarUrl' in command, false);
        profileRevision++;
        body = {
          user: {
            id: owner,
            name: displayName,
            email: 'test@example.com',
            role: 'learner',
            profileRevision,
          },
        };
      } else if (path === '/api/auth/change-password') {
        passwordWrites++;
        body = {
          user: {
            id: owner,
            name: displayName,
            email: 'test@example.com',
            role: 'learner',
            profileRevision,
          },
        };
      } else if (path === '/api/settings') {
        body = {
          revision: 1,
          updatedAt: null,
          settings: {
            voiceURI: null,
            learnBatchSize: 10,
            reviewBatchSize: 10,
            dailyNewWordTarget: 10,
            onlineLookupEnabled: true,
          },
        };
      } else if (path.endsWith('/active'))
        body = {
          session:
            pending && path.includes('/' + mode + '/') ? session() : null,
        };
      else if (path === `/api/study/${mode}/${mode}-1`)
        body = { session: session() };
      else if (path.endsWith('/action')) {
        if (failWrite) {
          await route.abort('failed');
          return;
        }
        version++;
        body = {
          session: {
            ...session(),
            draftAnswer: JSON.parse(route.request().postData()!).answer,
          },
        };
      } else if (path === '/api/progress/summary')
        body = {
          summary: {
            learnedCount: 0,
            masteredCount: 0,
            enabledCount: 0,
            disabledCount: 0,
            dueCount: 0,
            nextReviewAt: null,
            serverTime: Date.now(),
            levels: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          },
        };
      else if (path === '/api/library/topic-summaries') body = { topics: [] };
      else if (path === '/api/notebook/list')
        body = {
          rows: [],
          total: 0,
          enabledCount: 0,
          disabledCount: 0,
          scopeCount: 0,
          allCount: 0,
          page: 1,
          pageSize: 50,
        };
      else {
        await route.fulfill({
          status: 404,
          json: { error: { message: 'Unexpected fixture route: ' + path } },
        });
        return;
      }
      await route.fulfill({ json: body });
    });
    const resume = () =>
      page
        .getByRole('button', {
          name: mode === 'learn' ? 'Tiếp tục' : 'Tiếp tục ôn',
          exact: true,
        })
        .click();
    const recall = () => page.getByLabel('Viết lại từ hoặc cụm từ vừa học');
    await page.goto(origin);
    await resume();
    await recall().fill('draft answer');
    await page.reload();
    await resume();
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLInputElement>('input[type=text]')?.value ===
        'draft answer',
    );
    assert.equal(await recall().inputValue(), 'draft answer');
    await page.getByRole('button', { name: /Menu tài khoản của/ }).click();
    await page
      .getByRole('menuitem', { name: 'Cài đặt cá nhân', exact: true })
      .click();
    await page
      .getByRole('heading', { name: 'Cài đặt cá nhân', exact: true })
      .waitFor();
    await page
      .getByRole('button', { name: 'Trở lại bài đang học', exact: true })
      .click();
    assert.equal(await recall().inputValue(), 'draft answer');
    // A lost request leaves the local draft available for the reload path.
    failWrite = true;
    await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
    await page
      .getByRole('button', { name: 'Tải lại phiên', exact: true })
      .click();
    assert.equal(await recall().inputValue(), 'draft answer');
    failWrite = false;
    await page.getByRole('button', { name: 'Lưu nháp', exact: true }).click();
    await page.getByText('Bản nháp đã lưu.', { exact: true }).waitFor();
    assert.equal(
      await page.evaluate(
        () =>
          Object.keys(localStorage).filter((key) =>
            key.startsWith('englishvocab:study-draft:'),
          ).length,
      ),
      0,
    );
    await recall().fill('old version');
    version++;
    await page.reload();
    await resume();
    assert.equal(await recall().inputValue(), '');
    await recall().fill('alice secret');
    owner = 'bob';
    await page.reload();
    await resume();
    assert.equal(await recall().inputValue(), '');
    owner = 'alice';
    mode = 'review';
    version = 1;
    await page.reload();
    await resume();
    // Use the actual cloze controls, including its per-letter focus behavior.
    const inputs = page.locator('.cloze-sentence input');
    await inputs.nth(0).fill('h');
    await inputs.nth(1).fill('i');
    await page.reload();
    await resume();
    await page.waitForFunction(
      () =>
        Array.from(
          document.querySelectorAll<HTMLInputElement>('.cloze-sentence input'),
        )
          .map((input) => input.value)
          .join('') === 'hi',
    );
    assert.deepEqual(
      await inputs.evaluateAll((nodes) =>
        nodes.map((node) => (node as HTMLInputElement).value),
      ),
      ['h', 'i'],
    );
    pending = false;
    await page.goto(origin);
    await page
      .getByRole('navigation')
      .getByRole('button', { name: 'Học từ mới', exact: true })
      .click();
    assert.equal(new URL(page.url()).searchParams.get('tab'), 'learn');
    await page.reload();
    await page
      .getByRole('navigation')
      .getByRole('button', { name: 'Học từ mới', exact: true })
      .waitFor();
    assert.equal(
      await page
        .getByRole('navigation')
        .getByRole('button', { name: 'Học từ mới', exact: true })
        .getAttribute('aria-current'),
      'page',
    );
    await page
      .getByRole('navigation')
      .getByRole('button', { name: 'Ôn tập', exact: true })
      .click();
    await page.goBack();
    await page.waitForFunction(
      () => new URL(location.href).searchParams.get('tab') === 'learn',
    );
    assert.equal(
      await page
        .getByRole('navigation')
        .getByRole('button', { name: /Cài đặt/ })
        .count(),
      0,
    );
    const accountTrigger = () =>
      page.getByRole('button', { name: /Menu tài khoản của/ });
    await accountTrigger().click();
    await page.getByRole('menu').waitFor();
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('menu').count(), 0);
    assert.equal(
      await accountTrigger().evaluate(
        (node) => node === document.activeElement,
      ),
      true,
    );
    await accountTrigger().press('ArrowDown');
    await page
      .getByRole('menuitem', { name: 'Cài đặt cá nhân', exact: true })
      .click();
    await page
      .getByRole('heading', { name: 'Cài đặt cá nhân', exact: true })
      .waitFor();
    await page.getByLabel('Tên hiển thị').fill('Alice Updated');
    await page.getByRole('button', { name: 'Lưu hồ sơ', exact: true }).click();
    await page.getByText('Đã lưu hồ sơ cá nhân.', { exact: true }).waitFor();
    assert.equal(displayName, 'Alice Updated');
    assert.equal(
      await page.locator('.account-display-name').innerText(),
      'Alice Updated',
    );
    await page.reload();
    await page.waitForFunction(
      () =>
        document.querySelector<HTMLInputElement>('input[autocomplete=name]')
          ?.value === 'Alice Updated',
    );
    assert.equal(await page.locator('input[type=file]').count(), 0);
    assert.equal(new URL(page.url()).searchParams.get('tab'), 'settings');
    const settingsNav = () =>
      page.getByRole('navigation', { name: 'Cài đặt cá nhân', exact: true });
    assert.equal(
      await page.getByLabel('Mật khẩu hiện tại', { exact: true }).isVisible(),
      false,
    );
    await page.getByLabel('Tên hiển thị').fill('Alice Draft');
    await settingsNav()
      .getByRole('link', { name: 'Đổi mật khẩu', exact: true })
      .click();
    assert.equal(await page.getByLabel('Tên hiển thị').isVisible(), false);
    await settingsNav()
      .getByRole('link', { name: 'Thông tin cá nhân', exact: true })
      .click();
    assert.equal(
      await page.getByLabel('Tên hiển thị').inputValue(),
      'Alice Draft',
    );
    await page.getByLabel('Tên hiển thị').fill('Alice Updated');
    await settingsNav()
      .getByRole('link', { name: 'Đổi mật khẩu', exact: true })
      .click();
    await page.reload();
    await page.getByLabel('Mật khẩu hiện tại', { exact: true }).waitFor();
    assert.equal(await page.getByLabel('Tên hiển thị').isVisible(), false);
    assert.equal(new URL(page.url()).searchParams.get('section'), 'password');
    await page.goBack();
    await page.getByLabel('Tên hiển thị').waitFor();
    await page.goForward();
    await page.getByLabel('Mật khẩu hiện tại', { exact: true }).waitFor();
    await page
      .getByLabel('Mật khẩu hiện tại', { exact: true })
      .fill('old-password-test');
    await page
      .getByLabel('Mật khẩu mới', { exact: true })
      .fill('new-password-test');
    await page
      .getByLabel('Xác nhận mật khẩu mới', { exact: true })
      .fill('other-password-test');
    await page
      .getByRole('button', { name: 'Đổi mật khẩu', exact: true })
      .click();
    await page
      .getByText('Mật khẩu xác nhận chưa khớp.', { exact: true })
      .waitFor();
    assert.equal(passwordWrites, 0);
    await page
      .getByLabel('Xác nhận mật khẩu mới', { exact: true })
      .fill('new-password-test');
    await page
      .getByRole('button', { name: 'Đổi mật khẩu', exact: true })
      .click();
    await page.getByText(/Đã đổi mật khẩu/).waitFor();
    assert.equal(passwordWrites, 1);
    assert.equal(
      await page.getByLabel('Mật khẩu mới', { exact: true }).inputValue(),
      '',
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: '.browser-check/settings-password-desktop.png',
      fullPage: true,
    });
    await settingsNav()
      .getByRole('link', { name: 'Thông tin cá nhân', exact: true })
      .click();
    await page.mouse.move(0, 0);
    assert.equal(
      await settingsNav()
        .getByRole('link', { name: 'Thông tin cá nhân', exact: true })
        .getAttribute('aria-current'),
      'page',
    );
    await mkdir('.browser-check', { recursive: true });
    await page.setViewportSize({ width: 1440, height: 1100 });
    await page.screenshot({
      path: '.browser-check/settings-desktop.png',
      fullPage: true,
    });
    await page.setViewportSize({ width: 390, height: 1100 });
    await page.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await page.screenshot({
      path: '.browser-check/settings-mobile.png',
      fullPage: true,
      animations: 'disabled',
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      true,
    );
    assert.deepEqual(errors, []);
    await accountTrigger().click();
    await page.getByRole('menu').waitFor();
    const triggerBox = await accountTrigger().boundingBox();
    const menuBox = await page.getByRole('menu').boundingBox();
    assert.ok(
      triggerBox && menuBox && menuBox.y >= triggerBox.y + triggerBox.height,
    );
    assert.ok(menuBox.x >= 0 && menuBox.x + menuBox.width <= 390);
    await page.screenshot({
      path: '.browser-check/account-menu-mobile.png',
      fullPage: false,
    });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.screenshot({
      path: '.browser-check/account-menu-desktop.png',
      fullPage: false,
    });
    await page
      .getByRole('heading', { name: 'Cài đặt cá nhân', exact: true })
      .click();
    assert.equal(await page.getByRole('menu').count(), 0);
    await accountTrigger().click();
    await page.route('**/api/auth/logout', (route) =>
      route.fulfill({ status: 204 }),
    );
    await page.route('**/api/auth/me', (route) =>
      route.fulfill({
        status: 401,
        json: { error: { message: 'Unauthorized' } },
      }),
    );
    const logoutResponse = page.waitForResponse('**/api/auth/logout');
    await page
      .getByRole('menuitem', { name: 'Đăng xuất', exact: true })
      .click();
    await logoutResponse;
    await page
      .getByRole('button', { name: /Menu tài khoản của/ })
      .waitFor({ state: 'hidden' });
    // A fresh page ensures the failed lazy chunk is not already in module cache.
    const broken = await browser.newPage();
    await broken.route('**/chunks/WelcomePage-*.js', (route) =>
      route.abort('failed'),
    );
    await broken.route('**/api/auth/me', (route) =>
      route.fulfill({
        status: 401,
        json: { error: { message: 'Unauthorized' } },
      }),
    );
    await broken.goto(origin);
    await broken
      .getByRole('heading', { name: 'Chưa mở được giao diện' })
      .waitFor();
    assert.equal(
      await broken
        .getByRole('button', { name: 'Tải lại trang', exact: true })
        .isVisible(),
      true,
    );
  },
);
