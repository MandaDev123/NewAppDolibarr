import Papa from 'papaparse'
import JSZip from 'jszip'
import { dolibarrApi } from './dolibarrServices'

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

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

/** "677,56" ou "677.56" → 677.56 */
function parseAmount(value) {
  if (!value) return 0
  return parseFloat(String(value).replace(',', '.'))
}

/**
 * "01/03/2026" → timestamp unix (secondes)
 * Accepte aussi "2026-03-01" (ISO).
 */
function parseDateToTimestamp(dateStr) {
  if (!dateStr) return null
  const s = dateStr.trim()
  let iso
  if (s.includes('/')) {
    const [day, month, year] = s.split('/')
    iso = `${year}-${month}-${day}T12:00:00`
  } else {
    iso = `${s}T12:00:00`
  }
  const ts = Math.floor(new Date(iso).getTime() / 1000)
  return isNaN(ts) ? null : ts
}

/**
 * Table de correspondance en mémoire :
 *   ref_employe (CSV) → ID Dolibarr
 */
const csvRefToDolibarrIdMap = {}

// ─────────────────────────────────────────────────────────────────
// 1. IMPORT DES EMPLOYÉS
// ─────────────────────────────────────────────────────────────────

export async function importEmployees(file, onProgress = () => {}) {
  const rows = await parseCSV(file)

  for (const row of rows) {
    onProgress(`Traitement de l'employé : ${row.nom} (Réf: ${row.ref_employe})…`)

    const payload = {
      lastname:    row.nom,
      login:       row.identifiant,
      password:    row.mdp || 'Dolibarr1234!',
      gender:      row.genre === 'homme' ? 'man' : 'woman',
      weeklyhours: row.heure_travail_semaine ? parseFloat(row.heure_travail_semaine) : 35,
      statut:      1
    }

    try {
      const existingUsers = await dolibarrApi.get(
        `/users?sqlfilters=(t.login:=:'${row.identifiant}')`
      )

      let dolibarrUserId

      if (existingUsers && existingUsers.length > 0) {
        dolibarrUserId = existingUsers[0].id
        onProgress(`ℹ L'employé ${row.nom} existe déjà (ID: ${dolibarrUserId}). Mise à jour…`)
        await dolibarrApi.put(`/users/${dolibarrUserId}`, payload)
      } else {
        const responseData = await dolibarrApi.post('/users', payload)
        dolibarrUserId = typeof responseData === 'object' ? responseData.id : responseData
        onProgress(`✅ Nouvel employé créé : ${row.nom} (ID Dolibarr: ${dolibarrUserId})`)
      }

      csvRefToDolibarrIdMap[row.ref_employe] = dolibarrUserId

    } catch (err) {
      onProgress(`❌ Erreur sur l'employé ${row.nom} : ${err.message}`)
    }
  }

  onProgress('Employés traités avec succès !')
  return { ...csvRefToDolibarrIdMap }
}

// ─────────────────────────────────────────────────────────────────
// 2. IMPORT DES SALAIRES
// ─────────────────────────────────────────────────────────────────
//
// BUGS CORRIGÉS :
//   - date_start / date_end  → remplacés par datesp / dateep  (champs réels Dolibarr)
//   - label manquant         → ajouté (obligatoire pour que le salaire soit valide)
//   - type_payment           → mappé depuis la colonne CSV si présente
//   - paye                   → mappé depuis la colonne CSV si présente
//   - Réponse POST loguée    → on log l'ID du salaire créé pour vérification
// ─────────────────────────────────────────────────────────────────

/** Correspondance code mode paiement CSV → ID Dolibarr type paiement */
const PAYMENT_TYPE_MAP = {
  'LIQ':  4,  // Espèces / Liquide
  'CB':   2,  // Carte bancaire
  'CHQ':  3,  // Chèque
  'VIR':  6,  // Virement
  'ESP':  4,  // Espèces alias
}

