<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Liste des salariés</h1>
        <p class="page-subtitle">Consulter les informations et l'historique salarial</p>
      </div>
    </div>

    <div v-if="error" style="background:#fef2f2;border:1px solid var(--danger);color:var(--danger);padding:1rem;border-radius:var(--radius-md);margin-bottom:1rem;">{{ error }}</div>

    <div class="card" style="padding:0;overflow:hidden;">
      <div v-if="loading" style="padding:3rem;text-align:center;color:var(--text-muted);display:flex;align-items:center;justify-content:center;gap:.75rem;">
        <Loader2 style="width:20px;height:20px;animation:spin 1s linear infinite;" /> Chargement des salariés…
      </div>
      <div v-else style="overflow-x:auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>Employé</th>
              <th>Login</th>
              <th>Poste</th>
              <th>Genre</th>
              <th style="text-align:right;">Heures / sem.</th>
              <th style="text-align:right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="u in users" :key="u.id">
              <td>
                <div style="display:flex;align-items:center;gap:.75rem;">
                  <div class="av" :style="{ background: avatarColor(u) }">{{ initials(u) }}</div>
                  <div>
                    <div style="font-weight:600;">{{ u.lastname }} {{ u.firstname }}</div>
                    <div style="font-size:.72rem;color:var(--text-muted);">ID #{{ u.id }}</div>
                  </div>
                </div>
              </td>
              <td style="font-family:var(--mono);font-size:.85rem;color:var(--text-secondary);">@{{ u.login }}</td>
              <td>
                <span v-if="u.job" class="badge badge-info" style="font-size:.72rem;">{{ u.job }}</span>
                <span v-else style="color:var(--text-muted);">—</span>
              </td>
              <td>
                <span :style="{ fontWeight: 600, color: u.gender === 'man' ? '#6366f1' : u.gender === 'woman' ? '#ec4899' : 'var(--text-muted)' }">
                  {{ u.gender === 'man' ? '♂ Homme' : u.gender === 'woman' ? '♀ Femme' : '—' }}
                </span>
              </td>
              <td style="text-align:right;">{{ u.weeklyhours || 35 }} h</td>
              <td style="text-align:right;">
                <router-link :to="`/frontoffice/employees/${u.id}`" class="btn btn-outline" style="padding:.25rem .75rem;font-size:.75rem;display:inline-flex;align-items:center;gap:.3rem;">
                  <Eye style="width:13px;height:13px;" /> Voir la fiche
                </router-link>
              </td>
            </tr>
            <tr v-if="users.length === 0 && !loading">
              <td colspan="6" style="text-align:center;padding:3rem;color:var(--text-muted);">Aucun salarié trouvé.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="!loading && users.length > 0"
        style="padding:.75rem 1.25rem;border-top:1px solid var(--border-color);font-size:.8rem;color:var(--text-muted);">
        {{ users.length }} salarié(s)
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { Loader2, Eye } from 'lucide-vue-next'
import { getUsersExtended } from '../../services/salaryServices.js'

const users   = ref([])
const loading = ref(false)
const error   = ref(null)

const COLORS = ['#6366f1','#ec4899','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ef4444','#14b8a6']
function avatarColor(u) { return COLORS[(parseInt(u.id,10)||0) % COLORS.length] }
function initials(u) { return (u.lastname?.[0] ?? '') + (u.firstname?.[0] ?? '') || '?' }

onMounted(async () => {
  loading.value = true
  try {
    users.value = await getUsersExtended()
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
@keyframes spin { to { transform: rotate(360deg); } }
.av { width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:700;font-size:.82rem;flex-shrink:0; }
</style>