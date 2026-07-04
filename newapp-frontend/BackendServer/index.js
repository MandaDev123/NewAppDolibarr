const express = require('express')
const cors = require('cors')
const Database = require('better-sqlite3')
const path = require('path')
const fs = require('fs')

const app = express()
const PORT = process.env.PORT || 3001

// ── Middleware ──────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',  // Vite dev
    'http://localhost:4173',  // Vite preview
    'http://localhost:3000',
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}))
app.use(express.json())

// ── Configuration de la Base de données ─────────────────────────
const DB_PATH = path.join(__dirname, 'data', 'hr.sqlite')

// Crée le dossier data/ si inexistant
const dataDir = path.dirname(DB_PATH)
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true })

const db = new Database(DB_PATH)

// Performance SQLite
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

// Création des tables et index
db.exec(`
  CREATE TABLE IF NOT EXISTS jours_feries (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    nom         TEXT    NOT NULL,
    date        TEXT    NOT NULL,          -- format YYYY-MM-DD
    recurrent   INTEGER NOT NULL DEFAULT 0, -- 0 = ponctuel | 1 = annuel (même jour/mois chaque année)
    description TEXT    DEFAULT '',
    created_at  TEXT    DEFAULT (datetime('now', 'localtime')),
    updated_at  TEXT    DEFAULT (datetime('now', 'localtime'))
  );

  CREATE INDEX IF NOT EXISTS idx_jf_date       ON jours_feries(date);
  CREATE INDEX IF NOT EXISTS idx_jf_recurrent  ON jours_feries(recurrent);
`)

// ── Helpers ─────────────────────────────────────────────────────
function validateFerie(body) {
  const errors = []
  if (!body.nom  || !String(body.nom).trim())  errors.push('Le champ "nom" est obligatoire.')
  if (!body.date || !String(body.date).trim()) errors.push('Le champ "date" est obligatoire.')
  if (body.date && !/^\d{4}-\d{2}-\d{2}$/.test(body.date))
    errors.push('Le format de date doit être YYYY-MM-DD.')
  return errors
}

// ── Routes API: Jours Fériés ────────────────────────────────────

// GET /api/feries (Paramètres optionnels : ?year=2026  ?recurrent=1)
app.get('/api/feries', (req, res) => {
  try {
    let sql    = 'SELECT * FROM jours_feries WHERE 1=1'
    const params = []

    if (req.query.year) {
      sql += " AND (strftime('%Y', date) = ? OR (recurrent = 1))"
      params.push(String(req.query.year))
    }
    if (req.query.recurrent !== undefined) {
      sql += ' AND recurrent = ?'
      params.push(parseInt(req.query.recurrent, 10))
    }
    if (req.query.search) {
      sql += ' AND (nom LIKE ? OR description LIKE ?)'
      const q = `%${req.query.search}%`
      params.push(q, q)
    }

    sql += ' ORDER BY date ASC, nom ASC'

    const rows = db.prepare(sql).all(...params)
    res.json({ success: true, data: rows, total: rows.length })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// GET /api/feries/:id
app.get('/api/feries/:id', (req, res) => {
  try {
    const row = db.prepare('SELECT * FROM jours_feries WHERE id = ?').get(req.params.id)
    if (!row) return res.status(404).json({ success: false, error: 'Jour férié introuvable.' })
    res.json({ success: true, data: row })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// POST /api/feries
app.post('/api/feries', (req, res) => {
  try {
    const errors = validateFerie(req.body)
    if (errors.length) return res.status(400).json({ success: false, errors })

    // Vérifier doublon (même date + même nom)
    const existing = db.prepare(
      'SELECT id FROM jours_feries WHERE date = ? AND nom = ?'
    ).get(req.body.date, req.body.nom.trim())
    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Un jour férié "${req.body.nom}" existe déjà à la date ${req.body.date}.`
      })
    }

    const stmt = db.prepare(`
      INSERT INTO jours_feries (nom, date, recurrent, description)
      VALUES (@nom, @date, @recurrent, @description)
    `)
    const result = stmt.run({
      nom:         req.body.nom.trim(),
      date:        req.body.date,
      recurrent:   req.body.recurrent ? 1 : 0,
      description: req.body.description?.trim() ?? ''
    })

    const created = db.prepare('SELECT * FROM jours_feries WHERE id = ?').get(result.lastInsertRowid)
    res.status(201).json({ success: true, data: created })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// PUT /api/feries/:id
app.put('/api/feries/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM jours_feries WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ success: false, error: 'Jour férié introuvable.' })

    const errors = validateFerie(req.body)
    if (errors.length) return res.status(400).json({ success: false, errors })

    // Vérifier doublon (même date + même nom, sauf soi-même)
    const dup = db.prepare(
      'SELECT id FROM jours_feries WHERE date = ? AND nom = ? AND id != ?'
    ).get(req.body.date, req.body.nom.trim(), req.params.id)
    if (dup) {
      return res.status(409).json({
        success: false,
        error: `Un autre jour férié "${req.body.nom}" existe déjà à cette date.`
      })
    }

    db.prepare(`
      UPDATE jours_feries
      SET nom = @nom, date = @date, recurrent = @recurrent,
          description = @description, updated_at = datetime('now','localtime')
      WHERE id = @id
    `).run({
      id:          req.params.id,
      nom:         req.body.nom.trim(),
      date:        req.body.date,
      recurrent:   req.body.recurrent ? 1 : 0,
      description: req.body.description?.trim() ?? ''
    })

    const updated = db.prepare('SELECT * FROM jours_feries WHERE id = ?').get(req.params.id)
    res.json({ success: true, data: updated })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// DELETE /api/feries/:id
app.delete('/api/feries/:id', (req, res) => {
  try {
    const existing = db.prepare('SELECT * FROM jours_feries WHERE id = ?').get(req.params.id)
    if (!existing) return res.status(404).json({ success: false, error: 'Jour férié introuvable.' })

    db.prepare('DELETE FROM jours_feries WHERE id = ?').run(req.params.id)
    res.json({ success: true, message: `Jour férié "${existing.nom}" supprimé.` })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// DELETE /api/feries (bulk : Body { ids: [1, 2, 3] })
app.delete('/api/feries', (req, res) => {
  try {
    const ids = req.body?.ids
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'ids[] requis.' })
    }
    const placeholders = ids.map(() => '?').join(',')
    const result = db.prepare(`DELETE FROM jours_feries WHERE id IN (${placeholders})`).run(...ids)
    res.json({ success: true, deleted: result.changes })
  } catch (err) {
    res.status(500).json({ success: false, error: err.message })
  }
})

// ── Sanity check & Fallbacks ────────────────────────────────────

app.get('/api/health', (_, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// 404 catch-all
app.use((_, res) => {
  res.status(404).json({ success: false, error: 'Route introuvable.' })
})

// Global error handler
app.use((err, _, res, __) => {
  console.error('[SERVER ERROR]', err)
  res.status(500).json({ success: false, error: err.message })
})

// ── Lancement du serveur ────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Serveur API démarré sur http://localhost:${PORT}`)
  console.log(`   → Jours fériés : http://localhost:${PORT}/api/feries`)
})