import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

// S6: Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// S6: CORS configuration (supports allowed origin or same-origin)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim())
  : null;

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !allowedOrigins || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Dev / preview friendly default
    }
  },
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));

// S6: In-memory sliding rate limiter
const rateLimits = new Map();
function createRateLimiter(limit = 30, windowMs = 60000) {
  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
    const now = Date.now();
    const key = `${req.baseUrl || req.path}:${ip}`;
    const record = rateLimits.get(key) || { count: 0, resetAt: now + windowMs };
    if (now > record.resetAt) {
      record.count = 0;
      record.resetAt = now + windowMs;
    }
    record.count += 1;
    rateLimits.set(key, record);
    if (record.count > limit) {
      return res.status(429).json({ error: 'Demasiadas solicitudes. Por favor espera un momento.' });
    }
    next();
  };
}

const authRateLimiter = createRateLimiter(25, 60000); // 25 auth requests / min
const aiRateLimiter = createRateLimiter(15, 60000);   // 15 AI requests / min

// S4: SSRF prevention validator
function isSafePublicUrl(urlString) {
  try {
    const parsed = new URL(urlString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }
    const hostname = parsed.hostname.toLowerCase();
    // Block localhost, local domains, metadata
    if (
      hostname === 'localhost' ||
      hostname.endsWith('.local') ||
      hostname.endsWith('.internal') ||
      hostname.endsWith('.localhost')
    ) {
      return false;
    }
    // Block IPv4 private & loopback & metadata (169.254.x.x)
    const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
    const ipMatch = hostname.match(ipv4Regex);
    if (ipMatch) {
      const [, o1, o2] = ipMatch.map(Number);
      if (o1 === 127 || o1 === 0) return false;
      if (o1 === 10) return false;
      if (o1 === 169 && o2 === 254) return false;
      if (o1 === 192 && o2 === 168) return false;
      if (o1 === 172 && o2 >= 16 && o2 <= 31) return false;
    }
    // Block IPv6 loopback
    if (hostname.includes(':') || hostname === '[::1]') {
      return false;
    }
    // Disallow non-standard ports
    if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// S3: Sanitize space data before returning to client (Strip PIN & tokens)
function sanitizeSpace(space) {
  if (!space) return null;
  const { pin, tokens: _tokens, _isFreshInit: _fresh, ...publicSpace } = space;
  return {
    ...publicSpace,
    hasPin: Boolean(pin && String(pin).trim().length > 0)
  };
}

// Storage configuration (supports both local disk and Vercel/serverless environments)
const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const LOCAL_DATA_DIR = path.join(__dirname, 'data');
const DATA_DIR = isServerless ? path.join('/tmp', 'cita-data') : LOCAL_DATA_DIR;
const DB_FILE = path.join(DATA_DIR, 'spaces.json');
const SEED_FILE = path.join(LOCAL_DATA_DIR, 'spaces.json');

try {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
} catch (e) {
  console.warn('Notice on DATA_DIR creation:', e.message);
}

// Curated high-res romantic lodging photo fallbacks
const ROMANTIC_PHOTOS = [
  'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80', // Cozy wooden cabin
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80', // Luxury resort pool
  'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=1200&q=80', // Boutique hotel bedroom
  'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80', // Resort sea view
  'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80', // Forest cabin
  'https://images.unsplash.com/photo-1571896349842-33c89424de2d?auto=format&fit=crop&w=1200&q=80', // Modern villa
  'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1200&q=80', // Lake mountain view
  'https://images.unsplash.com/photo-1578683010236-d716f9a3f461?auto=format&fit=crop&w=1200&q=80'  // Luxury suite with tub
];

function getRandomPhoto() {
  return ROMANTIC_PHOTOS[Math.floor(Math.random() * ROMANTIC_PHOTOS.length)];
}

// In-memory cache + storage helper
let spacesCache = {};

// Permanent PostgreSQL Database Integration (Supabase / Neon / Postgres)
let dbPool = null;
const dbConnectionString = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

if (dbConnectionString) {
  try {
    const parsedUrl = new URL(dbConnectionString);
    dbPool = new pg.Pool({
      user: decodeURIComponent(parsedUrl.username),
      password: decodeURIComponent(parsedUrl.password),
      host: parsedUrl.hostname,
      port: parsedUrl.port ? parseInt(parsedUrl.port, 10) : 5432,
      database: parsedUrl.pathname.replace(/^\//, ''),
      ssl: { rejectUnauthorized: false },
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 8000
    });

    dbPool.on('error', (err) => {
      console.warn('Supabase PostgreSQL pool warning:', err.message);
    });
  } catch (err) {
    console.warn('Could not parse PostgreSQL connection string:', err.message);
  }
}

let dbInitPromise = null;
async function initDatabase() {
  if (!dbPool) return;
  try {
    const client = await dbPool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS spaces (
          id VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
        CREATE INDEX IF NOT EXISTS idx_spaces_updated_at ON spaces(updated_at);
      `);

      // Hydrate in-memory cache with all existing spaces
      const res = await client.query('SELECT id, data FROM spaces;');
      for (const row of res.rows) {
        if (row.id && row.data) {
          spacesCache[row.id] = row.data;
        }
      }
      console.log(`✓ Supabase PostgreSQL conectado: ${res.rows.length} espacio(s) sincronizado(s)`);
    } finally {
      client.release();
    }
  } catch (err) {
    console.warn('Aviso de inicialización Supabase:', err.message);
  }
}

function ensureDbInit() {
  if (!dbPool) return Promise.resolve();
  if (!dbInitPromise) {
    dbInitPromise = initDatabase();
  }
  return dbInitPromise;
}

// Trigger initial connection
ensureDbInit();

async function getSpaceFromDb(spaceId) {
  if (!dbPool || !spaceId) return null;
  try {
    await ensureDbInit();
    const res = await dbPool.query('SELECT data FROM spaces WHERE id = $1', [spaceId]);
    if (res.rows.length > 0 && res.rows[0].data) {
      return res.rows[0].data;
    }
  } catch (err) {
    console.warn(`Error reading space ${spaceId} from Supabase:`, err.message);
  }
  return null;
}

async function findSpaceByEmailFromDb(email) {
  if (!dbPool || !email) return null;
  try {
    await ensureDbInit();
    const cleanEmail = email.toLowerCase().trim();
    const res = await dbPool.query(
      `SELECT id, data FROM spaces 
       WHERE lower(data->>'ownerEmail') = $1 
          OR lower(data->'googleOwner'->>'email') = $1
       LIMIT 1`,
      [cleanEmail]
    );
    if (res.rows.length > 0 && res.rows[0].data) {
      return res.rows[0].data;
    }
  } catch (err) {
    console.warn(`Error finding space by email from Supabase:`, err.message);
  }
  return null;
}

async function saveSpaceToDb(spaceId, spaceData) {
  if (!dbPool || !spaceId || !spaceData) return;
  try {
    await ensureDbInit();
    await dbPool.query(
      `INSERT INTO spaces (id, data, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW();`,
      [spaceId, JSON.stringify(spaceData)]
    );
  } catch (err) {
    console.warn(`Error saving space ${spaceId} to Supabase:`, err.message);
  }
}

// Permanent Cloud KV Integration (Upstash Redis / Vercel KV via REST)
const KV_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const KV_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

async function getSpaceFromCloud(spaceId) {
  if (!KV_URL || !KV_TOKEN) return null;
  try {
    const res = await fetch(`${KV_URL}/get/cita_space_${spaceId}`, {
      headers: { Authorization: `Bearer ${KV_TOKEN}` }
    });
    if (res.ok) {
      const data = await res.json();
      if (data.result) {
        return typeof data.result === 'string' ? JSON.parse(data.result) : data.result;
      }
    }
  } catch (err) {
    console.warn('Cloud KV read error:', err.message);
  }
  return null;
}

async function saveSpaceToCloud(spaceId, spaceData) {
  if (!KV_URL || !KV_TOKEN) return;
  try {
    await fetch(`${KV_URL}/set/cita_space_${spaceId}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(JSON.stringify(spaceData))
    });
  } catch (err) {
    console.warn('Cloud KV write error:', err.message);
  }
}

function loadSpaces() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const data = fs.readFileSync(DB_FILE, 'utf-8');
      spacesCache = JSON.parse(data);
    } else if (fs.existsSync(SEED_FILE)) {
      const data = fs.readFileSync(SEED_FILE, 'utf-8');
      spacesCache = JSON.parse(data);
    }
  } catch (err) {
    console.error('Error loading spaces from disk:', err.message);
    if (!spacesCache) spacesCache = {};
  }
}

