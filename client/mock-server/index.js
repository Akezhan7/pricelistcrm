const http = require('http');
const { products, suppliers, categories, orders, users, stockAnalytics } = require('./data');

const PORT = 5000;

const MOCK_TOKEN = 'mock-jwt-token-for-development';
const MOCK_USER = { id: 1, name: 'Администратор', email: 'admin@example.com', role: 'admin' };

function ok(data) {
  return JSON.stringify({ success: true, data });
}

function notFound() {
  return JSON.stringify({ success: false, message: 'Not found' });
}

function paginate(arr, query) {
  const params = new URLSearchParams(query || '');
  const page = parseInt(params.get('page') || '1');
  const limit = parseInt(params.get('limit') || '50');
  const search = (params.get('search') || '').toLowerCase();

  let items = arr;
  if (search) {
    items = arr.filter(i =>
      Object.values(i).some(v => typeof v === 'string' && v.toLowerCase().includes(search))
    );
  }

  const total = items.length;
  const pages = Math.ceil(total / limit);
  const start = (page - 1) * limit;

  return { items: items.slice(start, start + limit), pagination: { total, pages, page, limit } };
}

function route(method, pathname, query, body, res) {
  const seg = pathname.replace(/^\/api\//, '').split('/');
  const [resource, id, action] = seg;
  const numId = parseInt(id);

  // Auth
  if (resource === 'auth') {
    if (id === 'login' && method === 'POST') {
      res.writeHead(200);
      return res.end(ok({ user: MOCK_USER, token: MOCK_TOKEN }));
    }
    if (id === 'me') {
      res.writeHead(200);
      return res.end(ok({ user: MOCK_USER }));
    }
  }

  // Products
  if (resource === 'products') {
    if (!id) {
      const { items, pagination } = paginate(products, query);
      res.writeHead(200);
      return res.end(ok({ products: items, pagination }));
    }
    if (id === 'low-stock') {
      const low = products.filter(p => p.currentStock <= p.minStock);
      res.writeHead(200);
      return res.end(ok({ products: low, pagination: { total: low.length, pages: 1, page: 1, limit: 50 } }));
    }
    if (id === 'stock-analytics') {
      res.writeHead(200);
      return res.end(ok(stockAnalytics));
    }
    const product = products.find(p => p.id === numId);
    if (!product) { res.writeHead(404); return res.end(notFound()); }
    if (action === 'warehouse-details' && method === 'PUT') {
      product.warehouseDetails = {
        id: product.warehouseDetails?.id || Date.now(),
        productId: product.id,
        sector: body.sector,
        shelf: body.shelf,
        cell: body.cell,
        weight: body.weight ?? null,
        length: body.length ?? null,
        width: body.width ?? null,
        height: body.height ?? null,
        notes: body.notes || null,
        updatedBy: MOCK_USER.id,
        createdAt: product.warehouseDetails?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      res.writeHead(200);
      return res.end(ok({ warehouseDetails: product.warehouseDetails }));
    }
    if (method === 'GET') { res.writeHead(200); return res.end(ok(product)); }
    if (method === 'PUT') {
      Object.assign(product, body);
      res.writeHead(200);
      return res.end(ok(product));
    }
    if (method === 'DELETE') { res.writeHead(200); return res.end(ok({ message: 'Deleted' })); }
  }

  // Suppliers
  if (resource === 'suppliers') {
    if (!id) {
      if (method === 'POST') {
        const newS = { id: suppliers.length + 1, ...body, products: [] };
        suppliers.push(newS);
        res.writeHead(201);
        return res.end(ok(newS));
      }
      const { items, pagination } = paginate(suppliers, query);
      res.writeHead(200);
      return res.end(ok({ suppliers: items, pagination }));
    }
    const supplier = suppliers.find(s => s.id === numId);
    if (!supplier) { res.writeHead(404); return res.end(notFound()); }
    if (method === 'GET') { res.writeHead(200); return res.end(ok(supplier)); }
    if (method === 'PUT') {
      Object.assign(supplier, body);
      res.writeHead(200);
      return res.end(ok(supplier));
    }
    if (method === 'DELETE') { res.writeHead(200); return res.end(ok({ message: 'Deleted' })); }
    // suppliers/:id/payments
    if (action === 'payments') {
      res.writeHead(200);
      return res.end(ok({ payments: [], pagination: { total: 0, pages: 1, page: 1, limit: 50 } }));
    }
  }

  // Categories
  if (resource === 'categories') {
    if (!id || id === 'tree') {
      res.writeHead(200);
      return res.end(ok({ categories }));
    }
    const cat = categories.find(c => c.id === numId);
    if (!cat) { res.writeHead(404); return res.end(notFound()); }
    res.writeHead(200);
    return res.end(ok(cat));
  }

  // Orders
  if (resource === 'orders') {
    if (!id) {
      if (method === 'POST') {
        const newO = { id: orders.length + 1, orderNumber: `ORD-2026-00${orders.length + 1}`, ...body, items: [], payments: [], paymentStatus: 'Не оплачено', paidAmount: '0.00', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
        orders.push(newO);
        res.writeHead(201);
        return res.end(ok(newO));
      }
      const { items, pagination } = paginate(orders, query);
      res.writeHead(200);
      return res.end(ok({ orders: items, pagination, stats: { total: orders.length, byStatus: {} } }));
    }
    const order = orders.find(o => o.id === numId);
    if (!order) { res.writeHead(404); return res.end(notFound()); }
    if (action === 'status-history') {
      res.writeHead(200);
      return res.end(ok([]));
    }
    if (method === 'GET') { res.writeHead(200); return res.end(ok(order)); }
    if (method === 'PUT' || method === 'PATCH') {
      Object.assign(order, body);
      res.writeHead(200);
      return res.end(ok(order));
    }
    if (method === 'DELETE') { res.writeHead(200); return res.end(ok({ message: 'Deleted' })); }
    if (action === 'send-whatsapp' || action === 'confirm' || action === 'receive') {
      res.writeHead(200);
      return res.end(ok({ message: 'OK (mock)' }));
    }
  }

  // Payments
  if (resource === 'payments') {
    if (method === 'POST') {
      res.writeHead(201);
      return res.end(ok({ id: 1, ...body, createdAt: new Date().toISOString() }));
    }
    res.writeHead(200);
    return res.end(ok({ payments: [], pagination: { total: 0, pages: 1, page: 1, limit: 50 } }));
  }

  // Users
  if (resource === 'users') {
    if (!id) { res.writeHead(200); return res.end(ok({ users, pagination: { total: users.length, pages: 1, page: 1, limit: 50 } })); }
    const user = users.find(u => u.id === numId);
    if (!user) { res.writeHead(404); return res.end(notFound()); }
    res.writeHead(200);
    return res.end(ok(user));
  }

  // Analytics
  if (resource === 'analytics') {
    if (id === 'purchase-suggestions') {
      res.writeHead(200);
      return res.end(ok({ bySupplier: [], critical: [], total: 0 }));
    }
    res.writeHead(200);
    return res.end(ok({}));
  }

  // Warehouse
  if (resource === 'warehouse') {
    res.writeHead(200);
    return res.end(ok({ orders: [], pagination: { total: 0, pages: 1, page: 1, limit: 50 } }));
  }

  // Collector
  if (resource === 'collector') {
    res.writeHead(200);
    return res.end(ok({ tasks: [], pagination: { total: 0, pages: 1, page: 1, limit: 50 }, stats: { pending: 0, inProgress: 0, completed: 0 } }));
  }

  // Export
  if (resource === 'export') {
    res.writeHead(200);
    return res.end(ok([]));
  }

  // Sectors / Rows / Markets
  if (resource === 'sectors' || resource === 'rows' || resource === 'markets') {
    res.writeHead(200);
    return res.end(ok([]));
  }

  // Price history
  if (resource === 'price-history') {
    res.writeHead(200);
    return res.end(ok({ priceHistory: [], pagination: { total: 0, pages: 1, page: 1, limit: 50 } }));
  }

  res.writeHead(404);
  res.end(notFound());
}

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const [pathname, query] = (req.url || '/').split('?');

  let body = '';
  req.on('data', chunk => { body += chunk; });
  req.on('end', () => {
    let parsed = {};
    try { parsed = body ? JSON.parse(body) : {}; } catch {}
    route(req.method, pathname, query, parsed, res);
  });
});

server.listen(PORT, () => {
  console.log(`Mock API server running at http://localhost:${PORT}`);
  console.log('Login: admin@example.com / any password');
});
