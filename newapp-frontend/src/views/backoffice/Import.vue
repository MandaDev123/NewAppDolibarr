<template>
  <div>
    <div class="page-header">
      <div>
        <h1 class="page-title">Import de données</h1>
        <p class="page-subtitle">Importez vos fichiers de base et archives d'images</p>
      </div>
    </div>
    
    <div class="card" style="max-width: 800px; margin: 0 auto;">
      <form @submit.prevent="handleImport" style="display: flex; flex-direction: column; gap: 2rem;">
        
        <!-- Fichier 1 -->
        <div>
          <label class="form-label">Fichier de données principal (CSV/Excel)</label>
          <div class="upload-zone">
            <FileSpreadsheet style="color: var(--text-muted); width: 32px; height: 32px; margin-bottom: 0.5rem;" />
            <span style="font-weight: 500;">Cliquez pour sélectionner un fichier</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">ou glissez-déposez ici</span>
            <input type="file" class="file-input" @change="e => file1 = e.target.files[0]" />
          </div>
          <div v-if="file1" style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--success); display: flex; align-items: center; gap: 0.25rem;">
            <CheckCircle2 style="width: 14px; height: 14px;" /> {{ file1.name }}
          </div>
        </div>
        
        <!-- Fichier 2 -->
        <div>
          <label class="form-label">Fichier de données secondaire (CSV/Excel)</label>
          <div class="upload-zone">
            <FileSpreadsheet style="color: var(--text-muted); width: 32px; height: 32px; margin-bottom: 0.5rem;" />
            <span style="font-weight: 500;">Cliquez pour sélectionner un fichier</span>
            <span style="font-size: 0.75rem; color: var(--text-muted);">ou glissez-déposez ici</span>
            <input type="file" class="file-input" @change="e => file2 = e.target.files[0]" />
          </div>
          <div v-if="file2" style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--success); display: flex; align-items: center; gap: 0.25rem;">
            <CheckCircle2 style="width: 14px; height: 14px;" /> {{ file2.name }}
          </div>
        </div>
        
        <!-- Archive Images -->
        <div>
          <label class="form-label">Archive des images (ZIP)</label>
          <div class="upload-zone" style="border-color: var(--accent-light); background-color: var(--accent-light);">
            <FileArchive style="color: var(--accent-primary); width: 32px; height: 32px; margin-bottom: 0.5rem;" />
            <span style="font-weight: 500; color: var(--accent-primary);">Sélectionner l'archive ZIP</span>
            <span style="font-size: 0.75rem; color: var(--accent-primary); opacity: 0.8;">Format .zip uniquement</span>
            <input type="file" accept=".zip" class="file-input" @change="e => zipFile = e.target.files[0]" />
          </div>
          <div v-if="zipFile" style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--success); display: flex; align-items: center; gap: 0.25rem;">
            <CheckCircle2 style="width: 14px; height: 14px;" /> {{ zipFile.name }}
          </div>
        </div>
        
        <div style="border-top: 1px solid var(--border-color); padding-top: 1.5rem; display: flex; justify-content: flex-end;">
          <button type="submit" class="btn btn-primary" :disabled="!file1 && !file2 && !zipFile" style="padding: 0.75rem 2rem;">
            <Upload style="width: 16px; height: 16px;" />
            Lancer l'import
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { FileSpreadsheet, FileArchive, Upload, CheckCircle2 } from 'lucide-vue-next'

const file1 = ref(null)
const file2 = ref(null)
const zipFile = ref(null)

const handleImport = () => {
  alert('Simulation d\'import réussie!')
  file1.value = null
  file2.value = null
  zipFile.value = null
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
</style>
