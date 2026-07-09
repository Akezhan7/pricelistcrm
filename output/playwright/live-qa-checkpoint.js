const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const { chromium } = require(path.join(ROOT_DIR, 'client', 'node_modules', 'playwright'));
const OUT_DIR = __dirname;
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000/api';

const QA_PASSWORD = 'qa123456';
const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const productName = `QA Lifecycle ${runId}`;
const productSku = `QA-KASPI-${runId}`;

const users = {
  admin: { email: 'admin@example.com', password: 'admin123' },
  designer: { email: 'qa_designer@example.com', password: QA_PASSWORD },
  marketplace: { email: 'qa_marketplace@example.com', password: QA_PASSWORD },
  purchase: { email: 'qa_purchase@example.com', password: QA_PASSWORD },
};

const screenshots = [];
const steps = [];
const findings = [];

function screenshotPath(name) {
  return path.join(OUT_DIR, `${String(screenshots.length + 1).padStart(2, '0')}-${name}.png`);
}

async function shot(page, name) {
  const filePath = screenshotPath(name);
  await page.screenshot({ path: filePath, fullPage: true });
  screenshots.push(path.relative(ROOT_DIR, filePath).replace(/\\/g, '/'));
}

async function step(name, fn) {
  const startedAt = Date.now();
  try {
    const result = await fn();
    steps.push({ name, status: 'passed', durationMs: Date.now() - startedAt });
    return result;
  } catch (error) {
    steps.push({
      name,
      status: 'failed',
      durationMs: Date.now() - startedAt,
      error: error.message,
    });
    throw error;
  }
}

async function login(page, user, roleName) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded' });
  await page.getByLabel('Email адрес').fill(user.email);
  await page.getByLabel('Пароль').fill(user.password);
  await page.getByRole('button', { name: /Войти|Вход/ }).click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  await shot(page, `login-${roleName}`);
}

async function logout(page) {
  await page.evaluate(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  });
}

async function getAuthToken(page) {
  const token = await page.evaluate(() => localStorage.getItem('token'));
  if (!token) throw new Error('Auth token is missing in localStorage');
  return token;
}