export async function importSalaries(file, idMap, onProgress = () => {}) {
  const rows = await parseCSV(file)
  const activeMap = (idMap && Object.keys(idMap).length > 0) ? idMap : csvRefToDolibarrIdMap

  let createdCount = 0
  let errorCount   = 0

  for (const row of rows) {
    const dolibarrUserId = activeMap[row.ref_employe]

    if (!dolibarrUserId) {
      onProgress(`⚠ Salaire ignoré (réf CSV ${row.ref_employe} introuvable dans la map)`)
      errorCount++
      continue
    }

    // ── Champs obligatoires ──────────────────────────────────────
    const datesp = parseDateToTimestamp(row.date_debut)
    const dateep = parseDateToTimestamp(row.date_fin)
    const amount = parseAmount(row.montant)

    if (!datesp || !dateep) {
      onProgress(`⚠ Salaire ignoré (dates invalides) : debut="${row.date_debut}" fin="${row.date_fin}"`)
      errorCount++
      continue
    }
    if (!amount) {
      onProgress(`⚠ Salaire ignoré (montant nul) pour ref_employe ${row.ref_employe}`)
      errorCount++
      continue
    }

    // ── Libellé (label) — obligatoire dans Dolibarr ─────────────
    const label = row.label || row.libelle || 'Salaire'

    // ── Mode de paiement (optionnel) ─────────────────────────────
    let type_payment
    if (row.mode_paiement) {
      const code = String(row.mode_paiement).toUpperCase().trim()
      type_payment = PAYMENT_TYPE_MAP[code] ?? undefined
    }

    // ── Statut payé (optionnel) ──────────────────────────────────
    const paye = row.paye !== undefined ? String(row.paye) : '0'

    const payload = {
      fk_user: String(dolibarrUserId),
      label,
      amount,
      datesp,          // ← timestamp début de période (était date_start → ignoré par Dolibarr)
      dateep,          // ← timestamp fin de période   (était date_end  → ignoré par Dolibarr)
      paye,
    }
    if (type_payment) payload.type_payment = type_payment
    if (row.note_private) payload.note_private = row.note_private

    onProgress(
      `Création du salaire "${label}" pour employé #${dolibarrUserId}` +
      ` (${row.date_debut} → ${row.date_fin}, ${amount} MGA)…`
    )

    try {
      const resp = await dolibarrApi.post('/salaries', payload)
      const newId = typeof resp === 'object' ? resp.id : resp
      onProgress(`✅ Salaire créé (ID Dolibarr: ${newId})`)
      createdCount++
    } catch (err) {
      onProgress(`❌ Échec création salaire ref_employe=${row.ref_employe} : ${err.message}`)
      errorCount++
    }
  }

  onProgress(`Salaires importés : ${createdCount} créé(s), ${errorCount} erreur(s).`)
}

// ─────────────────────────────────────────────────────────────────
// 3. IMPORT DES IMAGES DE PROFIL (ZIP)
// ─────────────────────────────────────────────────────────────────
//
// BUG CORRIGÉ :
//   - modulepart 'user' via /documents/upload → "not implemented yet"
//     dans Dolibarr 23 (api_documents.class.php)
//   - Solution : PUT /users/{id} avec le champ "photo" en base64
//     Dolibarr détecte le base64, écrit le fichier dans
//     htdocs/documents/users/user/{id}/photos/ et met à jour llx_user.photo
// ─────────────────────────────────────────────────────────────────

export async function importImages(zipFile, idMap, onProgress = () => {}) {
  const zip = await JSZip.loadAsync(zipFile)
  const activeMap = (idMap && Object.keys(idMap).length > 0) ? idMap : csvRefToDolibarrIdMap

  const imageFiles = Object.values(zip.files).filter(f =>
    !f.dir &&
    !f.name.startsWith('__MACOSX') &&
    !f.name.split('/').pop().startsWith('.')
  )

  if (imageFiles.length === 0) {
    onProgress('⚠ Aucune image trouvée dans le ZIP.')
    return
  }

  let successCount = 0
  let errorCount   = 0

  for (const zipEntry of imageFiles) {
    const filename   = zipEntry.name.split('/').pop()                  // "1.png"
    const refEmploye = filename.replace(/\.[^.]+$/, '').trim()         // "1"

    onProgress(`Analyse de l'image ${filename} (ref: ${refEmploye})…`)

    const dolibarrUserId = activeMap[refEmploye]
    if (!dolibarrUserId) {
      onProgress(`⚠ Aucune correspondance pour "${refEmploye}". Image ignorée.`)
      continue
    }

    onProgress(`Téléversement de l'image pour l'employé ID #${dolibarrUserId}…`)

    try {
      // Lire le contenu en base64
      const base64Content = await zipEntry.async('base64')

      // Détecter le type MIME depuis l'extension
      const ext = filename.split('.').pop().toLowerCase()
      const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                     : ext === 'png'                   ? 'image/png'
                     : ext === 'gif'                   ? 'image/gif'
                     : 'image/jpeg'

      // ── Méthode 1 : PUT /users/{id} avec champ "photo" ─────────
      // Dolibarr 23 accepte un objet avec "photo" contenant
      // le data URI complet ou le base64 brut.
      const dataUri = `data:${mimeType};base64,${base64Content}`

      await dolibarrApi.put(`/users/${dolibarrUserId}`, {
        photo: dataUri
      })

      onProgress(`✅ Image ${filename} envoyée (employé ID #${dolibarrUserId})`)
      successCount++

    } catch (err) {
      // ── Fallback : PUT avec base64 brut sans data URI ───────────
      onProgress(`⚠ Méthode data-URI échouée, tentative base64 brut…`)
      try {
        const base64Content = await zipEntry.async('base64')
        await dolibarrApi.put(`/users/${dolibarrUserId}`, {
          photo: base64Content
        })
        onProgress(`✅ Image ${filename} envoyée (base64 brut, employé ID #${dolibarrUserId})`)
        successCount++
      } catch (err2) {
        onProgress(`❌ Échec de l'envoi de l'image ${filename} : ${err2.message}`)
        errorCount++
      }
    }
  }

  onProgress(`Import des images terminé : ${successCount} réussi(s), ${errorCount} échec(s).`)
}