<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Réinitialisation</h1>
        <p class="page-subtitle">Zone de danger : effacement des données</p>
      </div>
    </div>

    <!-- ── RÉSULTAT ─────────────────────────────────────────────── -->
    <div
      v-if="result"
      class="card"
      style="max-width: 640px; margin: 0 auto; text-align: center;
             border-color: rgba(16,185,129,0.4); background: rgba(16,185,129,0.05);"
    >
      <CheckCircle2 style="width: 48px; height: 48px; color: var(--success, #10b981); margin-bottom: 1rem;" />
      <h2 style="color: var(--success, #10b981); margin-bottom: 0.75rem;">Réinitialisation terminée</h2>

      <!-- Compteurs -->
      <div style="display: flex; justify-content: center; gap: 2rem; margin: 1.5rem 0; flex-wrap: wrap;">
        <div style="text-align: center;">
          <div style="font-size: 2rem; font-weight: 700;">{{ result.deletedPayments }}</div>
          <div style="color: var(--text-muted); font-size: 0.8rem;">paiement(s)</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 2rem; font-weight: 700;">{{ result.deletedSalaries }}</div>
          <div style="color: var(--text-muted); font-size: 0.8rem;">salaire(s)</div>
        </div>
        <div style="text-align: center;">
          <div style="font-size: 2rem; font-weight: 700;">{{ result.deletedUsers }}</div>
          <div style="color: var(--text-muted); font-size: 0.8rem;">utilisateur(s)</div>
        </div>
      </div>

      <!-- Utilisateurs protégés (informatif) -->
      <div
        v-if="result.protectedUsers?.length > 0"
        style="background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.25);
               border-radius: var(--radius-md); padding: 0.875rem 1rem; text-align: left; margin-bottom: 1rem;"
      >
        <p style="font-size: 0.8rem; font-weight: 600; color: var(--accent-primary, #6366f1); margin-bottom: 0.5rem;">
          🔒 {{ result.protectedUsers.length }} compte(s) conservé(s) :
        </p>
        <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.78rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.2rem;">
          <li v-for="u in result.protectedUsers" :key="u.id">
            <strong>{{ u.login }}</strong> — {{ u.reason }}
          </li>
        </ul>
      </div>

      <!-- Erreurs non bloquantes -->
      <div
        v-if="result.errors?.length > 0"
        style="background: rgba(239,68,68,0.07); border: 1px solid rgba(239,68,68,0.3);
               border-radius: var(--radius-md); padding: 0.75rem 1rem; text-align: left; margin-bottom: 1rem;"
      >
        <p style="font-size: 0.8rem; font-weight: 600; color: var(--danger); margin-bottom: 0.4rem;">
          {{ result.errors.length }} erreur(s) non bloquante(s) :
        </p>
        <ul style="margin: 0; padding-left: 1.2rem; font-size: 0.78rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.15rem;">
          <li v-for="(e, i) in result.errors" :key="i">{{ e }}</li>
        </ul>
      </div>

      <button class="btn btn-outline" @click="resetUI">
        <RefreshCw style="width: 15px; height: 15px;" />
        Retour
      </button>
    </div>

    <!-- ── PROGRESSION ───────────────────────────────────────────── -->
    <div
      v-else-if="running"
      class="card"
      style="max-width: 640px; margin: 0 auto; text-align: center;"
    >
      <Loader2 style="width: 40px; height: 40px; color: var(--danger); margin-bottom: 1rem; animation: spin 1s linear infinite;" />
      <h2 style="margin-bottom: 0.5rem;">Suppression en cours…</h2>
      <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1.5rem;">
        Ne fermez pas cette page.
      </p>

      <!-- Barre de progression -->
      <div style="background: var(--bg-secondary); border-radius: 999px; height: 10px; overflow: hidden; margin-bottom: 0.75rem;">
        <div
          style="height: 100%; background: var(--danger); border-radius: 999px; transition: width 0.2s ease;"
          :style="{ width: progressPercent + '%' }"
        ></div>
      </div>
      <p style="font-size: 0.8rem; color: var(--text-muted);">
        {{ progress.step > 0 ? `${progress.step} / ${progress.total} — ` : '' }}{{ progress.label }}
      </p>
    </div>

    <!-- ── ÉTAT INITIAL ──────────────────────────────────────────── -->
    <template v-else>

      <!-- Résumé des données actuelles -->
      <div class="card" style="max-width: 640px; margin: 0 auto 1.5rem;">
        <h3 style="font-size: 0.9rem; font-weight: 600; margin-bottom: 1rem; color: var(--text-secondary);">
          Données actuellement en base
        </h3>

        <div style="display: flex; justify-content: center; gap: 2.5rem; margin-bottom: 1.25rem; flex-wrap: wrap;">
          <div style="text-align: center;">
            <div v-if="loadingSummary" style="font-size: 1.75rem; color: var(--text-muted);">…</div>
            <div v-else style="font-size: 1.75rem; font-weight: 700;">{{ summary.paymentsCount }}</div>
            <div style="color: var(--text-muted); font-size: 0.8rem;">paiement(s)</div>
          </div>
          <div style="text-align: center;">
            <div v-if="loadingSummary" style="font-size: 1.75rem; color: var(--text-muted);">…</div>
            <div v-else style="font-size: 1.75rem; font-weight: 700;">{{ summary.salariesCount }}</div>
            <div style="color: var(--text-muted); font-size: 0.8rem;">salaire(s)</div>
          </div>
          <div style="text-align: center;">
            <div v-if="loadingSummary" style="font-size: 1.75rem; color: var(--text-muted);">…</div>
            <div v-else style="font-size: 1.75rem; font-weight: 700; color: var(--danger);">{{ summary.usersCount }}</div>
            <div style="color: var(--text-muted); font-size: 0.8rem;">utilisateur(s) importé(s)</div>
          </div>
        </div>

        <!-- Comptes protégés -->
        <div
          v-if="summary.protectedUsers?.length > 0"
          style="background: rgba(99,102,241,0.06); border: 1px solid rgba(99,102,241,0.2);
                 border-radius: var(--radius-md); padding: 0.875rem 1rem; font-size: 0.8rem;"
        >
          <p style="font-weight: 600; color: var(--accent-primary, #6366f1); margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem;">
            <ShieldCheck style="width: 14px; height: 14px;" />
            {{ summary.protectedUsers.length }} compte(s) protégé(s) — ne seront pas supprimés :
          </p>
          <ul style="margin: 0; padding-left: 1.2rem; color: var(--text-secondary); display: flex; flex-direction: column; gap: 0.2rem;">
            <li v-for="u in summary.protectedUsers" :key="u.id">
              <strong>{{ u.login }}</strong>
              <span style="color: var(--text-muted);"> — {{ u.reason }}</span>
            </li>
          </ul>
        </div>
      </div>

      <!-- Carte danger -->
      <div
        class="card"
        style="border-color: rgba(239,68,68,0.3); background: rgba(239,68,68,0.05);
               max-width: 640px; margin: 0 auto; text-align: center;"
      >
        <AlertTriangle style="color: var(--danger); width: 48px; height: 48px; margin-bottom: 1rem;" />
        <h2 style="color: var(--danger); margin-bottom: 1rem;">Attention !</h2>
        <p style="margin-bottom: 1.5rem; color: var(--text-secondary); line-height: 1.7;">
          Vous êtes sur le point de supprimer <strong>tous les paiements</strong>,
          <strong>toutes les fiches salaires</strong> et
          <strong>tous les utilisateurs importés</strong>.
          Les comptes administrateurs Dolibarr sont protégés et conservés.
          Cette action est <strong>irréversible</strong>.
        </p>

        <!-- Étape 1 : bouton initial -->
        <template v-if="step === 1">
          <button
            class="btn btn-danger"
            style="padding: 0.875rem 2rem; font-size: 1rem; font-weight: 600;"
            :disabled="isBaseEmpty"
            @click="step = 2"
          >
            <Trash2 style="width: 20px; height: 20px;" />
            Réinitialiser toutes les données
          </button>
          <p
            v-if="isBaseEmpty && !loadingSummary"
            style="margin-top: 0.75rem; font-size: 0.8rem; color: var(--text-muted);"
          >
            Aucune donnée à supprimer.
          </p>
        </template>

        <!-- Étape 2 : confirmation par saisie -->
        <template v-else-if="step === 2">
          <div
            style="background: var(--bg-primary); border: 1px solid rgba(239,68,68,0.4);
                   border-radius: var(--radius-md); padding: 1.25rem; margin-bottom: 1.25rem; text-align: left;"
          >
            <p style="font-size: 0.875rem; color: var(--text-secondary); margin-bottom: 0.75rem;">
              Pour confirmer, tapez
              <strong style="color: var(--danger); font-family: var(--mono);">SUPPRIMER</strong>
              dans le champ ci-dessous :
            </p>
            <input
              v-model="confirmText"
              type="text"
              class="form-input"
              placeholder="SUPPRIMER"
              style="text-align: center; font-size: 1rem; letter-spacing: 0.05em;"
              @keyup.enter="confirmText === 'SUPPRIMER' && launch()"
            />
          </div>
          <div style="display: flex; gap: 1rem; justify-content: center;">
            <button class="btn btn-outline" @click="step = 1; confirmText = ''">
              Annuler
            </button>
            <button
              class="btn btn-danger"
              style="padding: 0.875rem 2rem; font-weight: 600;"
              :disabled="confirmText !== 'SUPPRIMER'"
              @click="launch"
            >
              <Trash2 style="width: 18px; height: 18px;" />
              Confirmer la suppression
            </button>
          </div>
        </template>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { AlertTriangle, Trash2, Loader2, CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-vue-next'
import { resetAllData, getDataSummary } from '../../services/resetServices.js'

const step        = ref(1)
const confirmText = ref('')
const running     = ref(false)
const result      = ref(null)

const summary        = ref({ paymentsCount: 0, salariesCount: 0, usersCount: 0, protectedUsers: [] })
const loadingSummary = ref(false)

const progress = ref({ step: 0, total: 0, label: '…' })

const progressPercent = computed(() => {
  if (!progress.value.total) return 0
  return Math.min(100, Math.round((progress.value.step / progress.value.total) * 100))
})

const isBaseEmpty = computed(() =>
  !loadingSummary.value &&
  summary.value.paymentsCount === 0 &&
  summary.value.salariesCount === 0 &&
  summary.value.usersCount === 0
)

async function loadSummary() {
  loadingSummary.value = true
  try {
    summary.value = await getDataSummary()
  } catch {
    // non bloquant
  } finally {
    loadingSummary.value = false
  }
}

async function launch() {
  if (confirmText.value !== 'SUPPRIMER') return
  running.value = true
  try {
    result.value = await resetAllData(p => { progress.value = p })
  } catch (e) {
    result.value = {
      deletedPayments: 0, deletedSalaries: 0, deletedUsers: 0,
      protectedUsers: [], errors: [e.message], total: 0
    }
  } finally {
    running.value = false
  }
}

function resetUI() {
  result.value  = null
  confirmText.value = ''
  step.value    = 1
  loadSummary()
}

onMounted(loadSummary)
</script>

<style scoped>
@keyframes spin { to { transform: rotate(360deg); } }

.btn-danger {
  background: var(--danger, #ef4444);
  color: #fff;
  border: none;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  border-radius: var(--radius-md);
  cursor: pointer;
  padding: 0.6rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  transition: opacity 0.15s;
}
.btn-danger:hover:not(:disabled) { opacity: 0.88; }
.btn-danger:disabled { opacity: 0.45; cursor: not-allowed; }
</style>