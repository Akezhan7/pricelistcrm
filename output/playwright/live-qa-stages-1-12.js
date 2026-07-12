const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..', '..');
const { chromium } = require(path.join(ROOT_DIR, 'client', 'node_modules', 'playwright'));

const BASE_URL = 'http://localhost:3000';
const API_URL = 'http://localhost:5000/api';
const QA_PASSWORD = 'qa123456';
const runId = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);
const productName = `QA Full Lifecycle ${runId}`;
const productSku = `QA-FULL-KASPI-${runId}`;
const OUT_DIR = path.join(__dirname, `stages-1-12-${runId}`);
const RESULT_PATH = path.join(__dirname, `live-qa-stages-1-12-result-${runId}.json`);

fs.mkdirSync(OUT_DIR, { recursive: true });

const users = {
  admin: { name: 'QA Admin', email: 'admin@example.com', password: 'admin123', role: 'admin' },
  designer: { name: 'QA Designer', email: 'qa_designer@example.com', password: QA_PASSWORD, role: 'designer' },
  marketplace: { name: 'QA Marketplace', email: 'qa_marketplace@example.com', password: QA_PASSWORD, role: 'marketplace_manager' },
  purchase: { name: 'QA Purchase', email: 'qa_purchase@example.com', password: QA_PASSWORD, role: 'purchase_manager' },
  warehouse: { name: 'QA Warehouse', email: 'qa_warehouse@example.com', password: QA_PASSWORD, role: 'warehouse_operator' },
};

const screenshots = [];
const steps = [];
const findings = [];
const tokens = {};
let productId = null;
let supplierId = null;
let designerId = null;

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
  await page.locator('input[type="email"]').fill(user.email);
  await page.locator('input[type="password"]').fill(user.password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard', { timeout: 15000 });
  await page.waitForLoadState('networkidle');
  tokens[roleName] = await page.evaluate(() => localStorage.getItem('token'));
  if (!tokens[roleName]) throw new Error(`Auth token is missing for ${roleName}`);
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

async function requestWithToken(token, method, url, data, expectedStatuses = [200, 201]) {
  const response = await fetch(`${API_URL}${url}`, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: data === undefined ? undefined : JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({}));
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(`${method} ${url} expected ${expectedStatuses.join('/')}, got ${response.status}: ${JSON.stringify(result)}`);
  }
  return { status: response.status, body: result };
}

async function loginForApiToken(user) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: user.email, password: user.password }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.data?.token) {
    throw new Error(`API login failed for ${user.email}: ${response.status} ${JSON.stringify(result)}`);
  }
  return result.data.token;
}

