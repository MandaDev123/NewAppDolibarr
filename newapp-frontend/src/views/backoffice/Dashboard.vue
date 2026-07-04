<template>
  <div>
    <!-- En-tête -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Tableau de bord</h1>
        <p class="page-subtitle">Statistiques salariales</p>
      </div>
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        <select v-model="selectedYear" class="form-input" style="width: auto;">
          <option v-for="y in years" :key="y" :value="y">{{ y }}</option>
        </select>
        <button class="btn btn-outline" @click="load" :disabled="loading"
          style="display: flex; align-items: center; gap: 0.5rem;">
          <RefreshCw style="width: 15px; height: 15px;"
            :style="loading ? 'animation: spin 1s linear infinite' : ''" />
          Actualiser
        </button>
      </div>
    </div>

    <div v-if="error" style="background: #fef2f2; border: 1px solid var(--danger); color: var(--danger); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1.5rem;">
      {{ error }}
    </div>

    <!-- KPI -->
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 1.25rem; margin-bottom: 1.75rem;">
      <div class="card kpi-card">
        <span class="kpi-label"><Banknote style="width:15px;height:15px;" /> Masse salariale</span>
        <span class="kpi-value">{{ loading ? '…' : fmt(kpi.total) }}</span>
        <span class="kpi-sub">Total — {{ selectedYear }}</span>
      </div>
      <div class="card kpi-card">
        <span class="kpi-label"><Users style="width:15px;height:15px;" /> Fiches salaires</span>
        <span class="kpi-value">{{ loading ? '…' : kpi.count }}</span>
        <span class="kpi-sub">Salaires créés — {{ selectedYear }}</span>
      </div>
      <div class="card kpi-card">
        <span class="kpi-label"><AlertCircle style="width:15px;height:15px;color:var(--warning,#d97706);" /> Non soldés</span>
        <span class="kpi-value" :style="{ color: kpi.unpaidCount > 0 ? 'var(--warning,#d97706)' : 'inherit' }">
          {{ loading ? '…' : kpi.unpaidCount }}
        </span>
        <span class="kpi-sub">Reste : {{ fmt(kpi.totalUnpaid) }}</span>
      </div>
      <div class="card kpi-card">
        <span class="kpi-label"><TrendingUp style="width:15px;height:15px;color:var(--success,#10b981);" /> Salaire moyen</span>
        <span class="kpi-value">{{ loading ? '…' : fmt(kpi.avg) }}</span>
        <span class="kpi-sub">Par fiche — {{ selectedYear }}</span>
      </div>
    </div>

    <!-- Charts -->
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 1.75rem;">

      <!-- Bar : montant par mois (datesp) -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h3 style="font-size: 1rem; font-weight: 600;">Masse salariale par mois</h3>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Référence : date de début du salaire</span>
        </div>
        <div style="height: 280px;">
          <div v-if="loading" class="chart-empty">
            <Loader2 style="width:20px;height:20px;animation:spin 1s linear infinite;" /> Chargement…
          </div>
          <Bar v-else :data="barData" :options="barOptions" style="height:100%;" />
        </div>
      </div>

      <!-- Donut : montant par genre -->
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem;">
          <h3 style="font-size: 1rem; font-weight: 600;">Par genre</h3>
          <span style="font-size: 0.75rem; color: var(--text-muted);">Montant des salaires</span>
        </div>
        <div style="height: 200px; display: flex; justify-content: center;">
          <div v-if="loading" class="chart-empty">
            <Loader2 style="width:20px;height:20px;animation:spin 1s linear infinite;" />
          </div>
          <Doughnut v-else-if="hasGenderData" :data="donutData" :options="donutOptions" />
          <div v-else class="chart-empty" style="font-size:0.875rem;">Données manquantes</div>
        </div>
        <div v-if="!loading && hasGenderData"
          style="display: flex; flex-direction: column; gap: 0.5rem; margin-top: 1rem; font-size: 0.82rem;">
          <div v-for="item in genderLegend" :key="item.label"
            style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span :style="{ display:'inline-block', width:'10px', height:'10px', borderRadius:'50%', background: item.color }"></span>
              {{ item.label }}
            </div>
            <span style="font-weight: 600;">{{ fmt(item.amount) }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Top employés -->
    <div class="card" style="padding: 0; overflow: hidden;">
      <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between;">
        <h3 style="font-size: 1rem; font-weight: 600;">Top employés — masse salariale</h3>
        <span style="font-size: 0.75rem; color: var(--text-muted);">{{ selectedYear }}</span>
      </div>
      <div v-if="loading" style="padding: 2rem; text-align: center; color: var(--text-muted);">
        <Loader2 style="width:18px;height:18px;animation:spin 1s linear infinite;" />
      </div>
      <div v-else style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Employé</th>
              <th>Genre</th>
              <th style="text-align: right;">Nb salaires</th>
              <th style="text-align: right;">Montant total</th>
              <th style="text-align: right;">Part (%)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(row, i) in topEmployees" :key="row.fk_user">
              <td style="color: var(--text-muted);">{{ i + 1 }}</td>
              <td style="font-weight: 500;">{{ row.name }}</td>
              <td>
                <span :class="['badge', row.gender === 'man' ? 'badge-info' : row.gender === 'woman' ? 'badge-success' : '']">
                  {{ row.gender === 'man' ? 'Homme' : row.gender === 'woman' ? 'Femme' : 'N/A' }}
                </span>
              </td>
              <td style="text-align: right;">{{ row.count }}</td>
              <td style="text-align: right; font-weight: 600;">{{ fmt(row.total) }}</td>
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
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale, ArcElement } from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'
import {
  fetchSalaries, fetchUsers,
  availableYears, salariesForYear,
  computeKpi, computeMonthlyAmounts, computeGenderAmounts, computeTopEmployees,
  formatAmount
} from '../../services/dashboardServices.js'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

