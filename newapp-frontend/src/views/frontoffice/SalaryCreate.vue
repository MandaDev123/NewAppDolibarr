<template>
  <div>
    <!-- En-tête -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Nouveau Salaire</h1>
        <p class="page-subtitle">Créer un salaire et définir les modalités de paiement</p>
      </div>
      <router-link to="/frontoffice/salary" class="btn btn-outline">
        <ArrowLeft style="width: 16px; height: 16px;" />
        Retour à la liste
      </router-link>
    </div>

    <!-- Erreur -->
    <div v-if="error" style="background: #fef2f2; border: 1px solid var(--danger); color: var(--danger); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
      {{ error }}
    </div>

    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; align-items: start;">

      <!-- ── FORMULAIRE PRINCIPAL ─────────────────────────────── -->
      <div class="card">
        <form @submit.prevent="submitSalary" style="display: flex; flex-direction: column; gap: 1.75rem;">

          <!-- ── SECTION : Employé ─────────────────────────────── -->
          <section>
            <h3 class="section-title">Employé</h3>

            <!-- Skeleton chargement -->
            <div v-if="loadingMeta" style="display: flex; flex-direction: column; gap: 0.5rem;">
              <div class="skeleton" style="height: 42px; border-radius: var(--radius-md);"></div>
            </div>

            <div v-else>
              <!-- Searchable dropdown employé -->
              <div style="position: relative;" v-click-outside="closeDropdown">
                <label class="form-label">Employé *</label>

                <!-- Champ de recherche / sélection -->
                <div
                  class="employee-input"
                  :class="{ active: dropdownOpen, 'has-value': !!selectedUser }"
                  @click="openDropdown"
                >
                  <!-- Employé sélectionné -->
                  <template v-if="selectedUser && !dropdownOpen">
                    <div class="employee-avatar" :style="{ background: avatarColor(selectedUser) }">
                      {{ initials(selectedUser) }}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-weight: 600; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                        {{ selectedUser.lastname }} {{ selectedUser.firstname }}
                      </div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">
                        @{{ selectedUser.login }} · {{ selectedUser.gender === 'man' ? 'Homme' : selectedUser.gender === 'woman' ? 'Femme' : 'N/A' }}
                      </div>
                    </div>
                    <X style="width: 16px; height: 16px; color: var(--text-muted); flex-shrink: 0; cursor: pointer;" @click.stop="clearUser" />
                  </template>

                  <!-- Champ recherche quand ouvert ou vide -->
                  <template v-else>
                    <Search style="width: 16px; height: 16px; color: var(--text-muted); flex-shrink: 0;" />
                    <input
                      ref="searchInput"
                      v-model="userSearch"
                      type="text"
                      placeholder="Rechercher un employé…"
                      style="border: none; outline: none; background: transparent; flex: 1; font-size: 0.9rem; color: var(--text-primary);"
                      @input="dropdownOpen = true"
                      @focus="dropdownOpen = true"
                    />
                  </template>
                </div>

                <!-- Liste déroulante -->
                <div v-if="dropdownOpen" class="employee-dropdown">
                  <div v-if="filteredUsers.length === 0" style="padding: 1rem; text-align: center; color: var(--text-muted); font-size: 0.875rem;">
                    Aucun employé trouvé
                  </div>
                  <div
                    v-for="u in filteredUsers"
                    :key="u.id"
                    class="employee-option"
                    :class="{ selected: String(u.id) === form.fk_user }"
                    @click="selectUser(u)"
                  >
                    <div class="employee-avatar sm" :style="{ background: avatarColor(u) }">
                      {{ initials(u) }}
                    </div>
                    <div style="flex: 1; min-width: 0;">
                      <div style="font-weight: 500; font-size: 0.875rem;">
                        {{ u.lastname }} {{ u.firstname }}
                      </div>
                      <div style="font-size: 0.75rem; color: var(--text-muted);">
                        @{{ u.login }}
                        <span :style="{ color: u.gender === 'man' ? '#6366f1' : '#ec4899' }">
                          · {{ u.gender === 'man' ? '♂ Homme' : u.gender === 'woman' ? '♀ Femme' : '— N/A' }}
                        </span>
                      </div>
                    </div>
                    <CheckCircle v-if="String(u.id) === form.fk_user" style="width: 16px; height: 16px; color: var(--success, #10b981); flex-shrink: 0;" />
                  </div>
                </div>
              </div>

              <p v-if="!form.fk_user && formSubmitted" style="color: var(--danger); font-size: 0.78rem; margin-top: 0.4rem;">
                Veuillez sélectionner un employé.
              </p>
            </div>
          </section>

          <!-- ── SECTION : Identification ──────────────────────── -->
          <section>
            <h3 class="section-title">Identification</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label class="form-label">Libellé *</label>
                <input type="text" v-model="form.label" class="form-input" placeholder="Ex: Salaire" required />
              </div>
              <div>
                <label class="form-label">Note privée</label>
                <input type="text" v-model="form.note_private" class="form-input" placeholder="Commentaire interne…" />
              </div>
            </div>
          </section>

          <!-- ── SECTION : Période ─────────────────────────────── -->
          <section>
            <h3 class="section-title">Période</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label class="form-label">Date de début *</label>
                <input type="date" v-model="form.datesp" class="form-input" required />
              </div>
              <div>
                <label class="form-label">Date de fin *</label>
                <input type="date" v-model="form.dateep" class="form-input" required />
              </div>
            </div>
          </section>

          <!-- ── SECTION : Montant ─────────────────────────────── -->
          <section>
            <h3 class="section-title">Montant</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label class="form-label">Montant total *</label>
                <div style="position: relative;">
                  <input
                    type="number"
                    v-model.number="form.amount"
                    class="form-input"
                    min="0" step="0.01" required
                    placeholder="0.00"
                    style="padding-right: 3.5rem;"
                  />
                  <span style="position: absolute; right: 0.875rem; top: 50%; transform: translateY(-50%); font-size: 0.8rem; color: var(--text-muted); font-weight: 600;">MGA</span>
                </div>
              </div>
              <div>
                <label class="form-label">Marquer comme payé</label>
                <select v-model="form.paye" class="form-input">
                  <option value="0">Non</option>
                  <option value="1">Oui — entièrement réglé</option>
                </select>
              </div>
            </div>

            <!-- Règlement automatique : visible seulement si "payé = Oui" -->
            <div v-if="form.paye === '1'" style="margin-top: 1rem; padding: 0.875rem; background: rgba(16,185,129,0.06); border: 1px solid rgba(16,185,129,0.25); border-radius: var(--radius-md);">
              <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.4rem;">
                <CheckCircle style="width: 14px; height: 14px; color: var(--success, #10b981); flex-shrink: 0;" />
                Ce salaire sera marqué payé. Choisissez un <strong>mode de règlement</strong> ci-dessous et la <strong>date de paiement</strong> pour générer automatiquement le règlement — aucune saisie supplémentaire ne sera nécessaire.
              </p>
              <div style="max-width: 260px;">
                <label class="form-label">Date de paiement {{ form.type_payment ? '*' : '' }}</label>
                <input type="date" v-model="form.datepaye" class="form-input" :required="form.paye === '1' && !!form.type_payment" />
                <p v-if="autoPayMissingDate" style="color: var(--danger); font-size: 0.75rem; margin-top: 0.35rem;">
                  Veuillez indiquer la date de paiement pour finaliser le règlement automatique.
                </p>
              </div>
            </div>
          </section>

          <!-- ── SECTION : Mode de règlement ──────────────────── -->
          <section>
            <h3 class="section-title">Mode de règlement</h3>

            <div v-if="loadingMeta" style="display: flex; gap: 0.75rem;">
              <div v-for="i in 4" :key="i" class="skeleton" style="height: 80px; flex: 1; border-radius: var(--radius-md);"></div>
            </div>

            <div v-else style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.75rem;">
              <!-- Option "Aucun" -->
              <div
                class="payment-card"
                :class="{ selected: form.type_payment === '' }"
                @click="form.type_payment = ''"
              >
                <span style="font-size: 1.5rem;">—</span>
                <span class="payment-card-label">Non défini</span>
              </div>

              <!-- Types depuis l'API -->
              <div
                v-for="pt in paymentTypes"
                :key="pt.id"
                class="payment-card"
                :class="{ selected: form.type_payment === String(pt.id) }"
                @click="form.type_payment = String(pt.id)"
              >
                <span style="font-size: 1.5rem;">{{ paymentIcon(pt.code) }}</span>
                <span class="payment-card-label">{{ pt.label }}</span>
              </div>
            </div>

            <!-- Badge confirmation -->
            <div v-if="selectedPaymentType" style="margin-top: 0.75rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.8rem; color: var(--text-secondary);">
              <CheckCircle style="width: 14px; height: 14px; color: var(--success, #10b981);" />
              Mode sélectionné :
              <span class="badge badge-success">{{ paymentIcon(selectedPaymentType.code) }} {{ selectedPaymentType.label }}</span>
            </div>

            <!-- Rappel règle règlement auto -->
            <div v-if="autoPayEnabled" style="margin-top: 0.75rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.78rem; color: var(--success, #10b981);">
              <Zap style="width: 14px; height: 14px; flex-shrink: 0;" />
              Règlement automatique activé — le paiement sera enregistré à la création.
            </div>
          </section>

          <!-- ── ACTIONS ────────────────────────────────────────── -->
          <div style="display: flex; justify-content: flex-end; gap: 1rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color);">
            <router-link to="/frontoffice/salary" class="btn btn-outline">Annuler</router-link>
            <button type="submit" class="btn btn-primary" :disabled="saving || (autoPayEnabled && !form.datepaye && formSubmitted)">
              <Loader2 v-if="saving" style="width: 16px; height: 16px; animation: spin 1s linear infinite;" />
              <CheckCircle v-else style="width: 16px; height: 16px;" />
              {{ saving ? 'Enregistrement…' : (autoPayEnabled ? 'Créer le salaire et régler' : 'Créer le salaire') }}
            </button>
          </div>

        </form>
      </div>

      <!-- ── SIDEBAR RÉCAPITULATIF ──────────────────────────────── -->
      <div style="position: sticky; top: 100px; display: flex; flex-direction: column; gap: 1rem;">

        <!-- Carte employé -->
        <div class="card" style="background: linear-gradient(160deg, var(--accent-light, #eff6ff) 0%, var(--bg-secondary) 100%);">
          <h3 style="font-size: 0.875rem; font-weight: 600; margin-bottom: 1rem; color: var(--accent-primary, #6366f1); display: flex; align-items: center; gap: 0.5rem;">
            <Receipt style="width: 16px; height: 16px;" /> Récapitulatif
          </h3>

          <!-- Bloc employé sélectionné -->
          <div v-if="selectedUser" style="display: flex; align-items: center; gap: 0.875rem; padding: 0.875rem; background: var(--bg-primary); border-radius: var(--radius-md); margin-bottom: 1rem; border: 1px solid var(--border-color);">
            <div class="employee-avatar lg" :style="{ background: avatarColor(selectedUser) }">
              {{ initials(selectedUser) }}
            </div>
            <div>
              <div style="font-weight: 600; font-size: 0.9rem;">{{ selectedUser.lastname }} {{ selectedUser.firstname }}</div>
              <div style="font-size: 0.75rem; color: var(--text-muted);">@{{ selectedUser.login }}</div>
              <div style="font-size: 0.75rem; margin-top: 0.2rem;">
                <span :style="{ color: selectedUser.gender === 'man' ? '#6366f1' : '#ec4899', fontWeight: 500 }">
                  {{ selectedUser.gender === 'man' ? '♂ Homme' : selectedUser.gender === 'woman' ? '♀ Femme' : '—' }}
                </span>
              </div>
            </div>
          </div>
          <div v-else style="padding: 0.875rem; background: var(--bg-secondary); border-radius: var(--radius-md); margin-bottom: 1rem; text-align: center; color: var(--text-muted); font-size: 0.8rem; border: 1px dashed var(--border-color);">
            Aucun employé sélectionné
          </div>

          <!-- Détails -->
          <div style="display: flex; flex-direction: column; gap: 0.6rem; font-size: 0.82rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-secondary);">Libellé</span>
              <span style="font-weight: 500;">{{ form.label || '—' }}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-secondary);">Début</span>
              <span style="font-weight: 500;">{{ form.datesp ? formatDateInput(form.datesp) : '—' }}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-secondary);">Fin</span>
              <span style="font-weight: 500;">{{ form.dateep ? formatDateInput(form.dateep) : '—' }}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-secondary);">Règlement</span>
              <span v-if="selectedPaymentType" class="badge badge-info" style="font-size: 0.7rem;">
                {{ paymentIcon(selectedPaymentType.code) }} {{ selectedPaymentType.label }}
              </span>
              <span v-else style="color: var(--text-muted);">—</span>
            </div>
            <div v-if="autoPayEnabled" style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-secondary);">Date de paiement</span>
              <span style="font-weight: 500;">{{ form.datepaye ? formatDateInput(form.datepaye) : '—' }}</span>
            </div>
            <div style="border-top: 1px dashed var(--border-color); padding-top: 0.6rem; display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-secondary); font-weight: 600;">Montant</span>
              <span style="font-size: 1.2rem; font-weight: 700;">{{ form.amount ? formatAmount(form.amount) : '—' }}</span>
            </div>
          </div>
        </div>

        <!-- Info règlement -->
        <div v-if="autoPayEnabled" class="card" style="font-size: 0.78rem; color: var(--text-secondary); line-height: 1.7; border-color: rgba(16,185,129,0.3);">
          <strong style="color: var(--success, #10b981); display: block; margin-bottom: 0.4rem;">✅ Règlement automatique</strong>
          Le salaire est marqué payé avec un mode de règlement défini : le paiement complet sera enregistré automatiquement à la date choisie, dès la création. Aucune saisie manuelle supplémentaire ne sera nécessaire.
        </div>
        <div v-else class="card" style="font-size: 0.78rem; color: var(--text-muted); line-height: 1.7;">
          <strong style="color: var(--text-primary); display: block; margin-bottom: 0.4rem;">ℹ️ Paiement fractionné</strong>
          Après création, ouvrez la fiche du salaire pour saisir les règlements en plusieurs fois via le bouton <em>Saisir règlement</em>.
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CheckCircle, Loader2, Receipt, Search, X, Zap } from 'lucide-vue-next'
import { createSalary, createSalaryPayment, getUsers, getPaymentTypes, formatAmount } from '../../services/salaryServices.js'

