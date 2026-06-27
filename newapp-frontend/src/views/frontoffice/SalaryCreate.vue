<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Paiement de Salaire</h1>
        <p class="page-subtitle">Créer et fractionner un paiement</p>
      </div>
      <router-link to="/frontoffice/employees" class="btn btn-outline">
        <ArrowLeft style="width: 16px; height: 16px;" />
        Retour à la liste
      </router-link>
    </div>
    
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 1.5rem; align-items: start;">
      
      <!-- Formulaire principal -->
      <div class="card">
        <form @submit.prevent="submitSalary" style="display: flex; flex-direction: column; gap: 1.5rem;">
          
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem;">
            <div class="form-group">
              <label class="form-label">Employé</label>
              <select v-model="formData.employeeId" class="form-input" required>
                <option value="" disabled>Sélectionner un employé</option>
                <option value="101">Alice Dupont (IT)</option>
                <option value="102">Marc Martin (IT)</option>
                <option value="103">Sophie Leroy (HR)</option>
                <option value="105">Emma Roux (Marketing)</option>
              </select>
            </div>
            
            <div class="form-group">
              <label class="form-label">Montant Total (€)</label>
              <input type="number" v-model.number="formData.totalAmount" class="form-input" min="0" required />
            </div>
          </div>
          
          <div class="form-group">
            <label class="form-label">Mois de référence</label>
            <input type="month" v-model="formData.month" class="form-input" required />
          </div>
          
          <div style="border-top: 1px solid var(--border-color); padding-top: 1.5rem;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem;">
              <h3 style="font-size: 1.125rem;">Échéances de paiement</h3>
              <button type="button" @click="addInstallment" class="btn btn-outline" style="padding: 0.25rem 0.75rem; font-size: 0.75rem;">
                <Plus style="width: 14px; height: 14px;" /> Ajouter
              </button>
            </div>
            
            <div v-for="(inst, index) in formData.installments" :key="index" style="display: flex; gap: 1rem; align-items: flex-end; margin-bottom: 1rem; background: var(--bg-tertiary); padding: 1rem; border-radius: var(--radius-md);">
              <div class="form-group" style="flex: 1; margin: 0;">
                <label class="form-label">Montant (€)</label>
                <input type="number" v-model.number="inst.amount" class="form-input" min="0" required />
              </div>
              <div class="form-group" style="flex: 1; margin: 0;">
                <label class="form-label">Date prévue</label>
                <input type="date" v-model="inst.date" class="form-input" required />
              </div>
              <button type="button" @click="removeInstallment(index)" class="btn btn-danger" style="padding: 0.625rem;" :disabled="formData.installments.length === 1">
                <Trash2 style="width: 18px; height: 18px;" />
              </button>
            </div>
            
            <div v-if="remainingAmount !== 0" :style="{ color: remainingAmount > 0 ? 'var(--warning)' : 'var(--danger)', fontSize: '0.875rem', marginTop: '0.5rem', fontWeight: '500' }">
              Reste à répartir : {{ remainingAmount }} €
            </div>
          </div>
          
          <div style="display: flex; justify-content: flex-end; gap: 1rem; margin-top: 1rem;">
            <button type="button" class="btn btn-outline">Annuler</button>
            <button type="submit" class="btn btn-primary" :disabled="remainingAmount !== 0">
              <CheckCircle style="width: 16px; height: 16px;" />
              Valider le paiement
            </button>
          </div>
        </form>
      </div>
      
      <!-- Résumé Sidebar -->
      <div class="card" style="position: sticky; top: 100px; background: linear-gradient(180deg, var(--accent-light) 0%, var(--bg-secondary) 100%); border-color: var(--accent-light);">
        <h3 style="margin-bottom: 1.5rem; font-size: 1.125rem; color: var(--accent-primary); display: flex; align-items: center; gap: 0.5rem;">
          <Receipt style="width: 20px; height: 20px;" /> Récapitulatif
        </h3>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 0.75rem;">
          <span style="color: var(--text-secondary);">Total</span>
          <span style="font-weight: 600;">{{ formData.totalAmount || 0 }} €</span>
        </div>
        
        <div style="display: flex; justify-content: space-between; margin-bottom: 1.5rem;">
          <span style="color: var(--text-secondary);">Nb d'échéances</span>
          <span style="font-weight: 600;">{{ formData.installments.length }}</span>
        </div>
        
        <div style="border-top: 1px dashed var(--border-color); padding-top: 1.5rem;">
          <div v-for="(inst, i) in formData.installments" :key="'rec-'+i" style="display: flex; justify-content: space-between; margin-bottom: 0.5rem; font-size: 0.875rem;">
            <span style="color: var(--text-secondary);">Échéance {{ i + 1 }}</span>
            <span>{{ inst.amount || 0 }} €</span>
          </div>
        </div>
      </div>
      
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Plus, Trash2, CheckCircle, Receipt } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()

const formData = ref({
  employeeId: '',
  totalAmount: 3000,
  month: '2023-10',
  installments: [
    { amount: 3000, date: '2023-10-25' }
  ]
})

onMounted(() => {
  if (route.query.employeeId) {
    formData.value.employeeId = route.query.employeeId
  }
})

const remainingAmount = computed(() => {
  const sum = formData.value.installments.reduce((acc, curr) => acc + (curr.amount || 0), 0)
  return (formData.value.totalAmount || 0) - sum
})

const addInstallment = () => {
  const date = new Date()
  date.setDate(date.getDate() + 15 * formData.value.installments.length)
  formData.value.installments.push({ 
    amount: remainingAmount.value > 0 ? remainingAmount.value : 0, 
    date: date.toISOString().split('T')[0] 
  })
}

const removeInstallment = (index) => {
  if (formData.value.installments.length > 1) {
    formData.value.installments.splice(index, 1)
  }
}

const submitSalary = () => {
  if (remainingAmount.value !== 0) {
    alert("Le montant des échéances doit être égal au montant total.")
    return
  }
  alert("Paiement enregistré avec succès (Simulation).")
  router.push({ name: 'EmployeeList' })
}
</script>
