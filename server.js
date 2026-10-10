import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

// In-memory cache + file storage helper
let spacesCache = {};

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

function saveSpaces() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(spacesCache, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving spaces to disk:', err.message);
  }
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth: Create a custom couple space
app.post('/api/auth/create-space', (req, res) => {
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

  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const cleanId = `AMOR-${randomDigits}`;

  const newSpace = {
    id: cleanId,
    name: name.trim() || 'Nuestra Escapada Romántica 💕',
    nights: Math.max(1, parseInt(nights, 10) || 3),
    currency: currency || 'CLP',
    pin: pin ? String(pin).trim() : '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    partners: {
      partner1: { id: 'p1', name: (p1Name || 'Ella').trim(), avatar: p1Avatar || '🌸', color: '#F472B6' },
      partner2: { id: 'p2', name: (p2Name || 'Él').trim(), avatar: p2Avatar || '🐻', color: '#818CF8' }
    },
    accommodations: withExamples ? createDefaultSpace(cleanId).accommodations : []
  };

  spacesCache[cleanId] = newSpace;
  saveSpaces();

  res.status(201).json({ success: true, space: newSpace });
});

// Auth: Join an existing couple space
app.post('/api/auth/join-space', (req, res) => {
  const { spaceId, pin = '', partnerChoice = '' } = req.body;
  const cleanId = (spaceId || '').toUpperCase().trim();

  if (!cleanId) {
    return res.status(400).json({ error: 'Ingresa un código de nido válido.' });
  }

  if (!spacesCache[cleanId]) {
    loadSpaces();
  }

  if (!spacesCache[cleanId]) {
    return res.status(404).json({ error: `No encontramos ningún nido con el código "${cleanId}". Revisa si lo escribiste bien.` });
  }

  const space = spacesCache[cleanId];

  // Check pin if required
  if (space.pin && space.pin !== String(pin).trim()) {
    return res.status(401).json({ error: 'El PIN de pareja es incorrecto.' });
  }

  const partnerId = partnerChoice === 'p2' ? 'p2' : 'p1';

  res.json({ success: true, space, partnerId });
});

// Auth: Google Sign-In & Persistence
app.post('/api/auth/google', (req, res) => {
  const { email, name, picture, sub, partnerName = '', spaceName = '' } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Email de Google requerido' });
  }

  const cleanEmail = email.toLowerCase().trim();

  // Search if a space already exists linked to this Google email
  const existingId = Object.keys(spacesCache).find((id) => {
    return spacesCache[id]?.googleOwner?.email?.toLowerCase().trim() === cleanEmail;
  });

  if (existingId) {
    return res.json({
      success: true,
      space: spacesCache[existingId],
      isNew: false,
      message: `¡Bienvenido de nuevo, ${name || 'Google User'}! Recuperamos tu nido.`
    });
  }

  // Create new space linked permanently to this Google account
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  const cleanId = `AMOR-${randomDigits}`;

  const userDisplayName = (name || cleanEmail.split('@')[0] || 'Tú').trim();
  const partnerDisplayName = (partnerName || 'Mi Pareja').trim();

  const newSpace = {
    id: cleanId,
    name: spaceName.trim() || `Escapada de ${userDisplayName} & ${partnerDisplayName} 💕`,
    nights: 3,
    currency: 'CLP',
    pin: '',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    googleOwner: {
      email: cleanEmail,
      name: userDisplayName,
      picture: picture || '',
      sub: sub || cleanEmail
    },
    partners: {
      partner1: { id: 'p1', name: userDisplayName, avatar: '🌸', color: '#F472B6' },
      partner2: { id: 'p2', name: partnerDisplayName, avatar: '🐻', color: '#818CF8' }
    },
    accommodations: []
  };

  spacesCache[cleanId] = newSpace;
  saveSpaces();

  res.status(201).json({
    success: true,
    space: newSpace,
    isNew: true,
    message: `¡Nido creado y vinculado exitosamente a tu cuenta de Google (${cleanEmail})!`
  });
});

// Auth: Link Google account to an existing space
app.post('/api/space/:spaceId/link-google', (req, res) => {
  const { spaceId } = req.params;
  const { email, name, picture } = req.body;
  const cleanId = (spaceId || '').toUpperCase().trim();

  if (!cleanId || !spacesCache[cleanId]) {
    return res.status(404).json({ error: 'Espacio no encontrado' });
  }

  if (!email) {
    return res.status(400).json({ error: 'Email de Google requerido' });
  }

  const cleanEmail = email.toLowerCase().trim();
  spacesCache[cleanId].googleOwner = {
    email: cleanEmail,
    name: (name || cleanEmail.split('@')[0]).trim(),
    picture: picture || ''
  };
  spacesCache[cleanId].updatedAt = new Date().toISOString();
  saveSpaces();

  res.json({ success: true, space: spacesCache[cleanId] });
});