const route = useRoute()
const router = useRouter()

// ─── État ──────────────────────────────────────────
const users        = ref([])
const paymentTypes = ref([])
const loadingMeta  = ref(false)
const saving       = ref(false)
const error        = ref(null)
const formSubmitted = ref(false)

// Dropdown employé
const dropdownOpen = ref(false)
const userSearch   = ref('')
const searchInput  = ref(null)

const form = ref({
  fk_user:      '',
  label:        'Salaire',
  datesp:       '',
  dateep:       '',
  amount:       null,
  type_payment: '',
  paye:         '0',
  datepaye:     '',
  note_private: '',
})

// ─── Directive v-click-outside ─────────────────────
const vClickOutside = {
  mounted(el, binding) {
    el._clickOutside = (e) => {
      if (!el.contains(e.target)) binding.value()
    }
    document.addEventListener('mousedown', el._clickOutside)
  },
  unmounted(el) {
    document.removeEventListener('mousedown', el._clickOutside)
  }
}

// ─── Computed ──────────────────────────────────────
const selectedUser = computed(() =>
  users.value.find(u => String(u.id) === form.value.fk_user) ?? null
)

const selectedPaymentType = computed(() =>
  paymentTypes.value.find(pt => String(pt.id) === form.value.type_payment) ?? null
)