function saveSpaces(spaceIdToPersist = null) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(spacesCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving spaces to disk:', err.message);
  }

  // Persist to Supabase PostgreSQL (Fixes D4)
  if (dbPool) {
    if (spaceIdToPersist && spacesCache[spaceIdToPersist]) {
      saveSpaceToDb(spaceIdToPersist, spacesCache[spaceIdToPersist]);
    } else {
      for (const id of Object.keys(spacesCache)) {
        saveSpaceToDb(id, spacesCache[id]);
      }
    }
  }

  // Also sync to cloud KV if configured
  if (KV_URL && KV_TOKEN) {
    if (spaceIdToPersist && spacesCache[spaceIdToPersist]) {
      saveSpaceToCloud(spaceIdToPersist, spacesCache[spaceIdToPersist]);
    } else {
      for (const id of Object.keys(spacesCache)) {
        saveSpaceToCloud(id, spacesCache[id]);
      }
    }
  }
}

// Unified space retriever: memory -> disk -> Supabase -> Upstash
async function getOrLoadSpace(cleanId) {
  if (!cleanId) return null;
  if (spacesCache[cleanId]) return spacesCache[cleanId];
  loadSpaces();
  if (spacesCache[cleanId]) return spacesCache[cleanId];

  if (dbPool) {
    const fromDb = await getSpaceFromDb(cleanId);
    if (fromDb) {
      spacesCache[cleanId] = fromDb;
      return fromDb;
    }
  }

  if (KV_URL && KV_TOKEN) {
    const fromCloud = await getSpaceFromCloud(cleanId);
    if (fromCloud) {
      spacesCache[cleanId] = fromCloud;
      return fromCloud;
    }
  }

  return null;
}

loadSpaces();

