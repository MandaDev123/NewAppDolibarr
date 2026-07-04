import { dolibarrApi } from './dolibarrServices.js'

// ── Fetch des données brutes ────────────────────────────────────

export async function fetchSalaries() {
  const data = await dolibarrApi.get('/salaries?limit=1000&sortfield=t.rowid&sortorder=ASC')
  return Array.isArray(data) ? data : []
}

export async function fetchUsers() {
  const data = await dolibarrApi.get('/users?limit=500&sortfield=t.lastname&sortorder=ASC')
  return Array.isArray(data) ? data : []
}

function dateFromDatesp(datesp) {
  return new Date(Number(datesp) * 1000 + 12 * 3600 * 1000)
}

export function availableYears(salaries) {
  const years = new Set()
  salaries.forEach(s => {
    if (s.datesp) years.add(dateFromDatesp(s.datesp).getUTCFullYear())
  })
  if (years.size === 0) years.add(new Date().getFullYear())
  return [...years].sort((a, b) => b - a)
}

// ── KPI ────────────────────────────────────────────────────────

export function computeKpi(salaries) {
  const total      = salaries.reduce((s, sal) => s + parseFloat(sal.amount ?? 0), 0)
  const unpaid     = salaries.filter(s => s.paye !== '1' && s.paye !== 1)
  const totalUnpaid = unpaid.reduce((s, sal) => s + Math.max(0, parseFloat(sal.amount ?? 0) - parseFloat(sal.totalpaid ?? 0)), 0)

  return {
    total,
    count:        salaries.length,
    unpaidCount:  unpaid.length,
    totalUnpaid,
    avg:          salaries.length > 0 ? total / salaries.length : 0,
  }
}

// ── Filtrage par année (référence : datesp) ─────────────────────

export function salariesForYear(salaries, year) {
  return salaries.filter(s => {
    if (!s.datesp) return false
    return dateFromDatesp(s.datesp).getUTCFullYear() === year
  })
}


// ── Montant par mois (basé sur datesp) ─────────────────────────

export function computeMonthlyAmounts(salaries) {
  const buckets = Array(12).fill(0)
  salaries.forEach(s => {
    if (!s.datesp) return

    const month = dateFromDatesp(s.datesp).getUTCMonth()
    buckets[month] += parseFloat(s.amount ?? 0)
  })
  return buckets
}

// ── Montant par genre ───────────────────────────────────────────

export function computeGenderAmounts(salaries, userMap) {
  const buckets = {}
  salaries.forEach(s => {
    const gender = userMap[String(s.fk_user)]?.gender || ''
    buckets[gender] = (buckets[gender] ?? 0) + parseFloat(s.amount ?? 0)
  })
  return buckets
}

// ── Top employés ────────────────────────────────────────────────

export function computeTopEmployees(salaries, userMap) {
  const perUser = {}
  salaries.forEach(s => {
    const uid = String(s.fk_user)
    if (!perUser[uid]) perUser[uid] = { fk_user: uid, total: 0, count: 0 }
    perUser[uid].total += parseFloat(s.amount ?? 0)
    perUser[uid].count += 1
  })

  const grandTotal = salaries.reduce((s, sal) => s + parseFloat(sal.amount ?? 0), 0)

  return Object.values(perUser)
    .sort((a, b) => b.total - a.total)
    .slice(0, 10)
    .map(r => ({
      ...r,
      name:   userMap[r.fk_user]?.name   ?? `#${r.fk_user}`,
      gender: userMap[r.fk_user]?.gender ?? '',
      share:  grandTotal > 0 ? ((r.total / grandTotal) * 100).toFixed(1) : '0.0',
    }))
}

// ── Formatage ───────────────────────────────────────────────────

export function formatAmount(value) {
  if (value === null || value === undefined) return '—'
  return Number(value).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' MGA'
}