// Règle métier : payé = Oui + mode de règlement choisi → règlement automatique
// (nécessite une date de paiement), on n'a alors plus besoin de saisir le
// règlement séparément après création du salaire.
const autoPayEnabled = computed(() =>
  form.value.paye === '1' && !!form.value.type_payment
)

const autoPayMissingDate = computed(() =>
  formSubmitted.value && autoPayEnabled.value && !form.value.datepaye
)

const filteredUsers = computed(() => {
  const q = userSearch.value.toLowerCase().trim()
  if (!q) return users.value
  return users.value.filter(u =>
    `${u.lastname} ${u.firstname} ${u.login}`.toLowerCase().includes(q)
  )
})

// ─── Helpers ───────────────────────────────────────
function initials(u) {
  const l = (u.lastname  || '').charAt(0).toUpperCase()
  const f = (u.firstname || '').charAt(0).toUpperCase()
  return l + f || '?'
}

const AVATAR_COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6']
function avatarColor(u) {
  const idx = (parseInt(u.id, 10) || 0) % AVATAR_COLORS.length
  return AVATAR_COLORS[idx]
}

const PAYMENT_ICONS = {
  'LIQ': '💵', 'ESP': '💵',
  'CB':  '💳',
  'CHQ': '🧾',
  'VIR': '🏦',
  'PRE': '📋',
}
function paymentIcon(code) {
  return PAYMENT_ICONS[String(code).toUpperCase()] ?? '💰'
}

