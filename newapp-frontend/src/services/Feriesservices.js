const API_BASE = import.meta.env.VITE_HR_API_URL || 'http://localhost:3001/api'

// ── Helper requête ───────────────────────────────────────────────

async function request(path, method = 'GET', body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' }
  }
  if (body) opts.body = JSON.stringify(body)

  const res = await fetch(`${API_BASE}${path}`, opts)
  const json = await res.json()

  if (!res.ok) {
    const msg = json.error || json.errors?.join(', ') || `Erreur ${res.status}`
    throw new Error(msg)
  }
  return json
}

// ── CRUD Jours fériés ────────────────────────────────────────────

/**
 * Liste tous les jours fériés.
 * @param {{ year?: number, recurrent?: 0|1, search?: string }} params
 */
export async function getFeries(params = {}) {
  const qs = new URLSearchParams()
  if (params.year      !== undefined) qs.set('year',      params.year)
  if (params.recurrent !== undefined) qs.set('recurrent', params.recurrent)
  if (params.search)                  qs.set('search',    params.search)
  const query = qs.toString() ? `?${qs}` : ''
  const res = await request(`/feries${query}`)
  return res.data
}

/**
 * Récupère un jour férié par son ID.
 */
export async function getFerieById(id) {
  const res = await request(`/feries/${id}`)
  return res.data
}

/**
 * Crée un jour férié.
 * @param {{ nom: string, date: string, recurrent: boolean, description?: string }} data
 */
export async function createFerie(data) {
  const res = await request('/feries', 'POST', data)
  return res.data
}

/**
 * Met à jour un jour férié.
 */
export async function updateFerie(id, data) {
  const res = await request(`/feries/${id}`, 'PUT', data)
  return res.data
}

/**
 * Supprime un jour férié.
 */
export async function deleteFerie(id) {
  return request(`/feries/${id}`, 'DELETE')
}

/**
 * Supprime plusieurs jours fériés.
 */
export async function deleteMultipleFeries(ids) {
  return request('/feries', 'DELETE', { ids })
}

// ── Helpers affichage ────────────────────────────────────────────

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

export async function getferiesbymonthyear(){
  const rows = await getFeries({year})
  const set = new set()
  rows.array.forEach(e => {
    const [, m, d] = e.date.split('-')
    set.add('${year}-${m}-${d}')
  })
  return set
}

/**
 * Retourne le nom du mois en français.
 */
const MONTHS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
]
export function monthName(dateStr) {
  if (!dateStr) return ''
  const m = parseInt(dateStr.split('-')[1], 10)
  return MONTHS_FR[m - 1] ?? ''
}