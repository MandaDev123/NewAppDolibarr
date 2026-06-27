<template>
  <div class="layout-container" style="flex-direction: column;">
    <nav class="topbar">
      <div style="display: flex; align-items: center; gap: 1rem;">
        <div class="logo">
          <Briefcase style="color: var(--accent-primary); width: 24px; height: 24px;" />
          <span style="font-weight: 700; font-size: 1.25rem;">Salarium</span>
        </div>
        <div style="display: flex; gap: 1rem; margin-left: 2rem;">
          <router-link to="/frontoffice/employees" class="nav-link" active-class="nav-link-active">Salariés</router-link>
          <router-link to="/frontoffice/salary/create" class="nav-link" active-class="nav-link-active">Nouveau Salaire</router-link>
        </div>
      </div>
      
      <div>
        <router-link to="/backoffice/login" class="btn btn-outline" style="padding: 0.4rem 1rem;">
          <Settings style="width: 16px; height: 16px;" />
          Backoffice
        </router-link>
      </div>
    </nav>
    
    <main class="main-content">
      <div class="page-container animate-fade-in">
        <router-view></router-view>
      </div>
    </main>
  </div>
</template>

<script setup>
import { Briefcase, Settings } from 'lucide-vue-next'
</script>

<style scoped>
.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}
.nav-link {
  color: var(--text-secondary);
  text-decoration: none;
  font-weight: 500;
  padding: 0.5rem 0;
  border-bottom: 2px solid transparent;
  transition: all var(--transition-fast);
}
.nav-link:hover {
  color: var(--text-primary);
}
.nav-link-active {
  color: var(--accent-primary);
  border-bottom-color: var(--accent-primary);
}
</style>