// Synchronize entire space state from client to backend cache
app.post('/api/space/:spaceId/sync', (req, res) => {
  const { spaceId } = req.params;
  const cleanId = (spaceId || 'default').toUpperCase().trim();
  const incoming = req.body;

  if (!incoming || typeof incoming !== 'object') {
    return res.status(400).json({ error: 'Payload de sincronización inválido' });
  }

  if (!spacesCache[cleanId]) {
    loadSpaces();
  }

  const existing = spacesCache[cleanId] || {};

  // Merge accommodations intelligently by id
  const existingAccs = Array.isArray(existing.accommodations) ? existing.accommodations : [];
  const incomingAccs = Array.isArray(incoming.accommodations) ? incoming.accommodations : [];

  const accMap = new Map();
  // Existing first
  for (const acc of existingAccs) {
    if (acc && acc.id) accMap.set(acc.id, acc);
  }
  // Incoming overrides or adds
  for (const acc of incomingAccs) {
    if (acc && acc.id) {
      if (!accMap.has(acc.id)) {
        accMap.set(acc.id, acc);
      } else {
        const cur = accMap.get(acc.id);
        accMap.set(acc.id, {
          ...cur,
          ...acc,
          reactions: {
            p1: acc.reactions?.p1?.liked !== undefined ? acc.reactions.p1 : cur.reactions?.p1,
            p2: acc.reactions?.p2?.liked !== undefined ? acc.reactions.p2 : cur.reactions?.p2
          },
          comments: Array.isArray(acc.comments) && acc.comments.length >= (cur.comments?.length || 0)
            ? acc.comments
            : (cur.comments || [])
        });
      }
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
    accommodations: Array.from(accMap.values()),
    updatedAt: new Date().toISOString()
  };

  spacesCache[cleanId] = mergedSpace;
  saveSpaces();

  res.json({ success: true, space: mergedSpace });
});

// Get space data
app.get('/api/space/:spaceId', (req, res) => {
  const { spaceId } = req.params;
  const cleanId = (spaceId || 'default').toUpperCase().trim();

  let isFreshInit = false;

  if (!spacesCache[cleanId]) {
    loadSpaces();
  }

  if (!spacesCache[cleanId]) {
    isFreshInit = true;
    // Only load demo items for the official demo space AMOR-2026 or DEMO
    if (cleanId === 'AMOR-2026' || cleanId === 'DEMO') {
      spacesCache[cleanId] = createDefaultSpace(cleanId);
    } else {
      // For any custom space, NEVER overwrite with Cami & Nico!
      spacesCache[cleanId] = {
        id: cleanId,
        name: 'Nuestra Escapada Romántica 💕',
        nights: 3,
        currency: 'CLP',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        partners: {
          partner1: { id: 'p1', name: 'Pareja 1', avatar: '🌸', color: '#F472B6' },
          partner2: { id: 'p2', name: 'Pareja 2', avatar: '🐻', color: '#818CF8' }
        },
        accommodations: []
      };
    }
    saveSpaces();
  }

  const spaceResponse = {
    ...spacesCache[cleanId],
    _isFreshInit: isFreshInit
  };

  res.json(spaceResponse);
});

// Update general space configuration (name, currency, nights, partners)
app.post('/api/space/:spaceId', (req, res) => {
  const { spaceId } = req.params;
  const cleanId = (spaceId || 'default').toUpperCase().trim();

  if (!spacesCache[cleanId]) {
    loadSpaces();
  }

  if (!spacesCache[cleanId]) {
    spacesCache[cleanId] = {
      id: cleanId,
      name: 'Nuestra Escapada Romántica 💕',
      nights: 3,
      currency: 'CLP',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      partners: {
        partner1: { id: 'p1', name: 'Pareja 1', avatar: '🌸', color: '#F472B6' },
        partner2: { id: 'p2', name: 'Pareja 2', avatar: '🐻', color: '#818CF8' }
      },
      accommodations: []
    };
  }

  const current = spacesCache[cleanId];
  const { name, nights, currency, partners } = req.body;

  if (name !== undefined) current.name = name;
  if (nights !== undefined) current.nights = Math.max(1, parseInt(nights, 10) || 1);
  if (currency !== undefined) current.currency = currency;
  if (partners !== undefined) current.partners = { ...current.partners, ...partners };

  current.updatedAt = new Date().toISOString();
  saveSpaces();

  res.json(current);
});

// Add new accommodation
app.post('/api/space/:spaceId/accommodations', (req, res) => {
  const { spaceId } = req.params;
  const cleanId = (spaceId || 'default').toUpperCase().trim();

  if (!spacesCache[cleanId]) {
    loadSpaces();
  }

  if (!spacesCache[cleanId]) {
    spacesCache[cleanId] = {
      id: cleanId,
      name: 'Nuestra Escapada Romántica 💕',
      nights: 3,
      currency: 'CLP',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      partners: {
        partner1: { id: 'p1', name: 'Pareja 1', avatar: '🌸', color: '#F472B6' },
        partner2: { id: 'p2', name: 'Pareja 2', avatar: '🐻', color: '#818CF8' }
      },
      accommodations: []
    };
  }

  const current = spacesCache[cleanId];
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
    createdAt: new Date().toISOString(),
    reactions: req.body.reactions || {
      p1: { liked: false, reaction: null, note: '' },
      p2: { liked: false, reaction: null, note: '' }
    },
    comments: []
  };

  current.accommodations.unshift(newAcc);
  current.updatedAt = new Date().toISOString();
  saveSpaces();

  res.status(201).json(newAcc);
});

