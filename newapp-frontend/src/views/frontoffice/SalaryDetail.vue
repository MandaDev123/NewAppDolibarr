<template>
  <div>
    <!-- En-tête -->
    <div class="page-header">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <router-link to="/frontoffice/salary" class="btn btn-outline" style="padding: 0.4rem 0.75rem;">
          <ArrowLeft style="width: 16px; height: 16px;" />
        </router-link>
        <div>
          <h1 class="page-title">
            Salaire {{ salary?.ref ? `n° ${salary.ref}` : '' }}
            <span v-if="salary" :class="['badge', getSalaryStatusClass(salary)]" style="margin-left: 0.75rem; font-size: 0.75rem; vertical-align: middle;">
              {{ getSalaryStatusLabel(salary) }}
            </span>
          </h1>
          <p class="page-subtitle">Détail du salaire et historique des règlements</p>
        </div>
      </div>
      <button
        v-if="salary && getSalaryStatusLabel(salary) !== 'Payé'"
        class="btn btn-primary"
        @click="openPaymentModal"
      >
        <CreditCard style="width: 16px; height: 16px;" />
        Saisir règlement
      </button>
    </div>

    <!-- Erreur globale -->
    <div v-if="error" style="background: #fef2f2; border: 1px solid var(--danger); color: var(--danger); padding: 1rem; border-radius: var(--radius-md); margin-bottom: 1rem;">
      {{ error }}
    </div>

    <!-- Chargement -->
    <div v-if="loading" style="display: flex; align-items: center; gap: 0.75rem; padding: 3rem; color: var(--text-muted); justify-content: center;">
      <Loader2 style="width: 22px; height: 22px; animation: spin 1s linear infinite;" />
      Chargement du salaire…
    </div>

    <template v-if="!loading && salary">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; margin-bottom: 1.5rem;">

        <!-- Fiche salaire -->
        <div class="card">
          <h2 style="font-size: 1rem; font-weight: 600; margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color);">
            Informations du salaire
          </h2>
          <dl style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem 1.5rem;">
            <div>
              <dt style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.2rem;">Réf.</dt>
              <dd style="font-weight: 600; font-family: var(--mono);">{{ salary.ref }}</dd>
            </div>
            <div>
              <dt style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.2rem;">Libellé</dt>
              <dd>{{ salary.label || '—' }}</dd>
            </div>
            <div>
              <dt style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.2rem;">Employé</dt>
              <dd>{{ employeeName }}</dd>
            </div>
            <div>
              <dt style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.2rem;">Mode de règlement</dt>
              <dd>{{ salary.type_payment_code || '—' }}</dd>
            </div>
            <div>
              <dt style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.2rem;">Date de début</dt>
              <dd>{{ formatDate(salary.datesp) }}</dd>
            </div>
            <div>
              <dt style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.2rem;">Date de fin</dt>
              <dd>{{ formatDate(salary.dateep) }}</dd>
            </div>
            <div>
              <dt style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.2rem;">Commentaires (privé)</dt>
              <dd>{{ salary.note_private || '—' }}</dd>
            </div>
            <div>
              <dt style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.2rem;">Compte bancaire</dt>
              <dd>{{ salary.accountid || '—' }}</dd>
            </div>
          </dl>
        </div>

        <!-- Résumé financier -->
        <div class="card" style="background: linear-gradient(160deg, var(--accent-light, #eff6ff) 0%, var(--bg-secondary) 100%); border-color: var(--accent-light, #bfdbfe);">
          <h2 style="font-size: 1rem; font-weight: 600; margin-bottom: 1.25rem; padding-bottom: 0.75rem; border-bottom: 1px solid var(--border-color);">
            Résumé financier
          </h2>
          <div style="display: flex; flex-direction: column; gap: 1rem;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-secondary);">Montant réclamé</span>
              <span style="font-size: 1.25rem; font-weight: 700;">{{ formatAmount(salary.amount) }}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span style="color: var(--text-secondary);">Déjà réglé</span>
              <span style="font-weight: 600; color: var(--success, #16a34a);">{{ formatAmount(totalPaid) }}</span>
            </div>
            <div style="border-top: 2px dashed var(--border-color); padding-top: 1rem; display: flex; justify-content: space-between; align-items: center;">
              <span style="font-weight: 600;">Reste à payer</span>
              <span style="font-size: 1.2rem; font-weight: 700;" :style="{ color: resteAPayer > 0 ? 'var(--warning, #d97706)' : 'var(--success, #16a34a)' }">
                {{ formatAmount(resteAPayer) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Tableau des paiements -->
      <div class="card" style="padding: 0; overflow: hidden;">
        <div style="padding: 1rem 1.25rem; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
          <h2 style="font-size: 1rem; font-weight: 600;">Historique des règlements</h2>
          <span style="font-size: 0.8rem; color: var(--text-muted);">{{ payments.length }} paiement(s)</span>
        </div>
        <div v-if="loadingPayments" style="padding: 2rem; text-align: center; color: var(--text-muted);">
          <Loader2 style="width: 18px; height: 18px; animation: spin 1s linear infinite;" />
        </div>
        <div v-else style="overflow-x: auto;">
          <table class="data-table">
            <thead>
              <tr>
                <th>Réf. paiement</th>
                <th>Date</th>
                <th>Type</th>
                <th>N° (Chèque/Virement)</th>
                <th>Compte bancaire</th>
                <th style="text-align: right;">Montant</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="p in payments" :key="p.id">
                <td style="font-family: var(--mono);">{{ p.ref || p.id }}</td>
                <td>{{ formatDate(p.datepaye ?? p.datep) }}</td>
                <td>{{ p.type_label || p.type_code || '—' }}</td>
                <td>{{ p.num_payment || '—' }}</td>
                <td>{{ p.bank_account || '—' }}</td>
                <td style="text-align: right; font-weight: 600;">{{ formatAmount(p.amount) }}</td>
              </tr>
              <tr v-if="payments.length === 0">
                <td colspan="6" style="text-align: center; padding: 2rem; color: var(--text-muted);">
                  Aucun paiement enregistré.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- Totaux sous le tableau -->
        <div v-if="payments.length > 0" style="padding: 1rem 1.25rem; border-top: 1px solid var(--border-color); display: flex; flex-direction: column; align-items: flex-end; gap: 0.4rem; font-size: 0.9rem;">
          <div style="display: flex; gap: 3rem;">
            <span style="color: var(--text-secondary);">Déjà réglé :</span>
            <span style="font-weight: 600; min-width: 120px; text-align: right;">{{ formatAmount(totalPaid) }}</span>
          </div>
          <div style="display: flex; gap: 3rem;">
            <span style="color: var(--text-secondary);">Montant réclamé :</span>
            <span style="font-weight: 600; min-width: 120px; text-align: right;">{{ formatAmount(salary.amount) }}</span>
          </div>
          <div style="display: flex; gap: 3rem; font-size: 1rem; border-top: 1px solid var(--border-color); padding-top: 0.5rem; margin-top: 0.25rem;">
            <span style="font-weight: 600;">Reste à payer :</span>
            <span style="font-weight: 700; min-width: 120px; text-align: right;" :style="{ color: resteAPayer > 0 ? 'var(--warning, #d97706)' : 'var(--success, #16a34a)' }">
              {{ formatAmount(resteAPayer) }}
            </span>
          </div>
        </div>
      </div>
    </template>

    <!-- ─── MODAL SAISIR RÈGLEMENT ─────────────────────────────────────── -->
    <Teleport to="body">
      <div
        v-if="showPaymentModal"
        style="position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 999; display: flex; align-items: center; justify-content: center; padding: 1rem;"
        @click.self="closePaymentModal"
      >
        <div style="background: var(--bg-primary); border-radius: var(--radius-lg); width: 100%; max-width: 620px; box-shadow: 0 20px 60px rgba(0,0,0,0.3); overflow: hidden;">

          <!-- Header modal -->
          <div style="display: flex; justify-content: space-between; align-items: center; padding: 1.25rem 1.5rem; border-bottom: 1px solid var(--border-color);">
            <h2 style="font-size: 1.05rem; font-weight: 700;">Saisir un règlement</h2>
            <button @click="closePaymentModal" style="background: none; border: none; cursor: pointer; color: var(--text-muted);">
              <X style="width: 20px; height: 20px;" />
            </button>
          </div>

          <!-- Corps modal -->
          <div style="padding: 1.5rem; display: flex; flex-direction: column; gap: 1.25rem;">

            <!-- Infos lecture seule -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; background: var(--bg-secondary); padding: 1rem; border-radius: var(--radius-md); font-size: 0.875rem;">
              <div><span style="color: var(--text-muted);">Réf. :</span> <strong>{{ salary?.ref }}</strong></div>
              <div><span style="color: var(--text-muted);">Libellé :</span> <strong>{{ salary?.label }}</strong></div>
              <div><span style="color: var(--text-muted);">Date début :</span> {{ formatDate(salary?.datesp) }}</div>
              <div><span style="color: var(--text-muted);">Date fin :</span> {{ formatDate(salary?.dateep) }}</div>
            </div>

            <!-- Ligne de saisie -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
              <div>
                <label class="form-label">Date du paiement *</label>
                <input type="datetime-local" v-model="paymentForm.datepaye" class="form-input" />
              </div>
              <div>
                <label class="form-label">Mode de règlement *</label>
                <select v-model="paymentForm.fk_typepayment" class="form-input">
                  <option value="" disabled>Choisir…</option>
                  <option v-for="pt in paymentTypes" :key="pt.id" :value="pt.id">{{ pt.label }}</option>
                </select>
              </div>
              <div>
                <label class="form-label">Compte à débiter</label>
                <input type="text" v-model="paymentForm.fk_account" class="form-input" placeholder="ID compte bancaire" />
              </div>
              <div>
                <label class="form-label">Numéro (Chèque / Virement)</label>
                <input type="text" v-model="paymentForm.num_payment" class="form-input" placeholder="N° de pièce" />
              </div>
            </div>

            <div>
              <label class="form-label">Commentaires</label>
              <textarea v-model="paymentForm.note_private" class="form-input" rows="2" placeholder="Commentaire interne…" style="resize: vertical;"></textarea>
            </div>

            <!-- Tableau récap + saisie montant -->
            <div style="overflow-x: auto;">
              <table class="data-table" style="font-size: 0.85rem;">
                <thead>
                  <tr>
                    <th>Date fin</th>
                    <th style="text-align: right;">Montant</th>
                    <th style="text-align: right;">Déjà réglé</th>
                    <th style="text-align: right;">Reste à payer</th>
                    <th style="text-align: right; width: 140px;">Montant à saisir *</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>{{ formatDate(salary?.dateep) }}</td>
                    <td style="text-align: right;">{{ formatAmount(salary?.amount) }}</td>
                    <td style="text-align: right; color: var(--success, green);">{{ formatAmount(totalPaid) }}</td>
                    <td style="text-align: right; color: var(--warning, orange); font-weight: 600;">{{ formatAmount(resteAPayer) }}</td>
                    <td style="text-align: right;">
                      <input
                        type="number"
                        v-model.number="paymentForm.amount"
                        class="form-input"
                        style="text-align: right; padding: 0.35rem 0.5rem;"
                        :max="resteAPayer"
                        min="0"
                        step="0.01"
                      />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Option auto-classement -->
            <label style="display: flex; align-items: flex-start; gap: 0.75rem; cursor: pointer; font-size: 0.875rem; color: var(--text-secondary);">
              <input type="checkbox" v-model="paymentForm.autoClose" style="margin-top: 2px; flex-shrink: 0;" />
              <span>
                Classez automatiquement le salaire comme «&nbsp;payé&nbsp;» lorsque le paiement est entièrement effectué.
              </span>
            </label>

            <!-- Erreur modal -->
            <div v-if="paymentError" style="background: #fef2f2; border: 1px solid var(--danger); color: var(--danger); padding: 0.75rem 1rem; border-radius: var(--radius-md); font-size: 0.875rem;">
              {{ paymentError }}
            </div>
          </div>

          <!-- Footer modal -->
          <div style="display: flex; justify-content: flex-end; gap: 0.75rem; padding: 1rem 1.5rem; border-top: 1px solid var(--border-color); background: var(--bg-secondary);">
            <button class="btn btn-outline" @click="closePaymentModal" :disabled="savingPayment">Annuler</button>
            <button class="btn btn-primary" @click="submitPayment" :disabled="savingPayment || !isPaymentValid">
              <Loader2 v-if="savingPayment" style="width: 15px; height: 15px; animation: spin 1s linear infinite;" />
              <CheckCircle v-else style="width: 15px; height: 15px;" />
              {{ savingPayment ? 'Enregistrement…' : 'Payer' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, CreditCard, Loader2, X, CheckCircle } from 'lucide-vue-next'
import {
  getSalaryById, getPaymentsBySalary, createSalaryPayment,
  getUsers, getPaymentTypes, updateSalary,
  formatDate, formatAmount, getSalaryStatusLabel, getSalaryStatusClass
} from '../../services/salaryServices.js'

const route = useRoute()
const router = useRouter()

// ─── État ──────────────────────────────────────────
const salary = ref(null)
const payments = ref([])
const users = ref([])
const paymentTypes = ref([])
const loading = ref(false)
const loadingPayments = ref(false)
const error = ref(null)

// Modal
const showPaymentModal = ref(false)
const savingPayment = ref(false)
const paymentError = ref(null)
const paymentForm = ref(defaultPaymentForm())

function defaultPaymentForm() {
  return {
    datepaye: new Date().toISOString().slice(0, 16),
    fk_typepayment: '',
    fk_account: '',
    num_payment: '',
    note_private: '',
    amount: 0,
    autoClose: true,
  }
}

// ─── Calculs ───────────────────────────────────────
const totalPaid = computed(() => {
  if (payments.value.length === 0) return parseFloat(salary.value?.totalpaid ?? 0)
  return payments.value.reduce((acc, p) => acc + parseFloat(p.amount ?? 0), 0)
})

const resteAPayer = computed(() => {
  if (!salary.value) return 0
  return Math.max(0, parseFloat(salary.value.amount ?? 0) - totalPaid.value)
})

const employeeName = computed(() => {
  if (!salary.value) return '—'
  const u = users.value.find(u => String(u.id) === String(salary.value.fk_user))
  return u ? `${u.lastname} ${u.firstname}` : `Utilisateur #${salary.value.fk_user}`
})

const isPaymentValid = computed(() => {
  return paymentForm.value.fk_typepayment &&
    paymentForm.value.datepaye &&
    paymentForm.value.amount > 0 &&
    paymentForm.value.amount <= resteAPayer.value
})

// ─── Fetch ─────────────────────────────────────────
async function fetchAll() {
  loading.value = true
  error.value = null
  try {
    const [sal, u, pt] = await Promise.all([
      getSalaryById(route.params.id),
      getUsers(),
      getPaymentTypes(),
    ])
    salary.value = sal
    users.value = Array.isArray(u) ? u : []
    paymentTypes.value = Array.isArray(pt) ? pt : []
    await fetchPayments()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function fetchPayments() {
  loadingPayments.value = true
  try {
    const data = await getPaymentsBySalary(route.params.id)
    payments.value = Array.isArray(data) ? data : []
  } catch {
    payments.value = []
  } finally {
    loadingPayments.value = false
  }
}

// ─── Modal ─────────────────────────────────────────
function openPaymentModal() {
  paymentForm.value = defaultPaymentForm()
  paymentForm.value.amount = resteAPayer.value
  paymentError.value = null
  showPaymentModal.value = true
}

function closePaymentModal() {
  showPaymentModal.value = false
}

async function submitPayment() {
  if (!isPaymentValid.value) return
  savingPayment.value = true
  paymentError.value = null
  try {
    // Conversion datetime-local → timestamp unix
    const datets = Math.floor(new Date(paymentForm.value.datepaye).getTime() / 1000)

    const payload = {
      fk_salary: String(route.params.id),
      datepaye: datets,
      amount: paymentForm.value.amount,
      fk_typepayment: paymentForm.value.fk_typepayment,
      num_payment: paymentForm.value.num_payment || '',
      note_private: paymentForm.value.note_private || '',
    }
    if (paymentForm.value.fk_account) payload.fk_account = paymentForm.value.fk_account

    await createSalaryPayment(payload)

    // Auto-classement "payé" si demandé et si reste = 0 après ce paiement
    if (paymentForm.value.autoClose) {
      const newReste = resteAPayer.value - paymentForm.value.amount
      if (newReste <= 0) {
        await updateSalary(route.params.id, { paye: 1 })
      }
    }

    closePaymentModal()
    await fetchAll()
  } catch (e) {
    paymentError.value = e.message
  } finally {
    savingPayment.value = false
  }
}

onMounted(fetchAll)
</script>

<style scoped>
@keyframes spin { to { transform: rotate(360deg); } }
</style>