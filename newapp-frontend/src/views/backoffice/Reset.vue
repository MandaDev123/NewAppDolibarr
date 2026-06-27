<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Réinitialisation</h1>
        <p class="page-subtitle">Zone de danger : effacement des données</p>
      </div>
    </div>
    
    <div class="card" style="border-color: rgba(239, 68, 68, 0.3); background-color: rgba(239, 68, 68, 0.05); max-width: 600px; margin: 0 auto; text-align: center;">
      <AlertTriangle style="color: var(--danger); width: 48px; height: 48px; margin-bottom: 1rem;" />
      <h2 style="color: var(--danger); margin-bottom: 1rem;">Attention !</h2>
      <p style="margin-bottom: 2rem; color: var(--text-secondary);">
        Vous êtes sur le point de réinitialiser complètement la base de données. 
        Toutes les informations concernant les salariés, les paiements et les paramètres seront définitivement supprimées. 
        Cette action est irréversible.
      </p>
      
      <button @click="confirmReset" class="btn btn-danger" style="padding: 1rem 2rem; font-size: 1rem; font-weight: 600;">
        <Trash2 style="width: 20px; height: 20px;" />
        Réinitialiser toutes les données
      </button>
    </div>
  </div>
</template>

<script setup>
import { AlertTriangle, Trash2 } from 'lucide-vue-next'

const confirmReset = () => {
  if (confirm('Êtes-vous absolument sûr de vouloir tout supprimer ? Cette action est irréversible.')) {
    alert('Les données ont été réinitialisées avec succès (Simulation).')
  }
}
</script>
