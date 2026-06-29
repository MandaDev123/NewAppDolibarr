<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Import de données Dolibarr</h1>
        <p class="page-subtitle">Importez vos fichiers de base et archives d'images liés de manière exacte</p>
      </div>
    </div>
    
    <div class="card" style="max-width: 800px; margin: 0 auto;">
      <form @submit.prevent="handleImport" style="display: flex; flex-direction: column; gap: 2rem;">
        
        <div>
          <label class="form-label">Fichier Employés (Feuille 1 CSV)</label>
          <div class="upload-zone">
            <FileSpreadsheet style="color: var(--text-muted); width: 32px; height: 32px; margin-bottom: 0.5rem;" />
            <span style="font-weight: 500;">Cliquez pour sélectionner la liste des employés</span>
            <input type="file" accept=".csv" class="file-input" @change="e => fileEmployees = e.target.files[0]" />
          </div>
          <div v-if="fileEmployees" style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--success); display: flex; align-items: center; gap: 0.25rem;">
            <CheckCircle2 style="width: 14px; height: 14px;" /> {{ fileEmployees.name }}
          </div>
        </div>
        
        <div>
          <label class="form-label">Fichier Salaires & Paiements (Feuille 2 CSV)</label>
          <div class="upload-zone">
            <FileSpreadsheet style="color: var(--text-muted); width: 32px; height: 32px; margin-bottom: 0.5rem;" />
            <span style="font-weight: 500;">Cliquez pour sélectionner la liste des salaires</span>
            <input type="file" accept=".csv" class="file-input" @change="e => fileSalaries = e.target.files[0]" />
          </div>
          <div v-if="fileSalaries" style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--success); display: flex; align-items: center; gap: 0.25rem;">
            <CheckCircle2 style="width: 14px; height: 14px;" /> {{ fileSalaries.name }}
          </div>
        </div>

        <div>
          <label class="form-label">Archive des images des employés (ZIP - Nommé : ref_employe.png)</label>
          <div class="upload-zone" style="border-color: var(--accent-light); background-color: var(--accent-light);">
            <FileArchive style="color: var(--accent-primary); width: 32px; height: 32px; margin-bottom: 0.5rem;" />
            <span style="font-weight: 500; color: var(--accent-primary);">Sélectionner l'archive ZIP des images</span>
            <span style="font-size: 0.75rem; color: var(--accent-primary); opacity: 0.8;">Format .zip (ex: 1.png, 2.jpg)</span>
            <input type="file" accept=".zip" class="file-input" @change="e => zipFile = e.target.files[0]" />
          </div>
          <div v-if="zipFile" style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--success); display: flex; align-items: center; gap: 0.25rem;">
            <CheckCircle2 style="width: 14px; height: 14px;" /> {{ zipFile.name }}
          </div>
        </div>
        
        <div v-if="logs.length > 0" class="log-container">
          <div v-for="(log, i) in logs" :key="i" class="log-line">{{ log }}</div>
        </div>
        
        <div style="border-top: 1px solid var(--border-color); padding-top: 1.5rem; display: flex; justify-content: flex-end;">
          <button type="submit" class="btn btn-primary" :disabled="isLoading || (!fileEmployees && !fileSalaries && !zipFile)" style="padding: 0.75rem 2rem;">
            <Upload style="width: 16px; height: 16px;" />
            {{ isLoading ? 'Importation en cours...' : 'Lancer l\'import complet' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { FileSpreadsheet, FileArchive, Upload, CheckCircle2 } from 'lucide-vue-next'
import { importEmployees, importSalaries, importImages } from '../../services/importServices'

const fileEmployees = ref(null)
const fileSalaries = ref(null)
const zipFile = ref(null)
const logs = ref([])
const isLoading = ref(false)

const addLog = (message) => {
  logs.value.push(`[${new Date().toLocaleTimeString()}] ${message}`)
}

const handleImport = async () => {
  isLoading.value = true
  logs.value = []

  try {
    let idMap = {}

    // 1. Étape 1 : Traitement des employés & génération de la Map de correspondance
    if (fileEmployees.value) {
      addLog("Début de l'import des employés...")
      idMap = await importEmployees(fileEmployees.value, addLog)
    } else {
      addLog("ℹ Aucun fichier employé fourni. Utilisation de la mémoire cache ou liaison brute.")
    }

    // 2. Étape 2 : Traitement des salaires basés sur l'idMap exacte
    if (fileSalaries.value) {
      addLog("Début de l'import des salaires...")
      await importSalaries(fileSalaries.value, idMap, addLog)
    }

    // 3. Étape 3 : Traitement des images ZIP basées sur l'idMap exacte
    if (zipFile.value) {
      addLog("Début de l'import des images du package ZIP...")
      await importImages(zipFile.value, idMap, addLog)
    }

    addLog(" Opération d'importation Dolibarr exécutée entièrement.")
    
    // Nettoyage de l'interface
    fileEmployees.value = null
    fileSalaries.value = null
    zipFile.value = null
  } catch (error) {
    addLog(`❌ Erreur générale critique : ${error.message}`)
  } finally {
    isLoading.value = false
  }
}
</script>

<style scoped>
.upload-zone {
  position: relative;
  border: 2px dashed var(--border-color);
  border-radius: var(--radius-lg);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  background-color: var(--bg-tertiary);
  transition: all var(--transition-fast);
  cursor: pointer;
}
.upload-zone:hover {
  border-color: var(--accent-primary);
  background-color: var(--bg-secondary);
}
.file-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  cursor: pointer;
}
.log-container {
  background-color: #1e1e1e;
  color: #a9b7c6;
  font-family: monospace;
  padding: 1rem;
  border-radius: var(--radius-lg);
  max-height: 250px;
  overflow-y: auto;
  font-size: 0.85rem;
}
.log-line {
  margin-bottom: 0.25rem;
}
</style>