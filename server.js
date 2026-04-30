const path = require('node:path');
const crypto = require('node:crypto');
const fs = require('node:fs/promises');
const express = require('express');
const dotenv = require('dotenv');
const admin = require('firebase-admin');

dotenv.config();

const rootDir = __dirname;
const port = Number(process.env.PORT) || 3000;
const dataDir = path.join(rootDir, 'data');
const productsFile = path.join(dataDir, 'products.json');
const catalogItemsFile = path.join(dataDir, 'catalog-items.json');
const adminsFile = path.join(dataDir, 'admins.json');
const flipbooksFile = path.join(dataDir, 'flipbooks.json');
const firebaseServiceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
  || path.join(rootDir, 'firebase-service.json');
const accessTokens = new Map();
const catalogAccessTokens = new Map();
const catalogPin = '12345';

let firestoreDb = null;

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

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch (error) {
    return false;
  }
};

const loadFirebaseServiceAccount = async () => {
  // Support multiple ways to provide credentials:
  // - FIREBASE_SERVICE_ACCOUNT: inline JSON string OR file path
  // - FIREBASE_SERVICE_ACCOUNT_JSON: inline JSON string
  // - FIREBASE_SERVICE_ACCOUNT_B64: base64-encoded JSON
  // - FIREBASE_SERVICE_ACCOUNT_PATH: filesystem path to JSON

  const envCandidate = String(process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_SERVICE_ACCOUNT_JSON || '').trim();

  if (envCandidate) {
    // If it looks like JSON, parse it inline
    if (envCandidate.startsWith('{')) {
      const parsed = JSON.parse(envCandidate);
      if (process.env.FIREBASE_PRIVATE_KEY) {
        parsed.private_key = String(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, '\n');
      }
      return parsed;
    }

    // Otherwise treat it as a path
    if (await fileExists(envCandidate)) {
      const file = await readJsonFile(envCandidate, null);
      if (file && process.env.FIREBASE_PRIVATE_KEY) {
        file.private_key = String(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, '\n');
      }
      return file;
    }
  }

  // Base64-encoded JSON support
  if (process.env.FIREBASE_SERVICE_ACCOUNT_B64 || process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64) {
    const b64 = process.env.FIREBASE_SERVICE_ACCOUNT_B64 || process.env.FIREBASE_SERVICE_ACCOUNT_JSON_B64;
    try {
      const decoded = Buffer.from(String(b64), 'base64').toString('utf8');
      const parsed = JSON.parse(decoded);
      if (process.env.FIREBASE_PRIVATE_KEY) {
        parsed.private_key = String(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, '\n');
      }
      return parsed;
    } catch (err) {
      // fallthrough to file-based loading
    }
  }

  // Finally, try the configured path
  if (await fileExists(firebaseServiceAccountPath)) {
    const file = await readJsonFile(firebaseServiceAccountPath, null);
    if (file && process.env.FIREBASE_PRIVATE_KEY) {
      file.private_key = String(process.env.FIREBASE_PRIVATE_KEY).replace(/\\n/g, '\n');
    }
    return file;
  }

  return null;
};

const initializeFirebase = async () => {
  try {
    const serviceAccount = await loadFirebaseServiceAccount();
console.log("👉 Expected path:", firebaseServiceAccountPath);

console.log("👉 Loaded service account:", serviceAccount ? "YES" : "NO");
    if (!serviceAccount || !serviceAccount.project_id || !serviceAccount.client_email || !serviceAccount.private_key) {
      return false;
    }

    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: serviceAccount.project_id,
          clientEmail: serviceAccount.client_email,
          privateKey: serviceAccount.private_key.replace(/\\n/g, '\n')
        })
      });
    }

    firestoreDb = admin.firestore();
    return true;
  } catch (error) {
    console.warn('Firebase initialization failed, continuing with local JSON storage:', error.message);
    firestoreDb = null;
    return false;
  }
};

const isFirebaseReady = () => Boolean(firestoreDb);

