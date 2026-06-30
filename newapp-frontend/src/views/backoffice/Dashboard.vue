<template>
  <div>
    <!-- En-tête -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Tableau de bord</h1>
        <p class="page-subtitle">Statistiques salariales en temps réel</p>
      </div>
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <!-- Filtre année -->
        <select v-model="selectedYear" class="form-input" style="width: auto;" @change="computeCharts">
          <option v-for="y in availableYears" :key="y" :value="y">{{ y }}</option>
        </select>
        <button class="btn btn-outline" @click="fetchAll" :disabled="loading" style="display: flex; align-items: center; gap: 0.5rem;">
          <RefreshCw :style="loading ? 'animation: spin 1s linear infinite;' : ''" style="width: 15px; height: 15px;" />
          Actualiser
        </button>
      </div>
    </div>

    <!-- Erreur -->
    <div v-if="error" style="background: #fef2f2; border: 1px solid var(--danger); color: var(--danger); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
      {{ error }}
    </div>

    <!-- KPI cards -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">

      <!-- Total versé -->
      <div class="card" style="display: flex; flex-direction: column; gap: 0.5rem;">
        <span style="color: var(--text-secondary); font-size: 0.875rem; font-weight: 500; display: flex; align-items: center; gap: 0.5rem;">
          <Banknote style="width: 16px; height: 16px; color: var(--accent-primary, #6366f1);" />
          Total des salaires versés
        </span>
        <span v-if="loading" style="font-size: 1.75rem; font-weight: 700; color: var(--text-muted);">…</span>
        <span v-else style="font-size: 1.75rem; font-weight: 700; font-family: var(--font-display);">
          {{ formatAmount(kpi.totalPaid) }}
        </span>
        <span style="font-size: 0.75rem; color: var(--text-muted);">Paiements enregistrés — {{ selectedYear }}</span>
      </div>

      <!-- Salariés actifs -->
      <div class="card" style="display: flex; flex-direction: column; gap: 0.5rem;">
        <span style="color: var(--text-secondary); font-size: 0.875rem; font-weight: 500; display: flex; align-items: center; gap: 0.5rem;">
          <Users style="width: 16px; height: 16px; color: var(--accent-primary, #6366f1);" />
          Salariés actifs
        </span>
        <span v-if="loading" style="font-size: 1.75rem; font-weight: 700; color: var(--text-muted);">…</span>
        <span v-else style="font-size: 1.75rem; font-weight: 700; font-family: var(--font-display);">
          {{ kpi.activeSalaries }}
        </span>
        <span style="font-size: 0.75rem; color: var(--text-muted);">Salaires distincts sur la période</span>
      </div>

      <!-- Salaires non payés -->
      <div class="card" style="display: flex; flex-direction: column; gap: 0.5rem;">
        <span style="color: var(--text-secondary); font-size: 0.875rem; font-weight: 500; display: flex; align-items: center; gap: 0.5rem;">
          <AlertCircle style="width: 16px; height: 16px; color: var(--warning, #d97706);" />
          Salaires non soldés
        </span>
        <span v-if="loading" style="font-size: 1.75rem; font-weight: 700; color: var(--text-muted);">…</span>
        <span v-else style="font-size: 1.75rem; font-weight: 700; font-family: var(--font-display);" :style="{ color: kpi.unpaidCount > 0 ? 'var(--warning, #d97706)' : 'inherit' }">
          {{ kpi.unpaidCount }}
        </span>
        <span style="font-size: 0.75rem; color: var(--text-muted);">Dont reste à payer : {{ formatAmount(kpi.totalUnpaid) }}</span>
      </div>

      <!-- Montant moyen -->
      <div class="card" style="display: flex; flex-direction: column; gap: 0.5rem;">
        <span style="color: var(--text-secondary); font-size: 0.875rem; font-weight: 500; display: flex; align-items: center; gap: 0.5rem;">
          <TrendingUp style="width: 16px; height: 16px; color: var(--success, #10b981);" />
          Salaire moyen
        </span>
        <span v-if="loading" style="font-size: 1.75rem; font-weight: 700; color: var(--text-muted);">…</span>
        <span v-else style="font-size: 1.75rem; font-weight: 700; font-family: var(--font-display);">
          {{ formatAmount(kpi.avgAmount) }}
        </span>
        <span style="font-size: 0.75rem; color: var(--text-muted);">Par fiche salaire — {{ selectedYear }}</span>
      </div>
    </div>

    <!-- Charts -->
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">

      <!-- Bar chart : par mois -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1rem; font-weight: 600;">Montant des règlements par mois</h3>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Basé sur la date de règlement</span>
        </div>
        <div style="height: 300px; position: relative;">
          <div v-if="loading" style="height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-muted); gap: 0.75rem;">
            <Loader2 style="width: 20px; height: 20px; animation: spin 1s linear infinite;" /> Chargement…
          </div>
          <Bar v-else-if="monthlyChartData.labels.length > 0" :data="monthlyChartData" :options="monthlyOptions" />
          <div v-else style="height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 0.875rem;">
            Aucun règlement pour {{ selectedYear }}
          </div>
        </div>
      </div>

      <!-- Donut chart : par genre -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
          <h3 style="font-size: 1rem; font-weight: 600;">Masse salariale par genre</h3>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Montant des paiements versés</span>
        </div>
        <div style="height: 240px; position: relative; display: flex; justify-content: center;">
          <div v-if="loading" style="height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-muted); gap: 0.75rem;">
            <Loader2 style="width: 20px; height: 20px; animation: spin 1s linear infinite;" />
          </div>
          <Doughnut v-else-if="hasGenderData" :data="genderChartData" :options="genderOptions" />
          <div v-else style="height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-muted); font-size: 0.875rem;">
            Données de genre manquantes
          </div>
        </div>
        <!-- Légende enrichie -->
        <div v-if="!loading && hasGenderData" style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; font-size: 0.85rem;">
          <div v-for="(item, i) in genderLegend" :key="i" style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span :style="{ display: 'inline-block', width: '12px', height: '12px', borderRadius: '50%', background: item.color }"></span>
              {{ item.label }}
            </div>
            <span style="font-weight: 600;">{{ formatAmount(item.amount) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Tableau top employés par montant -->
    <div class="card" style="padding: 0; overflow: hidden;">
      <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
        <h3 style="font-size: 1rem; font-weight: 600;">Top employés — masse salariale versée</h3>
        <span style="font-size: 0.75rem; color: var(--text-muted);">{{ selectedYear }}</span>
      </div>
      <div v-if="loading" style="padding: 2rem; text-align: center; color: var(--text-muted);">
        <Loader2 style="width: 18px; height: 18px; animation: spin 1s linear infinite;" />
      </div>
      <div v-else style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Employé</th>
              <th>Genre</th>
              <th style="text-align: right;">Nb paiements</th>
              <th style="text-align: right;">Total versé</th>
              <th style="text-align: right;">Part (%)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in topEmployees" :key="row.fk_user">
              <td style="color: var(--text-muted); font-family: var(--mono);">{{ i + 1 }}</td>
              <td style="font-weight: 500;">{{ row.name }}</td>
              <td>
                <span :class="['badge', row.gender === 'man' ? 'badge-info' : row.gender === 'woman' ? 'badge-success' : '']">
                  {{ row.gender === 'man' ? 'Homme' : row.gender === 'woman' ? 'Femme' : 'N/A' }}
                </span>
              </td>
              <td style="text-align: right;">{{ row.paymentCount }}</td>
              <td style="text-align: right; font-weight: 600;">{{ formatAmount(row.totalPaid) }}</td>
              <td style="text-align: right; color: var(--text-muted);">{{ row.share }}%</td>
            </tr>
            <tr v-if="topEmployees.length === 0">
              <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                Aucune donnée pour {{ selectedYear }}.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { TrendingUp, Users, Banknote, AlertCircle, RefreshCw, Loader2 } from 'lucide-vue-next'
import {
  Chart as ChartJS, Title, Tooltip, Legend,
  BarElement, CategoryScale, LinearScale, ArcElement
} from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'
import { dolibarrApi } from '../../services/dolibarrServices.js'
import { formatAmount } from '../../services/salaryServices.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

// ─── État ──────────────────────────────────────────
const loading = ref(false)
const error = ref(null)

const allSalaries = ref([])   // toutes les fiches salaire
const allPayments = ref([])   // tous les paiements
const userMap = ref({})       // { id: { name, gender } }

const selectedYear = ref(new Date().getFullYear())

// ─── Fetch ─────────────────────────────────────────
async function fetchAll() {
  loading.value = true
  error.value = null
  try {
    // 1. Tous les salaires
    const salaries = await dolibarrApi.get('/salaries?limit=500&sortfield=t.rowid&sortorder=ASC')
    allSalaries.value = Array.isArray(salaries) ? salaries : []

    // 2. Tous les paiements
    const payments = await dolibarrApi.get('/salaries/payments?limit=1000&sortfield=t.rowid&sortorder=ASC')
    allPayments.value = Array.isArray(payments) ? payments : []

    // 3. Utilisateurs (genre + nom)
    const users = await dolibarrApi.get('/users?limit=300&sortfield=t.lastname&sortorder=ASC&sqlfilters=(t.statut:=:1)')
    const uList = Array.isArray(users) ? users : []
    const map = {}
    uList.forEach(u => {
      map[String(u.id)] = {
        name: `${u.lastname || ''} ${u.firstname || ''}`.trim() || `#${u.id}`,
        gender: u.gender || ''
      }
    })
    userMap.value = map

    computeCharts()
  } catch (e) {
    error.value = `Erreur API : ${e.message}`
  } finally {
    loading.value = false
  }
}

// ─── Années disponibles ────────────────────────────
const availableYears = computed(() => {
  const years = new Set()
  allPayments.value.forEach(p => {
    const ts = p.datepaye ?? p.datep
    if (ts) years.add(new Date(Number(ts) * 1000).getFullYear())
  })
  if (years.size === 0) years.add(new Date().getFullYear())
  return [...years].sort((a, b) => b - a)
})

// ─── Paiements filtrés par année sélectionnée ─────
const paymentsForYear = computed(() =>
  allPayments.value.filter(p => {
    const ts = p.datepaye ?? p.datep
    if (!ts) return false
    return new Date(Number(ts) * 1000).getFullYear() === selectedYear.value
  })
)

// ─── KPI ───────────────────────────────────────────
const kpi = computed(() => {
  const totalPaid = paymentsForYear.value.reduce((s, p) => s + parseFloat(p.amount ?? 0), 0)

  // Salaires de l'année sélectionnée (par datesp)
  const salForYear = allSalaries.value.filter(s => {
    const ts = s.datesp
    if (!ts) return false
    return new Date(Number(ts) * 1000).getFullYear() === selectedYear.value
  })

  const activeSalaries = salForYear.length
  const unpaid = salForYear.filter(s => s.paye !== '1' && s.paye !== 1)
  const unpaidCount = unpaid.length
  const totalUnpaid = unpaid.reduce((sum, s) => {
    const reste = s.resteapayer !== null && s.resteapayer !== undefined
      ? parseFloat(s.resteapayer)
      : Math.max(0, parseFloat(s.amount ?? 0) - parseFloat(s.totalpaid ?? 0))
    return sum + reste
  }, 0)

  const avgAmount = activeSalaries > 0
    ? salForYear.reduce((s, sal) => s + parseFloat(sal.amount ?? 0), 0) / activeSalaries
    : 0

  return { totalPaid, activeSalaries, unpaidCount, totalUnpaid, avgAmount }
})

// ─── Chart par mois ────────────────────────────────
const MONTHS_FR = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc']

const monthlyChartData = computed(() => {
  const buckets = Array(12).fill(0)
  paymentsForYear.value.forEach(p => {
    const ts = p.datepaye ?? p.datep
    if (!ts) return
    const month = new Date(Number(ts) * 1000).getMonth()
    buckets[month] += parseFloat(p.amount ?? 0)
  })
  // Couper les mois trailing vides (optionnel : garder tous les 12)
  return {
    labels: MONTHS_FR,
    datasets: [{
      label: 'Règlements (MGA)',
      backgroundColor: '#6366f1',
      hoverBackgroundColor: '#4f46e5',
      borderRadius: 6,
      data: buckets
    }]
  }
})

const monthlyOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => ' ' + Number(ctx.raw).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' MGA'
      }
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: { color: 'rgba(0,0,0,0.05)' },
      ticks: {
        callback: v => v === 0 ? '0' : (v / 1000).toFixed(0) + 'k'
      }
    },
    x: { grid: { display: false } }
  }
}

