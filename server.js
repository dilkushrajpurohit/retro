const path = require('node:path');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const express = require('express');

const rootDir = __dirname;
const port = Number(process.env.PORT) || 3000;
const dataDir = path.join(rootDir, 'data');
const productsFile = path.join(dataDir, 'products.json');
const catalogItemsFile = path.join(dataDir, 'catalog-items.json');
const adminsFile = path.join(dataDir, 'admins.json');
const accessTokens = new Map();
const catalogAccessTokens = new Map();
const catalogPin = '12345';

const app = express();

app.disable('x-powered-by');
app.use(express.json({ limit: '25mb' }));
app.use('/assets', express.static(path.join(rootDir, 'assets')));
app.use('/css', express.static(path.join(rootDir, 'css')));
app.use('/js', express.static(path.join(rootDir, 'js')));

const ensureDataDir = async () => {
  await fs.mkdir(dataDir, { recursive: true });
};

const readJsonFile = async (filePath, fallbackValue) => {
  try {
    const fileContent = await fs.readFile(filePath, 'utf8');
    return JSON.parse(fileContent);
  } catch (error) {
    return fallbackValue;
  }
};

const writeJsonFile = async (filePath, value) => {
  await fs.writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};

const seedProducts = [
  {
    id: 'seed-chair',
    name: 'Retro Lounge Chair',
    description: 'A comfortable reclaimed-wood lounge chair with warm grain and a premium matte finish.',
    photo: 'assets/img2.jpg',
    createdAt: new Date().toISOString()
  },
  {
    id: 'seed-table',
    name: 'Reclaimed Dining Table',
    description: 'A statement dining table designed for family homes, hospitality spaces, and project work.',
    photo: 'assets/img3.jpg',
    createdAt: new Date().toISOString()
  },
  {
    id: 'seed-decor',
    name: 'Handcrafted Decor Accent',
    description: 'A smaller decorative piece that carries the same reclaimed-wood story into a compact form.',
    photo: 'assets/img5.jpg',
    createdAt: new Date().toISOString()
  }
];

const seedCatalogItems = [
  {
    id: 'catalog-chair-01',
    name: 'Classic Chair',
    description: 'Elegant reclaimed wood chair with timeless lines and premium comfort.',
    price: '4999',
    photo: '/assets/img1.jpg',
    createdAt: new Date().toISOString()
  },
  {
    id: 'catalog-chair-02',
    name: 'Modern Chair',
    description: 'Minimal silhouette with handcrafted detailing and strong structure.',
    price: '6499',
    photo: '/assets/img2.jpg',
    createdAt: new Date().toISOString()
  },
  {
    id: 'catalog-chair-03',
    name: 'Luxury Chair',
    description: 'Premium finish and plush comfort for statement spaces.',
    price: '8999',
    photo: '/assets/img3.jpg',
    createdAt: new Date().toISOString()
  }
];

const getAllowedAdmins = async () => {
  const config = await readJsonFile(adminsFile, []);

  // Supports either a list of { phone, password } or { sharedPassword, numbers: [] }.
  if (!Array.isArray(config) && config && typeof config === 'object') {
    const sharedPassword = String(config.sharedPassword || '').trim();
    const numbers = Array.isArray(config.numbers) ? config.numbers : [];

    return numbers
      .map((value) => String(value || '').trim())
      .filter(Boolean)
      .map((phone) => ({
        phone,
        password: sharedPassword
      }))
      .filter((entry) => entry.password.length > 0);
  }

  return (Array.isArray(config) ? config : [])
    .filter((entry) => entry && entry.phone && entry.password)
    .map((entry) => ({
      phone: String(entry.phone).trim(),
      password: String(entry.password)
    }));
};

const getStoredProducts = async () => {
  const products = await readJsonFile(productsFile, null);
  if (Array.isArray(products) && products.length > 0) {
    return products;
  }

  await writeJsonFile(productsFile, seedProducts);
  return seedProducts;
};

const saveProducts = async (products) => {
  await writeJsonFile(productsFile, products);
};

const getStoredCatalogItems = async () => {
  const items = await readJsonFile(catalogItemsFile, null);
  if (Array.isArray(items) && items.length > 0) {
    return items;
  }

  await writeJsonFile(catalogItemsFile, seedCatalogItems);
  return seedCatalogItems;
};

const saveCatalogItems = async (items) => {
  await writeJsonFile(catalogItemsFile, items);
};

const requireVerifiedToken = (req, res, next) => {
  const authHeader = req.get('Authorization') || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';

  if (!token || !accessTokens.has(token)) {
    res.status(401).json({ message: 'Verification required.' });
    return;
  }

  req.adminSession = accessTokens.get(token);
  next();
};

const parseCookies = (cookieHeader = '') => cookieHeader
  .split(';')
  .map((chunk) => chunk.trim())
  .filter(Boolean)
  .reduce((acc, pair) => {
    const separatorIndex = pair.indexOf('=');
    if (separatorIndex === -1) {
      return acc;
    }

    const key = pair.slice(0, separatorIndex);
    const value = decodeURIComponent(pair.slice(separatorIndex + 1));
    acc[key] = value;
    return acc;
  }, {});

const hasCatalogAccess = (req) => {
  const cookies = parseCookies(req.get('Cookie') || '');
  const token = String(cookies.retro_catalog_access || '').trim();
  return token.length > 0 && catalogAccessTokens.has(token);
};

app.get('/api/products', async (_, res) => {
  const products = await getStoredProducts();
  res.json({ products });
});

app.get('/api/catalog-items', async (_, res) => {
  const items = await getStoredCatalogItems();
  res.json({ items });
});