// Seed initial romantic example data if space is brand new
function createDefaultSpace(spaceId) {
  return {
    id: spaceId,
    name: 'Nuestra Escapada Romántica 💕',
    nights: 3,
    currency: 'USD',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    partners: {
      partner1: { id: 'p1', name: 'Cami', avatar: '🌸', color: '#F472B6' },
      partner2: { id: 'p2', name: 'Nico', avatar: '🐻', color: '#818CF8' }
    },
    accommodations: [
      {
        id: 'acc_demo_1',
        title: 'Cabaña Bosque & Tina Nórdica Caliente',
        type: 'Cabaña',
        location: 'Bariloche, Circuito Chico',
        pricePerNight: 135,
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=1200&q=80',
        link: 'https://www.airbnb.com',
        description: 'Hermosa cabaña de troncos y piedra inmersa en el bosque andino. Cuenta con tina de madera caliente al aire libre bajo las estrellas y chimenea a leña.',
        highlights: [
          'Tina nórdica de agua caliente privada',
          'Chimenea a leña con provisión ilimitada',
          'Desayuno casero con mermeladas regionales',
          'Vistas panorámicas a la cordillera'
        ],
        cons: [
          'Requiere vehículo para llegar',
          'Señal de celular media (Wi-Fi fibra óptica disponible)'
        ],
        addedBy: 'p1',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        reactions: {
          p1: { liked: true, reaction: 'love', note: '¡Me enamoré de la tina bajo las estrellas!' },
          p2: { liked: true, reaction: 'love', note: '¡Ufff, tremendo! Es nuestro lugar 100%' }
        },
        tags: ['😍 Me fascina', '🛁 Tiene jacuzzi/tina', '✨ Súper romántico', '🌲 Naturaleza total'],
        comments: [
          {
            id: 'c_demo_1',
            partnerId: 'p1',
            partnerName: 'Cami',
            avatar: '🌸',
            text: 'Amor, imaginate acá tomando un vino al lado del fuego 🍷🔥',
            createdAt: new Date(Date.now() - 3600000 * 12).toISOString()
          },
          {
            id: 'c_demo_2',
            partnerId: 'p2',
            partnerName: 'Nico',
            avatar: '🐻',
            text: '¡Completamente sí! Ya vi que tiene parrilla también haha 🥩',
            createdAt: new Date(Date.now() - 3600000 * 10).toISOString()
          }
        ]
      },
      {
        id: 'acc_demo_2',
        title: 'Loft Boutique con Vista al Lago & Spa',
        type: 'Hotel Boutique',
        location: 'San Martín de los Andes, Centro',
        pricePerNight: 180,
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80',
        link: 'https://www.booking.com',
        description: 'Loft de diseño minimalista con ventanal de piso a techo sobre la bahía. Acceso libre al circuito de sauna húmedo, piscina climatizada in/out y cava de vinos.',
        highlights: [
          'Piscina climatizada in-out y sauna',
          'A solo 3 cuadras del centro gastronómico',
          'Desayuno buffet gourmet incluido',
          'Cama king size con sábanas de algodón egipcio'
        ],
        cons: [
          'Precio más elevado por noche',
          'Estacionamiento medido en la zona'
        ],
        addedBy: 'p2',
        createdAt: new Date(Date.now() - 3600000 * 18).toISOString(),
        reactions: {
          p1: { liked: true, reaction: 'love', note: '¡Divino el spa y estar cerca de los restaurantes!' },
          p2: { liked: false, reaction: 'expensive', note: 'Es precioso pero se nos va un toque de presupuesto' }
        },
        tags: ['✨ Muy romántico', '💸 Un poco caro', '🍷 Cerca de restaurantes', '💆‍♀️ Tiene Spa'],
        comments: [
          {
            id: 'c_demo_3',
            partnerId: 'p1',
            partnerName: 'Cami',
            avatar: '🌸',
            text: 'La pileta climatizada con vista al lago es una locura 😍',
            createdAt: new Date(Date.now() - 3600000 * 8).toISOString()
          }
        ]
      },
      {
        id: 'acc_demo_3',
        title: 'Glamping Domo Geodésico Deluxe & Estrellas',
        type: 'Glamping',
        location: 'Villa La Angostura, Puerto Manzano',
        pricePerNight: 95,
        currency: 'USD',
        imageUrl: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?auto=format&fit=crop&w=1200&q=80',
        link: 'https://www.airbnb.com',
        description: 'Experiencia inmersiva en domo geodésico transparente con calefacción a pellets, deck privado con fogonero y telescopio para contemplar la Vía Láctea.',
        highlights: [
          'Excelente relación calidad-precio ($95/noche)',
          'Techo panorámico para ver estrellas desde la cama',
          'Fogonero privado exterior para malvaviscos',
          'Entorno ultra silencioso y pacífico'
        ],
        cons: [
          'Baño privado en módulo contiguo a 5 metros',
          'Capacidad limitada de equipaje'
        ],
        addedBy: 'p1',
        createdAt: new Date(Date.now() - 3600000 * 6).toISOString(),
        reactions: {
          p1: { liked: true, reaction: 'love', note: '¡Re económico y original!' },
          p2: { liked: true, reaction: 'love', note: '¡Me copa la onda de fogata a la noche!' }
        },
        tags: ['😍 Me fascina', '💰 Gran precio', '⭐ Ver estrellas', '🔥 Fogón privado'],
        comments: []
      }
    ]
  };
}

// Routes

// S1, D7: Auth: Create a custom couple space (generates secure token & avoids ID collision)
app.post('/api/auth/create-space', authRateLimiter, (req, res) => {
  const {
    name = 'Nuestra Escapada Romántica 💕',
    p1Name = 'Pareja 1',
    p1Avatar = '🌸',
    p2Name = 'Pareja 2',
    p2Avatar = '🐻',
    pin = '',
    withExamples = false,
    nights = 3,
    currency = 'CLP'
  } = req.body;

  let cleanId;
  let attempts = 0;
  do {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    cleanId = `AMOR-${randomDigits}`;
    attempts++;
  } while (spacesCache[cleanId] && attempts < 50);

  const token = crypto.randomUUID();

  const newSpace = {
    id: cleanId,
    name: name.trim() || 'Nuestra Escapada Romántica 💕',
    nights: Math.max(1, parseInt(nights, 10) || 3),
    currency: currency || 'CLP',
    pin: pin ? String(pin).trim() : '',
    tokens: [token],
    deletedAccIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    partners: {
      partner1: { id: 'p1', name: (p1Name || 'Ella').trim(), avatar: p1Avatar || '🌸', color: '#F472B6' },
      partner2: { id: 'p2', name: (p2Name || 'Él').trim(), avatar: p2Avatar || '🐻', color: '#818CF8' }
    },
    accommodations: withExamples ? createDefaultSpace(cleanId).accommodations : []
  };

  spacesCache[cleanId] = newSpace;
  saveSpaces(cleanId);

  res.status(201).json({ success: true, space: sanitizeSpace(newSpace), token });
});

// Health check with Supabase database status
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    database: dbPool ? 'supabase_postgres' : (KV_URL ? 'kv_cloud' : 'local_disk'),
    timestamp: new Date().toISOString()
  });
});

// S1, S2: Auth: Join an existing couple space (404 on not found, strict PIN validation, token issued)
app.post('/api/auth/join-space', authRateLimiter, async (req, res) => {
  const { spaceId, pin = '', partnerChoice = '' } = req.body;
  const cleanId = (spaceId || '').toUpperCase().trim();

  if (!cleanId) {
    return res.status(400).json({ error: 'Ingresa un código de nido válido.' });
  }

  const space = await getOrLoadSpace(cleanId);
  if (!space) {
    return res.status(404).json({ error: 'No encontramos ese nido. Por favor verifica el código e intenta nuevamente.' });
  }

  // S2: Strict PIN validation
  if (space.pin && space.pin !== String(pin).trim()) {
    return res.status(401).json({ error: 'El PIN de pareja es incorrecto.', requiresPin: true });
  }

  const partnerId = partnerChoice === 'p2' ? 'p2' : 'p1';
  const token = crypto.randomUUID();
  space.tokens = Array.isArray(space.tokens) ? space.tokens : [];
  space.tokens.push(token);
  if (space.tokens.length > 50) space.tokens = space.tokens.slice(-50);
  saveSpaces(cleanId);

  res.json({ success: true, space: sanitizeSpace(space), partnerId, token });
});

// S2: Dedicated PIN verification endpoint
app.post('/api/auth/verify-pin', authRateLimiter, async (req, res) => {
  const { spaceId, pin } = req.body;
  const cleanId = (spaceId || '').toUpperCase().trim();

  const space = await getOrLoadSpace(cleanId);
  if (!space) {
    return res.status(404).json({ error: 'Nido no encontrado' });
  }

  if (space.pin && space.pin !== String(pin).trim()) {
    return res.status(401).json({ error: 'PIN incorrecto' });
  }

  const token = crypto.randomUUID();
  space.tokens = Array.isArray(space.tokens) ? space.tokens : [];
  space.tokens.push(token);
  saveSpaces(cleanId);

  res.json({ success: true, space: sanitizeSpace(space), token });
});

