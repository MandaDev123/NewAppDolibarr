<template>
  <div class="layout-container">
    <aside class="sidebar">
      <div class="sidebar-header">
        <div style="display: flex; align-items: center; gap: 0.5rem; justify-content: center;">
          <Shield style="color: var(--danger); width: 24px; height: 24px;" />
          <span style="font-weight: 700; font-size: 1.25rem;">Backoffice</span>
        </div>
      </div>
      
      <nav class="sidebar-nav">
        <router-link to="/backoffice/dashboard" class="nav-item" active-class="active">
          <LayoutDashboard style="width: 18px; height: 18px;" />
          Dashboard
        </router-link>
        <router-link to="/backoffice/import" class="nav-item" active-class="active">
          <UploadCloud style="width: 18px; height: 18px;" />
          Import
        </router-link>
        <router-link to="/backoffice/reset" class="nav-item" active-class="active">
          <Trash2 style="width: 18px; height: 18px;" />
          Réinitialisation
        </router-link>
        <router-link to="/backoffice/feries" class="nav-item" active-class="active">
          <Calendar style="width: 18px; height: 18px;" />
          Jours fériés
        </router-link>
      </nav>
      
      <div style="padding: 1.5rem; border-top: 1px solid var(--border-color);">
        <button @click="logout" class="btn btn-outline" style="width: 100%;">
          <LogOut style="width: 16px; height: 16px;" />
          Déconnexion
        </button>
      </div>
    </aside>
    
    <main class="main-content">
      <header class="topbar">
        <h2 style="font-size: 1.125rem; font-weight: 500; margin: 0;">Administration</h2>
        <div style="display: flex; gap: 1rem;">
          <router-link to="/frontoffice" class="btn btn-primary" style="padding: 0.4rem 1rem;">
            <ExternalLink style="width: 16px; height: 16px;" />
            Vers Frontoffice
          </router-link>
        </div>
      </header>
      
      <div class="page-container animate-fade-in">
        <router-view></router-view>
      </div>
    </main>
  </div>
</template>

<script setup>
import { Shield, LayoutDashboard, UploadCloud, Trash2, LogOut, ExternalLink } from 'lucide-vue-next'
import { useRouter } from 'vue-router'

const router = useRouter()

const logout = () => {
  localStorage.removeItem('isBackofficeAuthenticated')
  router.push({ name: 'Login' })
}
</script>