async function apiGet(page, url) {
  const token = await getAuthToken(page);
  const response = await page.request.get(`${API_URL}${url}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await response.json();
  if (!response.ok()) {
    throw new Error(`GET ${url} failed: ${response.status()} ${JSON.stringify(data)}`);
  }
  return data;
}

async function findQaProduct(page) {
  const data = await apiGet(page, `/products?search=${encodeURIComponent(productName)}&limit=10`);
  const product = data.data.items?.find((item) => item.name === productName)
    || data.data.products?.find((item) => item.name === productName);
  if (!product) throw new Error(`Product not found by API: ${productName}`);
  return product;
}

async function openWorkflowProductAction(page, nameForShot) {
  await page.goto(`${BASE_URL}/workflow`, { waitUntil: 'networkidle' });
  await page.getByLabel('Поиск').fill(productName);
  await page.waitForTimeout(800);
  await shot(page, nameForShot);
  const card = page.locator('article').filter({ hasText: productName }).first();
  await card.waitFor({ state: 'visible', timeout: 10000 });
  await card.getByRole('button').click();
  await page.waitForTimeout(800);
}

async function uploadAsset(page, assetTypeValue, filePath, screenshotName) {
  await page.getByLabel('Тип материала').selectOption(assetTypeValue);
  await page.locator('input[type="file"]').setInputFiles(filePath);
  await shot(page, screenshotName);
  await page.getByRole('button', { name: 'Загрузить', exact: true }).click();
  await page.waitForTimeout(1200);
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();

  page.on('pageerror', (error) => {
    findings.push({ severity: 'high', area: 'browser', message: `Page error: ${error.message}` });
  });

  page.on('console', (message) => {
    if (['error', 'warning'].includes(message.type())) {
      findings.push({
        severity: message.type() === 'error' ? 'medium' : 'low',
        area: 'console',
        message: `${message.type()}: ${message.text()}`,
      });
    }
  });

  try {
    await step('Admin can log in', async () => {
      await login(page, users.admin, 'admin');
    });

    await step('Admin can create product draft from UI', async () => {
      await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'Быстрый черновик' }).click();
      await page.getByLabel('Рабочее название').fill(productName);
      await page.getByLabel('Себестоимость').fill('1234');
      await page.getByLabel('Комментарий').fill('Live QA draft created by Playwright');
      await shot(page, 'draft-modal-filled');
      await page.getByRole('button', { name: /Создать черновик/ }).click();
      await page.waitForTimeout(1800);
      const product = await findQaProduct(page);
      if (product.lifecycleStatus !== 'new') {
        throw new Error(`Expected lifecycleStatus=new, got ${product.lifecycleStatus}`);
      }
    });

    await step('Admin can select new draft and assign designer from UI', async () => {
      await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle' });
      await page.locator('select').first().selectOption('new');
      await page.getByPlaceholder('Поиск по названию или артикулу...').fill(productName);
      await page.waitForTimeout(800);
      await shot(page, 'new-product-filtered');
      await page.locator('[title="Выбрать товар"]').first().click();
      await page.getByRole('button', { name: /Передать дизайнеру/ }).click();
      const designerDialog = page.getByRole('dialog', { name: /Передать дизайнеру/ });
      const designerSelect = designerDialog.locator('select').first();
      const designerValue = await designerSelect
        .locator('option')
        .filter({ hasText: 'QA Designer' })
        .first()
        .getAttribute('value');
      if (!designerValue) throw new Error('QA Designer option was not found');
      await designerSelect.selectOption(designerValue);
      await shot(page, 'assign-designer-modal');
      await page.getByRole('button', { name: /^Передать$/ }).click();
      await page.waitForTimeout(1600);
      const product = await findQaProduct(page);
      if (product.lifecycleStatus !== 'assigned_to_designer') {
        throw new Error(`Expected assigned_to_designer, got ${product.lifecycleStatus}`);
      }
    });

    await step('Designer can upload product assets and mark content created', async () => {
      await logout(page);
      await login(page, users.designer, 'designer');
      await openWorkflowProductAction(page, 'designer-workflow-assigned');
      await shot(page, 'designer-assets-modal-open');

      await uploadAsset(
        page,
        'product_photo',
        path.join(ROOT_DIR, 'client', 'public', 'logo192.png'),
        'asset-photo-selected'
      );

      const jpgCandidates = [
        path.join(ROOT_DIR, 'server', 'uploads', '0c5a7390-b739-42cb-b534-a62f0abdc33f-1780906929312-73514802.jpg'),
      ];
      if (fs.existsSync(jpgCandidates[0])) {
        await uploadAsset(page, 'slide_jpg', jpgCandidates[0], 'asset-jpg-selected');
      } else {
        findings.push({
          severity: 'low',
          area: 'assets',
          message: 'JPG fixture was not found, slide_jpg upload was skipped',
        });
      }

      try {
        await uploadAsset(page, 'psd_source', path.join(OUT_DIR, 'qa-source.psd'), 'asset-psd-selected');
      } catch (error) {
        findings.push({
          severity: 'medium',
          area: 'assets',
          message: `PSD upload path failed: ${error.message}`,
        });
      }

      await shot(page, 'assets-after-uploads');
      await page.getByRole('button', { name: /Карточка создана/ }).click();
      await page.waitForTimeout(1600);
      const data = await apiGet(page, `/products?search=${encodeURIComponent(productName)}&limit=10`);
      const product = data.data.products?.find((item) => item.name === productName)
        || data.data.items?.find((item) => item.name === productName);
      if (!product || product.lifecycleStatus !== 'content_created') {
        throw new Error(`Expected content_created, got ${product?.lifecycleStatus}`);
      }
    });

    await step('Designer can send content to review', async () => {
      await openWorkflowProductAction(page, 'designer-workflow-content-created');
      await shot(page, 'designer-submit-review-modal');
      await page
        .getByRole('dialog', { name: /Проверка карточки/ })
        .getByRole('button', { name: 'Передать на проверку', exact: true })
        .click();
      await page.waitForTimeout(1600);
      const product = await findQaProduct(page);
      if (product.lifecycleStatus !== 'review') {
        throw new Error(`Expected review, got ${product.lifecycleStatus}`);
      }
    });

    await step('Admin can request revision with attachment', async () => {
      await logout(page);
      await login(page, users.admin, 'admin-review');
      await openWorkflowProductAction(page, 'admin-workflow-review');
      await shot(page, 'admin-review-modal-open');
      await page.getByRole('button', { name: /На доработку/ }).click();
      await page.getByLabel('Комментарий').fill('Live QA revision request');
      await page.locator('input[type="file"]').setInputFiles(path.join(ROOT_DIR, 'client', 'public', 'logo192.png'));
      await shot(page, 'revision-request-filled');
      await page.getByRole('button', { name: /Отправить/ }).click();
      await page.waitForTimeout(1800);
      const product = await findQaProduct(page);
      if (product.lifecycleStatus !== 'revision') {
        throw new Error(`Expected revision, got ${product.lifecycleStatus}`);
      }
    });

    await step('Designer can resubmit revision', async () => {
      await logout(page);
      await login(page, users.designer, 'designer-revision');
      await openWorkflowProductAction(page, 'designer-workflow-revision');
      await shot(page, 'designer-revision-modal');
      await page.getByRole('button', { name: /Отправить повторно/ }).click();
      await page.waitForTimeout(1600);
      const product = await findQaProduct(page);
      if (product.lifecycleStatus !== 'review') {
        throw new Error(`Expected review after resubmit, got ${product.lifecycleStatus}`);
      }
    });

    await step('Admin can approve card to marketplace', async () => {
      await logout(page);
      await login(page, users.admin, 'admin-approve');
      await openWorkflowProductAction(page, 'admin-workflow-review-resubmitted');
      await shot(page, 'admin-approve-modal');
      await page.getByRole('button', { name: /Одобрить/ }).click();
      await page.waitForTimeout(1600);
      const product = await findQaProduct(page);
      if (product.lifecycleStatus !== 'marketplace') {
        throw new Error(`Expected marketplace, got ${product.lifecycleStatus}`);
      }
    });

    await step('Marketplace manager can fill Kaspi and move product to purchase', async () => {
      await logout(page);
      await login(page, users.marketplace, 'marketplace');
      await openWorkflowProductAction(page, 'marketplace-workflow');
      await shot(page, 'kaspi-panel-initial');
      const readyButton = page.getByRole('button', { name: /Передать в закуп/ });
      if (!(await readyButton.isDisabled())) {
        findings.push({
          severity: 'medium',
          area: 'marketplace',
          message: 'Kaspi ready button is enabled before required fields are filled',
        });
      }
      await page.getByLabel('Статус').selectOption('published');
      await page.getByLabel('SKU Kaspi').fill(productSku);
      await page.getByLabel('Название на Kaspi').fill(`${productName} Kaspi`);
      await page.getByLabel('Цена продажи').fill('4999');
      await shot(page, 'kaspi-panel-filled');
      await page.getByRole('button', { name: /Сохранить/ }).click();
      await page.waitForTimeout(1200);
      await page.getByRole('button', { name: /Передать в закуп/ }).click();
      await page.waitForTimeout(1800);
      const product = await findQaProduct(page);
      if (product.lifecycleStatus !== 'purchase') {
        throw new Error(`Expected purchase, got ${product.lifecycleStatus}`);
      }
    });

    await step('Purchase manager can see product in purchase queue', async () => {
      await logout(page);
      await login(page, users.purchase, 'purchase');
      await page.goto(`${BASE_URL}/workflow`, { waitUntil: 'networkidle' });
      await page.getByLabel('Поиск').fill(productName);
      await page.waitForTimeout(800);
      await shot(page, 'purchase-workflow-final');
      const bodyText = await page.locator('body').innerText();
      if (!bodyText.includes(productName)) {
        throw new Error('Purchase manager cannot see product after marketplace -> purchase transition');
      }
    });
  } finally {
    await browser.close();
  }

  const result = {
    runId,
    productName,
    productSku,
    generatedAt: new Date().toISOString(),
    steps,
    findings,
    screenshots,
  };

  const resultPath = path.join(OUT_DIR, `live-qa-result-${runId}.json`);
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.log(JSON.stringify(result, null, 2));
}

run().catch((error) => {
  const result = {
    runId,
    productName,
    productSku,
    generatedAt: new Date().toISOString(),
    fatalError: error.message,
    steps,
    findings,
    screenshots,
  };
  const resultPath = path.join(OUT_DIR, `live-qa-result-${runId}.json`);
  fs.writeFileSync(resultPath, JSON.stringify(result, null, 2), 'utf8');
  console.error(JSON.stringify(result, null, 2));
  process.exit(1);
});