// U1: Auth: Honest email access & space recovery
app.post(['/api/auth/email', '/api/auth/google'], authRateLimiter, async (req, res) => {
  const { email, name, partnerName = '', spaceName = '' } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email requerido para acceder al nido' });
  }

  const cleanEmail = email.toLowerCase().trim();

  // Search if a space already exists linked to this email in memory
  let existingId = Object.keys(spacesCache).find((id) => {
    return spacesCache[id]?.ownerEmail?.toLowerCase().trim() === cleanEmail ||
           spacesCache[id]?.googleOwner?.email?.toLowerCase().trim() === cleanEmail;
  });

  // If not found in memory, search in Supabase PostgreSQL
  if (!existingId && dbPool) {
    const fromDb = await findSpaceByEmailFromDb(cleanEmail);
    if (fromDb && fromDb.id) {
      spacesCache[fromDb.id] = fromDb;
      existingId = fromDb.id;
    }
  }

  if (existingId) {
    const space = spacesCache[existingId];
    const token = crypto.randomUUID();
    space.tokens = Array.isArray(space.tokens) ? space.tokens : [];
    space.tokens.push(token);
    saveSpaces(existingId);

    return res.json({
      success: true,
      space: sanitizeSpace(space),
      token,
      isNew: false,
      message: `¡Bienvenido de nuevo! Recuperamos tu nido con éxito.`
    });
  }

  // Create new space linked to this email
  let cleanId;
  let attempts = 0;
  do {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    cleanId = `AMOR-${randomDigits}`;
    attempts++;
  } while (spacesCache[cleanId] && attempts < 50);

  const token = crypto.randomUUID();
  const userDisplayName = (name || cleanEmail.split('@')[0] || 'Tú').trim();
  const partnerDisplayName = (partnerName || 'Mi Pareja').trim();

  const newSpace = {
    id: cleanId,
    name: spaceName.trim() || `Escapada de ${userDisplayName} & ${partnerDisplayName} 💕`,
    nights: 3,
    currency: 'CLP',
    pin: '',
    tokens: [token],
    deletedAccIds: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ownerEmail: cleanEmail,
    googleOwner: {
      email: cleanEmail,
      name: userDisplayName
    },
    partners: {
      partner1: { id: 'p1', name: userDisplayName, avatar: '🌸', color: '#F472B6' },
      partner2: { id: 'p2', name: partnerDisplayName, avatar: '🐻', color: '#818CF8' }
    },
    accommodations: []
  };

  spacesCache[cleanId] = newSpace;
  saveSpaces(cleanId);

  res.status(201).json({
    success: true,
    space: sanitizeSpace(newSpace),
    token,
    isNew: true,
    message: `¡Nido creado y vinculado exitosamente a tu email (${cleanEmail})!`
  });
});

// Link email account to an existing space
app.post(['/api/space/:spaceId/link-email', '/api/space/:spaceId/link-google'], async (req, res) => {
  const { spaceId } = req.params;
  const { email, name } = req.body;
  const cleanId = (spaceId || '').toUpperCase().trim();

  const space = await getOrLoadSpace(cleanId);
  if (!space) {
    return res.status(404).json({ error: 'Espacio no encontrado' });
  }

  if (!email) {
    return res.status(400).json({ error: 'Email requerido' });
  }

  const cleanEmail = email.toLowerCase().trim();
  spacesCache[cleanId].ownerEmail = cleanEmail;
  spacesCache[cleanId].googleOwner = {
    email: cleanEmail,
    name: (name || cleanEmail.split('@')[0]).trim()
  };
  spacesCache[cleanId].updatedAt = new Date().toISOString();
  saveSpaces(cleanId);

  res.json({ success: true, space: sanitizeSpace(spacesCache[cleanId]) });
});

// D1, D2: Synchronize space state with Last-Write-Wins (LWW) and respect deleted tombstones
app.post('/api/space/:spaceId/sync', async (req, res) => {
  const { spaceId } = req.params;
  const cleanId = (spaceId || 'default').toUpperCase().trim();
  const incoming = req.body;

  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ error: 'Payload de sincronización inválido' });
  }

  const existing = (await getOrLoadSpace(cleanId)) || {};

  // Combine deleted tombstones so deleted items NEVER resurrect (Fixes D1)
  const existingDeleted = Array.isArray(existing.deletedAccIds) ? existing.deletedAccIds : [];
  const incomingDeleted = Array.isArray(incoming.deletedAccIds) ? incoming.deletedAccIds : [];
  const allDeletedSet = new Set([...existingDeleted, ...incomingDeleted]);

  const existingAccs = Array.isArray(existing.accommodations) ? existing.accommodations : [];
  const incomingAccs = Array.isArray(incoming.accommodations) ? incoming.accommodations : [];

  const accMap = new Map();

  // 1. Existing items that are not deleted
  for (const acc of existingAccs) {
    if (acc && acc.id && !allDeletedSet.has(acc.id)) {
      accMap.set(acc.id, acc);
    }
  }

  // 2. Incoming items: apply LWW (Last-Write-Wins)
  for (const incAcc of incomingAccs) {
    if (!incAcc || !incAcc.id || allDeletedSet.has(incAcc.id)) continue;

    if (!accMap.has(incAcc.id)) {
      accMap.set(incAcc.id, incAcc);
    } else {
      const curAcc = accMap.get(incAcc.id);
      const incTime = new Date(incAcc.updatedAt || 0).getTime();
      const curTime = new Date(curAcc.updatedAt || 0).getTime();

      // Base fields: newer update wins
      const base = incTime >= curTime ? { ...curAcc, ...incAcc } : { ...incAcc, ...curAcc };

      // Partner reactions: merge by individual reaction timestamp/presence
      const mergedReactions = {
        p1: incAcc.reactions?.p1?.liked !== undefined ? incAcc.reactions.p1 : curAcc.reactions?.p1,
        p2: incAcc.reactions?.p2?.liked !== undefined ? incAcc.reactions.p2 : curAcc.reactions?.p2
      };

      // Comments: merge unique comment objects by id
      const commentMap = new Map();
      for (const c of (curAcc.comments || [])) {
        if (c && c.id) commentMap.set(c.id, c);
      }
      for (const c of (incAcc.comments || [])) {
        if (c && c.id) commentMap.set(c.id, c);
      }
      const mergedComments = Array.from(commentMap.values()).sort(
        (a, b) => new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime()
      );

      accMap.set(incAcc.id, {
        ...base,
        reactions: mergedReactions,
        comments: mergedComments,
        updatedAt: new Date(Math.max(incTime, curTime, Date.now())).toISOString()
      });
    }
  }

  const mergedSpace = {
    ...existing,
    ...incoming,
    id: cleanId,
    name: incoming.name || existing.name || 'Nuestra Escapada Romántica 💕',
    nights: incoming.nights || existing.nights || 3,
    currency: incoming.currency || existing.currency || 'CLP',
    partners: {
      partner1: {
        ...(existing.partners?.partner1 || { id: 'p1', name: 'Pareja 1', avatar: '🌸', color: '#F472B6' }),
        ...(incoming.partners?.partner1 || {})
      },
      partner2: {
        ...(existing.partners?.partner2 || { id: 'p2', name: 'Pareja 2', avatar: '🐻', color: '#818CF8' }),
        ...(incoming.partners?.partner2 || {})
      }
    },
    deletedAccIds: Array.from(allDeletedSet),
    accommodations: Array.from(accMap.values()),
    updatedAt: new Date().toISOString()
  };

  spacesCache[cleanId] = mergedSpace;
  saveSpaces(cleanId);

  res.json({ success: true, space: sanitizeSpace(mergedSpace) });
});