app.post('/api/admin/verify', async (req, res) => {
  const phone = String(req.body?.phone || '').trim();
  const password = String(req.body?.password || '');
  const allowedAdmins = await getAllowedAdmins();
  const admin = allowedAdmins.find((entry) => entry.phone === phone && entry.password === password);

  if (!admin) {
    res.status(401).json({ message: 'Invalid number or password.' });
    return;
  }

  const token = crypto.randomUUID();
  accessTokens.set(token, {
    phone: admin.phone,
    issuedAt: Date.now()
  });

  res.json({
    message: 'Verified.',
    token,
    phone: admin.phone
  });
});

app.post('/api/products', requireVerifiedToken, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const description = String(req.body?.description || '').trim();
  const photo = String(req.body?.photo || '').trim();

  if (!name || !description || !photo) {
    res.status(400).json({ message: 'Product name, photo, and description are required.' });
    return;
  }

  const products = await getStoredProducts();
  const product = {
    id: crypto.randomUUID(),
    name,
    description,
    photo,
    createdAt: new Date().toISOString(),
    createdBy: req.adminSession.phone
  };

  products.unshift(product);
  await saveProducts(products);

  res.status(201).json({ product });
});

app.post('/api/catalog-items', requireVerifiedToken, async (req, res) => {
  const name = String(req.body?.name || '').trim();
  const description = String(req.body?.description || '').trim();
  const photo = String(req.body?.photo || '').trim();
  const price = String(req.body?.price || '').trim();

  if (!name || !description || !photo || !price) {
    res.status(400).json({ message: 'Product name, photo, description, and price are required.' });
    return;
  }

  const items = await getStoredCatalogItems();
  const item = {
    id: crypto.randomUUID(),
    name,
    description,
    price,
    photo,
    createdAt: new Date().toISOString(),
    createdBy: req.adminSession.phone
  };

  items.unshift(item);
  await saveCatalogItems(items);

  res.status(201).json({ item });
});

app.post('/api/catalog/verify-pin', (req, res) => {
  const pin = String(req.body?.pin || '').trim();

  if (pin !== catalogPin) {
    res.status(401).json({ message: 'Incorrect PIN.' });
    return;
  }

  const token = crypto.randomUUID();
  catalogAccessTokens.set(token, {
    issuedAt: Date.now()
  });

  res.setHeader('Set-Cookie', `retro_catalog_access=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`);
  res.json({ message: 'PIN verified.' });
});

app.get('/', (_, res) => res.sendFile(path.join(rootDir, 'index.html')));
app.get('/index.html', (_, res) => res.sendFile(path.join(rootDir, 'index.html')));
app.get('/about', (_, res) => res.sendFile(path.join(rootDir, 'about.html')));
app.get('/about.html', (_, res) => res.sendFile(path.join(rootDir, 'about.html')));
app.get('/contact', (_, res) => res.sendFile(path.join(rootDir, 'contact.html')));
app.get('/contact.html', (_, res) => res.sendFile(path.join(rootDir, 'contact.html')));
app.get('/showroom', (_, res) => res.sendFile(path.join(rootDir, 'showroom.html')));
app.get('/showroom.html', (_, res) => res.sendFile(path.join(rootDir, 'showroom.html')));
app.get('/products', (_, res) => res.sendFile(path.join(rootDir, 'products.html')));
app.get('/products.html', (_, res) => res.sendFile(path.join(rootDir, 'products.html')));
app.get('/catalog-access', (_, res) => res.sendFile(path.join(rootDir, 'catalog-access.html')));
app.get('/catalog-access.html', (_, res) => res.sendFile(path.join(rootDir, 'catalog-access.html')));
app.get('/cat', (req, res) => {
  if (!hasCatalogAccess(req)) {
    res.redirect('/catalog-access.html');
    return;
  }

  res.sendFile(path.join(rootDir, 'catalog.html'));
});
app.get('/catalog.html', (req, res) => {
  if (!hasCatalogAccess(req)) {
    res.redirect('/catalog-access.html');
    return;
  }

  res.sendFile(path.join(rootDir, 'catalog.html'));
});
app.get('/main-catalog', (req, res) => {
  if (!hasCatalogAccess(req)) {
    res.redirect('/catalog-access.html');
    return;
  }

  res.sendFile(path.join(rootDir, 'main-catalog.html'));
});
app.get('/main-catalog.html', (req, res) => {
  if (!hasCatalogAccess(req)) {
    res.redirect('/catalog-access.html');
    return;
  }

  res.sendFile(path.join(rootDir, 'main-catalog.html'));
});
app.get('/chairs', (_, res) => res.sendFile(path.join(rootDir, 'chairs.html')));
app.get('/chairs.html', (_, res) => res.sendFile(path.join(rootDir, 'chairs.html')));
app.get('/tables', (_, res) => res.sendFile(path.join(rootDir, 'tables.html')));
app.get('/tables.html', (_, res) => res.sendFile(path.join(rootDir, 'tables.html')));
app.get('/decor', (_, res) => res.sendFile(path.join(rootDir, 'decor.html')));
app.get('/decor.html', (_, res) => res.sendFile(path.join(rootDir, 'decor.html')));

const initializeStore = async () => {
  await ensureDataDir();
  await getStoredProducts();
  await getStoredCatalogItems();
  await writeJsonFile(
    adminsFile,
    await readJsonFile(adminsFile, {
      sharedPassword: '123456789',
      numbers: ['8094679551', '', '']
    })
  );
};

app.use((_, res) => {
  res.status(404).send('Not found');
});

initializeStore()
  .then(() => {
    app.listen(port, () => {
      console.log(`Retro INC server running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });