<template>
  <div>
    <!-- En-tête -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Liste des Salaires</h1>
        <p class="page-subtitle">Gérez et suivez les paiements de salaires</p>
      </div>
      <router-link to="/frontoffice/salary/create" class="btn btn-primary">
        <Plus style="width: 16px; height: 16px;" />
        Nouveau Salaire
      </router-link>
    </div>

    <!-- Recherche multicritère -->
    <div class="card" style="margin-bottom: 1.5rem;">
      <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem;">
        <h3 style="font-size: 0.95rem; font-weight: 600;">Recherche multicritère</h3>
        <button class="btn btn-outline" style="padding: 0.25rem 0.75rem; font-size: 0.75rem;" @click="resetFilters">
          Réinitialiser
        </button>
      </div>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem;">
        <!-- Libellé -->
        <div>
          <label class="form-label">Libellé</label>
          <div style="position: relative;">
            <Search style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 15px; height: 15px; color: var(--text-muted);" />
            <input type="text" v-model="filters.label" class="form-input" style="padding-left: 2.25rem;" placeholder="Ex: Salaire" @input="debouncedFetch" />
          </div>
        </div>
        <!-- Salarié -->
        <div>
          <label class="form-label">Salarié</label>
          <select v-model="filters.fk_user" class="form-input" @change="fetchSalaries">
            <option value="">Tous les employés</option>
            <option v-for="u in users" :key="u.id" :value="u.id">
              {{ u.lastname }} {{ u.firstname }}
            </option>
          </select>
        </div>
        <!-- État -->
        <div>
          <label class="form-label">État</label>
          <select v-model="filters.paye" class="form-input" @change="fetchSalaries">
            <option value="">Tous</option>
            <option value="0">Non payé</option>
            <option value="1">Payé</option>
          </select>
        </div>
        <!-- Date début (de) -->
        <div>
          <label class="form-label">Date début ≥</label>
          <input type="date" v-model="filters.datesp_from" class="form-input" @change="fetchSalaries" />
        </div>
        <!-- Date fin (à) -->
        <div>
          <label class="form-label">Date début ≤</label>
          <input type="date" v-model="filters.datesp_to" class="form-input" @change="fetchSalaries" />
        </div>
        <!-- Mode règlement par défaut -->
        <div>
          <label class="form-label">Mode de règlement par défaut</label>
          <select v-model="filters.type_payment_code" class="form-input" @change="fetchSalaries">
            <option value="">Tous</option>
            <option v-for="pt in paymentTypes" :key="pt.id" :value="pt.code">{{ pt.label }}</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Erreur -->
    <div v-if="error" style="background: var(--danger-light, #fef2f2); border: 1px solid var(--danger); color: var(--danger); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
      {{ error }}
    </div>

    <!-- Tableau -->
    <div class="card" style="padding: 0; overflow: hidden;">
      <!-- Loading overlay -->
      <div v-if="loading" style="display: flex; align-items: center; justify-content: center; padding: 3rem; gap: 0.75rem; color: var(--text-muted);">
        <Loader2 style="width: 20px; height: 20px; animation: spin 1s linear infinite;" />
        Chargement…
      </div>

      <div v-else style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th style="cursor: pointer;" @click="toggleSort('t.rowid')">
                Réf. <SortIcon field="t.rowid" :current="sortField" :order="sortOrder" />
              </th>
              <th>Libellé</th>
              <th style="cursor: pointer;" @click="toggleSort('t.datesp')">
                Date début <SortIcon field="t.datesp" :current="sortField" :order="sortOrder" />
              </th>
              <th style="cursor: pointer;" @click="toggleSort('t.dateep')">
                Date fin <SortIcon field="t.dateep" :current="sortField" :order="sortOrder" />
              </th>
              <th style="cursor: pointer;" @click="toggleSort('t.lastname')">
                Salarié <SortIcon field="t.lastname" :current="sortField" :order="sortOrder" />
              </th>
              <th>Mode de règlement par défaut</th>
              <th style="text-align: right; cursor: pointer;" @click="toggleSort('t.amount')">
                Montant <SortIcon field="t.amount" :current="sortField" :order="sortOrder" />
              </th>
              <th>État</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="sal in salaries" :key="sal.id">
              <td style="font-family: var(--mono); color: var(--text-muted);">{{ sal.ref }}</td>
              <td style="font-weight: 500;">{{ sal.label || '—' }}</td>
              <td>{{ formatDate(sal.datesp) }}</td>
              <td>{{ formatDate(sal.dateep) }}</td>
              <td>{{ getUserName(sal.fk_user) }}</td>
              <td>{{ sal.type_payment_code || '—' }}</td>
              <td style="text-align: right; font-weight: 600;">{{ formatAmount(sal.amount) }}</td>
              <td>
                <span :class="['badge', getSalaryStatusClass(sal)]">
                  {{ getSalaryStatusLabel(sal) }}
                </span>
              </td>
              <td style="text-align: right; white-space: nowrap; display: flex; gap: 0.5rem; justify-content: flex-end;">
                <router-link :to="`/frontoffice/salary/${sal.id}`" class="btn btn-outline" style="padding: 0.25rem 0.75rem; font-size: 0.75rem;">
                  <Eye style="width: 13px; height: 13px;" /> Voir
                </router-link>
              </td>
            </tr>
            <tr v-if="salaries.length === 0 && !loading">
              <td colspan="9" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                Aucun salaire ne correspond à votre recherche.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Pagination -->
      <div v-if="!loading && salaries.length > 0" style="display: flex; justify-content: space-between; align-items: center; padding: 1rem 1.25rem; border-top: 1px solid var(--border-color); font-size: 0.875rem; color: var(--text-secondary);">
        <span>Page {{ currentPage + 1 }} — {{ salaries.length }} résultat(s)</span>
        <div style="display: flex; gap: 0.5rem;">
          <button class="btn btn-outline" style="padding: 0.25rem 0.75rem; font-size: 0.75rem;" :disabled="currentPage === 0" @click="changePage(-1)">
            ← Précédent
          </button>
          <button class="btn btn-outline" style="padding: 0.25rem 0.75rem; font-size: 0.75rem;" :disabled="salaries.length < pageSize" @click="changePage(1)">
            Suivant →
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { Plus, Search, Eye, Loader2 } from 'lucide-vue-next'
import {
  getSalaries, getUsers, getPaymentTypes,
  formatDate, formatAmount, getSalaryStatusLabel, getSalaryStatusClass
} from '../../services/salaryServices.js'

