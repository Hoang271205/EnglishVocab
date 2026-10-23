import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { extname, resolve } from 'node:path';
import assert from 'node:assert/strict';

// The server uses an ephemeral port and a fresh browser context: user progress is never opened.
const root = resolve('dist');
assert.ok(existsSync(resolve(root, 'index.html')), 'Run npm run build first.');
const mime = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
};
const server = createServer(async (req, res) => {
  try {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const path = resolve(
      root,
      '.' + (pathname === '/' ? '/index.html' : pathname),
    );
    if (!path.startsWith(root + '/')) {
      res.writeHead(403).end();
      return;
    }
    res.setHeader(
      'Content-Type',
      mime[extname(path)] ?? 'application/octet-stream',
    );
    res.end(await readFile(path));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const chrome =
  process.env.CHROME_PATH ??
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
let browser;
const checks = [],
  errors = [];
try {
  browser = await chromium.launch({
    headless: true,
    ...(existsSync(chrome) ? { executablePath: chrome } : {}),
  });
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('http://127.0.0.1:' + server.address().port);
  await page.getByRole('button', { name: 'Sổ tay', exact: true }).click();
  await page
    .getByRole('button', { name: 'Thêm từ cá nhân', exact: true })
    .click();
  await page
    .getByLabel('Từ hoặc cụm từ tiếng Anh', { exact: true })
    .fill('stargazing');
  await page
    .getByLabel('Ghi chú cá nhân', { exact: true })
    .fill('Ghi chú kiểm tra FE05');
  await page.getByRole('button', { name: 'Lưu bản nháp', exact: true }).click();
  await page
    .getByRole('heading', { name: 'stargazing', exact: true })
    .waitFor();
  assert.match(
    await page
  .getByRole('region', {
    name: 'Chi tiết từ',
    exact: true,
  })
  .innerText(),
    /chưa có level ghi nhớ/,
  );
  await page
    .getByRole('button', { name: 'Nghe từ · Mỹ', exact: true })
    .waitFor();
  checks.push(
    'Create draft without IPA/meaning, retain notes, show no fake level and offer US TTS',
  );
  console.log(checks.at(-1));
  await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
  await page.getByLabel('Từ loại', { exact: true }).fill('n.');
  await page.getByLabel(/^Nghĩa tiếng Việt/).fill('ngắm sao');
  await page
    .getByLabel('Câu ví dụ tiếng Anh', { exact: true })
    .fill('My favorite hobby is stargazing.');
  await page
    .getByLabel('Từ/cụm từ xuất hiện trong câu', { exact: true })
    .fill('stargazing');
  await page.getByRole('button', { name: 'Lưu để học', exact: true }).click();
  await page
    .getByRole('button', {
      name: 'Học từ này / tiếp tục phiên dở',
      exact: true,
    })
    .click();
  await page
    .getByRole('button', { name: 'Next — Viết lại từ', exact: true })
    .waitFor();
  checks.push('Complete draft and open a real one-word study session');
  console.log(checks.at(-1));
  await page
    .getByRole('button', { name: 'Next — Viết lại từ', exact: true })
    .click();
  await page
    .getByLabel('Viết lại từ hoặc cụm từ vừa học', { exact: true })
    .fill('wrong');
  await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click();
  await page
    .getByText('Chưa đúng. Bạn thử viết lại nhé.', { exact: true })
    .waitFor();
  await page
    .getByLabel('Viết lại từ hoặc cụm từ vừa học', { exact: true })
    .fill('stargazing');
  await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click();
  await page
    .getByRole('heading', { name: 'Hoàn thành lượt học', exact: true })
    .waitFor();
  await page
    .getByRole('button', { name: 'Về danh sách chủ đề', exact: true })
    .click();
  await page.getByRole('button', { name: 'Sổ tay', exact: true }).click();
  await page.locator('.notebook-row').filter({ hasText: 'stargazing' }).click();
  assert.match(
    await page.locator('.review-result').innerText(),
    /Level ghi nhớ:\s*1/,
  );
  checks.push(
    'Wrong rewrite retries; correct rewrite creates L1 and notebook refreshes from BE',
  );
  console.log(checks.at(-1));
  await page.reload();
  await page.getByRole('button', { name: 'Sổ tay', exact: true }).click();
  await page.locator('.notebook-row').filter({ hasText: 'stargazing' }).click();
  await page.locator('.personal-note').waitFor();
  assert.equal(
    await page.locator('.personal-note').innerText(),
    'Ghi chú kiểm tra FE05',
  );
  checks.push('Reload preserves native IndexedDB progress and personal note');
  console.log(checks.at(-1));
  await page.getByRole('button', { name: 'Chỉnh sửa', exact: true }).click();
  await page.getByLabel(/^Nghĩa tiếng Việt/).fill('quan sát bầu trời đêm');
  await page.getByRole('button', { name: 'Lưu để học', exact: true }).click();
  await page
    .getByText('Đã tạo mục mới. Tiến độ của mục cũ được giữ nguyên.', {
      exact: true,
    })
    .waitFor();
  await page.waitForFunction(
    () => document.querySelectorAll('.notebook-row').length === 2,
  );
  assert.equal(
    await page.locator('.notebook-row').filter({ hasText: 'Level 1' }).count(),
    1,
  );
  assert.equal(
    await page
      .locator('.notebook-row')
      .filter({ hasText: 'Chưa có level' })
      .count(),
    1,
  );
  checks.push(
    'Changing a learned meaning creates an unlearned entry and keeps the old L1 entry',
  );
  console.log(checks.at(-1));
  // Reading keeps the current selection until the user explicitly opens the popup.
  await page
    .getByRole('button', { name: 'Reading — Đọc và lưu từ', exact: true })
    .click();
  await page
    .getByLabel('Nguồn bài đọc, nếu có')
    .fill('https://example.com/reading');
  await page
    .getByLabel('Nội dung tiếng Anh')
    .fill('I enjoy stargazing. Reading is fun.');
  await page.getByRole('button', { name: 'Mở bài đọc', exact: true }).click();
  await page.locator('.reading-article').scrollIntoViewIfNeeded();
  await page.evaluate(() => {
    const article = document.querySelector('.reading-article');
    const node = article.firstChild;
    const start = node.textContent.indexOf('stargazing');
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, start + 10);
    const selection = window.getSelection();
    selection.removeAllRanges();
    selection.addRange(range);
  });
  await page.locator('.reading-article').dispatchEvent('pointerup');
  await page
    .getByRole('button', { name: 'Tra từ stargazing', exact: true })
    .waitFor();
  assert.equal(await page.getByRole('dialog').count(), 0);
  await page
    .getByRole('button', { name: 'Tra từ stargazing', exact: true })
    .click();
  const dialog = page.getByRole('dialog', {
    name: 'Tra từ stargazing',
    exact: true,
  });
  await dialog.waitFor();
  await dialog.getByText('Thư viện trên thiết bị', { exact: false }).waitFor();
  assert.match(await dialog.innerText(), /I enjoy stargazing\./);
  await page.setViewportSize({ width: 390, height: 844 });
  const box = await dialog.boundingBox();
  assert.ok(
    box &&
      box.x >= 0 &&
      box.x + box.width <= 390 &&
      box.y >= 0 &&
      box.y + box.height <= 845,
  );
  await dialog.getByRole('button', { name: 'Lưu từ', exact: true }).click();
  await dialog
    .getByText(
      'Đã lưu ngữ cảnh. Nội dung và tiến độ hiện có được giữ nguyên.',
      { exact: true },
    )
    .waitFor();
  await page
    .getByRole('button', { name: 'Đóng popup tra từ', exact: true })
    .click();
  await page.getByRole('button', { name: 'Đóng Reading', exact: true }).click();
  assert.equal(
    await page.locator('.notebook-row').filter({ hasText: 'Level 1' }).count(),
    1,
  );
  checks.push(
    'Reading selection shows icon first; popup opens only on click, uses local lookup, fits mobile and saves context without changing L1',
  );
  console.log(checks.at(-1));
  // Only this fresh browser context is changed to make the learned test word due.
  async function makeTestWordDue() {
    await page.evaluate(
      () =>
        new Promise((resolve, reject) => {
          const request = indexedDB.open('englishvocab');
          request.onerror = () => reject(request.error);
          request.onsuccess = () => {
            const db = request.result;
            const transaction = db.transaction('progress', 'readwrite');
            const store = transaction.objectStore('progress');
            const records = store.getAll();
            records.onsuccess = () => {
              for (const record of records.result)
                store.put({ ...record, nextReviewAt: Date.now() - 1000 });
            };
            transaction.oncomplete = () => {
              db.close();
              resolve();
            };
            transaction.onerror = () => {
              db.close();
              reject(transaction.error);
            };
          };
        }),
    );
  }
  await makeTestWordDue();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Ôn tập', exact: true }).click();
  await page
    .getByRole('button', { name: 'Bắt đầu ôn tập', exact: true })
    .click();
  await page.locator('.cloze-letter').first().waitFor();
  const missing = await page
    .locator('.cloze-word')
    .evaluate((element) =>
      Array.from(element.children).flatMap((child, index) =>
        child.tagName === 'INPUT' ? ['stargazing'[index]] : [],
      ),
    );
  await page.locator('.cloze-letter').first().fill(missing[0]);
  await page
    .getByText('Bản nháp đã lưu trên thiết bị.', { exact: true })
    .waitFor();
  await page.getByRole('button', { name: 'Tạm dừng', exact: true }).click();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.locator('.cloze-letter').first().waitFor();
  assert.equal(
    await page.locator('.cloze-letter').first().inputValue(),
    missing[0],
  );
  for (let index = 0; index < missing.length; index++)
    await page.locator('.cloze-letter').nth(index).fill(missing[index]);
  await page.getByRole('button', { name: 'Kiểm tra', exact: true }).click();
  await page.getByText('Đúng rồi!', { exact: true }).waitFor();
  assert.match(
    await page.locator('.review-result').innerText(),
    /Level ghi nhớ sau lượt này:\s*2/,
  );
  await page.reload();
  await page.getByRole('button', { name: 'Tiếp tục', exact: true }).click();
  await page.getByText('Đúng rồi!', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'Từ tiếp theo', exact: true }).click();
  await page
    .getByRole('heading', { name: 'Hoàn thành lượt ôn', exact: true })
    .waitFor();
  await page
    .getByRole('button', { name: 'Về trang Ôn tập', exact: true })
    .click();
  await makeTestWordDue();
  await page.reload();
  await page
    .getByRole('button', { name: 'Bắt đầu ôn tập', exact: true })
    .click();
  await page.getByRole('button', { name: 'Không nhớ', exact: true }).click();
  await page
    .getByText('Chưa đúng. Xem lại từ trước khi tiếp tục nhé.', { exact: true })
    .waitFor();
  assert.match(
    await page.locator('.review-result').innerText(),
    /Level ghi nhớ sau lượt này:\s*1/,
  );
  checks.push(
    'Review restores a paused draft, grades correct to L2, preserves feedback on reload and resets forgotten words to L1',
  );
  console.log(checks.at(-1));
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify({ result: 'Pass', checks, pageErrors: errors }, null, 2),
  );
  await context.close();
} finally {
  await browser?.close();
  await new Promise((resolve) => server.close(resolve));
}