// S3: Get space data (Sanitized public DTO, returns 404 for nonexistent spaces)
app.get('/api/space/:spaceId', async (req, res) => {
  const { spaceId } = req.params;
  const cleanId = (spaceId || 'default').toUpperCase().trim();

  let space = await getOrLoadSpace(cleanId);
  if (!space) {
    // Only auto-initialize demo items for the official demo spaces
    if (cleanId === 'AMOR-2026' || cleanId === 'DEMO') {
      space = createDefaultSpace(cleanId);
      spacesCache[cleanId] = space;
      saveSpaces(cleanId);
    } else {
      return res.status(404).json({ error: 'Nido no encontrado' });
    }
  }

  res.json(sanitizeSpace(space));
});

// Update general space configuration (name, currency, nights, partners)
app.post('/api/space/:spaceId', async (req, res) => {
  const { spaceId } = req.params;
  const cleanId = (spaceId || 'default').toUpperCase().trim();

  const current = await getOrLoadSpace(cleanId);
  if (!current) {
    return res.status(404).json({ error: 'Nido no encontrado' });
  }
  const { name, nights, currency, partners } = req.body;

  if (name !== undefined) current.name = name;
  if (nights !== undefined) current.nights = Math.max(1, parseInt(nights, 10) || 1);
  if (currency !== undefined) current.currency = currency;
  if (partners !== undefined) current.partners = { ...current.partners, ...partners };

  current.updatedAt = new Date().toISOString();
  saveSpaces(cleanId);

  res.json(sanitizeSpace(current));
});

// Add new accommodation
app.post('/api/space/:spaceId/accommodations', async (req, res) => {
  const { spaceId } = req.params;
  const cleanId = (spaceId || 'default').toUpperCase().trim();

  const current = await getOrLoadSpace(cleanId);
  if (!current) {
    return res.status(404).json({ error: 'Nido no encontrado' });
  }
  const now = new Date().toISOString();
  const newAcc = {
    id: 'acc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    title: req.body.title || 'Alojamiento Romántico',
    type: req.body.type || 'Cabaña',
    location: req.body.location || 'Zona por definir',
    pricePerNight: parseFloat(req.body.pricePerNight) || 100,
    currency: req.body.currency || current.currency || 'CLP',
    imageUrl: req.body.imageUrl || getRandomPhoto(),
    link: req.body.link || '',
    description: req.body.description || '',
    highlights: Array.isArray(req.body.highlights) ? req.body.highlights : [],
    cons: Array.isArray(req.body.cons) ? req.body.cons : [],
    tags: Array.isArray(req.body.tags) ? req.body.tags : [],
    addedBy: req.body.addedBy || 'p1',
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    reactions: req.body.reactions || {
      p1: { liked: false, reaction: null, note: '', updatedAt: now },
      p2: { liked: false, reaction: null, note: '', updatedAt: now }
    },
    comments: []
  };

  current.accommodations = Array.isArray(current.accommodations) ? current.accommodations : [];
  current.accommodations.unshift(newAcc);
  current.updatedAt = now;
  saveSpaces(cleanId);

  res.status(201).json(newAcc);
});

// Update accommodation
app.put('/api/space/:spaceId/accommodations/:accId', async (req, res) => {
  const { spaceId, accId } = req.params;
  const cleanId = (spaceId || 'default').toUpperCase().trim();

  const current = await getOrLoadSpace(cleanId);
  if (!current) {
    return res.status(404).json({ error: 'Espacio no encontrado' });
  }
  const index = current.accommodations.findIndex(a => a.id === accId);

  if (index === -1) {
    return res.status(404).json({ error: 'Alojamiento no encontrado' });
  }

  const existing = current.accommodations[index];
  const now = new Date().toISOString();
  const updated = {
    ...existing,
    ...req.body,
    id: existing.id, // prevent overwriting ID
    createdAt: existing.createdAt,
    updatedAt: now,
    comments: existing.comments // comments updated via dedicated route
  };

  current.accommodations[index] = updated;
  current.updatedAt = now;
  saveSpaces(cleanId);

  res.json(updated);
});

// D1: Delete accommodation with tombstone tracking (Never resurrects)
app.delete('/api/space/:spaceId/accommodations/:accId', async (req, res) => {
  const { spaceId, accId } = req.params;
  const cleanId = (spaceId || 'default').toUpperCase().trim();

  const current = await getOrLoadSpace(cleanId);
  if (!current) {
    return res.status(404).json({ error: 'Espacio no encontrado' });
  }
  current.deletedAccIds = Array.isArray(current.deletedAccIds) ? current.deletedAccIds : [];
  if (!current.deletedAccIds.includes(accId)) {
    current.deletedAccIds.push(accId);
  }

  current.accommodations = current.accommodations.filter(a => a.id !== accId);
  current.updatedAt = new Date().toISOString();
  saveSpaces(cleanId);

  res.json({ success: true, count: current.accommodations.length });
});

