// ── Config serveur (Vercel Functions uniquement) ──────────────────
// Ce fichier n'est JAMAIS envoyé au navigateur — il tourne uniquement côté serveur
// Les Vercel Functions dans /api/ sont du code serveur Node.js

module.exports = {
  LUCCA_API_KEY: process.env.LUCCA_API_KEY || '39e2fc8c-757d-4deb-83a5-7e4d4536ece0',
  LUCCA_BASE_URL: 'https://groupe-sra.ilucca.net',
}
