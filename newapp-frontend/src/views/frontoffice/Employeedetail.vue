<template>
  <div>
    <!-- En-tête -->
    <div class="page-header">
      <div style="display:flex;align-items:center;gap:1rem;">
        <router-link to="/frontoffice/employees" class="btn btn-outline" style="padding:.4rem .75rem;">
          <ArrowLeft style="width:16px;height:16px;" />
        </router-link>
        <div>
          <h1 class="page-title">Fiche salarié</h1>
          <p class="page-subtitle">Historique salarial et paiements</p>
        </div>
      </div>
    </div>

    <div v-if="error" style="background:#fef2f2;border:1px solid var(--danger);color:var(--danger);padding:1rem;border-radius:var(--radius-md);margin-bottom:1.25rem;">{{ error }}</div>

    <div v-if="loading" style="display:flex;align-items:center;justify-content:center;gap:.75rem;padding:4rem;color:var(--text-muted);">
      <Loader2 style="width:22px;height:22px;animation:spin 1s linear infinite;" /> Chargement…
    </div>

    <template v-if="!loading && user">

      <!-- Infos salarié -->
      <div style="display:grid;grid-template-columns:auto 1fr;gap:1.5rem;margin-bottom:1.5rem;align-items:start;">

        <!-- Carte identité -->
        <div class="card" style="min-width:260px;text-align:center;">
          <div class="big-av" :style="{ background: avatarColor(user) }">{{ initials(user) }}</div>
          <h2 style="font-size:1.2rem;font-weight:700;margin-top:.875rem;margin-bottom:.25rem;">
            {{ user.lastname }} {{ user.firstname }}
          </h2>
          <p style="color:var(--text-muted);font-size:.85rem;margin-bottom:.875rem;">@{{ user.login }}</p>
          <div style="display:flex;flex-direction:column;gap:.5rem;font-size:.82rem;text-align:left;border-top:1px solid var(--border-color);padding-top:.875rem;">
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text-secondary);">Genre</span>
              <span :style="{ fontWeight: 600, color: user.gender === 'man' ? '#6366f1' : '#ec4899' }">
                {{ user.gender === 'man' ? '♂ Homme' : user.gender === 'woman' ? '♀ Femme' : '—' }}
              </span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text-secondary);">Poste</span>
              <span class="badge badge-info" style="font-size:.7rem;" v-if="user.job">{{ user.job }}</span>
              <span v-else style="color:var(--text-muted);">—</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text-secondary);">Heures / sem.</span>
              <span style="font-weight:600;">{{ user.weeklyhours || 35 }} h</span>
            </div>
            <div style="display:flex;justify-content:space-between;">
              <span style="color:var(--text-secondary);">Statut</span>
              <span :class="['badge', user.statut == 1 ? 'badge-success' : 'badge-danger']">
                {{ user.statut == 1 ? 'Actif' : 'Inactif' }}
              </span>
            </div>
          </div>
        </div>

        <!-- KPIs financiers -->
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;">
          <div class="card kpi">
            <span style="font-size:.75rem;color:var(--text-secondary);">Total réclamé</span>
            <span class="kpi-val">{{ fmtAmt(globalStats.totalAmount) }}</span>
          </div>
          <div class="card kpi">
            <span style="font-size:.75rem;color:var(--text-secondary);">Total versé</span>
            <span class="kpi-val" style="color:var(--success,#10b981);">{{ fmtAmt(globalStats.totalPaid) }}</span>
          </div>
          <div class="card kpi">
            <span style="font-size:.75rem;color:var(--text-secondary);">Reste à payer</span>
            <span class="kpi-val" :style="{ color: globalStats.totalReste > 0 ? 'var(--warning,#d97706)' : 'var(--success,#10b981)' }">
              {{ fmtAmt(globalStats.totalReste) }}
            </span>
          </div>
          <div class="card kpi" style="grid-column:span 1;">
            <span style="font-size:.75rem;color:var(--text-secondary);">Nb. salaires</span>
            <span class="kpi-val">{{ salaries.length }}</span>
          </div>
          <div class="card kpi">
            <span style="font-size:.75rem;color:var(--text-secondary);">Salaires payés</span>
            <span class="kpi-val" style="color:var(--success,#10b981);">{{ globalStats.paidCount }}</span>
          </div>
          <div class="card kpi">
            <span style="font-size:.75rem;color:var(--text-secondary);">Non soldés</span>
            <span class="kpi-val" :style="{ color: globalStats.unpaidCount > 0 ? 'var(--warning,#d97706)' : 'inherit' }">
              {{ globalStats.unpaidCount }}
            </span>
          </div>
        </div>
      </div>

      <!-- Historique des salaires -->
      <div class="card" style="padding:0;overflow:hidden;">
        <div style="padding:1rem 1.25rem;border-bottom:1px solid var(--border-color);display:flex;justify-content:space-between;align-items:center;">
          <h2 style="font-size:1rem;font-weight:600;">Historique des salaires</h2>
          <router-link :to="`/frontoffice/salary/create?fk_user=${user.id}`" class="btn btn-primary" style="padding:.35rem .875rem;font-size:.8rem;display:inline-flex;align-items:center;gap:.4rem;">
            <Plus style="width:14px;height:14px;" /> Nouveau salaire
          </router-link>
        </div>

        <div v-if="loadingSalaries" style="padding:2rem;text-align:center;color:var(--text-muted);display:flex;align-items:center;justify-content:center;gap:.6rem;">
          <Loader2 style="width:17px;height:17px;animation:spin 1s linear infinite;" /> Chargement des salaires…
        </div>

        <div v-else-if="salaries.length === 0" style="padding:3rem;text-align:center;color:var(--text-muted);">
          Aucun salaire enregistré pour cet employé.
        </div>

        <template v-else>
          <!-- Chaque salaire -->
          <div v-for="sal in salaries" :key="sal.id" style="border-bottom:1px solid var(--border-color);">

            <!-- Ligne principale salaire -->
            <div style="display:grid;grid-template-columns:1fr auto auto auto auto auto;gap:.75rem 1.5rem;align-items:center;padding:.875rem 1.25rem;">

              <div>
                <span style="font-weight:600;">{{ sal.label || 'Salaire' }}</span>
                <span style="font-size:.72rem;color:var(--text-muted);margin-left:.5rem;">Réf. #{{ sal.ref }}</span>
              </div>

              <div style="font-size:.8rem;color:var(--text-secondary);">
                {{ fmtTs(sal.datesp) }} → {{ fmtTs(sal.dateep) }}
              </div>

              <div style="font-weight:600;text-align:right;">{{ fmtAmt(sal.amount) }}</div>

              <div style="text-align:right;color:var(--success,#10b981);">
                {{ fmtAmt(paymentMap[sal.id] ? sumPayments(paymentMap[sal.id]) : (sal.totalpaid ?? 0)) }}
              </div>

              <div style="text-align:right;" :style="{ color: getResteAPayer(sal) > 0 ? 'var(--warning,#d97706)' : 'inherit', fontWeight: 600 }">
                {{ fmtAmt(getResteAPayer(sal)) }}
              </div>

              <span :class="['badge', statusClass(sal)]">{{ statusLabel(sal) }}</span>
            </div>

            <!-- Sous-tableau paiements : toujours affiché, chargé dès l'ouverture de la page -->
            <div style="background:var(--bg-secondary);border-top:1px solid var(--border-color);">
              <div v-if="!paymentMap[sal.id] || paymentMap[sal.id].length === 0"
                style="padding:1rem 2rem;color:var(--text-muted);font-size:.82rem;">
                Aucun paiement enregistré.
                <router-link :to="`/frontoffice/salary/${sal.id}`" style="color:var(--accent-primary,#6366f1);margin-left:.5rem;font-size:.78rem;">
                  Saisir un règlement →
                </router-link>
              </div>
              <table v-else class="data-table" style="font-size:.8rem;background:transparent;">
                <thead>
                  <tr>
                    <th style="padding-left:1.25rem;">Réf.</th>
                    <th>Date paiement</th>
                    <th>Type</th>
                    <th>N° pièce</th>

                    <th style="text-align:right;">Montant</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in paymentMap[sal.id]" :key="p.id">
                    <td style="padding-left:1.25rem;font-family:var(--mono);">{{ p.ref || p.id }}</td>
                    <td>{{ fmtTs(p.datepaye ?? p.datep) }}</td>
                    <td>{{ p.type_label || p.type_code || '—' }}</td>
                    <td>{{ p.num_payment || '—' }}</td>
                    <td style="text-align:right;font-weight:600;color:var(--success,#10b981);">{{ fmtAmt(p.amount) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="4" style="text-align:right;padding:.5rem 1rem;font-weight:600;font-size:.78rem;color:var(--text-secondary);">Total versé :</td>
                    <td style="text-align:right;font-weight:700;padding:.5rem 1rem;color:var(--success,#10b981);">{{ fmtAmt(sumPayments(paymentMap[sal.id])) }}</td>
                  </tr>
                  <tr v-if="getResteAPayer(sal, true) > 0">
                    <td colspan="4" style="text-align:right;padding:.5rem 1rem;font-weight:600;font-size:.78rem;">
                      <router-link :to="`/frontoffice/salary/${sal.id}`" style="color:var(--accent-primary,#6366f1);">Saisir un règlement →</router-link>
                    </td>
                    <td style="text-align:right;font-weight:700;padding:.5rem 1rem;color:var(--warning,#d97706);">
                      Reste : {{ fmtAmt(getResteAPayer(sal, true)) }}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          <!-- Totaux globaux -->
          <div style="padding:1rem 1.25rem;display:flex;flex-direction:column;align-items:flex-end;gap:.4rem;font-size:.875rem;background:var(--bg-secondary);">
            <div style="display:flex;gap:4rem;">
              <span style="color:var(--text-secondary);">Total réclamé :</span>
              <span style="font-weight:600;min-width:140px;text-align:right;">{{ fmtAmt(globalStats.totalAmount) }}</span>
            </div>
            <div style="display:flex;gap:4rem;">
              <span style="color:var(--text-secondary);">Total versé :</span>
              <span style="font-weight:600;min-width:140px;text-align:right;color:var(--success,#10b981);">{{ fmtAmt(globalStats.totalPaid) }}</span>
            </div>
            <div style="display:flex;gap:4rem;border-top:2px solid var(--border-color);padding-top:.5rem;font-size:1rem;">
              <span style="font-weight:700;">Reste à payer :</span>
              <span style="font-weight:800;min-width:140px;text-align:right;" :style="{ color: globalStats.totalReste > 0 ? 'var(--warning,#d97706)' : 'var(--success,#10b981)' }">
                {{ fmtAmt(globalStats.totalReste) }}
              </span>
            </div>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ArrowLeft, Loader2, Plus } from 'lucide-vue-next'
import {
  getUserById, getSalariesByUser, getAllPaymentsByUser,
  formatDate, formatAmount, getSalaryStatusLabel, getSalaryStatusClass
} from '../../services/salaryServices.js'

const route = useRoute()

const user            = ref(null)
const salaries        = ref([])
const paymentMap      = ref({})    // salaryId → payments[]
const loading         = ref(false)
const loadingSalaries = ref(false)
const error           = ref(null)

const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6']
function avatarColor(u) { return COLORS[(parseInt(u.id,10)||0) % COLORS.length] }
function initials(u) { return (u.lastname?.[0] ?? '') + (u.firstname?.[0] ?? '') || '?' }

function fmtTs(v) {
  if (!v) return '—'
  const d = typeof v === 'number' ? new Date(v * 1000) : new Date(v)
  return isNaN(d) ? '—' : d.toLocaleDateString('fr-FR')
}
function fmtAmt(v) {
  if (v === null || v === undefined) return '—'
  return Number(v).toLocaleString('fr-FR', { minimumFractionDigits: 2 }) + ' MGA'
}

function sumPayments(payments) {
  return (payments || []).reduce((s, p) => s + parseFloat(p.amount ?? 0), 0)
}

function getResteAPayer(sal, usePaymentMap = false) {
  const amount = parseFloat(sal.amount ?? 0)
  let paid
  if (usePaymentMap && paymentMap.value[sal.id]) {
    paid = sumPayments(paymentMap.value[sal.id])
  } else {
    paid = parseFloat(sal.totalpaid ?? 0)
  }
  return Math.max(0, amount - paid)
}

function statusLabel(sal) { return getSalaryStatusLabel(sal) }
function statusClass(sal)  { return getSalaryStatusClass(sal) }

// Calculs globaux (réactifs)
const globalStats = computed(() => {
  let totalAmount = 0, totalPaid = 0, paidCount = 0, unpaidCount = 0
  salaries.value.forEach(sal => {
    totalAmount += parseFloat(sal.amount ?? 0)
    const paid = paymentMap.value[sal.id]
      ? sumPayments(paymentMap.value[sal.id])
      : parseFloat(sal.totalpaid ?? 0)
    totalPaid += paid
    if (sal.paye === '1' || sal.paye === 1) paidCount++
    else unpaidCount++
  })
  return { totalAmount, totalPaid, totalReste: Math.max(0, totalAmount - totalPaid), paidCount, unpaidCount }
})

onMounted(async () => {
  loading.value = true
  try {
    user.value = await getUserById(route.params.id)
    loadingSalaries.value = true
    salaries.value = await getSalariesByUser(route.params.id)
    // Chargement immédiat de TOUS les paiements de TOUS les salaires,
    // afin que les KPIs en haut de page et les tableaux de paiements en bas
    // soient déjà complets à l'affichage — aucun clic n'est nécessaire.
    paymentMap.value = await getAllPaymentsByUser(salaries.value)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
    loadingSalaries.value = false
  }
})
</script>

<style scoped>
@keyframes spin { to { transform: rotate(360deg); } }
.big-av { width:80px;height:80px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-size:1.75rem;font-weight:700;margin:0 auto; }
.kpi { display:flex;flex-direction:column;gap:.35rem;padding:.875rem; }
.kpi-val { font-size:1.15rem;font-weight:700; }
</style>