// Toggle partner reaction / heart / sentiment
app.post('/api/space/:spaceId/accommodations/:accId/reaction', async (req, res) => {
  const { spaceId, accId } = req.params;
  const { partnerId, liked, reaction, note } = req.body;
  const cleanId = (spaceId || 'default').toUpperCase().trim();

  const current = await getOrLoadSpace(cleanId);
  if (!current) {
    return res.status(404).json({ error: 'Espacio no encontrado' });
  }
  const item = current.accommodations.find(a => a.id === accId);

  if (!item) {
    return res.status(404).json({ error: 'Alojamiento no encontrado' });
  }

  const now = new Date().toISOString();
  if (!item.reactions) {
    item.reactions = {
      p1: { liked: false, reaction: null, note: '', updatedAt: now },
      p2: { liked: false, reaction: null, note: '', updatedAt: now }
    };
  }

  const pKey = partnerId === 'p2' ? 'p2' : 'p1';
  item.reactions[pKey] = {
    liked: liked !== undefined ? !!liked : item.reactions[pKey]?.liked || false,
    reaction: reaction !== undefined ? reaction : item.reactions[pKey]?.reaction || null,
    note: note !== undefined ? note : item.reactions[pKey]?.note || '',
    updatedAt: now
  };
  item.updatedAt = now;

  // Check if both liked it (Match!)
  const isMatch = !!(item.reactions.p1?.liked && item.reactions.p2?.liked);

  current.updatedAt = now;
  saveSpaces(cleanId);

  res.json({ success: true, reactions: item.reactions, isMatch });
});

// Add comment to accommodation
app.post('/api/space/:spaceId/accommodations/:accId/comment', async (req, res) => {
  const { spaceId, accId } = req.params;
  const { partnerId, text } = req.body;
  const cleanId = (spaceId || 'default').toUpperCase().trim();

  const current = await getOrLoadSpace(cleanId);
  if (!current) {
    return res.status(404).json({ error: 'Espacio no encontrado' });
  }
  const item = current.accommodations.find(a => a.id === accId);

  if (!item) {
    return res.status(404).json({ error: 'Alojamiento no encontrado' });
  }

  const partnerInfo = current.partners[partnerId === 'p2' ? 'partner2' : 'partner1'] || {
    name: 'Pareja',
    avatar: '💌'
  };

  const now = new Date().toISOString();
  const newComment = {
    id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
    partnerId: partnerId || 'p1',
    partnerName: partnerInfo.name,
    avatar: partnerInfo.avatar,
    text: (text || '').trim(),
    createdAt: now
  };

  if (!Array.isArray(item.comments)) {
    item.comments = [];
  }

  item.comments.push(newComment);
  item.updatedAt = now;
  current.updatedAt = now;
  saveSpaces(cleanId);

  res.status(201).json(newComment);
});

// Delete comment
app.delete('/api/space/:spaceId/accommodations/:accId/comment/:commentId', async (req, res) => {
  const { spaceId, accId, commentId } = req.params;
  const cleanId = (spaceId || 'default').toUpperCase().trim();

  const current = await getOrLoadSpace(cleanId);
  if (!current) {
    return res.status(404).json({ error: 'Espacio no encontrado' });
  }
  const item = current.accommodations.find(a => a.id === accId);

  if (!item || !Array.isArray(item.comments)) {
    return res.status(404).json({ error: 'Comentario o alojamiento no encontrado' });
  }

  const now = new Date().toISOString();
  item.comments = item.comments.filter(c => c.id !== commentId);
  item.updatedAt = now;
  current.updatedAt = now;
  saveSpaces(cleanId);

  res.json({ success: true });
});

