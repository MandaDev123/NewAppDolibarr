<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Liste des Salariés</h1>
        <p class="page-subtitle">Gérez et recherchez vos employés</p>
      </div>
      <router-link to="/frontoffice/salary/create" class="btn btn-primary">
        <Plus style="width: 16px; height: 16px;" />
        Nouveau Salaire
      </router-link>
    </div>
    
    <div class="card" style="margin-bottom: 2rem;">
      <h3 style="margin-bottom: 1rem; font-size: 1rem;">Recherche multicritère</h3>
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
        <div>
          <label class="form-label">Nom / Prénom</label>
          <div style="position: relative;">
            <Search style="position: absolute; left: 10px; top: 50%; transform: translateY(-50%); width: 16px; height: 16px; color: var(--text-muted);" />
            <input type="text" v-model="filters.name" class="form-input" style="padding-left: 2.25rem;" placeholder="Rechercher..." />
          </div>
        </div>
        <div>
          <label class="form-label">Département</label>
          <select v-model="filters.department" class="form-input">
            <option value="">Tous les départements</option>
            <option value="IT">IT & Tech</option>
            <option value="HR">Ressources Humaines</option>
            <option value="Sales">Ventes</option>
            <option value="Marketing">Marketing</option>
          </select>
        </div>
        <div>
          <label class="form-label">Statut</label>
          <select v-model="filters.status" class="form-input">
            <option value="">Tous les statuts</option>
            <option value="active">Actif</option>
            <option value="inactive">Inactif</option>
          </select>
        </div>
      </div>
    </div>
    
    <div class="card" style="padding: 0; overflow: hidden;">
      <div style="overflow-x: auto;">
        <table class="data-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Employé</th>
              <th>Poste</th>
              <th>Département</th>
              <th>Statut</th>
              <th style="text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="emp in filteredEmployees" :key="emp.id">
              <td style="font-family: var(--mono); color: var(--text-muted);">#{{ emp.id }}</td>
              <td>
                <div style="font-weight: 500;">{{ emp.name }}</div>
                <div style="font-size: 0.75rem; color: var(--text-muted);">{{ emp.email }}</div>
              </td>
              <td>{{ emp.role }}</td>
              <td>{{ emp.department }}</td>
              <td>
                <span :class="['badge', emp.status === 'active' ? 'badge-success' : 'badge-warning']">
                  {{ emp.status === 'active' ? 'Actif' : 'Inactif' }}
                </span>
              </td>
              <td style="text-align: right;">
                <router-link :to="`/frontoffice/salary/create?employeeId=${emp.id}`" class="btn btn-outline" style="padding: 0.25rem 0.75rem; font-size: 0.75rem;">
                  Payer
                </router-link>
              </td>
            </tr>
            <tr v-if="filteredEmployees.length === 0">
              <td colspan="6" style="text-align: center; padding: 3rem; color: var(--text-muted);">
                Aucun salarié ne correspond à votre recherche.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { Plus, Search } from 'lucide-vue-next'

const filters = ref({
  name: '',
  department: '',
  status: ''
})

const employees = ref([
  { id: '101', name: 'Alice Dupont', email: 'alice.d@example.com', role: 'Développeuse Frontend', department: 'IT', status: 'active' },
  { id: '102', name: 'Marc Martin', email: 'marc.m@example.com', role: 'Chef de projet', department: 'IT', status: 'active' },
  { id: '103', name: 'Sophie Leroy', email: 'sophie.l@example.com', role: 'DRH', department: 'HR', status: 'active' },
  { id: '104', name: 'Lucas Petit', email: 'lucas.p@example.com', role: 'Commercial', department: 'Sales', status: 'inactive' },
  { id: '105', name: 'Emma Roux', email: 'emma.r@example.com', role: 'Designer', department: 'Marketing', status: 'active' },
])

const filteredEmployees = computed(() => {
  return employees.value.filter(emp => {
    const matchName = emp.name.toLowerCase().includes(filters.value.name.toLowerCase()) || 
                      emp.email.toLowerCase().includes(filters.value.name.toLowerCase())
    const matchDept = filters.value.department === '' || emp.department === filters.value.department
    const matchStatus = filters.value.status === '' || emp.status === filters.value.status
    
    return matchName && matchDept && matchStatus
  })
})
</script>
