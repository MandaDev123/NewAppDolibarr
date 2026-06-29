import Papa from 'papaparse'
import JSZip from 'jszip'
import { dolibarrApi } from './dolibarrServices'

// Analyse générique du CSV
export function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => resolve(results.data),
      error: (error) => reject(error)
    })
  })
}

// Nettoie les montants français "677,56" en float standard
function parseAmount(value) {
  if (!value) return 0
  return parseFloat(String(value).replace(',', '.'))
}

// Convertit les dates "01/03/2026" au format Timestamp Dolibarr
function parseDateToTimestamp(dateStr) {
  if (!dateStr) return null
  const [day, month, year] = dateStr.trim().split('/')
  return Math.floor(new Date(`${year}-${month}-${day}T12:00:00`).getTime() / 1000)
}

// Tables de correspondance en mémoire (Persistance globale durant la session d'import)
// Clé : ref_employe (CSV) ──> Valeur : ID réel dans Dolibarr
const csvRefToDolibarrIdMap = {}

// ── 1. IMPORT DES EMPLOYÉS (Feuille 1) ──────────────────────────
export async function importEmployees(file, onProgress = () => {}) {
  const rows = await parseCSV(file)

  for (const row of rows) {
    onProgress(`Traitement de l'employé : ${row.nom} (Réf: ${row.ref_employe})…`)

    const payload = {
      lastname: row.nom,
      login: row.identifiant,
      password: row.mdp || 'Dolibarr1234!',
      gender: row.genre === 'homme' ? 'man' : 'woman',
      weeklyhours: row.heure_travail_semaine ? parseFloat(row.heure_travail_semaine) : 35,
      statut: 1 
    }

    try {
      const existingUsers = await dolibarrApi.get(`/users?sqlfilters=(t.login:=:'${row.identifiant}')`)
      
      let dolibarrUserId;
      
      if (existingUsers && existingUsers.length > 0) {
        // L'API GET renvoie un tableau d'objets, donc .id fonctionne ici
        dolibarrUserId = existingUsers[0].id;
        onProgress(`L'employé ${row.nom} existe déjà (ID Dolibarr: ${dolibarrUserId}). Mise à jour...`)
        await dolibarrApi.put(`/users/${dolibarrUserId}`, payload)
      } else {
        // CORRECTION 1 : Lors d'un POST, Dolibarr renvoie directement l'ID (entier)
        const responseData = await dolibarrApi.post('/users', payload)
        dolibarrUserId = typeof responseData === 'object' ? responseData.id : responseData;
        onProgress(` Nouvel employé créé : ${row.nom} (ID Dolibarr: ${dolibarrUserId})`)
      }

      // Sauvegarde sécurisée dans la mémoire
      csvRefToDolibarrIdMap[row.ref_employe] = dolibarrUserId

    } catch (err) {
      onProgress(`❌ Erreur sur l'employé ${row.nom} : ${err.message}`)
    }
  }
  onProgress('Employés traités avec succès !')
  return csvRefToDolibarrIdMap
}

// ── 2. IMPORT DES SALAIRES & PAIEMENTS (Feuille 2) ─────────────
export async function importSalaries(file, idMap, onProgress = () => {}) {
  const rows = await parseCSV(file)

  // Utilise la map passée en paramètre ou celle globale si non fournie
  const activeMap = idMap && Object.keys(idMap).length > 0 ? idMap : csvRefToDolibarrIdMap

  for (const row of rows) {
    // Liaison sécurisée grâce à notre table de correspondance
    const dolibarrUserId = activeMap[row.ref_employe]
    
    if (!dolibarrUserId) {
      onProgress(`⚠ Impossible d'importer le salaire #${row.ref_salaire} : Aucun employé trouvé avec la ref_employe "${row.ref_employe}" dans Dolibarr.`)
      continue
    }

    onProgress(`Création du salaire pour l'employé ID Dolibarr #${dolibarrUserId} (Réf CSV: ${row.ref_employe})…`)

    const payload = {
      fk_user: dolibarrUserId,
      date_start: parseDateToTimestamp(row.date_debut),
      date_end: parseDateToTimestamp(row.date_fin),
      amount: parseAmount(row.montant),
      datesp: parseDateToTimestamp(row.date_debut),
    }

    try {
      await dolibarrApi.post('/salaries', payload)
    } catch (err) {
      console.error(`Erreur lors de l'import du salaire #${row.ref_salaire}:`, err.message)
    }
  }
  onProgress('Salaires et paiements importés !')
}

// ── 3. IMPORT DES IMAGES DE PROFIL (ZIP) ─────────────────────────
export async function importImages(zipFile, idMap, onProgress = () => {}) {
  const zip = await JSZip.loadAsync(zipFile)
  const activeMap = idMap && Object.keys(idMap).length > 0 ? idMap : csvRefToDolibarrIdMap

  const imageFiles = Object.values(zip.files).filter(f =>
    !f.dir &&
    !f.name.startsWith('__MACOSX') &&
    !f.name.split('/').pop().startsWith('.')
  )

  for (const zipEntry of imageFiles) {
    const filename = zipEntry.name.split('/').pop() 
    const refEmploye = filename.replace(/\.[^.]+$/, '') 

    onProgress(`Analyse de l'image ${filename}...`)

    const dolibarrUserId = activeMap[refEmploye]
    if (!dolibarrUserId) {
      onProgress(`⚠ Aucune correspondance trouvée pour la ref_employe "${refEmploye}". Image ignorée.`)
      continue
    }

    onProgress(`Téléversement de l'image pour l'employé ID #${dolibarrUserId}...`)

    const base64Content = await zipEntry.async('base64')
    
    // CORRECTION 2 : La ref doit être juste l'ID, et paramètre overwriteifexists ajouté
    const payload = {
      filename: filename,
      modulepart: 'user', 
      ref: String(dolibarrUserId), // Juste "10" par exemple, pas "ID-10"
      subdir: '',
      filecontent: base64Content,
      fileencoding: 'base64',
      overwriteifexists: '1' // Écrase l'image si on relance l'import
    }

    try {
      // CORRECTION 3 : L'endpoint correct est /documents/upload
      await dolibarrApi.post('/documents/upload', payload)
      onProgress(` Image ${filename} liée avec succès à l'employé ID #${dolibarrUserId}`)
    } catch (err) {
      onProgress(`❌ Échec de l'envoi de l'image ${filename} : ${err.message}`)
    }
  }
  onProgress('Import des images terminé.')
}