import { dolibarrApi } from './dolibarrServices.js'

// ─────────────────────────────────────────────
// SALAIRES
// ─────────────────────────────────────────────

/**
 * Récupère la liste de tous les salaires.
 * @param {Object} params - Filtres optionnels : { sqlfilters, limit, page, sortfield, sortorder }
 *   sqlfilters exemples :
 *     "(t.label:like:'%Salaire%')"
 *     "(t.datesp:>=:1746057600) AND (t.dateep:<=:1748649600)"
 *     "(t.paye:=:'0')"         → non payés
 *     "(t.fk_user:=:5)"        → par utilisateur
 */
export async function getSalaries(params = {}) {
  const query = buildQueryString({
    limit: params.limit ?? 100,
    page: params.page ?? 0,
    sortfield: params.sortfield ?? 't.rowid',
    sortorder: params.sortorder ?? 'DESC',
    sqlfilters: params.sqlfilters ?? undefined,
  })
  return dolibarrApi.get(`/salaries${query}`)
}

/**
 * Récupère un salaire par son ID.
 */
export async function getSalaryById(id) {
  return dolibarrApi.get(`/salaries/${id}`)
}

/**
 * Crée un nouveau salaire.
 * @param {Object} data
 *   Champs requis : fk_user, label, amount, datesp, dateep
 *   Champs optionnels : type_payment, note_private, paye
 */
export async function createSalary(data) {
  return dolibarrApi.post('/salaries', data)
}

/**
 * Met à jour un salaire existant.
 */
export async function updateSalary(id, data) {
  return dolibarrApi.put(`/salaries/${id}`, data)
}

// ─────────────────────────────────────────────
// PAIEMENTS DE SALAIRE
// ─────────────────────────────────────────────

/**
 * Récupère tous les paiements liés à un salaire.
 * Endpoint : GET /salaries/payments  avec sqlfilters sur fk_salary
 */
export async function getPaymentsBySalary(salaryId) {
  // IMPORTANT : l'alias de la table principale de l'endpoint /salaries/payments
  // est "t" (comme pour les autres endpoints), pas "sp". Avec le mauvais alias,
  // Dolibarr ignorait silencieusement le filtre et renvoyait TOUS les paiements
  // de TOUS les salaires, ce qui expliquait le mélange des données entre employés.
  const sqlfilters = `(t.fk_salary:=:${salaryId})`
  const query = buildQueryString({ sqlfilters, limit: 200, sortfield: 't.rowid', sortorder: 'ASC' })
  const data = await dolibarrApi.get(`/salaries/payments${query}`)
  const list = Array.isArray(data) ? data : []

  // Filet de sécurité côté client : comparaison NUMÉRIQUE (et non en chaîne)
  // car Dolibarr peut renvoyer les identifiants sous des formats différents
  // selon le contexte de l'appel (ex. "7" vs "7.000000" vs Number 7).
  const targetId = parseInt(salaryId, 10)
  const filtered = list.filter(p => parseInt(p.fk_salary, 10) === targetId)

  if (filtered.length === 0 && list.length > 0) {
    console.warn(
      '[getPaymentsBySalary] Le serveur a renvoyé des paiements mais aucun ne correspond à fk_salary =', salaryId,
      '— vérifie le format du champ fk_salary reçu :', list[0]
    )
  }

  return filtered
}

/**
 * Enregistre un paiement pour un salaire.
 * @param {Object} data
 *   Champs requis : fk_salary, datepaye, amount, fk_typepayment
 *   Champs optionnels : num_payment, note_private, fk_account
 */
export async function createSalaryPayment(data) {
  return dolibarrApi.post('/salaries/payments', data)
}

// ─────────────────────────────────────────────
// UTILISATEURS DOLIBARR (pour le sélecteur d'employé)
// ─────────────────────────────────────────────

/**
 * Récupère la liste des utilisateurs actifs Dolibarr.
 */
export async function getUsers(params = {}) {
  const query = buildQueryString({
    limit: params.limit ?? 200,
    page: 0,
    sortfield: 't.lastname',
    sortorder: 'ASC',
    sqlfilters: "(t.statut:=:1)", // utilisateurs actifs seulement
  })
  return dolibarrApi.get(`/users${query}`)
}

// ─────────────────────────────────────────────
// MODES DE RÈGLEMENT
// ─────────────────────────────────────────────

/**
 * Récupère les types de paiement disponibles (espèce, chèque, virement…)
 */
export async function getPaymentTypes() {
  return dolibarrApi.get('/setup/dictionary/payment_types')
}


/**
 * Récupère un utilisateur par son ID.
 */
export async function getUserById(id) {
  return dolibarrApi.get(`/users/${id}`)
}

/**
 * Récupère tous les salaires d'un utilisateur donné.
 */
export async function getSalariesByUser(userId) {
  const sqlfilters = `(t.fk_user:=:${userId})`
  const query = buildQueryString({
    limit: 200,
    sortfield: 't.rowid',
    sortorder: 'DESC',
    sqlfilters,
  })
  const data = await dolibarrApi.get(`/salaries${query}`)
  const list = Array.isArray(data) ? data : []

  // Filet de sécurité côté client : garantit qu'aucun salaire d'un autre
  // utilisateur ne peut apparaître dans la fiche employé, même si le filtre
  // serveur venait à être ignoré.
  return list.filter(s => String(s.fk_user) === String(userId))
}

/**
 * Récupère tous les paiements de tous les salaires d'un user.
 * Fait appel à getPaymentsBySalary pour chaque salaire.
 */
export async function getAllPaymentsByUser(salaries) {
  const all = await Promise.all(
    salaries.map(s => getPaymentsBySalary(s.id).catch(() => []))
  )
  // Map: salaryId → payments[]
  const map = {}
  salaries.forEach((s, i) => { map[s.id] = Array.isArray(all[i]) ? all[i] : [] })
  return map
}

// ─────────────────────────────────────────────
// GÉNÉRATION EN MASSE
// ─────────────────────────────────────────────

/**
 * Récupère tous les utilisateurs avec leurs champs étendus
 * (job, weeklyhours, gender) pour le filtrage côté client.
 */
export async function getUsersExtended() {
  const query = buildQueryString({
    limit: 500,
    page: 0,
    sortfield: 't.lastname',
    sortorder: 'ASC',
    sqlfilters: "(t.statut:=:1)",
  })
  const users = await dolibarrApi.get(`/users${query}`)
  return Array.isArray(users) ? users : []
}

/**
 * Filtre une liste d'utilisateurs côté client.
 * @param {Array}  users
 * @param {{ gender?: string, job?: string, hoursMin?: number, hoursMax?: number }} filters
 */
export function filterUsers(users, filters = {}) {
  return users.filter(u => {
    if (filters.gender && u.gender !== filters.gender) return false
    if (filters.jobs && filters.jobs.length > 0) {
      // Sélection multiple de postes (correspondance exacte)
      if (!filters.jobs.includes(u.job)) return false
    } else if (filters.job) {
      // Compat rétro : recherche texte simple sur un seul poste
      const job = String(u.job || '').toLowerCase()
      if (!job.includes(filters.job.toLowerCase())) return false
    }
    if (filters.hoursMin !== '' && filters.hoursMin !== null && filters.hoursMin !== undefined) {
      if (parseFloat(u.weeklyhours ?? 35) < parseFloat(filters.hoursMin)) return false
    }
    if (filters.hoursMax !== '' && filters.hoursMax !== null && filters.hoursMax !== undefined) {
      if (parseFloat(u.weeklyhours ?? 35) > parseFloat(filters.hoursMax)) return false
    }
    return true
  })
}

/**
 * Génère un salaire pour chaque userId fourni.
 * @param {string[]} userIds
 * @param {{ label, amount, datesp, dateep, type_payment?, paye? }} salaryPayload
 * @param {Function} onProgress — callback({ done, total, userId, status, error? })
 * @returns {{ created: number, errors: {userId, error}[] }}
 */
export async function generateSalariesBatch(userIds, salaryPayload, onProgress = () => {}) {
  let created = 0
  const errors = []

  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i]
    try {
      const payload = { ...salaryPayload, fk_user: String(userId) }
      const resp = await createSalary(payload)
      const newId = typeof resp === 'object' ? resp.id : resp
      created++
      onProgress({ done: i + 1, total: userIds.length, userId, status: 'ok', salaryId: newId })
    } catch (err) {
      errors.push({ userId, error: err.message })
      onProgress({ done: i + 1, total: userIds.length, userId, status: 'error', error: err.message })
    }
  }
  return { created, errors }
}

/**
 * Retourne les postes distincts présents dans une liste d'utilisateurs.
 */
export function extractPostes(users) {
  const set = new Set()
  users.forEach(u => { if (u.job) set.add(u.job) })
  return [...set].sort()
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

/**
 * Construit une query string à partir d'un objet, en ignorant les valeurs undefined/null/''.
 */
function buildQueryString(params) {
  const parts = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
  return parts.length ? `?${parts.join('&')}` : ''
}

/**
 * Formate un timestamp unix (secondes) ou une date ISO en "DD/MM/YYYY".
 */
export function formatDate(value) {
  if (!value) return '—'
  const d = typeof value === 'number' ? new Date(value * 1000) : new Date(value)
  if (isNaN(d)) return '—'
  return d.toLocaleDateString('fr-FR')
}

/**
 * Formate un montant en MGA (ou autre devise).
 */
export function formatAmount(value, currency = 'MGA') {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) + ' ' + currency
}

/**
 * Retourne le libellé du statut du salaire.
 * paye = "1" → Payé | "0" → Non payé
 */
export function getSalaryStatusLabel(salary) {
  if (salary.paye === '1' || salary.paye === 1) return 'Payé'
  const reste = parseFloat(salary.resteapayer ?? salary.amount ?? 0)
  const paid = parseFloat(salary.totalpaid ?? 0)
  if (paid > 0 && reste > 0) return 'Partiel'
  return 'Non payé'
}

export function getSalaryStatusClass(salary) {
  const label = getSalaryStatusLabel(salary)
  if (label === 'Payé') return 'badge-success'
  if (label === 'Partiel') return 'badge-warning'
  return 'badge-danger'
}   