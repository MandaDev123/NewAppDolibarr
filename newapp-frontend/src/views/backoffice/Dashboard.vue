<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Tableau de bord</h1>
        <p class="page-subtitle">Aperçu des statistiques salariales</p>
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; margin-bottom: 2rem;">
      <div class="card" style="display: flex; flex-direction: column; gap: 0.5rem;">
        <span style="color: var(--text-secondary); font-size: 0.875rem; font-weight: 500;">Total des Salaires Versés</span>
        <span style="font-size: 2rem; font-weight: 700; font-family: var(--font-display);">245,000 €</span>
        <span style="color: var(--success); font-size: 0.75rem; display: flex; align-items: center; gap: 0.25rem;">
          <TrendingUp style="width: 14px; height: 14px;" /> +12.5% ce mois
        </span>
      </div>
      <div class="card" style="display: flex; flex-direction: column; gap: 0.5rem;">
        <span style="color: var(--text-secondary); font-size: 0.875rem; font-weight: 500;">Salariés Actifs</span>
        <span style="font-size: 2rem; font-weight: 700; font-family: var(--font-display);">42</span>
        <span style="color: var(--text-muted); font-size: 0.75rem;">Stable</span>
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; margin-bottom: 2rem;">
      <div class="card">
        <h3 style="margin-bottom: 1.5rem; font-size: 1.125rem;">Montant de salaire par mois</h3>
        <div style="height: 300px; position: relative;">
          <Bar :data="monthlyData" :options="monthlyOptions" />
        </div>
      </div>
      
      <div class="card">
        <h3 style="margin-bottom: 1.5rem; font-size: 1.125rem;">Salaire par genre</h3>
        <div style="height: 300px; position: relative; display: flex; justify-content: center;">
          <Doughnut :data="genderData" :options="genderOptions" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { TrendingUp } from 'lucide-vue-next'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
  ArcElement
} from 'chart.js'
import { Bar, Doughnut } from 'vue-chartjs'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

// Mock Data for Monthly Salary
const monthlyData = {
  labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
  datasets: [
    {
      label: 'Salaires versés (€)',
      backgroundColor: '#6366f1',
      borderRadius: 6,
      data: [40000, 39000, 41000, 40500, 42000, 42500]
    }
  ]
}

const monthlyOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: { display: false }
  },
  scales: {
    y: {
      beginAtZero: true,
      grid: {
        color: 'rgba(0, 0, 0, 0.05)'
      }
    },
    x: {
      grid: {
        display: false
      }
    }
  }
}

// Mock Data for Gender
const genderData = {
  labels: ['Hommes', 'Femmes'],
  datasets: [
    {
      backgroundColor: ['#6366f1', '#10b981'],
      borderWidth: 0,
      data: [130000, 115000]
    }
  ]
}

const genderOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      position: 'bottom'
    }
  },
  cutout: '70%'
}
</script>