// S4, S5: AI Link Extractor & Web Scraper (SSRF protected, server-only Gemini key, rate-limited)
app.post('/api/ai/extract', aiRateLimiter, async (req, res) => {
  try {
    const { url, rawText } = req.body;
    let scrapedTitle = '';
    let scrapedDescription = '';
    let scrapedImage = '';
    let scrapedPrice = null;
    let scrapedLocation = '';

    // S4: Scrape metadata safely with SSRF protection
    if (url && typeof url === 'string') {
      const trimmedUrl = url.trim();
      if (!isSafePublicUrl(trimmedUrl)) {
        return res.status(400).json({ error: 'URL no permitida por seguridad (direcciones privadas o locales no autorizadas)' });
      }

      try {
        const fetchResponse = await fetch(trimmedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
          },
          signal: AbortSignal.timeout(5000)
        });

          if (fetchResponse.ok) {
            const rawHtml = await fetchResponse.text();
            const html = rawHtml.slice(0, 1000000); // 1MB limit to prevent memory exhaustion
            const $ = cheerio.load(html);

            scrapedTitle = $('meta[property="og:title"]').attr('content') ||
                           $('meta[name="twitter:title"]').attr('content') ||
                           $('title').text() || '';

            scrapedDescription = $('meta[property="og:description"]').attr('content') ||
                                 $('meta[name="twitter:description"]').attr('content') ||
                                 $('meta[name="description"]').attr('content') || '';

            scrapedImage = $('meta[property="og:image"]').attr('content') ||
                           $('meta[name="twitter:image"]').attr('content') || '';

            // Look for price in JSON-LD or meta tags
            $('script[type="application/ld+json"]').each((_, el) => {
              try {
                const json = JSON.parse($(el).html());
                if (json && json.offers && json.offers.price) {
                  scrapedPrice = parseFloat(json.offers.price);
                } else if (json && json.price) {
                  scrapedPrice = parseFloat(json.price);
                }
                if (json && json.address && (json.address.addressLocality || json.address.addressRegion)) {
                  scrapedLocation = [json.address.addressLocality, json.address.addressRegion, json.address.addressCountry].filter(Boolean).join(', ');
                }
              } catch {}
            });
          }
        } catch (scrapeErr) {
          console.warn('Scraping warning (proceeding with fallback extraction):', scrapeErr.message);
        }
      }

    // S5: Gemini API key strictly from server environment (Never trust client body)
    const geminiKey = process.env.GEMINI_API_KEY;

    if (geminiKey) {
      try {
        const prompt = `Actúa como un asistente experto en viajes románticos y extracción de datos de alojamientos.
Analiza la siguiente información de un alojamiento:

URL: ${url || 'No especificada'}
Título detectado: ${scrapedTitle}
Descripción detectada: ${scrapedDescription}
Ubicación detectada: ${scrapedLocation}
Texto o notas adicionales: ${rawText || 'Ninguno'}

Extrae y devuelve ÚNICAMENTE un objeto JSON válido (sin backticks de markdown ni texto adicional) con la siguiente estructura:
{
  "title": "Nombre atractivo y limpio del alojamiento",
  "type": "Cabaña" | "Hotel Boutique" | "Glamping" | "Departamento" | "Villa" | "Resort" | "Casa de Campo",
  "location": "Ciudad, Región o Zona",
  "pricePerNight": número aproximado,
  "currency": "USD",
  "imageUrl": "${scrapedImage || ''}",
  "highlights": ["Punto fuerte romántico 1", "Punto fuerte 2", "Punto fuerte 3"],
  "cons": ["Posible detalle a tener en cuenta 1", "Detalle 2"],
  "description": "Breve descripción romántica y atractiva de 2 a 3 oraciones"
}`;

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          }),
          signal: AbortSignal.timeout(6000)
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawResult = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawResult) {
            const parsed = JSON.parse(rawResult);
            if (!parsed.imageUrl || !parsed.imageUrl.startsWith('http')) {
              parsed.imageUrl = scrapedImage || getRandomPhoto();
            }
            parsed.link = url || '';
            return res.json({ success: true, data: parsed, source: 'gemini' });
          }
        }
      } catch (aiErr) {
        console.warn('Gemini API call failed, falling back to smart heuristic:', aiErr.message);
      }
    }

    // Smart heuristic & NLP fallback extractor (Zero configuration needed!)
    const combinedText = [scrapedTitle, scrapedDescription, rawText, url].filter(Boolean).join(' ');

    let cleanTitle = scrapedTitle
      .replace(/\|.*$/g, '')
      .replace(/-.*(Airbnb|Booking|TripAdvisor|Instagram).*$/gi, '')
      .trim();

    if (!cleanTitle || cleanTitle.length < 3) {
      if (rawText && rawText.length > 3) {
        cleanTitle = rawText.split('\n')[0].substring(0, 50).trim();
      } else if (url) {
        try {
          const u = new URL(url);
          const slug = u.pathname.split('/').filter(Boolean).pop() || '';
          cleanTitle = slug.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        } catch {
          cleanTitle = 'Alojamiento Romántico Especial';
        }
      } else {
        cleanTitle = 'Refugio Romántico';
      }
    }

    let lodgingType = 'Cabaña';
    const lowerText = combinedText.toLowerCase();
    if (lowerText.includes('glamping') || lowerText.includes('domo') || lowerText.includes('yurta')) {
      lodgingType = 'Glamping';
    } else if (lowerText.includes('boutique') || lowerText.includes('hotel')) {
      lodgingType = 'Hotel Boutique';
    } else if (lowerText.includes('depto') || lowerText.includes('departamento') || lowerText.includes('loft') || lowerText.includes('apart')) {
      lodgingType = 'Departamento';
    } else if (lowerText.includes('villa') || lowerText.includes('mansion')) {
      lodgingType = 'Villa';
    } else if (lowerText.includes('resort') || lowerText.includes('spa')) {
      lodgingType = 'Resort & Spa';
    }

    let estimatedPrice = scrapedPrice;
    if (!estimatedPrice) {
      const priceMatches = combinedText.match(/(?:us\$|\$|usd|eur|€)\s?(\d{2,4})/i) ||
                           combinedText.match(/(\d{2,4})\s?(?:usd|dolares|dólares|noche|\/noche)/i);
      if (priceMatches && priceMatches[1]) {
        estimatedPrice = parseFloat(priceMatches[1]);
      } else {
        estimatedPrice = lodgingType === 'Glamping' ? 95 : lodgingType === 'Hotel Boutique' ? 160 : 120;
      }
    }

    let estimatedLocation = scrapedLocation;
    if (!estimatedLocation) {
      const locMatch = combinedText.match(/(?:en|ubicad[oa] en|zona|cerca de)\s+([A-ZÁÉÍÓÚ][a-záéíóú]+(?:\s+[A-ZÁÉÍÓÚ][a-záéíóú]+){0,2})/);
      if (locMatch && locMatch[1]) {
        estimatedLocation = locMatch[1];
      } else if (lowerText.includes('bariloche')) {
        estimatedLocation = 'Bariloche, Río Negro';
      } else if (lowerText.includes('angostura')) {
        estimatedLocation = 'Villa La Angostura, Neuquén';
      } else if (lowerText.includes('mendoza')) {
        estimatedLocation = 'Valle de Uco, Mendoza';
      } else if (lowerText.includes('playa') || lowerText.includes('mar')) {
        estimatedLocation = 'Costa Atlántica / Zona de Playa';
      } else if (lowerText.includes('sierras') || lowerText.includes('cordoba') || lowerText.includes('córdoba')) {
        estimatedLocation = 'Sierras de Córdoba';
      } else {
        estimatedLocation = 'Zona Panorámica y Tranquila';
      }
    }

    const highlights = [];
    if (lowerText.includes('jacuzzi') || lowerText.includes('hidro') || lowerText.includes('tina') || lowerText.includes('hot tub')) {
      highlights.push('Tina caliente / Jacuzzi de relajación');
    }
    if (lowerText.includes('vista') || lowerText.includes('panoram') || lowerText.includes('lago') || lowerText.includes('montaña')) {
      highlights.push('Vista panorámica de ensueño');
    }
    if (lowerText.includes('desayuno') || lowerText.includes('breakfast')) {
      highlights.push('Desayuno gourmet incluido');
    }
    if (lowerText.includes('fuego') || lowerText.includes('chimenea') || lowerText.includes('fog')) {
      highlights.push('Chimenea o fogonero romántico');
    }
    if (highlights.length === 0) {
      highlights.push('Ambiente íntimo ideal para parejas');
      highlights.push('Entorno natural con privacidad total');
      highlights.push('Cama King size y detalles de bienvenida');
    }

    const cons = [];
    if (lowerText.includes('auto') || lowerText.includes('vehiculo') || lowerText.includes('camino')) {
      cons.push('Recomendable ir con vehículo propio');
    } else {
      cons.push('Suele tener alta demanda para fines de semana');
    }

    const result = {
      title: cleanTitle,
      type: lodgingType,
      location: estimatedLocation,
      pricePerNight: estimatedPrice,
      currency: 'USD',
      imageUrl: scrapedImage && scrapedImage.startsWith('http') ? scrapedImage : getRandomPhoto(),
      link: url || '',
      highlights,
      cons,
      description: scrapedDescription.length > 20
        ? scrapedDescription.substring(0, 220) + '...'
        : 'Hermoso espacio cuidadosamente ambientado para desconectar y compartir momentos inolvidables de a dos.'
    };

    return res.json({ success: true, data: result, source: 'smart_heuristic' });
  } catch (err) {
    console.error('Error in AI extraction:', err);
    return res.status(500).json({
      error: 'Error al procesar la información con IA',
      details: err.message
    });
  }
});

