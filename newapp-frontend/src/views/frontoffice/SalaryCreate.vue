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

    <!-- Erreur / succès -->
    <div v-if="error" style="background: #fef2f2; border: 1px solid var(--danger); color: var(--danger); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
      {{ error }}
    </div>

    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; align-items: start;">

      <!-- Formulaire principal -->
      <div class="card">
        <form @submit.prevent="submitSalary" style="display: flex; flex-direction: column; gap: 1.5rem;">

          <!-- Section : Identification -->
          <section>
            <h3 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              Identification
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label class="form-label">Employé *</label>
                <select v-model="form.fk_user" class="form-input" required :disabled="loadingMeta">
                  <option value="" disabled>{{ loadingMeta ? 'Chargement…' : 'Sélectionner un employé' }}</option>
                  <option v-for="u in users" :key="u.id" :value="String(u.id)">
                    {{ u.lastname }} {{ u.firstname }}
                  </option>
                </select>
              </div>
              <div>
                <label class="form-label">Libellé *</label>
                <input type="text" v-model="form.label" class="form-input" placeholder="Ex: Salaire" required />
              </div>
            </div>
          </section>

          <!-- Section : Période -->
          <section>
            <h3 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              Période
            </h3>
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

          <!-- Section : Montant & Paiement -->
          <section>
            <h3 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              Montant & Paiement
            </h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label class="form-label">Montant total *</label>
                <input type="number" v-model.number="form.amount" class="form-input" min="0" step="0.01" required placeholder="0.00" />
              </div>
              <div>
                <label class="form-label">Mode de règlement par défaut</label>
                <select v-model="form.type_payment" class="form-input" :disabled="loadingMeta">
                  <option value="">— Choisir —</option>
                  <option v-for="pt in paymentTypes" :key="pt.id" :value="String(pt.id)">
                    {{ pt.label }}
                  </option>
                </select>
              </div>
              <div>
                <label class="form-label">Compte bancaire par défaut</label>
                <input type="text" v-model="form.accountid" class="form-input" placeholder="ID du compte" />
              </div>
              <div>
                <label class="form-label">Marquer comme payé</label>
                <select v-model="form.paye" class="form-input">
                  <option value="0">Non</option>
                  <option value="1">Oui</option>
                </select>
              </div>
            </div>
          </section>

          <!-- Section : Note -->
          <section>
            <h3 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-color);">
              Notes
            </h3>
            <div>
              <label class="form-label">Note privée</label>
              <textarea v-model="form.note_private" class="form-input" rows="3" style="resize: vertical;" placeholder="Commentaire interne…"></textarea>
            </div>
          </section>

          <!-- Actions -->
          <div style="display: flex; justify-content: flex-end; gap: 1rem; padding-top: 0.5rem; border-top: 1px solid var(--border-color);">
            <router-link to="/frontoffice/salary" class="btn btn-outline">Annuler</router-link>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <Loader2 v-if="saving" style="width: 16px; height: 16px; animation: spin 1s linear infinite;" />
              <CheckCircle v-else style="width: 16px; height: 16px;" />
              {{ saving ? 'Enregistrement…' : 'Créer le salaire' }}
            </button>
          </div>

        </form>
      </div>

      <!-- Sidebar récapitulatif -->
      <div style="position: sticky; top: 100px; display: flex; flex-direction: column; gap: 1rem;">
        <div class="card" style="background: linear-gradient(160deg, var(--accent-light, #eff6ff) 0%, var(--bg-secondary) 100%);">
          <h3 style="font-size: 0.95rem; font-weight: 600; margin-bottom: 1.25rem; display: flex; align-items: center; gap: 0.5rem; color: var(--accent-primary, #2563eb);">
            <Receipt style="width: 18px; height: 18px;" /> Récapitulatif
          </h3>
          <div style="display: flex; flex-direction: column; gap: 0.75rem; font-size: 0.875rem;">
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-secondary);">Employé</span>
              <span style="font-weight: 500; max-width: 150px; text-align: right; word-break: break-word;">{{ selectedUserName }}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-secondary);">Libellé</span>
              <span style="font-weight: 500;">{{ form.label || '—' }}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--text-secondary);">Période</span>
              <span style="font-weight: 500; text-align: right;">
                {{ form.datesp ? formatDateInput(form.datesp) : '—' }}<br/>
                <span style="color: var(--text-muted);">au {{ form.dateep ? formatDateInput(form.dateep) : '—' }}</span>
              </span>
            </div>
            <div style="border-top: 1px dashed var(--border-color); padding-top: 0.75rem; display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-secondary);">Montant total</span>
              <span style="font-size: 1.25rem; font-weight: 700;">{{ form.amount ? formatAmount(form.amount) : '—' }}</span>
            </div>
          </div>
        </div>

        <div class="card" style="font-size: 0.8rem; color: var(--text-muted); line-height: 1.6;">
          <strong style="color: var(--text-primary); display: block; margin-bottom: 0.5rem;">ℹ️ Paiement fractionné</strong>
          Après création, ouvrez la fiche du salaire pour saisir les règlements en plusieurs fois via le bouton <em>Saisir règlement</em>.
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CheckCircle, Loader2, Receipt } from 'lucide-vue-next'
import { createSalary, getUsers, getPaymentTypes, formatAmount } from '../../services/salaryServices.js'

const route = useRoute()
const router = useRouter()

// ─── État ──────────────────────────────────────────
const users = ref([])
const paymentTypes = ref([])
const loadingMeta = ref(false)
const saving = ref(false)
const error = ref(null)

const form = ref({
  fk_user: '',
  label: 'Salaire',
  datesp: '',
  dateep: '',
  amount: null,
  type_payment: '',
  accountid: '',
  paye: '0',
  note_private: '',
})

// ─── Computed ──────────────────────────────────────
const selectedUserName = computed(() => {
  const u = users.value.find(u => String(u.id) === form.value.fk_user)
  return u ? `${u.lastname} ${u.firstname}` : '—'
})

// ─── Helpers ───────────────────────────────────────
function formatDateInput(dateStr) {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  return `${d}/${m}/${y}`
}

function toTimestamp(dateStr) {
  if (!dateStr) return null
  return Math.floor(new Date(dateStr).getTime() / 1000)
}

// ─── Fetch ─────────────────────────────────────────
async function fetchMeta() {
  loadingMeta.value = true
  try {
    const [u, pt] = await Promise.all([getUsers(), getPaymentTypes()])
    users.value = Array.isArray(u) ? u : []
    paymentTypes.value = Array.isArray(pt) ? pt : []
  } catch {
    // non bloquant
  } finally {
    loadingMeta.value = false
  }
}

// ─── Soumission ────────────────────────────────────
async function submitSalary() {
  saving.value = true
  error.value = null
  try {
    const payload = {
      fk_user: form.value.fk_user,
      label: form.value.label,
      amount: form.value.amount,
      datesp: toTimestamp(form.value.datesp),
      dateep: toTimestamp(form.value.dateep),
      paye: form.value.paye,
    }
    if (form.value.type_payment) payload.type_payment = form.value.type_payment
    if (form.value.accountid) payload.accountid = form.value.accountid
    if (form.value.note_private) payload.note_private = form.value.note_private

    const result = await createSalary(payload)
    const newId = result?.id ?? result
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
</style>