function formatDateInput(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function toTimestamp(dateStr) {
  if (!dateStr) return null
  return Math.floor(new Date(dateStr).getTime() / 1000)
}

// ─── Dropdown actions ──────────────────────────────
async function openDropdown() {
  dropdownOpen.value = true
  await nextTick()
  searchInput.value?.focus()
}

function closeDropdown() {
  dropdownOpen.value = false
  userSearch.value = ''
}

function selectUser(u) {
  form.value.fk_user = String(u.id)
  closeDropdown()
}

function clearUser() {
  form.value.fk_user = ''
  userSearch.value = ''
}

// ─── Fetch ─────────────────────────────────────────
async function fetchMeta() {
  loadingMeta.value = true
  try {
    const [u, pt] = await Promise.all([getUsers(), getPaymentTypes()])
    users.value        = Array.isArray(u)  ? u  : []
    paymentTypes.value = Array.isArray(pt) ? pt : []
  } catch {
    // non bloquant
  } finally {
    loadingMeta.value = false
  }
}

// ─── Soumission ────────────────────────────────────
async function submitSalary() {
  formSubmitted.value = true
  if (!form.value.fk_user) return
  // Règlement automatique demandé mais date de paiement manquante → on bloque.
  if (autoPayMissingDate.value) return

  saving.value = true
  error.value  = null
  try {
    const payload = {
      fk_user: form.value.fk_user,
      label:   form.value.label,
      amount:  form.value.amount,
      datesp:  toTimestamp(form.value.datesp),
      dateep:  toTimestamp(form.value.dateep),
      paye:    form.value.paye,
    }
    if (form.value.type_payment) payload.type_payment = form.value.type_payment
    if (form.value.note_private) payload.note_private = form.value.note_private

    const result = await createSalary(payload)
    const newId  = result?.id ?? result

    // Règlement automatique : payé = Oui + mode de règlement choisi + date saisie
    // → on enregistre directement le paiement complet, sans étape manuelle.
    if (autoPayEnabled.value && form.value.datepaye) {
      await createSalaryPayment(newId, {
        datepaye:     toTimestamp(form.value.datepaye),
        amount:       form.value.amount,
        paiementtype: form.value.type_payment,
      })
    }

    router.push(`/frontoffice/salary/${newId}`)
  } catch (e) {
    error.value = e.message
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await fetchMeta()
  if (route.query.fk_user) form.value.fk_user = route.query.fk_user
})
</script>

<style scoped>
@keyframes spin { to { transform: rotate(360deg); } }

.section-title {
  font-size: 0.95rem;
  font-weight: 600;
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--border-color);
  color: var(--text-primary);
}