// Update accommodation
app.put('/api/space/:spaceId/accommodations/:accId', (req, res) => {
  const { spaceId, accId } = req.params;
  const cleanId = (spaceId || 'default').toUpperCase().trim();

  if (!spacesCache[cleanId]) {
    return res.status(404).json({ error: 'Espacio no encontrado' });
  }

  const current = spacesCache[cleanId];
  const index = current.accommodations.findIndex(a => a.id === accId);

  if (index === -1) {
    return res.status(404).json({ error: 'Alojamiento no encontrado' });
  }

  const existing = current.accommodations[index];
  const updated = {
    ...existing,
    ...req.body,
    id: existing.id, // prevent overwriting ID
    createdAt: existing.createdAt,
    comments: existing.comments // comments updated via dedicated route
  };

  current.accommodations[index] = updated;
  current.updatedAt = new Date().toISOString();
  saveSpaces();

  res.json(updated);
});

// Delete accommodation
app.delete('/api/space/:spaceId/accommodations/:accId', (req, res) => {
  const { spaceId, accId } = req.params;
  const cleanId = (spaceId || 'default').toUpperCase().trim();

  if (!spacesCache[cleanId]) {
    return res.status(404).json({ error: 'Espacio no encontrado' });
  }

  const current = spacesCache[cleanId];
  current.accommodations = current.accommodations.filter(a => a.id !== accId);
  current.updatedAt = new Date().toISOString();
  saveSpaces();

  res.json({ success: true, count: current.accommodations.length });
});

// Toggle partner reaction / heart / sentiment
app.post('/api/space/:spaceId/accommodations/:accId/reaction', (req, res) => {
  const { spaceId, accId } = req.params;
  const { partnerId, liked, reaction, note } = req.body;
  const cleanId = (spaceId || 'default').toUpperCase().trim();

  if (!spacesCache[cleanId]) {
    return res.status(404).json({ error: 'Espacio no encontrado' });
  }

  const current = spacesCache[cleanId];
  const item = current.accommodations.find(a => a.id === accId);

  if (!item) {
    return res.status(404).json({ error: 'Alojamiento no encontrado' });
  }

  if (!item.reactions) {
    item.reactions = {
      p1: { liked: false, reaction: null, note: '' },
      p2: { liked: false, reaction: null, note: '' }
    };
  }

  const pKey = partnerId === 'p2' ? 'p2' : 'p1';
  item.reactions[pKey] = {
    liked: liked !== undefined ? !!liked : item.reactions[pKey]?.liked || false,
    reaction: reaction !== undefined ? reaction : item.reactions[pKey]?.reaction || null,
    note: note !== undefined ? note : item.reactions[pKey]?.note || ''
  };

  // Check if both liked it (Match!)
  const isMatch = !!(item.reactions.p1?.liked && item.reactions.p2?.liked);

  current.updatedAt = new Date().toISOString();
  saveSpaces();

  res.json({ success: true, reactions: item.reactions, isMatch });
});