// ─── Chart par genre ───────────────────────────────
const GENDER_COLORS = { man: '#6366f1', woman: '#10b981', '': '#f59e0b' }
const GENDER_LABELS = { man: 'Hommes', woman: 'Femmes', '': 'Non renseigné' }

const genderTotals = computed(() => {
  const salaryMap = {}
  allSalaries.value.forEach(s => { salaryMap[String(s.id)] = s })

  const buckets = {}
  paymentsForYear.value.forEach(p => {
    const sal = salaryMap[String(p.fk_salary)]
    if (!sal) return
    const user = userMap.value[String(sal.fk_user)]
    const gender = user?.gender || ''
    buckets[gender] = (buckets[gender] ?? 0) + parseFloat(p.amount ?? 0)
  })
  return buckets
})

const hasGenderData = computed(() => Object.values(genderTotals.value).some(v => v > 0))

const genderChartData = computed(() => {
  const entries = Object.entries(genderTotals.value).filter(([, v]) => v > 0)
  return {
    labels: entries.map(([k]) => GENDER_LABELS[k] ?? k),
    datasets: [{
      backgroundColor: entries.map(([k]) => GENDER_COLORS[k] ?? '#94a3b8'),
      borderWidth: 0,
      data: entries.map(([, v]) => v)
    }]
  }
})