/* ── Employé dropdown ── */
.employee-input {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 0.875rem;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-primary);
  cursor: pointer;
  transition: border-color 0.15s;
  min-height: 44px;
}
.employee-input:hover,
.employee-input.active { border-color: var(--accent-primary, #6366f1); }

.employee-dropdown {
  position: absolute;
  top: calc(100% + 4px);
  left: 0; right: 0;
  background: var(--bg-primary);
  border: 1.5px solid var(--accent-primary, #6366f1);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(0,0,0,0.12);
  z-index: 50;
  max-height: 280px;
  overflow-y: auto;
}

.employee-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.65rem 0.875rem;
  cursor: pointer;
  transition: background 0.1s;
}
.employee-option:hover { background: var(--bg-secondary); }
.employee-option.selected { background: rgba(99,102,241,0.07); }

/* ── Avatar ── */
.employee-avatar {
  width: 38px; height: 38px;
  border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  font-weight: 700;
  font-size: 0.875rem;
  flex-shrink: 0;
  letter-spacing: 0.02em;
}
.employee-avatar.sm { width: 32px; height: 32px; font-size: 0.75rem; }
.employee-avatar.lg { width: 46px; height: 46px; font-size: 1rem; }

/* ── Payment type cards ── */
.payment-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.875rem 0.5rem;
  border: 1.5px solid var(--border-color);
  border-radius: var(--radius-md);
  background: var(--bg-secondary);
  cursor: pointer;
  transition: all 0.15s;
  text-align: center;
}
.payment-card:hover {
  border-color: var(--accent-primary, #6366f1);
  background: var(--bg-primary);
}
.payment-card.selected {
  border-color: var(--accent-primary, #6366f1);
  background: rgba(99,102,241,0.07);
  box-shadow: 0 0 0 3px rgba(99,102,241,0.15);
}
.payment-card-label {
  font-size: 0.72rem;
  font-weight: 500;
  color: var(--text-secondary);
  line-height: 1.3;
}
.payment-card.selected .payment-card-label {
  color: var(--accent-primary, #6366f1);
  font-weight: 600;
}

/* ── Skeleton ── */
.skeleton {
  background: linear-gradient(90deg, var(--bg-secondary) 25%, var(--border-color) 50%, var(--bg-secondary) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { to { background-position: -200% 0; } }
</style>