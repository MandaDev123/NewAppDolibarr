<template>
  <div>
    <!-- En-tête -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Jours fériés</h1>
        <p class="page-subtitle">Gérer les jours fériés — Madagascar</p>
      </div>
      <button class="btn btn-primary" @click="openModal()">
        <Plus style="width: 16px; height: 16px;" />
        Nouveau jour férié
      </button>
    </div>

    <!-- Erreur globale -->
    <div v-if="error" style="background: #fef2f2; border: 1px solid var(--danger); color: var(--danger); padding: 0.875rem 1rem; border-radius: var(--radius-md); margin-bottom: 1.25rem; display: flex; justify-content: space-between; align-items: center;">
      {{ error }}
      <button @click="error = null" style="background: none; border: none; cursor: pointer; color: var(--danger); font-size: 1rem;">✕</button>
    </div>

    <!-- Barre de filtres -->
    <div class="card" style="padding: 1rem 1.25rem; margin-bottom: 1.25rem;">
      <div style="display: flex; gap: 1rem; flex-wrap: wrap; align-items: flex-end;">
        <!-- Recherche -->
        <div style="flex: 1; min-width: 180px;">
          <label class="form-label">Recherche</label>
          <div style="position: relative;">
            <Search style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 15px; height: 15px; color: var(--text-muted);" />
            <input v-model="filters.search" type="text" class="form-input" style="padding-left: 2.25rem;" placeholder="Nom ou description…" @input="debouncedFetch" />
          </div>
        </div>
        <!-- Filtre année -->
        <div style="min-width: 120px;">
          <label class="form-label">Année</label>
          <select v-model="filters.year" class="form-input" @change="fetchFeries">
            <option value="">Toutes</option>
            <option v-for="y in yearOptions" :key="y" :value="y">{{ y }}</option>
          </select>
        </div>
        <!-- Filtre récurrence -->
        <div style="min-width: 150px;">
          <label class="form-label">Type</label>
          <select v-model="filters.recurrent" class="form-input" @change="fetchFeries">
            <option value="">Tous</option>
            <option value="1">Annuels</option>
            <option value="0">Ponctuels</option>
          </select>
        </div>
        <button class="btn btn-outline" style="align-self: flex-end;" @click="resetFilters">
          Réinitialiser
        </button>
      </div>
    </div>

    <!-- Tableau -->
    <div class="card" style="padding: 0; overflow: hidden;">
      <div v-if="loading" style="padding: 3rem; text-align: center; color: var(--text-muted); display: flex; align-items: center; justify-content: center; gap: 0.75rem;">
        <Loader2 style="width: 20px; height: 20px; animation: spin 1s linear infinite;" /> Chargement…
      </div>
      <div v-else style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th style="width: 40px;">
                <input type="checkbox" :checked="allSelected" @change="toggleSelectAll" />
              </th>
              <th>Nom</th>
              <th>Date</th>
              <th>Mois</th>
              <th>Type</th>
              <th>Description</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="f in feries" :key="f.id" :class="{ 'row-selected': selected.includes(f.id) }">
              <td>
                <input type="checkbox" :value="f.id" v-model="selected" />
              </td>
              <td style="font-weight: 600;">
                <span style="margin-right: 0.4rem;">{{ dayEmoji(f.date) }}</span>
                {{ f.nom }}
              </td>
              <td style="font-family: var(--mono);">{{ formatDate(f.date) }}</td>
              <td style="color: var(--text-secondary);">{{ monthName(f.date) }}</td>
              <td>
                <span :class="['badge', f.recurrent ? 'badge-success' : 'badge-warning']">
                  {{ f.recurrent ? '🔁 Annuel' : '📅 Ponctuel' }}
                </span>
              </td>
              <td style="color: var(--text-muted); font-size: 0.82rem; max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                {{ f.description || '—' }}
              </td>
              <td style="text-align: right; white-space: nowrap; display: flex; justify-content: flex-end; gap: 0.4rem;">
                <button class="btn btn-outline" style="padding: 0.25rem 0.6rem; font-size: 0.75rem;" @click="openModal(f)">
                  <Pencil style="width: 13px; height: 13px;" />
                </button>
                <button class="btn-danger-sm" @click="confirmDelete(f)">
                  <Trash2 style="width: 13px; height: 13px;" />
                </button>
              </td>
            </tr>
            <tr v-if="feries.length === 0 && !loading">
              <td colspan="7" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                Aucun jour férié trouvé.
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Barre de sélection multiple -->
      <div v-if="selected.length > 0" style="padding: 0.75rem 1.25rem; border-top: 1px solid var(--border-color); background: rgba(239,68,68,0.05); display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 0.875rem; color: var(--text-secondary);">
          <strong>{{ selected.length }}</strong> sélectionné(s)
        </span>
        <button class="btn-danger-sm" style="padding: 0.35rem 0.875rem; font-size: 0.8rem;" @click="bulkDelete">
          <Trash2 style="width: 13px; height: 13px;" />
          Supprimer la sélection
        </button>
      </div>

      <!-- Footer compteur -->
      <div v-if="!loading && feries.length > 0" style="padding: 0.75rem 1.25rem; border-top: 1px solid var(--border-color); font-size: 0.8rem; color: var(--text-muted);">
        {{ feries.length }} jour(s) férié(s)
      </div>
    </div>

    <!-- ── MODAL CRÉER / MODIFIER ─────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="showModal"
        style="position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 999; display: flex; align-items: center; justify-content: center; padding: 1rem;"
        @click.self="closeModal"
      >
        <div style="background: var(--bg-primary); border-radius: var(--radius-lg); width: 100%; max-width: 500px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); overflow: hidden;">

          <!-- Header modal -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color);">
            <h2 style="font-size: 1.05rem; font-weight: 700;">
              {{ editingId ? 'Modifier le jour férié' : 'Nouveau jour férié' }}
            </h2>
            <button @click="closeModal" style="background: none; border: none; cursor: pointer; color: var(--text-muted);">
              <X style="width: 20px; height: 20px;" />
            </button>
          </div>

          <!-- Corps modal -->
          <form @submit.prevent="submitForm" style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.1rem;">

            <!-- Nom -->
            <div>
              <label class="form-label">Nom du jour férié *</label>
              <input v-model="form.nom" type="text" class="form-input" placeholder="Ex: Fête de l'Indépendance" required />
            </div>

            <!-- Date -->
            <div>
              <label class="form-label">Date *</label>
              <input v-model="form.date" type="date" class="form-input" required />
            </div>

            <!-- Type récurrence -->
            <div>
              <label class="form-label">Type de récurrence</label>
              <div style="display: flex; gap: 0.75rem; margin-top: 0.25rem;">
                <label class="recurrence-option" :class="{ active: !form.recurrent }" @click="form.recurrent = false">
                  <span style="font-size: 1.1rem;">📅</span>
                  <div>
                    <div style="font-weight: 600; font-size: 0.85rem;">Ponctuel</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">Une seule fois</div>
                  </div>
                </label>
                <label class="recurrence-option" :class="{ active: form.recurrent }" @click="form.recurrent = true">
                  <span style="font-size: 1.1rem;">🔁</span>
                  <div>
                    <div style="font-weight: 600; font-size: 0.85rem;">Annuel</div>
                    <div style="font-size: 0.72rem; color: var(--text-muted);">Même jour chaque année</div>
                  </div>
                </label>
              </div>
            </div>

            <!-- Description -->
            <div>
              <label class="form-label">Description <span style="color: var(--text-muted);">(optionnel)</span></label>
              <textarea v-model="form.description" class="form-input" rows="2" style="resize: vertical;" placeholder="Notes ou précisions…"></textarea>
            </div>

            <!-- Erreur modal -->
            <div v-if="modalError" style="background: #fef2f2; border: 1px solid var(--danger); color: var(--danger); padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.875rem;">
              {{ modalError }}
            </div>

            <!-- Actions modal -->
            <div style="display: flex; justify-content: flex-end; gap: 0.75rem; padding-top: 0.25rem;">
              <button type="button" class="btn btn-outline" @click="closeModal" :disabled="saving">Annuler</button>
              <button type="submit" class="btn btn-primary" :disabled="saving">
                <Loader2 v-if="saving" style="width: 15px; height: 15px; animation: spin 1s linear infinite;" />
                <CheckCircle v-else style="width: 15px; height: 15px;" />
                {{ saving ? 'Enregistrement…' : (editingId ? 'Mettre à jour' : 'Créer') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>

    <!-- ── MODAL CONFIRMATION SUPPRESSION ──────────────────────── -->
    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        style="position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 1rem;"
        @click.self="showDeleteConfirm = false"
      >
        <div style="background: var(--bg-primary); border-radius: var(--radius-lg); width: 100%; max-width: 420px; box-shadow: 0 20px 60px rgba(0,0,0,0.25); overflow: hidden;">
          <div style="padding: 1.5rem; text-align: center;">
            <AlertTriangle style="width: 44px; height: 44px; color: var(--danger); margin-bottom: 1rem;" />
            <h3 style="font-size: 1rem; font-weight: 700; margin-bottom: 0.5rem;">Confirmer la suppression</h3>
            <p style="font-size: 0.875rem; color: var(--text-secondary);">
              Supprimer <strong>{{ deleteTarget?.nom }}</strong> ({{ formatDate(deleteTarget?.date) }}) ?
              Cette action est irréversible.
            </p>
          </div>
          <div style="display: flex; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); justify-content: flex-end;">
            <button class="btn btn-outline" @click="showDeleteConfirm = false" :disabled="deleting">Annuler</button>
            <button class="btn-danger" @click="executeDelete" :disabled="deleting">
              <Loader2 v-if="deleting" style="width: 14px; height: 14px; animation: spin 1s linear infinite;" />
              <Trash2 v-else style="width: 14px; height: 14px;" />
              {{ deleting ? 'Suppression…' : 'Supprimer' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { Plus, Search, Pencil, Trash2, Loader2, X, CheckCircle, AlertTriangle } from 'lucide-vue-next'
import {
  getFeries, createFerie, updateFerie, deleteFerie, deleteMultipleFeries,
  formatDate, monthName
} from '../../services/feriesServices.js'

// ─── État principal ─────────────────────────────────────────────
const feries  = ref([])
const loading = ref(false)
const error   = ref(null)
const selected = ref([])

// ─── Filtres ────────────────────────────────────────────────────
const filters = ref({ search: '', year: new Date().getFullYear(), recurrent: '' })

const yearOptions = computed(() => {
  const cur = new Date().getFullYear()
  return [cur - 1, cur, cur + 1, cur + 2]
})

// ─── Modal form ─────────────────────────────────────────────────
const showModal  = ref(false)
const editingId  = ref(null)
const saving     = ref(false)
const modalError = ref(null)
const form = ref(defaultForm())

function defaultForm() {
  return { nom: '', date: '', recurrent: true, description: '' }
}

// ─── Suppression ────────────────────────────────────────────────
const showDeleteConfirm = ref(false)
const deleteTarget      = ref(null)
const deleting          = ref(false)

// ─── Computed ───────────────────────────────────────────────────
const allSelected = computed(() =>
  feries.value.length > 0 && selected.value.length === feries.value.length
)

// ─── Helpers ────────────────────────────────────────────────────
function dayEmoji(dateStr) {
  if (!dateStr) return '📅'
  const m = parseInt(dateStr.split('-')[1], 10)
  const emojis = ['❄️','💝','🌸','🌷','💐','🌞','🎆','⛱️','🍂','🎃','🍁','🎄']
  return emojis[(m - 1)] ?? '📅'
}

// ─── Fetch ──────────────────────────────────────────────────────
async function fetchFeries() {
  loading.value = true
  error.value   = null
  selected.value = []
  try {
    const params = {}
    if (filters.value.year)      params.year      = filters.value.year
    if (filters.value.recurrent !== '') params.recurrent = filters.value.recurrent
    if (filters.value.search)    params.search    = filters.value.search
    feries.value = await getFeries(params)
  } catch (e) {
    error.value = e.message
    feries.value = []
  } finally {
    loading.value = false
  }
}

let debounceTimer = null
function debouncedFetch() {
  clearTimeout(debounceTimer)
  debounceTimer = setTimeout(fetchFeries, 350)
}

function resetFilters() {
  filters.value = { search: '', year: new Date().getFullYear(), recurrent: '' }
  fetchFeries()
}

// ─── Sélection ──────────────────────────────────────────────────
function toggleSelectAll(e) {
  selected.value = e.target.checked ? feries.value.map(f => f.id) : []
}

// ─── Modal ──────────────────────────────────────────────────────
function openModal(ferie = null) {
  modalError.value = null
  if (ferie) {
    editingId.value = ferie.id
    form.value = {
      nom:         ferie.nom,
      date:        ferie.date,
      recurrent:   !!ferie.recurrent,
      description: ferie.description || ''
    }
  } else {
    editingId.value = null
    form.value = defaultForm()
  }
  showModal.value = true
}

function closeModal() {
  showModal.value = false
  modalError.value = null
}

async function submitForm() {
  saving.value     = true
  modalError.value = null
  try {
    const payload = {
      nom:         form.value.nom.trim(),
      date:        form.value.date,
      recurrent:   form.value.recurrent,
      description: form.value.description.trim()
    }
    if (editingId.value) {
      await updateFerie(editingId.value, payload)
    } else {
      await createFerie(payload)
    }
    closeModal()
    await fetchFeries()
  } catch (e) {
    modalError.value = e.message
  } finally {
    saving.value = false
  }
}

// ─── Suppression ────────────────────────────────────────────────
function confirmDelete(ferie) {
  deleteTarget.value    = ferie
  showDeleteConfirm.value = true
}

async function executeDelete() {
  if (!deleteTarget.value) return
  deleting.value = true
  try {
    await deleteFerie(deleteTarget.value.id)
    showDeleteConfirm.value = false
    await fetchFeries()
  } catch (e) {
    error.value = e.message
  } finally {
    deleting.value = false
  }
}

async function bulkDelete() {
  if (!selected.value.length) return
  if (!confirm(`Supprimer ${selected.value.length} jour(s) férié(s) ?`)) return
  try {
    await deleteMultipleFeries(selected.value)
    selected.value = []
    await fetchFeries()
  } catch (e) {
    error.value = e.message
  }
}

onMounted(fetchFeries)
</script>

<style scoped>
@keyframes spin { to { transform: rotate(360deg); } }

.row-selected { background: rgba(99,102,241,0.05); }

.btn-danger-sm {
  background: rgba(239,68,68,0.1);
  color: var(--danger, #ef4444);
  border: 1px solid rgba(239,68,68,0.25);
  border-radius: var(--radius-md);
  cursor: pointer;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  transition: background 0.15s;
}
.btn-danger-sm:hover { background: rgba(239,68,68,0.2); }

.btn-danger {
  background: var(--danger, #ef4444);
  color: #fff;
  border: none;
  border-radius: var(--radius-md);
  cursor: pointer;
  padding: 0.5rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  transition: opacity 0.15s;
}
.btn-danger:hover:not(:disabled) { opacity: 0.88; }
.btn-danger:disabled { opacity: 0.45; cursor: not-allowed; }

.recurrence-option {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: all 0.15s;
  background: var(--bg-secondary);
}
.recurrence-option:hover  { border-color: var(--accent-primary, #6366f1); }
.recurrence-option.active {
  border-color: var(--accent-primary, #6366f1);
  background: rgba(99,102,241,0.07);
}
</style>