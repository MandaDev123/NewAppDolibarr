<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Générer des salaires</h1>
        <p class="page-subtitle">Créer les salaires de plusieurs employés en une seule opération</p>
      </div>
      <router-link to="/frontoffice/salary" class="btn btn-outline">
        <ArrowLeft style="width: 16px; height: 16px;" /> Liste des salaires
      </router-link>
    </div>

    <!-- RÉSULTAT -->
    <template v-if="result">
      <div class="card" style="max-width: 600px; margin: 0 auto; text-align: center;"
        :style="{ borderColor: result.errors.length === 0 ? 'rgba(16,185,129,.4)' : 'rgba(239,68,68,.3)' }">
        <CheckCircle2 v-if="result.errors.length === 0"
          style="width:48px;height:48px;color:var(--success,#10b981);margin-bottom:1rem;" />
        <AlertTriangle v-else
          style="width:48px;height:48px;color:var(--warning,#d97706);margin-bottom:1rem;" />
        <h2 style="margin-bottom:.75rem;">
          {{ result.errors.length === 0 ? 'Génération terminée !' : 'Génération avec erreurs' }}
        </h2>
        <div style="display:flex;justify-content:center;gap:2.5rem;margin:1.25rem 0;">
          <div style="text-align:center;">
            <div style="font-size:2.2rem;font-weight:700;color:var(--success,#10b981);">{{ result.created }}</div>
            <div style="color:var(--text-muted);font-size:.8rem;">salaire(s) créé(s)</div>
          </div>
          <div v-if="result.errors.length" style="text-align:center;">
            <div style="font-size:2.2rem;font-weight:700;color:var(--danger);">{{ result.errors.length }}</div>
            <div style="color:var(--text-muted);font-size:.8rem;">erreur(s)</div>
          </div>
        </div>
        <div v-if="result.errors.length"
          style="background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.25);border-radius:var(--radius-md);padding:.875rem;text-align:left;margin-bottom:1rem;font-size:.8rem;max-height:150px;overflow-y:auto;">
          <div v-for="e in result.errors" :key="e.userId" style="margin-bottom:.25rem;">
            <strong>Employé #{{ e.userId }}</strong> — {{ e.error }}
          </div>
        </div>
        <div style="display:flex;gap:.75rem;justify-content:center;">
          <button class="btn btn-outline" @click="resetAll">
            <RefreshCw style="width:15px;height:15px;" /> Nouvelle génération
          </button>
          <router-link to="/frontoffice/salary" class="btn btn-primary">Voir les salaires</router-link>
        </div>
      </div>
    </template>

    <!-- GÉNÉRATION EN COURS -->
    <template v-else-if="generating">
      <div class="card" style="max-width:520px;margin:0 auto;text-align:center;">
        <Loader2 style="width:40px;height:40px;color:var(--accent-primary,#6366f1);margin-bottom:1rem;animation:spin 1s linear infinite;" />
        <h2 style="margin-bottom:.5rem;">Génération en cours…</h2>
        <p style="color:var(--text-muted);font-size:.875rem;margin-bottom:1.5rem;">Ne fermez pas cette page.</p>
        <div style="background:var(--bg-secondary);border-radius:999px;height:10px;overflow:hidden;margin-bottom:.75rem;">
          <div style="height:100%;background:var(--accent-primary,#6366f1);border-radius:999px;transition:width .25s;"
            :style="{ width: progressPercent + '%' }"></div>
        </div>
        <p style="font-size:.8rem;color:var(--text-muted);">{{ progressStep }} / {{ selectedUsers.length }}</p>
        <div style="margin-top:1rem;max-height:180px;overflow-y:auto;text-align:left;font-size:.78rem;background:var(--bg-secondary);border-radius:var(--radius-md);padding:.75rem;">
          <div v-for="(log, i) in progressLog" :key="i"
            :style="{ color: log.status === 'ok' ? 'var(--success,#10b981)' : 'var(--danger)' }">
            {{ log.status === 'ok' ? '✅' : '❌' }} {{ log.name }}
            <span v-if="log.status === 'ok' && log.autoPaid" style="color:var(--text-muted);"> — réglé automatiquement</span>
            <span v-if="log.status === 'error'" style="color:var(--text-muted);"> — {{ log.error }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- FORMULAIRE -->
    <template v-else>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:1.5rem;align-items:start;">

        <!-- GAUCHE -->
        <div style="display:flex;flex-direction:column;gap:1.25rem;">

          <!-- Filtres -->
          <div class="card">
            <h3 class="section-title"><Filter style="width:16px;height:16px;" /> Filtrer les employés</h3>
            <div style="display:flex;flex-direction:column;gap:1rem;">

              <div>
                <label class="form-label">Genre</label>
                <div style="display:flex;gap:.75rem;flex-wrap:wrap;">
                  <button v-for="g in genderOptions" :key="g.value" type="button"
                    class="filter-chip" :class="{ active: filters.gender === g.value }"
                    @click="filters.gender = filters.gender === g.value ? '' : g.value; applyFilters()">
                    {{ g.icon }} {{ g.label }}
                  </button>
                </div>
              </div>

              <div>
                <label class="form-label">Poste / Fonction</label>
                <div class="multiselect" ref="posteDropdownRef">
                  <button type="button" class="form-input multiselect-trigger" @click="posteDropdownOpen = !posteDropdownOpen">
                    <span style="display:flex;align-items:center;gap:.4rem;overflow:hidden;flex:1;min-width:0;">
                      <Briefcase style="width:15px;height:15px;color:var(--text-muted);flex-shrink:0;" />
                      <span v-if="filters.jobs.length === 0" style="color:var(--text-muted);">Tous les postes</span>
                      <span v-else style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                        {{ filters.jobs.length === 1 ? filters.jobs[0] : filters.jobs.length + ' postes sélectionnés' }}
                      </span>
                    </span>
                    <ChevronDown style="width:15px;height:15px;color:var(--text-muted);flex-shrink:0;transition:transform .15s;"
                      :style="{ transform: posteDropdownOpen ? 'rotate(180deg)' : 'none' }" />
                  </button>

                  <div v-if="posteDropdownOpen" class="multiselect-panel">
                    <div v-if="postes.length === 0" style="padding:.75rem;font-size:.8rem;color:var(--text-muted);text-align:center;">
                      Aucun poste disponible
                    </div>
                    <label v-for="p in postes" :key="p" class="multiselect-option">
                      <input type="checkbox" :value="p" v-model="filters.jobs" @change="applyFilters" />
                      <span>{{ p }}</span>
                    </label>
                    <div v-if="postes.length" class="multiselect-footer">
                      <button type="button" class="link-btn" @click="filters.jobs = []; applyFilters()">
                        Tout désélectionner
                      </button>
                    </div>
                  </div>
                </div>

                <div v-if="filters.jobs.length" style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.6rem;">
                  <span v-for="p in filters.jobs" :key="p" class="poste-chip">
                    {{ p }}
                    <button type="button" @click="removePoste(p)">×</button>
                  </span>
                </div>
              </div>

              <div>
                <label class="form-label">Heures / semaine</label>
                <div style="display:flex;gap:.75rem;align-items:center;">
                  <input v-model.number="filters.hoursMin" type="number" class="form-input"
                    placeholder="Min" min="0" @input="applyFilters" style="flex:1;" />
                  <span style="color:var(--text-muted);">à</span>
                  <input v-model.number="filters.hoursMax" type="number" class="form-input"
                    placeholder="Max" min="0" @input="applyFilters" style="flex:1;" />
                  <span style="font-size:.8rem;color:var(--text-muted);">h/sem</span>
                </div>
              </div>

              <button class="btn btn-outline" style="align-self:flex-start;font-size:.8rem;padding:.3rem .8rem;" @click="resetFilters">
                Réinitialiser
              </button>
            </div>
          </div>

          <!-- Paramètres salaire -->
          <div class="card">
            <h3 class="section-title"><Banknote style="width:16px;height:16px;" /> Paramètres du salaire</h3>
            <div style="display:flex;flex-direction:column;gap:1rem;">
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:1rem;">
                <div>
                  <label class="form-label">Date de début *</label>
                  <input v-model="salaryParams.datesp" type="date" class="form-input" />
                </div>
                <div>
                  <label class="form-label">Date de fin *</label>
                  <input v-model="salaryParams.dateep" type="date" class="form-input" />
                </div>
              </div>
              <div>
                <label class="form-label">Libellé</label>
                <input v-model="salaryParams.label" type="text" class="form-input" placeholder="Salaire" />
              </div>
              <div>
                <label class="form-label">Montant *</label>
                <div style="position:relative;">
                  <input v-model.number="salaryParams.amount" type="number" class="form-input"
                    min="0" step="0.01" placeholder="0.00" style="padding-right:3.5rem;" />
                  <span style="position:absolute;right:.875rem;top:50%;transform:translateY(-50%);font-size:.8rem;color:var(--text-muted);font-weight:600;">MGA</span>
                </div>
              </div>
              <div>
                <label class="form-label">Marquer comme payé</label>
                <select v-model="salaryParams.paye" class="form-input">
                  <option value="0">Non</option>
                  <option value="1">Oui — entièrement réglé</option>
                </select>
              </div>
              <div>
                <label class="form-label">Mode de règlement</label>
                <select v-model="salaryParams.type_payment" class="form-input">
                  <option value="">— Non défini —</option>
                  <option v-for="pt in paymentTypes" :key="pt.id" :value="String(pt.id)">{{ pt.label }}</option>
                </select>
              </div>
              <div>
                <label class="form-label">Note privée</label>
                <input v-model="salaryParams.note_private" type="text" class="form-input" placeholder="Commentaire interne…" />
              </div>

              <!-- Règlement automatique : visible seulement si "payé = Oui" -->
              <div v-if="salaryParams.paye === '1'" style="padding: 0.875rem; background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.25); border-radius: var(--radius-md);">
                <p style="font-size: 0.78rem; color: var(--text-secondary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
                  <Zap style="width: 14px; height: 14px; color: var(--success, #10b981); flex-shrink: 0;" />
                  Tous les salaires générés seront marqués payés. Choisissez un <strong>mode de règlement</strong> et une <strong>date de paiement</strong> pour que le règlement soit enregistré automatiquement pour chaque employé — sans saisie manuelle après coup.
                </p>
                <label class="form-label">Date de paiement {{ salaryParams.type_payment ? '*' : '' }}</label>
                <input type="date" v-model="salaryParams.datepaye" class="form-input" />
                <p v-if="autoPayMissingDate" style="color: var(--danger); font-size: 0.75rem; margin-top: 0.35rem;">
                  Veuillez indiquer la date de paiement pour activer le règlement automatique.
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- DROITE : preview + bouton -->
        <div style="position:sticky;top:90px;display:flex;flex-direction:column;gap:1.25rem;">

          <!-- Récap -->
          <div class="card" style="background:linear-gradient(160deg,rgba(99,102,241,.07) 0%,var(--bg-secondary) 100%);border-color:rgba(99,102,241,.2);">
            <h3 style="font-size:.875rem;font-weight:600;margin-bottom:1rem;color:var(--accent-primary,#6366f1);display:flex;align-items:center;gap:.5rem;">
              <ClipboardList style="width:16px;height:16px;" /> Récapitulatif
            </h3>
            <div style="font-size:.82rem;display:flex;flex-direction:column;gap:.6rem;">
              <div style="display:flex;justify-content:space-between;">
                <span style="color:var(--text-secondary);">Employés sélectionnés</span>
                <strong style="color:var(--accent-primary,#6366f1);font-size:1.1rem;">{{ selectedUsers.length }}</strong>
              </div>
              <div style="display:flex;justify-content:space-between;">
                <span style="color:var(--text-secondary);">Période</span>
                <span>{{ salaryParams.datesp ? fmtDate(salaryParams.datesp) : '—' }} → {{ salaryParams.dateep ? fmtDate(salaryParams.dateep) : '—' }}</span>
              </div>
              <div style="display:flex;justify-content:space-between;border-top:1px dashed var(--border-color);padding-top:.6rem;">
                <span style="color:var(--text-secondary);">Montant / employé</span>
                <strong>{{ salaryParams.amount ? fmtAmt(salaryParams.amount) : '—' }}</strong>
              </div>
              <div v-if="selectedUsers.length && salaryParams.amount" style="display:flex;justify-content:space-between;">
                <span style="color:var(--text-secondary);">Total masse salariale</span>
                <strong style="color:var(--success,#10b981);">{{ fmtAmt(selectedUsers.length * salaryParams.amount) }}</strong>
              </div>
              <div v-if="autoPayEnabled" style="display:flex;justify-content:space-between;border-top:1px dashed var(--border-color);padding-top:.6rem;">
                <span style="color:var(--text-secondary);">Règlement</span>
                <span style="color:var(--success,#10b981);font-weight:600;display:flex;align-items:center;gap:.3rem;">
                  <Zap style="width:13px;height:13px;" /> Automatique — {{ salaryParams.datepaye ? fmtDate(salaryParams.datepaye) : 'date manquante' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Liste preview -->
          <div class="card" style="padding:0;overflow:hidden;">
            <div style="padding:.875rem 1.25rem;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;">
              <h3 style="font-size:.875rem;font-weight:600;">Employés concernés</h3>
              <span style="font-size:.75rem;color:var(--text-muted);">
                {{ loadingUsers ? 'Chargement…' : selectedUsers.length + ' / ' + allUsers.length }}
              </span>
            </div>
            <div style="max-height:340px;overflow-y:auto;">
              <div v-if="loadingUsers" style="padding:2rem;text-align:center;color:var(--text-muted);">
                <Loader2 style="width:18px;height:18px;animation:spin 1s linear infinite;" />
              </div>
              <div v-else-if="selectedUsers.length === 0"
                style="padding:2rem;text-align:center;color:var(--text-muted);font-size:.875rem;">
                Aucun employé ne correspond aux filtres.
              </div>
              <div v-for="u in selectedUsers" :key="u.id"
                style="display:flex;align-items:center;gap:.75rem;padding:.6rem 1.25rem;border-bottom:1px solid var(--border-color);">
                <div class="av" :style="{ background: avatarColor(u) }">{{ initials(u) }}</div>
                <div style="flex:1;min-width:0;">
                  <div style="font-weight:500;font-size:.875rem;">{{ u.lastname }} {{ u.firstname }}</div>
                  <div style="font-size:.72rem;color:var(--text-muted);">
                    {{ u.job || 'Poste N/A' }} · {{ u.weeklyhours || 35 }}h/sem
                  </div>
                </div>
                <span :style="{ fontSize: '.7rem', color: u.gender === 'man' ? '#6366f1' : '#ec4899' }">
                  {{ u.gender === 'man' ? '♂' : '♀' }}
                </span>
              </div>
            </div>
          </div>

          <!-- Bouton générer -->
          <button class="btn btn-primary"
            style="width:100%;padding:.9rem;font-size:1rem;font-weight:600;justify-content:center;"
            :disabled="!canGenerate" @click="startGeneration">
            <Zap style="width:18px;height:18px;" />
            Générer {{ selectedUsers.length }} salaire(s)
          </button>
          <p v-if="generateError" style="color:var(--danger);font-size:.8rem;text-align:center;margin-top:-.75rem;">
            {{ generateError }}
          </p>
        </div>

      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ArrowLeft, Filter, Briefcase, Banknote, ClipboardList, Loader2,
         CheckCircle2, AlertTriangle, Zap, RefreshCw, ChevronDown } from 'lucide-vue-next'
import {
  getUsersExtended, filterUsers, extractPostes,
  generateSalariesBatch, getPaymentTypes
} from '../../services/salaryServices.js'

const allUsers      = ref([])
const selectedUsers = ref([])
const postes        = ref([])
const paymentTypes  = ref([])
const loadingUsers  = ref(false)
const generating    = ref(false)
const generateError = ref(null)
const result        = ref(null)
const progressStep  = ref(0)
const progressLog   = ref([])

const filters = ref({ gender: '', jobs: [], hoursMin: '', hoursMax: '' })
const posteDropdownOpen = ref(false)
const posteDropdownRef  = ref(null)
const salaryParams = ref({ label: 'Salaire', datesp: '', dateep: '', amount: null, type_payment: '', note_private: '', paye: '0', datepaye: '' })

const genderOptions = [
  { value: 'man',   label: 'Homme', icon: '♂' },
  { value: 'woman', label: 'Femme', icon: '♀' },
]

const progressPercent = computed(() =>
  selectedUsers.value.length ? Math.round((progressStep.value / selectedUsers.value.length) * 100) : 0
)
// Règle métier : payé = Oui + mode de règlement choisi → règlement automatique
// pour chaque salaire généré (nécessite une date de paiement).
const autoPayEnabled = computed(() =>
  salaryParams.value.paye === '1' && !!salaryParams.value.type_payment
)
const autoPayMissingDate = computed(() => autoPayEnabled.value && !salaryParams.value.datepaye)

const canGenerate = computed(() =>
  selectedUsers.value.length > 0 && salaryParams.value.datesp && salaryParams.value.dateep &&
  salaryParams.value.amount > 0 && !autoPayMissingDate.value
)

function fmtDate(d) { if (!d) return '—'; const [y,m,dd] = d.split('-'); return `${dd}/${m}/${y}` }
function fmtAmt(v)  { return Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' MGA' }
function initials(u){ return (u.lastname?.[0] ?? '') + (u.firstname?.[0] ?? '') || '?' }
const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6']
function avatarColor(u) { return COLORS[(parseInt(u.id,10)||0) % COLORS.length] }
function toTimestamp(d) { return d ? Math.floor(new Date(d).getTime() / 1000) : null }

function applyFilters() {
  selectedUsers.value = filterUsers(allUsers.value, {
    gender:   filters.value.gender || undefined,
    jobs:     filters.value.jobs,
    hoursMin: filters.value.hoursMin !== '' ? filters.value.hoursMin : undefined,
    hoursMax: filters.value.hoursMax !== '' ? filters.value.hoursMax : undefined,
  })
}

function removePoste(p) {
  filters.value.jobs = filters.value.jobs.filter(j => j !== p)
  applyFilters()
}

function resetFilters() {
  filters.value = { gender: '', jobs: [], hoursMin: '', hoursMax: '' }
  applyFilters()
}

function handleClickOutside(e) {
  if (posteDropdownOpen.value && posteDropdownRef.value && !posteDropdownRef.value.contains(e.target)) {
    posteDropdownOpen.value = false
  }
}

async function fetchUsers() {
  loadingUsers.value = true
  try {
    allUsers.value = await getUsersExtended()
    postes.value   = extractPostes(allUsers.value)
    applyFilters()
    const pt = await getPaymentTypes()
    paymentTypes.value = Array.isArray(pt) ? pt : []
  } catch (e) {
    generateError.value = e.message
  } finally {
    loadingUsers.value = false
  }
}

async function startGeneration() {
  if (!canGenerate.value) return
  generateError.value = null
  const userIds = selectedUsers.value.map(u => u.id)
  const userMap = Object.fromEntries(selectedUsers.value.map(u => [u.id, u]))
  const payload = {
    label:  salaryParams.value.label || 'Salaire',
    amount: salaryParams.value.amount,
    datesp: toTimestamp(salaryParams.value.datesp),
    dateep: toTimestamp(salaryParams.value.dateep),
    paye:   salaryParams.value.paye,
  }
  if (salaryParams.value.type_payment) payload.type_payment = salaryParams.value.type_payment
  if (salaryParams.value.note_private) payload.note_private = salaryParams.value.note_private
  // Règlement automatique : transmis uniquement pour être utilisé par
  // generateSalariesBatch (jamais envoyé à l'endpoint de création du salaire).
  if (autoPayEnabled.value && salaryParams.value.datepaye) {
    payload.datepaye = toTimestamp(salaryParams.value.datepaye)
  }

  generating.value   = true
  progressStep.value = 0
  progressLog.value  = []

  result.value = await generateSalariesBatch(userIds, payload, p => {
    progressStep.value = p.done
    const u = userMap[p.userId]
    progressLog.value.push({
      status: p.status,
      name: u ? `${u.lastname} ${u.firstname}` : `#${p.userId}`,
      error: p.error,
      autoPaid: p.autoPaid,
    })
  })
  generating.value = false
}

function resetAll() {
  result.value = null
  progressLog.value = []
  progressStep.value = 0
  applyFilters()
}

onMounted(() => {
  fetchUsers()
  document.addEventListener('click', handleClickOutside)
})
onBeforeUnmount(() => {
  document.removeEventListener('click', handleClickOutside)
})
</script>

<style scoped>
@keyframes spin { to { transform: rotate(360deg); } }
.section-title { font-size:.95rem;font-weight:600;margin-bottom:1rem;padding-bottom:.5rem;border-bottom:1px solid var(--border-color);display:flex;align-items:center;gap:.5rem; }
.filter-chip { display:inline-flex;align-items:center;gap:.4rem;padding:.35rem .875rem;border:1.5px solid var(--border-color);border-radius:999px;background:var(--bg-secondary);font-size:.82rem;cursor:pointer;transition:all .15s; }
.filter-chip:hover { border-color:var(--accent-primary,#6366f1); }
.filter-chip.active { border-color:var(--accent-primary,#6366f1);background:rgba(99,102,241,.1);color:var(--accent-primary,#6366f1);font-weight:600; }
.av { width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.78rem;flex-shrink:0; }

.multiselect { position:relative; }
.multiselect-trigger {
  width:100%;display:flex;align-items:center;justify-content:space-between;gap:.5rem;
  cursor:pointer;text-align:left;background:var(--bg-secondary);
}
.multiselect-panel {
  position:absolute;top:calc(100% + 6px);left:0;right:0;z-index:20;
  background:var(--bg-primary,#fff);border:1px solid var(--border-color);border-radius:var(--radius-md);
  box-shadow:0 8px 24px rgba(0,0,0,.12);max-height:230px;overflow-y:auto;padding:.35rem;
}
.multiselect-option {
  display:flex;align-items:center;gap:.6rem;padding:.45rem .6rem;border-radius:var(--radius-sm,6px);
  font-size:.85rem;cursor:pointer;
}
.multiselect-option:hover { background:var(--bg-secondary); }
.multiselect-option input[type="checkbox"] { width:15px;height:15px;flex-shrink:0;cursor:pointer;accent-color:var(--accent-primary,#6366f1); }
.multiselect-footer { border-top:1px solid var(--border-color);margin-top:.25rem;padding:.4rem .6rem 0; }
.link-btn {
  background:none;border:none;color:var(--accent-primary,#6366f1);font-size:.78rem;font-weight:600;
  cursor:pointer;padding:0;
}
.poste-chip {
  display:inline-flex;align-items:center;gap:.35rem;padding:.25rem .55rem;border-radius:999px;
  background:rgba(99,102,241,.1);color:var(--accent-primary,#6366f1);font-size:.75rem;font-weight:600;
}
.poste-chip button {
  background:none;border:none;color:inherit;cursor:pointer;font-size:.9rem;line-height:1;padding:0;
  display:flex;align-items:center;
}
</style>