async function apiRequest(page, method, url, data, expectedStatuses = [200, 201]) {
  const token = await getAuthToken(page);
  const response = await page.request.fetch(`${API_URL}${url}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
    data,
  });
  const result = await response.json().catch(() => ({}));
  if (!expectedStatuses.includes(response.status())) {
    throw new Error(`${method} ${url} expected ${expectedStatuses.join('/')}, got ${response.status()}: ${JSON.stringify(result)}`);
  }
  return { status: response.status(), body: result };
}

async function apiGet(page, url) {
  return (await apiRequest(page, 'GET', url)).body;
}

async function apiPost(page, url, data, expectedStatuses) {
  return (await apiRequest(page, 'POST', url, data, expectedStatuses)).body;
}

async function ensureUser(page, user) {
  const data = await apiGet(page, `/auth/users?role=${encodeURIComponent(user.role)}&isActive=true`);
  const existing = data.data.users.find((item) => item.email === user.email);
  if (existing) return existing;

  const created = await apiPost(page, '/auth/users', {
    name: user.name,
    email: user.email,
    password: user.password,
    role: user.role,
  });
  return created.data.user;
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
  await page.locator('input[placeholder*="Kaspi"]').fill(productName);
  await page.waitForTimeout(900);
  const card = page.locator('article').filter({ hasText: productName }).first();
  await card.waitFor({ state: 'visible', timeout: 10000 });
  await shot(page, screenshotName);
  await card.getByRole('button').last().click();
  await page.waitForTimeout(800);
}

async function openWorkflowHistory(page, screenshotName) {
  await page.goto(`${BASE_URL}/workflow`, { waitUntil: 'networkidle' });
  // Admin sees sale products in the general queue; search is enough for this visual check.
  await page.locator('input[placeholder*="Kaspi"]').fill(productName);
  await page.waitForTimeout(900);
  const card = page.locator('article').filter({ hasText: productName }).first();
  await card.waitFor({ state: 'visible', timeout: 10000 });
  await card.getByTitle('История товара').click();
  await page.waitForTimeout(1200);
  await shot(page, screenshotName);
}

async function prepareDraftForDesigner(page) {
  await page.goto(`${BASE_URL}/products`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Быстрый черновик' }).click();
  await page.getByLabel('Рабочее название').fill(productName);
  await page.getByLabel('Себестоимость').fill('1234');
  await page.getByLabel('Комментарий').fill('QA stages 1-12 product');
  await shot(page, 'draft-filled');
  await page.getByRole('button', { name: /Создать черновик/ }).click();
  await page.waitForTimeout(1400);

  const product = await assertProductStatus(page, 'new');
  const supplierData = await apiGet(page, '/suppliers?limit=1');
  const supplier = supplierData.data.suppliers[0];
  if (!supplier) throw new Error('No active supplier is available for QA');
  supplierId = supplier.id;

  await apiPost(page, `/products/${product.id}/suppliers`, {
    supplierId,
    supplierPrice: 1200,
    quantity: 10,
    isAvailable: true,
    notes: 'QA stages 1-12 supplier',
  });
  await apiPost(page, `/products/${product.id}/lifecycle/assign-designer`, {
    designerId,
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
    ProductAsset,
    ProductDesignerKpiEntry,
    ProductLaunchFlags,
    ProductLifecyclePurchase,
    ProductMarketplaceListing,
    ProductRevisionRequest,
    ProductWarehouseDetails,
    StockHistory,
    WarehouseReceipt,
    sequelize,
  } = models;

  try {
    const [
      product,
      purchase,
      warehouseDetails,
      launchFlags,
      kaspiListing,
      stockHistory,
      priceHistory,
      actionHistory,
      revisionRequests,
      assets,
      kpiEntry,
    ] = await Promise.all([
      Product.findByPk(productId),
      ProductLifecyclePurchase.findOne({ where: { productId } }),
      ProductWarehouseDetails.findOne({ where: { productId } }),
      ProductLaunchFlags.findOne({ where: { productId } }),
      ProductMarketplaceListing.findOne({ where: { productId, marketplace: 'kaspi' } }),
      StockHistory.findAll({ where: { productId }, order: [['createdAt', 'DESC']] }),
      PriceHistory.findAll({ where: { productId }, order: [['changedAt', 'DESC']] }),
      ProductActionHistory.findAll({ where: { productId }, order: [['createdAt', 'ASC']] }),
      ProductRevisionRequest.findAll({ where: { productId }, order: [['createdAt', 'ASC']] }),
      ProductAsset.findAll({ where: { productId }, order: [['createdAt', 'ASC']] }),
      ProductDesignerKpiEntry.findOne({ where: { productId } }),
    ]);

    const receipt = purchase?.warehouseReceiptId
      ? await WarehouseReceipt.findByPk(purchase.warehouseReceiptId)
      : null;
    const actions = actionHistory.map((entry) => entry.actionType);
    const approved = actionHistory.find((entry) => entry.actionType === 'approved');
    const requiredActions = [
      'product_created',
      'supplier_linked',
      'designer_assigned',
      'content_uploaded',
      'content_created',
      'submitted_for_review',
      'revision_requested',
      'revision_resubmitted',
      'approved',
      'marketplace_updated',
      'marketplace_placement_ready',
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
      designerId: product?.designerId,
      kpiWeight: Number(product?.kpiWeight),
      currentStock: product?.currentStock,
      costPrice: Number(product?.costPrice),
      purchase: purchase ? {
        orderId: purchase.orderId,
        quantity: purchase.quantity,
        receivedQuantity: purchase.receivedQuantity,
      } : null,
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
      revisionCount: revisionRequests.length,
      resolvedRevisionCount: revisionRequests.filter((entry) => entry.status === 'resolved').length,
      assetTypes: assets.map((asset) => asset.assetType),
      kpiEntry: kpiEntry ? {
        designerId: kpiEntry.designerId,
        weight: Number(kpiEntry.weight),
        reviewedByUserId: kpiEntry.reviewedByUserId,
      } : null,
      approvedMetadata: approved?.metadata || null,
      actions,
      missingActions,
    };

    if (verification.lifecycleStatus !== 'in_sale' || !verification.lifecycleCompletedAt) {
      throw new Error(`Final lifecycle verification failed: ${JSON.stringify(verification)}`);
    }
    if (verification.currentStock !== 4 || verification.costPrice !== 1300) {
      throw new Error(`Stock or cost verification failed: ${JSON.stringify(verification)}`);
    }
    if (verification.receiptType !== 'partial' || verification.purchase?.receivedQuantity !== 4) {
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
    if (verification.revisionCount !== 1 || verification.resolvedRevisionCount !== 1) {
      throw new Error(`Revision verification failed: ${JSON.stringify(verification)}`);
    }
    if (!verification.assetTypes.includes('product_photo') || !verification.assetTypes.includes('revision_attachment')) {
      throw new Error(`Asset verification failed: ${JSON.stringify(verification)}`);
    }
    if (verification.kpiWeight !== 2 || verification.kpiEntry?.weight !== 2 || verification.kpiEntry?.designerId !== designerId) {
      throw new Error(`KPI verification failed: ${JSON.stringify(verification)}`);
    }
    if (Number(verification.approvedMetadata?.kpiWeight) !== 2) {
      throw new Error(`Approval history KPI metadata missing: ${JSON.stringify(verification)}`);
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
  let apiVerification = null;

  page.on('pageerror', (error) => {
    findings.push({ severity: 'high', area: 'browser', message: `Page error: ${error.message}` });
  });
  page.on('console', (message) => {
    if (message.type() === 'error') {
      findings.push({ severity: 'medium', area: 'console', message: message.text() });
    }
  });

  try {
    await step('Admin prepares QA users, product draft, supplier link, and designer assignment', async () => {
      await login(page, users.admin, 'admin');
      const designer = await ensureUser(page, users.designer);
      designerId = designer.id;
      await ensureUser(page, users.marketplace);
      await ensureUser(page, users.purchase);
      await ensureUser(page, users.warehouse);
      tokens.designer = tokens.designer || await loginForApiToken(users.designer);
      tokens.marketplace = await loginForApiToken(users.marketplace);
      tokens.purchase = await loginForApiToken(users.purchase);
      tokens.warehouse = await loginForApiToken(users.warehouse);
      await prepareDraftForDesigner(page);
    });

    await step('Designer uploads content, marks content ready, and submits for review', async () => {
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
      await page.getByRole('dialog').getByRole('button', { name: 'Передать на проверку', exact: true }).click();
      await page.waitForTimeout(1200);
      await assertProductStatus(page, 'review');
    });

    await step('Admin requests revision with attachment, designer resubmits', async () => {
      await logout(page);
      await login(page, users.admin, 'admin-revision');
      await openWorkflowProductAction(page, 'admin-review-before-revision');
      await page.getByRole('button', { name: /На доработку/ }).click();
      await page.waitForTimeout(600);
      await page.getByLabel('Комментарий для дизайнера').fill('QA revision: improve product photo framing');
      await page.locator('input[type="file"]').last().setInputFiles(path.join(ROOT_DIR, 'client', 'public', 'logo192.png'));
      await shot(page, 'revision-request-filled');
      await page.getByRole('button', { name: 'Отправить на доработку', exact: true }).click();
      await page.waitForTimeout(1400);
      await assertProductStatus(page, 'revision');

      await logout(page);
      await login(page, users.designer, 'designer-revision');
      await openWorkflowProductAction(page, 'designer-revision-task');
      await shot(page, 'revision-resubmit-panel');
      await page.getByRole('button', { name: /Отправить повторно/ }).click();
      await page.waitForTimeout(1400);
      await assertProductStatus(page, 'review');
    });

    await step('Admin approves with KPI weight and product moves to marketplace', async () => {
      await logout(page);
      await login(page, users.admin, 'admin-approve-kpi');
      await openWorkflowProductAction(page, 'admin-review-after-revision');
      await page.getByLabel(/KPI/).selectOption('2');
      await shot(page, 'approve-with-kpi-weight');
      await page.getByRole('button', { name: /Одобрить/ }).click();
      await page.waitForTimeout(1400);
      const product = await assertProductStatus(page, 'marketplace');
      if (Number(product.kpiWeight) !== 2) throw new Error(`Expected product kpiWeight=2, got ${product.kpiWeight}`);
    });

    await step('Permission probes reject forbidden lifecycle/card actions', async () => {
      const designerApprove = await requestWithToken(tokens.designer, 'POST', `/products/${productId}/lifecycle/approve`, { kpiWeight: 1 }, [403]);
      const marketplaceCardEdit = await requestWithToken(tokens.marketplace, 'PUT', `/products/${productId}`, { name: 'Forbidden rename' }, [403]);
      const historyMutation = await requestWithToken(tokens.admin, 'POST', `/products/${productId}/history`, {}, [404]);
      apiVerification = {
        forbiddenDesignerApprove: designerApprove.status,
        forbiddenMarketplaceCardEdit: marketplaceCardEdit.status,
        forbiddenHistoryMutation: historyMutation.status,
      };
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
      await page.getByLabel('Описание / заметки').fill('QA stages 1-12 Kaspi listing');
      await shot(page, 'kaspi-panel-filled');
      await page.getByRole('button', { name: /Сохранить/ }).click();
      await page.waitForTimeout(900);
      await page.getByRole('button', { name: /Передать в закуп/ }).click();
      await page.waitForTimeout(1400);
      await assertProductStatus(page, 'purchase');
    });

    await step('Purchase manager creates initial purchase and confirms partial arrival', async () => {
      await logout(page);
      await login(page, users.purchase, 'purchase-order');
      await openWorkflowProductAction(page, 'purchase-queue-before-order');
      await page.getByLabel('Количество').fill('5');
      await page.getByLabel('Закупочная цена за единицу').fill('1250');
      await page.getByLabel('Комментарий').fill('QA stages 1-12 initial purchase');
      await shot(page, 'purchase-panel-filled');
      await page.getByRole('button', { name: /Оформить закуп/ }).click();
      await page.waitForTimeout(1400);
      await assertProductStatus(page, 'purchase', { completed: false });

      await openWorkflowProductAction(page, 'purchase-queue-after-order');
      await page.getByLabel('Фактически поступило').fill('4');
      await page.getByLabel('Комментарий к приемке').fill('QA partial receipt: 4 of 5');
      await shot(page, 'arrival-panel-filled');
      await page.getByRole('dialog').getByRole('button', { name: /Подтвердить поступление/ }).click();
      await page.waitForTimeout(1400);
      await assertProductStatus(page, 'warehouse', { completed: false });
    });

    await step('Warehouse operator completes warehouse passport', async () => {
      await logout(page);
      await login(page, users.warehouse, 'warehouse');
      await openWorkflowProductAction(page, 'warehouse-queue');
      await page.getByLabel('Сектор').fill('QA-A');
      await page.getByLabel('Полка').fill('03');
      await page.getByLabel('Ячейка').fill('12');
      await page.getByLabel('Вес, кг').fill('0.45');
      await page.getByLabel('Длина, см').fill('20');
      await page.getByLabel('Ширина, см').fill('12.5');
      await page.getByLabel('Высота, см').fill('8');
      await page.getByLabel('Уточненная себестоимость').fill('1300');
      await page.getByLabel('Примечание').fill('QA stages 1-12 warehouse passport');
      await shot(page, 'warehouse-panel-filled');
      await page.getByRole('button', { name: /Завершить складской этап/ }).click();
      await page.waitForTimeout(1400);
      await assertProductStatus(page, 'in_sale', { completed: false });
    });

    await step('Marketplace manager completes sale launch and edits completed sale flags', async () => {
      await logout(page);
      await login(page, users.marketplace, 'marketplace-sale-launch');
      await openWorkflowProductAction(page, 'sale-launch-task-queue');
      const checkboxes = page.getByRole('checkbox');
      await checkboxes.nth(0).check();
      await checkboxes.nth(2).check();
      await page.getByLabel('Примечание').fill('QA launch: advertising and review bonus enabled');
      await shot(page, 'sale-launch-panel-filled');
      await page.getByRole('button', { name: /Завершить запуск/ }).click();
      await page.waitForTimeout(1400);
      await assertProductStatus(page, 'in_sale', { completed: true });

      await page.goto(`${BASE_URL}/workflow`, { waitUntil: 'networkidle' });
      await page.getByRole('button', { name: 'В продаже', exact: true }).click();
      await page.locator('input[placeholder*="Kaspi"]').fill(productName);
      await page.waitForTimeout(900);
      const card = page.locator('article').filter({ hasText: productName }).first();
      await card.waitFor({ state: 'visible', timeout: 10000 });
      await shot(page, 'completed-product-sales-view');
      await card.getByRole('button', { name: /Параметры продаж/ }).click();
      await page.waitForTimeout(800);
      const completedCheckboxes = page.getByRole('checkbox');
      await completedCheckboxes.nth(1).check();
      await page.getByLabel('Примечание').fill('QA launch updated: promotion enabled');
      await shot(page, 'completed-sale-panel-updated');
      await page.getByRole('button', { name: /Сохранить изменения/ }).click();
      await page.waitForTimeout(1000);
    });

    await step('Admin visually verifies history timeline and KPI report', async () => {
      await logout(page);
      await login(page, users.admin, 'admin-history-kpi');
      await openWorkflowHistory(page, 'history-timeline-modal');
      await page.goto(`${BASE_URL}/reports/designer-kpi`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1500);
      await page.getByText(productName).waitFor({ state: 'visible', timeout: 10000 });
      await shot(page, 'designer-kpi-report');

      const history = await apiGet(page, `/products/${productId}/history?page=1&limit=100`);
      const events = history.data.events;
      const actionTypes = events.map((event) => event.actionType);
      for (const required of ['approved', 'revision_requested', 'revision_resubmitted', 'sale_launch_completed']) {
        if (!actionTypes.includes(required)) throw new Error(`History API missing ${required}`);
      }
      if (!events.some((event) => event.source === 'price') || !events.some((event) => event.source === 'stock')) {
        throw new Error('History API does not include price and stock sources');
      }

      const today = new Date().toISOString().slice(0, 10);
      const kpi = await apiGet(page, `/analytics/designer-kpi?from=${today}&to=${today}`);
      const designerRow = kpi.data.designers.find((row) => row.designer.id === designerId);
      if (!designerRow || !designerRow.entries.some((entry) => entry.product?.id === productId && Number(entry.weight) === 2)) {
        throw new Error(`KPI report API missing QA product: ${JSON.stringify(kpi.data)}`);
      }
      apiVerification = {
        ...apiVerification,
        historyEvents: events.length,
        kpiTotalWeightForDesigner: designerRow.totalWeight,
      };
    });
  } finally {
    await browser.close();
  }

  databaseVerification = await step('Database state matches full stages 1-12 workflow', async () => (
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
    apiVerification,
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
