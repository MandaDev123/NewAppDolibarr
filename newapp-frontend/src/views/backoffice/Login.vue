<template>
  <div class="layout-container" style="align-items: center; justify-content: center; background: linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-primary) 100%);">
    <div class="glass-panel" style="width: 100%; max-width: 400px; padding: 2.5rem;">
      <div style="text-align: center; margin-bottom: 2rem;">
        <div style="display: inline-flex; align-items: center; justify-content: center; width: 64px; height: 64px; border-radius: 50%; background: var(--accent-light); margin-bottom: 1rem;">
          <LockKeyhole style="color: var(--accent-primary); width: 32px; height: 32px;" />
        </div>
        <h1 style="font-size: 1.5rem; margin-bottom: 0.5rem;">Accès Backoffice</h1>
        <p style="color: var(--text-secondary); font-size: 0.875rem;">Veuillez saisir le code unique</p>
      </div>
      
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label">Code d'accès</label>
          <input 
            type="password" 
            v-model="password" 
            class="form-input" 
            placeholder="Code unique"
            required
          />
        </div>
        
        <div v-if="error" style="color: var(--danger); font-size: 0.875rem; margin-bottom: 1rem; text-align: center;">
          {{ error }}
        </div>
        
        <button type="submit" class="btn btn-primary" style="width: 100%; padding: 0.75rem;">
          Se connecter
        </button>
      </form>
      
      <div style="text-align: center; margin-top: 1.5rem;">
        <router-link to="/frontoffice" style="color: var(--text-secondary); font-size: 0.875rem; text-decoration: none;">
          &larr; Retour au Frontoffice
        </router-link>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { LockKeyhole } from 'lucide-vue-next'

const router = useRouter()
const password = ref('admin123') // Default password as requested
const error = ref('')

const handleLogin = () => {
  if (password.value === 'admin123') {
    localStorage.setItem('isBackofficeAuthenticated', 'true')
    router.push({ name: 'Dashboard' })
  } else {
    error.value = 'Code invalide'
  }
}
</script>
