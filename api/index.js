import app from '../server.js';

export default function handler(req, res) {
  // Normalize path if Vercel stripped /api prefix
  if (req.url && !req.url.startsWith('/api/') && req.url !== '/api') {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  return app(req, res);
}