const mapFirestoreDocs = (snapshot) => snapshot.docs.map((doc) => ({
  id: doc.id,
  ...doc.data()
}));

const getFirebaseCollection = async (collectionName) => {
  const snapshot = await firestoreDb.collection(collectionName).orderBy('createdAt', 'desc').get();
  return mapFirestoreDocs(snapshot);
};

const createFirebaseDocument = async (collectionName, payload) => {
  const createdAt = new Date().toISOString();
  const docRef = await firestoreDb.collection(collectionName).add({
    ...payload,
    createdAt
  });

  return {
    id: docRef.id,
    ...payload,
    createdAt
  };
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

const getStoredFlipbooks = async () => {
  const flipbooks = await readJsonFile(flipbooksFile, null);
  if (Array.isArray(flipbooks) && flipbooks.length > 0) {
    return flipbooks;
  }

  await writeJsonFile(flipbooksFile, []);
  return [];
};

const saveFlipbooks = async (flipbooks) => {
  await writeJsonFile(flipbooksFile, flipbooks);
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
  try {
    if (isFirebaseReady()) {
      const products = await getFirebaseCollection('products');
      res.json({ products });
      return;
    }

    const products = await getStoredProducts();
    res.json({ products });
  } catch (error) {
    console.error('Error in GET /api/products:', error);
    res.status(500).json({ message: 'Failed to load products.' });
  }
});

