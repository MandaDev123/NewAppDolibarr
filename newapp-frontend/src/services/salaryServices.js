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
  const sqlfilters = `(sp.fk_salary:=:${salaryId})`
  const query = buildQueryString({ sqlfilters, limit: 200, sortfield: 't.rowid', sortorder: 'ASC' })
  return dolibarrApi.get(`/salaries/payments${query}`)
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
    sortfield: 'u.lastname',
    sortorder: 'ASC',
    sqlfilters: "(u.statut:=:1)", // utilisateurs actifs seulement
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
  return dolibarrApi.get('/setup/paymenttypes')
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