// ── État ───────────────────────────────────────────
const allSalaries  = ref([])
const userMap      = ref({})
const loading      = ref(false)
const error        = ref(null)
const selectedYear = ref(new Date().getFullYear())
const fmt          = formatAmount

// ── Chargement ─────────────────────────────────────
async function load() {
  loading.value = true
  error.value   = null
  try {
    const [salaries, users] = await Promise.all([fetchSalaries(), fetchUsers()])
    allSalaries.value = salaries
    userMap.value = Object.fromEntries(
      users.map(u => [String(u.id), {
        name:   `${u.lastname || ''} ${u.firstname || ''}`.trim() || `#${u.id}`,
        gender: u.gender || ''
      }])
    )
    const y = availableYears(salaries)
    if (y.length) selectedYear.value = y[0]
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

// ── Computed ───────────────────────────────────────
const filtered     = computed(() => salariesForYear(allSalaries.value, selectedYear.value))
const years        = computed(() => availableYears(allSalaries.value))
const kpi          = computed(() => computeKpi(filtered.value))
const topEmployees = computed(() => computeTopEmployees(filtered.value, userMap.value))

// ── Bar chart ──────────────────────────────────────
const MONTHS = ['Jan','Fév','Mar','Avr','Mai','Jun','Jul','Aoû','Sep','Oct','Nov','Déc']

const barData = computed(() => ({
  labels: MONTHS,
  datasets: [{
    label: 'Salaires (MGA)',
    data: computeMonthlyAmounts(filtered.value),
    backgroundColor: '#6366f1',
    hoverBackgroundColor: '#4f46e5',
    borderRadius: 5,
  }]
}))

const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: ctx => ' ' + Number(ctx.raw).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' MGA' } }
  },
  scales: {
    y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { callback: v => v === 0 ? '0' : (v / 1000).toFixed(0) + 'k' } },
    x: { grid: { display: false } }
  }
}

// ── Donut chart ────────────────────────────────────
const GENDER_COLORS = { man: '#6366f1', woman: '#10b981', '': '#f59e0b' }
const GENDER_LABELS = { man: 'Hommes', woman: 'Femmes', '': 'Non renseigné' }

const genderAmounts = computed(() => computeGenderAmounts(filtered.value, userMap.value))
const hasGenderData = computed(() => Object.values(genderAmounts.value).some(v => v > 0))

const donutData = computed(() => {
  const entries = Object.entries(genderAmounts.value).filter(([, v]) => v > 0)
  return {
    labels: entries.map(([k]) => GENDER_LABELS[k] ?? k),
    datasets: [{ data: entries.map(([, v]) => v), backgroundColor: entries.map(([k]) => GENDER_COLORS[k] ?? '#94a3b8'), borderWidth: 0 }]
  }
})

const genderLegend = computed(() =>
  Object.entries(genderAmounts.value)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ label: GENDER_LABELS[k] ?? k, amount: v, color: GENDER_COLORS[k] ?? '#94a3b8' }))
)

const donutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false },
    tooltip: { callbacks: { label: ctx => ' ' + Number(ctx.raw).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' MGA' } }
  },
  cutout: '68%'
}

onMounted(load)
</script>

<style scoped>
@keyframes spin { to { transform: rotate(360deg); } }
.kpi-card  { display: flex; flex-direction: column; gap: 0.4rem; }
.kpi-label { color: var(--text-secondary); font-size: 0.875rem; font-weight: 500; display: flex; align-items: center; gap: 0.5rem; }
.kpi-value { font-size: 1.75rem; font-weight: 700; }
.kpi-sub   { font-size: 0.75rem; color: var(--text-muted); }
.chart-empty { height: 100%; display: flex; align-items: center; justify-content: center; color: var(--text-muted); gap: 0.75rem; }
</style>