app.get('/api/catalog-items', async (_, res) => {
  try {
    if (isFirebaseReady()) {
      const items = await getFirebaseCollection('catalogItems');
      res.json({ items });
      return;
    }

    const items = await getStoredCatalogItems();
    res.json({ items });
  } catch (error) {
    console.error('Error in GET /api/catalog-items:', error);
    res.status(500).json({ message: 'Failed to load catalog items.' });
  }
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

  try {
    if (isFirebaseReady()) {
      const product = await createFirebaseDocument('products', {
        name,
        description,
        photo,
        createdBy: req.adminSession.phone
      });

      res.status(201).json({ product });
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
  } catch (error) {
    console.error('Error in POST /api/products:', error);
    res.status(500).json({ message: 'Failed to save product.' });
  }
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

  try {
    if (isFirebaseReady()) {
      const item = await createFirebaseDocument('catalogItems', {
        name,
        description,
        price,
        photo,
        createdBy: req.adminSession.phone
      });

      res.status(201).json({ item });
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
  } catch (error) {
    console.error('Error in POST /api/catalog-items:', error);
    res.status(500).json({ message: 'Failed to save catalog item.' });
  }
});

app.get('/api/flipbooks', async (_, res) => {
  try {
    if (isFirebaseReady()) {
      const flipbooks = await getFirebaseCollection('flipbooks');
      res.json({ flipbooks });
      return;
    }

    const flipbooks = await getStoredFlipbooks();
    res.json({ flipbooks });
  } catch (error) {
    console.error('Error in GET /api/flipbooks:', error);
    res.status(500).json({ message: 'Failed to load flipbooks.' });
  }
});

app.post('/api/flipbooks', requireVerifiedToken, async (req, res) => {
  const title = String(req.body?.title || '').trim();
  const description = String(req.body?.description || '').trim();
  const coverImage = String(req.body?.coverImage || '').trim();
  const pages = Array.isArray(req.body?.pages) ? req.body.pages : [];

  if (!title) {
    res.status(400).json({ message: 'Flipbook title is required.' });
    return;
  }

  try {
    if (isFirebaseReady()) {
      const flipbook = await createFirebaseDocument('flipbooks', {
        title,
        description,
        coverImage,
        pages,
        createdBy: req.adminSession.phone
      });

      res.status(201).json({ flipbook });
      return;
    }

    const flipbooks = await getStoredFlipbooks();
    const flipbook = {
      id: crypto.randomUUID(),
      title,
      description,
      coverImage,
      pages,
      createdAt: new Date().toISOString(),
      createdBy: req.adminSession.phone
    };

    flipbooks.unshift(flipbook);
    await saveFlipbooks(flipbooks);

    res.status(201).json({ flipbook });
  } catch (error) {
    console.error('Error in POST /api/flipbooks:', error);
    res.status(500).json({ message: 'Failed to save flipbook.' });
  }
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

app.post('/api/showroom/verify-pin', (req, res) => {
  const pin = String(req.body?.pin || '').trim();

  if (pin !== catalogPin) {
    res.status(401).json({ message: 'Incorrect PIN.' });
    return;
  }

  const token = crypto.randomUUID();
  catalogAccessTokens.set(token, {
    issuedAt: Date.now()
  });

  res.setHeader('Set-Cookie', `retro_showroom_access=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=43200`);
  res.json({ message: 'PIN verified.' });
});

app.get('/', (_, res) => res.sendFile(path.join(rootDir, 'index.html')));
app.get('/index.html', (_, res) => res.sendFile(path.join(rootDir, 'index.html')));
app.get('/about', (_, res) => res.sendFile(path.join(rootDir, 'about.html')));
app.get('/about.html', (_, res) => res.sendFile(path.join(rootDir, 'about.html')));
app.get('/contact', (_, res) => res.sendFile(path.join(rootDir, 'contact.html')));
app.get('/contact.html', (_, res) => res.sendFile(path.join(rootDir, 'contact.html')));
app.get('/showroom', (_, res) => res.sendFile(path.join(rootDir, 'showroom-access.html')));
app.get('/showroom.html', (_, res) => res.sendFile(path.join(rootDir, 'showroom-access.html')));
app.get('/showroom-access', (_, res) => res.sendFile(path.join(rootDir, 'showroom-access.html')));
app.get('/showroom-access.html', (_, res) => res.sendFile(path.join(rootDir, 'showroom-access.html')));
app.get('/showroom-tour', (_, res) => res.sendFile(path.join(rootDir, 'showroom.html')));
app.get('/showroom-tour.html', (_, res) => res.sendFile(path.join(rootDir, 'showroom.html')));
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
  await getStoredFlipbooks();
  await writeJsonFile(
    adminsFile,
    await readJsonFile(adminsFile, {
      sharedPassword: '123456789',
      numbers: ['8094679551', '', '']
    })
  );
};

const migrateLocalDataToFirestore = async () => {
  if (!isFirebaseReady()) return { migrated: 0 };

  const results = { products: 0, catalogItems: 0, flipbooks: 0 };

  const uploadArray = async (collectionName, localFile) => {
    try {
      const items = await readJsonFile(localFile, null);
      if (!Array.isArray(items) || items.length === 0) return 0;

      for (const item of items) {
        const docId = item && item.id ? String(item.id) : null;
        const payload = { ...item };
        if (payload.id) delete payload.id;

        if (docId) {
          await firestoreDb.collection(collectionName).doc(docId).set(payload, { merge: true });
        } else {
          await firestoreDb.collection(collectionName).add(payload);
        }
      }

      return items.length;
    } catch (err) {
      console.warn(`Failed to migrate ${collectionName}:`, err.message);
      return 0;
    }
  };

  results.products = await uploadArray('products', productsFile);
  results.catalogItems = await uploadArray('catalogItems', catalogItemsFile);
  results.flipbooks = await uploadArray('flipbooks', flipbooksFile);

  return results;
};

app.use((_, res) => {
  res.status(404).send('Not found');
});

initializeStore()
  .then(async () => {
    const firebaseConnected = await initializeFirebase();

    if (firebaseConnected) {
      console.log('Firebase connected');
      try {
        const migrated = await migrateLocalDataToFirestore();
        console.log('Local -> Firestore migration results:', migrated);
      } catch (err) {
        console.warn('Migration failed:', err.message || err);
      }
    } else {
      console.warn('Firebase not configured, continuing with local JSON storage.');
    }

    app.listen(port, () => {
      console.log(`Retro INC server running at http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });