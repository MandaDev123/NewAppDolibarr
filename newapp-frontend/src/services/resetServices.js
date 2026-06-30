import { dolibarrApi } from './dolibarrServices.js'

// ─────────────────────────────────────────────────────────────────
// CONSTANTES DE PROTECTION
// ─────────────────────────────────────────────────────────────────

/**
 * Logins système Dolibarr à ne jamais supprimer.
 * Complété par les règles admin=1 et id=1 ci-dessous.
 */
const PROTECTED_LOGINS = new Set([
  'admin', 'superadmin', 'administrator', 'dolibarr', 'root'
])

/**
 * Évalue si un utilisateur Dolibarr doit être protégé.
 * Retourne { protected: bool, reason: string }
 */
function evaluateUser(u) {
  // Règle 1 : superadmin Dolibarr (champ admin = 1)
  if (String(u.admin) === '1') {
    return { protected: true, reason: 'Administrateur Dolibarr (admin=1)' }
  }
  // Règle 2 : ID=1 → toujours le premier compte créé (superadmin implicite)
  if (String(u.id) === '1' || u.id === 1) {
    return { protected: true, reason: 'Compte système ID=1' }
  }
  // Règle 3 : login système connu
  if (PROTECTED_LOGINS.has(String(u.login).toLowerCase())) {
    return { protected: true, reason: `Login système réservé ("${u.login}")` }
  }
  return { protected: false, reason: null }
}

// ─────────────────────────────────────────────────────────────────
// COLLECTEURS
// ─────────────────────────────────────────────────────────────────

async function fetchAllPaymentIds() {
  const data = await dolibarrApi.get(
    '/salaries/payments?limit=1000&page=0&sortfield=t.rowid&sortorder=ASC'
  )
  return Array.isArray(data) ? data.map(p => String(p.id)) : []
}

async function fetchAllSalaryIds() {
  const data = await dolibarrApi.get(
    '/salaries?limit=1000&page=0&sortfield=t.rowid&sortorder=ASC'
  )
  return Array.isArray(data) ? data.map(s => String(s.id)) : []
}

/**
 * Récupère tous les utilisateurs et les sépare en deux listes :
 *   - toDelete   : { id, login } — peuvent être supprimés
 *   - protected  : { id, login, reason } — à conserver absolument
 */
async function fetchAllUsers() {
  // On récupère actifs ET inactifs (pas de filtre statut)
  const data = await dolibarrApi.get(
    '/users?limit=500&page=0&sortfield=t.rowid&sortorder=ASC'
  )
  const users = Array.isArray(data) ? data : []

  const toDelete  = []
  const protected_ = []

  for (const u of users) {
    const { protected: isProtected, reason } = evaluateUser(u)
    const entry = { id: String(u.id), login: u.login || `#${u.id}` }
    if (isProtected) {
      protected_.push({ ...entry, reason })
    } else {
      toDelete.push(entry)
    }
  }

  return { toDelete, protected: protected_ }
}

// ─────────────────────────────────────────────────────────────────
// SUPPRESSEURS (non bloquants)
// ─────────────────────────────────────────────────────────────────

async function deletePayment(id) {
  try { await dolibarrApi.delete(`/salaries/payments/${id}`); return true }
  catch { return false }
}

async function deleteSalary(id) {
  try { await dolibarrApi.delete(`/salaries/${id}`); return true }
  catch { return false }
}

async function deleteUser(id) {
  try { await dolibarrApi.delete(`/users/${id}`); return true }
  catch { return false }
}

// ─────────────────────────────────────────────────────────────────
// RESET PRINCIPAL
// ─────────────────────────────────────────────────────────────────

/**
 * Lance la réinitialisation complète dans l'ordre :
 *   1. Paiements de salaires (contrainte FK → salaires)
 *   2. Fiches salaires       (contrainte FK → users)
 *   3. Utilisateurs importés (non protégés)
 *
 * @param {Function} onProgress — callback({ step, total, label })
 * @returns {Promise<ResetResult>}
 *
 * @typedef {Object} ResetResult
 * @property {number}   deletedPayments
 * @property {number}   deletedSalaries
 * @property {number}   deletedUsers
 * @property {Array}    protectedUsers   — liste des users conservés { id, login, reason }
 * @property {string[]} errors
 * @property {number}   total
 */
export async function resetAllData(onProgress = () => {}) {
  const errors = []
  let deletedPayments = 0
  let deletedSalaries = 0
  let deletedUsers    = 0

  // ── Phase 0 : collecte ────────────────────────────────────────
  onProgress({ step: 0, total: 0, label: 'Récupération des paiements…' })
  const paymentIds = await fetchAllPaymentIds()

  onProgress({ step: 0, total: 0, label: 'Récupération des salaires…' })
  const salaryIds = await fetchAllSalaryIds()

  onProgress({ step: 0, total: 0, label: 'Analyse des utilisateurs…' })
  const { toDelete: usersToDelete, protected: protectedUsers } = await fetchAllUsers()

  const total = paymentIds.length + salaryIds.length + usersToDelete.length

  if (total === 0) {
    return {
      deletedPayments: 0, deletedSalaries: 0, deletedUsers: 0,
      protectedUsers, errors: [], total: 0
    }
  }

  // ── Phase 1 : paiements ───────────────────────────────────────
  onProgress({ step: 0, total, label: `Suppression de ${paymentIds.length} paiement(s)…` })
  for (let i = 0; i < paymentIds.length; i++) {
    onProgress({
      step: i + 1,
      total,
      label: `Paiement #${paymentIds[i]} (${i + 1}/${paymentIds.length})`
    })
    const ok = await deletePayment(paymentIds[i])
    if (ok) deletedPayments++
    else errors.push(`Échec suppression paiement #${paymentIds[i]}`)
  }

  // ── Phase 2 : salaires ────────────────────────────────────────
  onProgress({
    step: paymentIds.length,
    total,
    label: `Suppression de ${salaryIds.length} salaire(s)…`
  })
  for (let i = 0; i < salaryIds.length; i++) {
    onProgress({
      step: paymentIds.length + i + 1,
      total,
      label: `Salaire #${salaryIds[i]} (${i + 1}/${salaryIds.length})`
    })
    const ok = await deleteSalary(salaryIds[i])
    if (ok) deletedSalaries++
    else errors.push(`Échec suppression salaire #${salaryIds[i]}`)
  }

  // ── Phase 3 : utilisateurs importés ──────────────────────────
  const offset = paymentIds.length + salaryIds.length
  onProgress({
    step: offset,
    total,
    label: `Suppression de ${usersToDelete.length} utilisateur(s)…`
  })
  for (let i = 0; i < usersToDelete.length; i++) {
    const u = usersToDelete[i]
    onProgress({
      step: offset + i + 1,
      total,
      label: `Utilisateur "${u.login}" #${u.id} (${i + 1}/${usersToDelete.length})`
    })
    const ok = await deleteUser(u.id)
    if (ok) deletedUsers++
    else errors.push(`Échec suppression utilisateur "${u.login}" #${u.id}`)
  }

  return {
    deletedPayments,
    deletedSalaries,
    deletedUsers,
    protectedUsers,
    errors,
    total
  }
}

// ─────────────────────────────────────────────────────────────────
// RÉSUMÉ AVANT CONFIRMATION
// ─────────────────────────────────────────────────────────────────

/**
 * Retourne le nombre d'enregistrements qui seront affectés
 * ainsi que la liste des utilisateurs protégés (pour info).
 */
export async function getDataSummary() {
  const [paymentIds, salaryIds, usersResult] = await Promise.all([
    fetchAllPaymentIds(),
    fetchAllSalaryIds(),
    fetchAllUsers(),
  ])

  return {
    paymentsCount:  paymentIds.length,
    salariesCount:  salaryIds.length,
    usersCount:     usersResult.toDelete.length,
    protectedUsers: usersResult.protected,   // [{ id, login, reason }]
  }
}