// S5: AI Romantic Concierge / Summary & Recommendation (Server-only key, rate-limited)
app.post(['/api/ai/recommend', '/api/ai/concierge'], aiRateLimiter, async (req, res) => {
  try {
    const { accommodations, nights = 3, currency = 'USD', partners = {} } = req.body;

    if (!Array.isArray(accommodations) || accommodations.length === 0) {
      return res.status(400).json({ error: 'No hay alojamientos para comparar' });
    }

    const p1Name = partners?.partner1?.name || 'Pareja 1';
    const p2Name = partners?.partner2?.name || 'Pareja 2';

    // S5: Server-only Gemini key
    const geminiKey = process.env.GEMINI_API_KEY;
    if (geminiKey) {
      try {
        const prompt = `Actúa como "Cúpido IA", un asesor experto y cariñoso en viajes en pareja.
Tienes la siguiente lista de alojamientos guardados por ${p1Name} y ${p2Name} para una escapada de ${nights} noches:

${JSON.stringify(accommodations.map(a => ({
  id: a.id,
  title: a.title,
  type: a.type,
  location: a.location,
  pricePerNight: a.pricePerNight,
  totalStay: a.pricePerNight * nights,
  highlights: a.highlights,
  reactions: a.reactions,
  commentsCount: a.comments?.length || 0
})), null, 2)}

Genera una respuesta en formato JSON con la siguiente estructura exacta:
{
  "winnerTitle": "Nombre del alojamiento ganador",
  "winnerId": "id del ganador",
  "winnerReason": "Por qué es la mejor decisión para ambos",
  "bestValueTitle": "Nombre de la opción con mejor relación calidad-precio",
  "splurgeTitle": "Nombre de la opción de lujo o más romántica si quieren darse un gusto",
  "coupleVerdict": "Texto cariñoso, divertido y motivador (3-4 párrafos) analizando las preferencias de ${p1Name} y ${p2Name}, sus puntos en común o disidencias, y recomendando la decisión final",
  "romanticTip": "Un consejo especial y divertido para su escapada juntos"
}`;

        const geminiRes = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' }
          }),
          signal: AbortSignal.timeout(6000)
        });

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const rawResult = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (rawResult) {
            return res.json({ success: true, recommendation: JSON.parse(rawResult), source: 'gemini' });
          }
        }
      } catch (aiErr) {
        console.warn('Gemini recommendation failed, falling back to heuristic:', aiErr.message);
      }
    }

    // High quality algorithmic heuristic recommendation
    const matches = accommodations.filter(a => a.reactions?.p1?.liked && a.reactions?.p2?.liked);
    const sortedByPrice = [...accommodations].sort((a, b) => a.pricePerNight - b.pricePerNight);
    const bestValue = sortedByPrice[0];
    const splurge = sortedByPrice[sortedByPrice.length - 1];

    let winner = matches.length > 0
      ? matches[0]
      : [...accommodations].sort((a, b) => {
          const scoreA = (a.reactions?.p1?.liked ? 1 : 0) + (a.reactions?.p2?.liked ? 1 : 0);
          const scoreB = (b.reactions?.p1?.liked ? 1 : 0) + (b.reactions?.p2?.liked ? 1 : 0);
          return scoreB - scoreA;
        })[0] || accommodations[0];

    const recommendation = {
      winnerTitle: winner.title,
      winnerId: winner.id,
      winnerReason: matches.includes(winner)
        ? `¡Es un Match oficial! Tanto ${p1Name} como ${p2Name} le dieron corazón. Ofrece el mejor balance entre romance, privacidad y presupuesto total (${currency} $${winner.pricePerNight * nights} por las ${nights} noches).`
        : `Es la opción que reúne mayor entusiasmo y excelentes comodidades (${winner.type} en ${winner.location}).`,
      bestValueTitle: bestValue.title,
      bestValueReason: `Con un valor de ${currency} $${bestValue.pricePerNight}/noche (Total: $${bestValue.pricePerNight * nights}), les permite ahorrar para cenitas románticas y paseos sin resignar comodidad.`,
      splurgeTitle: splurge.title,
      splurgeReason: `Si es un aniversario o quieren una experiencia de puro relax y mimos, este ${splurge.type} es la joya máxima.`,
      coupleVerdict: `Queridos ${p1Name} y ${p2Name}, revisé todas sus opciones y tienen un gusto exquisito para viajar.\n\n` +
        `Si buscan la experiencia más equilibrada e inolvidable, **"${winner.title}"** se lleva la corona 👑. Cuenta con comodidades ideales para conectar (${winner.highlights?.slice(0, 2).join(' y ') || 'ambiente íntimo'}).\n\n` +
        (matches.length > 1
          ? `Tienen ${matches.length} lugares donde ambos coincidieron con corazón, ¡lo que demuestra que están súper sincronizados! 💕`
          : `¡No lo piensen más, preparen las valijas y a disfrutar de su tiempo juntos! ✨`),
      romanticTip: 'Lleven una botella de su vino favorito, una lista de Spotify con sus canciones preferidas y dejen los celulares en modo avión al menos una tarde entera. ¡Buen viaje, tortolitos! 🥂'
    };

    return res.json({ success: true, recommendation, source: 'algorithmic' });
  } catch (err) {
    console.error('Error generating recommendation:', err);
    return res.status(500).json({ error: 'Error al generar la recomendación', details: err.message });
  }
});

// Production: serve Vite build
const DIST_PATH = path.join(__dirname, 'dist');
if (fs.existsSync(DIST_PATH)) {
  app.use(express.static(DIST_PATH));
  app.use((req, res) => {
    res.sendFile(path.join(DIST_PATH, 'index.html'));
  });
}

// Serverless check (Vercel & AWS Lambda)
if (!process.env.VERCEL && !process.env.AWS_LAMBDA_FUNCTION_NAME) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

export default app;