// ─── État ──────────────────────────────────────────
const salaries = ref([])
const users = ref([])
const paymentTypes = ref([])
const loading = ref(false)
const error = ref(null)

const currentPage = ref(0)
const pageSize = 50
const sortField = ref('t.rowid')
const sortOrder = ref('DESC')

const filters = ref({
  label: '',
  fk_user: '',
  paye: '',
  datesp_from: '',
  datesp_to: '',
  type_payment_code: '',
})

// ─── Helpers ───────────────────────────────────────
const userMap = computed(() => {
  const m = {}
  users.value.forEach(u => { m[u.id] = `${u.lastname} ${u.firstname}` })
  return m
})

function getUserName(fk_user) {
  return userMap.value[fk_user] || `Utilisateur #${fk_user}`
}

function getResteAPayer(sal) {
  if (sal.resteapayer !== null && sal.resteapayer !== undefined) return parseFloat(sal.resteapayer)
  const amount = parseFloat(sal.amount ?? 0)
  const paid = parseFloat(sal.totalpaid ?? 0)
  return Math.max(0, amount - paid)
}

// ─── Filtre → sqlfilters Dolibarr ──────────────────
function buildSqlFilters() {
  const parts = []
  if (filters.value.label)
    parts.push(`(t.label:like:'%${filters.value.label}%')`)
  if (filters.value.fk_user)
    parts.push(`(t.fk_user:=:${filters.value.fk_user})`)
  if (filters.value.paye !== '')
    parts.push(`(t.paye:=:${filters.value.paye})`)
  if (filters.value.datesp_from) {
    const ts = Math.floor(new Date(filters.value.datesp_from).getTime() / 1000)
    parts.push(`(t.datesp:>=:${ts})`)
  }
  if (filters.value.datesp_to) {
    const ts = Math.floor(new Date(filters.value.datesp_to).getTime() / 1000)
    parts.push(`(t.datesp:<=:${ts})`)
  }
  if (filters.value.type_payment_code)
    parts.push(`(t.type_payment_code:=:'${filters.value.type_payment_code}')`)
  return parts.join(' AND ') || undefined
}

// ─── Fetch ─────────────────────────────────────────
async function fetchSalaries() {
  loading.value = true
  error.value = null
  try {
    const data = await getSalaries({
      limit: pageSize,
      page: currentPage.value,
      sortfield: sortField.value,
      sortorder: sortOrder.value,
      sqlfilters: buildSqlFilters(),
    })
    salaries.value = Array.isArray(data) ? data : []
  } catch (e) {
    error.value = e.message
    salaries.value = []
  } finally {
    loading.value = false
  }
}

async function fetchMeta() {
  try {
    const [u, pt] = await Promise.all([getUsers(), getPaymentTypes()])
    users.value = Array.isArray(u) ? u : []
    paymentTypes.value = Array.isArray(pt) ? pt : []
  } catch {
    // silencieux — la liste principale reste utilisable
  }
}

// ─── Tri ───────────────────────────────────────────
function toggleSort(field) {
  if (sortField.value === field) {
    sortOrder.value = sortOrder.value === 'ASC' ? 'DESC' : 'ASC'
  } else {
    sortField.value = field
    sortOrder.value = 'ASC'
  }
  fetchSalaries()
}

// ─── Pagination ────────────────────────────────────
function changePage(delta) {
  currentPage.value = Math.max(0, currentPage.value + delta)
  fetchSalaries()
}

// ─── Debounce champ texte ──────────────────────────
let debounceTimer = null
function debouncedFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => fetchSalaries(), 400)
}

function resetFilters() {
  Object.keys(filters.value).forEach(k => { filters.value[k] = '' })
  currentPage.value = 0
  fetchSalaries()
}

onMounted(async () => {
  await fetchMeta()
  await fetchSalaries()
})
</script>

<!-- Composant inline : icône de tri -->
<script>
// SortIcon mini-component (défini inline pour éviter un fichier supplémentaire)
export const SortIcon = {
  props: ['field', 'current', 'order'],
  template: `<span style="font-size:0.7rem; color: var(--text-muted);">
    <template v-if="field === current">{{ order === 'ASC' ? '▲' : '▼' }}</template>
    <template v-else>⇅</template>
  </span>`
}
</script>