// Add comment to accommodation
app.post('/api/space/:spaceId/accommodations/:accId/comment', (req, res) => {
  const { spaceId, accId } = req.params;
  const { partnerId, text } = req.body;
  const cleanId = (spaceId || 'default').toUpperCase().trim();

  if (!spacesCache[cleanId]) {
    return res.status(404).json({ error: 'Espacio no encontrado' });
  }

  const current = spacesCache[cleanId];
  const item = current.accommodations.find(a => a.id === accId);

  if (!item) {
    return res.status(404).json({ error: 'Alojamiento no encontrado' });
  }

  const partnerInfo = current.partners[partnerId === 'p2' ? 'partner2' : 'partner1'] || {
    name: 'Pareja',
    avatar: '💌'
  };

  const newComment = {
    id: 'c_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
    partnerId: partnerId || 'p1',
    partnerName: partnerInfo.name,
    avatar: partnerInfo.avatar,
    text: (text || '').trim(),
    createdAt: new Date().toISOString()
  };

  if (!Array.isArray(item.comments)) {
    item.comments = [];
  }

  item.comments.push(newComment);
  current.updatedAt = new Date().toISOString();
  saveSpaces();

  res.status(201).json(newComment);
});

// Delete comment
app.delete('/api/space/:spaceId/accommodations/:accId/comment/:commentId', (req, res) => {
  const { spaceId, accId, commentId } = req.params;
  const cleanId = (spaceId || 'default').toUpperCase().trim();

  if (!spacesCache[cleanId]) {
    return res.status(404).json({ error: 'Espacio no encontrado' });
  }

  const current = spacesCache[cleanId];
  const item = current.accommodations.find(a => a.id === accId);

  if (!item || !Array.isArray(item.comments)) {
    return res.status(404).json({ error: 'Comentario o alojamiento no encontrado' });
  }

  item.comments = item.comments.filter(c => c.id !== commentId);
  current.updatedAt = new Date().toISOString();
  saveSpaces();

  res.json({ success: true });
});

// AI Link Extractor & Web Scraper
app.post('/api/ai/extract', async (req, res) => {
  try {
    const { url, rawText, apiKey } = req.body;
    let scrapedTitle = '';
    let scrapedDescription = '';
    let scrapedImage = '';
    let scrapedPrice = null;
    let scrapedLocation = '';
    let siteName = '';

    // If URL is provided, scrape metadata
    if (url && typeof url === 'string' && url.trim().startsWith('http')) {
      try {
        const fetchResponse = await fetch(url.trim(), {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
            'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8'
          },
          signal: AbortSignal.timeout(6000)
        });

        if (fetchResponse.ok) {
          const html = await fetchResponse.text();
          const $ = cheerio.load(html);

          scrapedTitle = $('meta[property="og:title"]').attr('content') ||
                         $('meta[name="twitter:title"]').attr('content') ||
                         $('title').text() || '';

          scrapedDescription = $('meta[property="og:description"]').attr('content') ||
                               $('meta[name="twitter:description"]').attr('content') ||
                               $('meta[name="description"]').attr('content') || '';

          scrapedImage = $('meta[property="og:image"]').attr('content') ||
                         $('meta[name="twitter:image"]').attr('content') || '';

          siteName = $('meta[property="og:site_name"]').attr('content') || '';

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
            } catch (e) {
              // Ignore invalid JSON-LD
            }
          });
        }
      } catch (scrapeErr) {
        console.warn('Scraping warning (proceeding with fallback extraction):', scrapeErr.message);
      }
    }

    // Check if Gemini API is available (passed from frontend settings or process.env)
    const geminiKey = apiKey || process.env.GEMINI_API_KEY;

    if (geminiKey) {
      try {
        const prompt = `Actúa como un asistente experto en viajes románticos y extracción de datos de alojamientos.
Analiza la siguiente información de un alojamiento (puede provenir de una URL, un post de Instagram, Airbnb, Booking o notas):

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
  "pricePerNight": número aproximado (solo el número decimal o entero en USD o moneda local),
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
          })
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

    // Guess title
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

    // Guess lodging type
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

    // Guess price
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

    // Guess location
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

    // Romantic highlights
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

// AI Romantic Concierge / Summary & Recommendation
app.post(['/api/ai/recommend', '/api/ai/concierge'], async (req, res) => {
  try {
    const { accommodations, nights = 3, currency = 'USD', partners = {}, apiKey } = req.body;

    if (!Array.isArray(accommodations) || accommodations.length === 0) {
      return res.status(400).json({ error: 'No hay alojamientos para comparar' });
    }

    const p1Name = partners?.partner1?.name || 'Pareja 1';
    const p2Name = partners?.partner2?.name || 'Pareja 2';

    // Check Gemini API
    const geminiKey = apiKey || process.env.GEMINI_API_KEY;
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
          })
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

if (process.env.VERCEL !== '1') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

export default app;