const genderLegend = computed(() =>
  Object.entries(genderTotals.value)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ label: GENDER_LABELS[k] ?? k, amount: v, color: GENDER_COLORS[k] ?? '#94a3b8' }))
)

const genderOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: ctx => ' ' + Number(ctx.raw).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' MGA'
      }
    }
  },
  cutout: '68%'
}

// ─── Top employés ──────────────────────────────────
const topEmployees = computed(() => {
  // Group paiements de l'année par fk_salary → puis join fk_user via allSalaries
  const salaryMap = {}
  allSalaries.value.forEach(s => { salaryMap[String(s.id)] = s })

  const perUser = {}
  paymentsForYear.value.forEach(p => {
    const sal = salaryMap[String(p.fk_salary)]
    if (!sal) return
    const uid = String(sal.fk_user)
    if (!perUser[uid]) perUser[uid] = { fk_user: uid, totalPaid: 0, paymentCount: 0 }
    perUser[uid].totalPaid += parseFloat(p.amount ?? 0)
    perUser[uid].paymentCount += 1
  })

  const grandTotal = Object.values(perUser).reduce((s, r) => s + r.totalPaid, 0)

  return Object.values(perUser)
    .sort((a, b) => b.totalPaid - a.totalPaid)
    .slice(0, 10)
    .map(r => ({
      ...r,
      name: userMap.value[r.fk_user]?.name ?? `#${r.fk_user}`,
      gender: userMap.value[r.fk_user]?.gender ?? '',
      share: grandTotal > 0 ? ((r.totalPaid / grandTotal) * 100).toFixed(1) : '0.0'
    }))
})

// dummy pour éviter le warning "computeCharts not used"
function computeCharts() { /* les computed se recalculent automatiquement */ }

onMounted(fetchAll)
</script>

<style scoped>
@keyframes spin { to { transform: rotate(360deg); } }
</style>