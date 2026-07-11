const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const { chromium } = require(path.join(ROOT_DIR, 'client', 'node_modules', 'playwright'));
const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000/api';
const QA_PASSWORD = 'qa123456';
const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const productName = `QA Checkpoint 2 ${runId}`;
const productSku = `QA2-KASPI-${runId}`;
const OUT_DIR = path.join(__dirname, `checkpoint-2-${runId}`);
const RESULT_PATH = path.join(__dirname, `live-qa-checkpoint-2-result-${runId}.json`);

fs.mkdirSync(OUT_DIR, { recursive: true });

const users = {
  admin: { email: 'admin@example.com', password: 'admin123' },
  designer: { email: 'qa_designer@example.com', password: QA_PASSWORD },
  marketplace: { email: 'qa_marketplace@example.com', password: QA_PASSWORD },
  purchase: { email: 'qa_purchase@example.com', password: QA_PASSWORD },
  warehouse: { email: 'qa_warehouse@example.com', password: QA_PASSWORD },
};

const screenshots = [];
const steps = [];
const findings = [];
let productId = null;

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
    steps.push({ name, status: 'failed', durationMs: Date.now() - startedAt, error: error.message });
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

async function apiRequest(page, method, url, data) {
  const token = await getAuthToken(page);
  const response = await page.request.fetch(`${API_URL}${url}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  const result = await response.json();
  if (!response.ok()) {
    throw new Error(`${method} ${url} failed: ${response.status()} ${JSON.stringify(result)}`);
  }
  return result;
}

async function apiGet(page, url) {
  return apiRequest(page, 'GET', url);
}

async function apiPost(page, url, data) {
  return apiRequest(page, 'POST', url, data);
}

async function findQaProduct(page) {
  const data = await apiGet(page, `/products?search=${encodeURIComponent(productName)}&limit=10`);
  const product = data.data.items?.find((item) => item.name === productName)
    || data.data.products?.find((item) => item.name === productName);
  if (!product) throw new Error(`Product not found by API: ${productName}`);
  productId = product.id;
  return product;
}

async function assertProductStatus(page, expectedStatus, options = {}) {
  const product = await findQaProduct(page);
  if (product.lifecycleStatus !== expectedStatus) {
    throw new Error(`Expected ${expectedStatus}, got ${product.lifecycleStatus}`);
  }
  if (Object.prototype.hasOwnProperty.call(options, 'completed')) {
    const completed = Boolean(product.lifecycleCompletedAt);
    if (completed !== options.completed) {
      throw new Error(`Expected lifecycle completed=${options.completed}, got ${completed}`);
    }
  }
  return product;
}

async function openWorkflowProductAction(page, screenshotName) {
  await page.goto(`${BASE_URL}/workflow`, { waitUntil: 'networkidle' });
  await page.getByLabel('Поиск').fill(productName);
  await page.waitForTimeout(700);
  const card = page.locator('article').filter({ hasText: productName }).first();
  await card.waitFor({ state: 'visible', timeout: 10000 });
  await shot(page, screenshotName);
  await card.getByRole('button').click();
  await page.waitForTimeout(700);
}

async function ensureWarehouseUser(page) {
  const data = await apiGet(page, '/auth/users?isActive=true');
  const existing = data.data.users.find((user) => user.email === users.warehouse.email);
  if (existing) return existing;

  const created = await apiPost(page, '/auth/users', {
    name: 'QA Warehouse',
    email: users.warehouse.email,
    password: users.warehouse.password,
    role: 'warehouse_operator',
  });
  return created.data.user;
}

async function prepareDraftForDesigner(page) {
  await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Быстрый черновик' }).click();
  await page.getByLabel('Рабочее название').fill(productName);
  await page.getByLabel('Себестоимость').fill('1234');
  await page.getByLabel('Комментарий').fill('QA Checkpoint 2 product');
  await shot(page, 'draft-filled');
  await page.getByRole('button', { name: /Создать черновик/ }).click();
  await page.waitForTimeout(1400);

  const product = await assertProductStatus(page, 'new');
  const [supplierData, userData] = await Promise.all([
    apiGet(page, '/suppliers?limit=1'),
    apiGet(page, '/auth/users?role=designer&isActive=true'),
  ]);
  const supplier = supplierData.data.suppliers[0];
  const designer = userData.data.users.find((user) => user.email === users.designer.email);
  if (!supplier) throw new Error('No active supplier is available for QA');
  if (!designer) throw new Error('QA designer user is missing');

  await apiPost(page, `/products/${product.id}/suppliers`, {
    supplierId: supplier.id,
    supplierPrice: 1200,
    quantity: 10,
    isAvailable: true,
    notes: 'QA Checkpoint 2 supplier',
  });
  await apiPost(page, `/products/${product.id}/lifecycle/assign-designer`, {
    designerId: designer.id,
  });
  await assertProductStatus(page, 'assigned_to_designer');
}

async function queryDatabaseVerification() {
  require(path.join(ROOT_DIR, 'server', 'node_modules', 'dotenv')).config({
    path: path.join(ROOT_DIR, 'server', '.env'),
  });
  const models = require(path.join(ROOT_DIR, 'server', 'models'));
  const {
    PriceHistory,
    Product,
    ProductActionHistory,
    ProductLaunchFlags,
    ProductLifecyclePurchase,
    ProductMarketplaceListing,
    ProductWarehouseDetails,
    StockHistory,
    WarehouseReceipt,
    sequelize,
  } = models;

  try {
    const [
      product,
      purchase,
      receipt,
      warehouseDetails,
      launchFlags,
      kaspiListing,
      stockHistory,
      priceHistory,
      actionHistory,
    ] = await Promise.all([
      Product.findByPk(productId),
      ProductLifecyclePurchase.findOne({ where: { productId } }),
      ProductLifecyclePurchase.findOne({ where: { productId } }).then((row) => (
        row?.warehouseReceiptId ? WarehouseReceipt.findByPk(row.warehouseReceiptId) : null
      )),
      ProductWarehouseDetails.findOne({ where: { productId } }),
      ProductLaunchFlags.findOne({ where: { productId } }),
      ProductMarketplaceListing.findOne({ where: { productId, marketplace: 'kaspi' } }),
      StockHistory.findAll({ where: { productId }, order: [['createdAt', 'DESC']] }),
      PriceHistory.findAll({ where: { productId }, order: [['changedAt', 'DESC']] }),
      ProductActionHistory.findAll({ where: { productId }, order: [['createdAt', 'ASC']] }),
    ]);

    const actions = actionHistory.map((entry) => entry.actionType);
    const requiredActions = [
      'purchase_marked',
      'warehouse_arrival_marked',
      'warehouse_completed',
      'sale_launch_completed',
      'sale_flags_updated',
    ];
    const missingActions = requiredActions.filter((action) => !actions.includes(action));

    const verification = {
      productId,
      lifecycleStatus: product?.lifecycleStatus,
      lifecycleCompletedAt: product?.lifecycleCompletedAt,
      currentStock: product?.currentStock,
      costPrice: Number(product?.costPrice),
      orderId: purchase?.orderId,
      purchasedQuantity: purchase?.quantity,
      receivedQuantity: purchase?.receivedQuantity,
      receiptType: receipt?.receiptType,
      warehouseLocation: warehouseDetails
        ? `${warehouseDetails.sector}/${warehouseDetails.shelf}/${warehouseDetails.cell}`
        : null,
      launchFlags: launchFlags ? {
        advertisingStarted: launchFlags.advertisingStarted,
        promotionStarted: launchFlags.promotionStarted,
        reviewBonusEnabled: launchFlags.reviewBonusEnabled,
        completedAt: launchFlags.completedAt,
      } : null,
      kaspiStatus: kaspiListing?.status,
      stockHistoryRecorded: stockHistory.some((entry) => entry.changeType === 'receipt'),
      priceHistoryRecorded: priceHistory.some((entry) => (
        entry.priceType === 'costPrice' && Number(entry.newPrice) === 1300
      )),
      actions,
      missingActions,
    };

    if (verification.lifecycleStatus !== 'in_sale' || !verification.lifecycleCompletedAt) {
      throw new Error(`Final lifecycle verification failed: ${JSON.stringify(verification)}`);
    }
    if (verification.currentStock !== 4 || verification.costPrice !== 1300) {
      throw new Error(`Stock or cost verification failed: ${JSON.stringify(verification)}`);
    }
    if (verification.receiptType !== 'partial' || verification.receivedQuantity !== 4) {
      throw new Error(`Receipt verification failed: ${JSON.stringify(verification)}`);
    }
    if (verification.warehouseLocation !== 'QA-A/03/12') {
      throw new Error(`Warehouse verification failed: ${JSON.stringify(verification)}`);
    }
    if (!verification.launchFlags?.advertisingStarted
      || !verification.launchFlags?.promotionStarted
      || !verification.launchFlags?.reviewBonusEnabled) {
      throw new Error(`Launch flag verification failed: ${JSON.stringify(verification)}`);
    }
    if (verification.kaspiStatus !== 'in_sale'
      || !verification.stockHistoryRecorded
      || !verification.priceHistoryRecorded
      || verification.missingActions.length > 0) {
      throw new Error(`History or marketplace verification failed: ${JSON.stringify(verification)}`);
    }

    return verification;
  } finally {
    await sequelize.close();
  }
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();
  let databaseVerification = null;

  page.on('pageerror', (error) => {
    findings.push({ severity: 'high', area: 'browser', message: `Page error: ${error.message}` });
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      findings.push({ severity: 'medium', area: 'console', message: message.text() });
    }
  });

  try {
    await step('Admin prepares a linked product for lifecycle QA', async () => {
      await login(page, users.admin, 'admin');
      await ensureWarehouseUser(page);
      await prepareDraftForDesigner(page);
    });

    await step('Designer creates content and submits it for review', async () => {
      await logout(page);
      await login(page, users.designer, 'designer');
      await openWorkflowProductAction(page, 'designer-assigned');
      await page.getByLabel('Тип материала').selectOption('product_photo');
      await page.locator('input[type="file"]').setInputFiles(path.join(ROOT_DIR, 'client', 'public', 'logo192.png'));
      await page.getByRole('button', { name: 'Загрузить', exact: true }).click();
      await page.waitForTimeout(1000);
      await page.getByRole('button', { name: /Карточка создана/ }).click();
      await page.waitForTimeout(1200);
      await assertProductStatus(page, 'content_created');

      await openWorkflowProductAction(page, 'designer-content-created');
      await page.getByRole('dialog', { name: /Проверка карточки/ })
        .getByRole('button', { name: 'Передать на проверку', exact: true })
        .click();
      await page.waitForTimeout(1200);
      await assertProductStatus(page, 'review');
    });

    await step('Admin approves the product for marketplace placement', async () => {
      await logout(page);
      await login(page, users.admin, 'admin-review');
      await openWorkflowProductAction(page, 'admin-review');
      await shot(page, 'admin-review-modal');
      await page.getByRole('button', { name: /Одобрить/ }).click();
      await page.waitForTimeout(1200);
      await assertProductStatus(page, 'marketplace');
    });

    await step('Marketplace manager publishes Kaspi listing and sends product to purchase', async () => {
      await logout(page);
      await login(page, users.marketplace, 'marketplace-kaspi');
      await openWorkflowProductAction(page, 'marketplace-queue');
      await shot(page, 'kaspi-panel-empty');
      await page.getByLabel('Статус').selectOption('published');
      await page.getByLabel('SKU Kaspi').fill(productSku);
      await page.getByLabel('Название на Kaspi').fill(`${productName} Kaspi`);
      await page.getByLabel('Цена продажи').fill('4999');
      await page.getByLabel('Описание / заметки').fill('QA Checkpoint 2 Kaspi listing');
      await shot(page, 'kaspi-panel-filled');
      await page.getByRole('button', { name: /Сохранить/ }).click();
      await page.waitForTimeout(900);
      await page.getByRole('button', { name: /Передать в закуп/ }).click();
      await page.waitForTimeout(1200);
      await assertProductStatus(page, 'purchase');
    });

    await step('Purchase manager creates the official initial purchase order', async () => {
      await logout(page);
      await login(page, users.purchase, 'purchase-order');
      await openWorkflowProductAction(page, 'purchase-queue-before-order');
      await shot(page, 'purchase-panel-initial');
      await page.getByLabel('Количество').fill('5');
      await page.getByLabel('Закупочная цена за единицу').fill('1250');
      await page.getByLabel('Комментарий').fill('QA Checkpoint 2 initial purchase');
      await shot(page, 'purchase-panel-filled');
      await page.getByRole('button', { name: /Оформить закуп/ }).click();
      await page.waitForTimeout(1400);
      await assertProductStatus(page, 'purchase', { completed: false });
      const operations = await apiGet(page, `/products/${productId}/lifecycle/operations`);
      if (!operations.data.purchase?.orderId) throw new Error('Lifecycle purchase order was not created');
    });

    await step('Purchase manager confirms a partial warehouse arrival', async () => {
      await openWorkflowProductAction(page, 'purchase-queue-after-order');
      await shot(page, 'arrival-panel-initial');
      await page.getByLabel('Фактически поступило').fill('4');
      await page.getByLabel('Комментарий к приемке').fill('QA partial receipt: 4 of 5');
      await shot(page, 'arrival-panel-filled');
      await page.getByRole('dialog', { name: /Закуп и поступление/ })
        .getByRole('button', { name: /Подтвердить поступление/ })
        .click();
      await page.waitForTimeout(1400);
      await assertProductStatus(page, 'warehouse', { completed: false });
    });

    await step('Warehouse operator fills the permanent warehouse passport', async () => {
      await logout(page);
      await login(page, users.warehouse, 'warehouse');
      await openWorkflowProductAction(page, 'warehouse-queue');
      await shot(page, 'warehouse-panel-empty');
      await page.getByLabel('Сектор').fill('QA-A');
      await page.getByLabel('Полка').fill('03');
      await page.getByLabel('Ячейка').fill('12');
      await page.getByLabel('Вес, кг').fill('0.45');
      await page.getByLabel('Длина, см').fill('20');
      await page.getByLabel('Ширина, см').fill('12.5');
      await page.getByLabel('Высота, см').fill('8');
      await page.getByLabel('Уточненная себестоимость').fill('1300');
      await page.getByLabel('Примечание').fill('QA Checkpoint 2 warehouse passport');
      await shot(page, 'warehouse-panel-filled');
      await page.getByRole('button', { name: /Завершить складской этап/ }).click();
      await page.waitForTimeout(1400);
      await assertProductStatus(page, 'in_sale', { completed: false });
    });

    await step('Marketplace manager completes the sale launch with optional flags', async () => {
      await logout(page);
      await login(page, users.marketplace, 'marketplace-sale-launch');
      await openWorkflowProductAction(page, 'sale-launch-task-queue');
      await shot(page, 'sale-launch-panel-initial');
      const checkboxes = page.getByRole('checkbox');
      await checkboxes.nth(0).check();
      await checkboxes.nth(2).check();
      await page.getByLabel('Примечание').fill('QA launch: advertising and review bonus enabled');
      await shot(page, 'sale-launch-panel-filled');
      await page.getByRole('button', { name: /Завершить запуск/ }).click();
      await page.waitForTimeout(1400);
      await assertProductStatus(page, 'in_sale', { completed: true });
    });

    await step('Completed product appears in sales view and remains editable', async () => {
      await page.goto(`${BASE_URL}/workflow`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'В продаже', exact: true }).click();
      await page.getByLabel('Поиск').fill(productName);
      await page.waitForTimeout(800);
      const card = page.locator('article').filter({ hasText: productName }).first();
      await card.waitFor({ state: 'visible', timeout: 10000 });
      await shot(page, 'completed-product-sales-view');
      await card.getByRole('button', { name: /Параметры продаж/ }).click();
      await page.waitForTimeout(700);
      await shot(page, 'completed-sale-panel');
      const checkboxes = page.getByRole('checkbox');
      await checkboxes.nth(1).check();
      await page.getByLabel('Примечание').fill('QA launch updated: promotion enabled');
      await shot(page, 'completed-sale-panel-updated');
      await page.getByRole('button', { name: /Сохранить изменения/ }).click();
      await page.waitForTimeout(1000);
      await shot(page, 'completed-sale-panel-saved');
    });
  } finally {
    await browser.close();
  }

  databaseVerification = await step('Database state matches the completed live workflow', async () => (
    queryDatabaseVerification()
  ));

  return {
    runId,
    productId,
    productName,
    productSku,
    generatedAt: new Date().toISOString(),
    steps,
    findings,
    screenshots,
    databaseVerification,
  };
}

run()
  .then((result) => {
    fs.writeFileSync(RESULT_PATH, JSON.stringify(result, null, 2), 'utf8');
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    const result = {
      runId,
      productId,
      productName,
      productSku,
      generatedAt: new Date().toISOString(),
      fatalError: error.message,
      steps,
      findings,
      screenshots,
    };
    fs.writeFileSync(RESULT_PATH, JSON.stringify(result, null, 2), 'utf8');
    console.error(JSON.stringify(result, null, 2));
    process.exit(1);
  });
