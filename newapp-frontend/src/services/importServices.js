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
 * "01/03/2026" ou "2026-03-01" → timestamp unix (secondes)
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
 * "DD/MM/YY" ou "DD/MM/YYYY" → timestamp unix (secondes)
 * Utilisé pour les dates courtes des paiements dans le CSV.
 *   "08/03/26" → 2026-03-08
 *   "08/03/2026" → 2026-03-08
 */
function parseShortDate(dateStr) {
  if (!dateStr) return null
  const parts = String(dateStr).trim().split('/')
  if (parts.length !== 3) return null
  let [day, month, year] = parts
  if (year.length === 2) {
    year = (parseInt(year, 10) >= 50 ? '19' : '20') + year
  }
  const ts = Math.floor(new Date(`${year}-${month}-${day}T12:00:00`).getTime() / 1000)
  return isNaN(ts) ? null : ts
}

/**
 * Parse la colonne "paiement" du CSV.
 *
 * Formats gérés (après parsing PapaParse) :
 *   {[["08/03/26",890]]}
 *   {[["08/03/26",480],["08/03/26",300]]}
 *   (vide / null / undefined)  → []
 *
 * Retourne : [{ dateStr: "08/03/26", amount: 890 }, …]
 */
function parsePaiements(rawValue) {
  if (!rawValue || !String(rawValue).trim()) return []

  try {
    let s = String(rawValue).trim()
    // Retirer les accolades wrappantes : "{[…]}" → "[…]"
    if (s.startsWith('{') && s.endsWith('}')) {
      s = s.slice(1, -1)
    }
    const parsed = JSON.parse(s)
    if (!Array.isArray(parsed)) return []

    return parsed
      .filter(entry => Array.isArray(entry) && entry.length >= 2)
      .map(([dateStr, amount]) => ({
        dateStr: String(dateStr).trim(),
        amount:  parseAmount(String(amount))
      }))
      .filter(p => p.amount > 0)
  } catch {
    return []
  }
}

/** Correspondance code mode paiement CSV → ID Dolibarr type paiement */
const PAYMENT_TYPE_MAP = {
  'LIQ': 4, 'ESP': 4,
  'CB':  2,
  'CHQ': 3,
  'VIR': 6,
}

/**
 * Table de correspondance en mémoire :
 *   ref_employe (CSV) → ID Dolibarr
 */
const csvRefToDolibarrIdMap = {}

// ─────────────────────────────────────────────────────────────────
// 1. IMPORT DES EMPLOYES
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
// 2. IMPORT DES SALAIRES + PAIEMENTS
// ─────────────────────────────────────────────────────────────────

export async function importSalaries(file, idMap, onProgress = () => {}) {
  const rows = await parseCSV(file)
  const activeMap = (idMap && Object.keys(idMap).length > 0) ? idMap : csvRefToDolibarrIdMap

  let salariesCreated = 0
  let paymentsCreated = 0
  let errorCount      = 0

  for (const row of rows) {
    const dolibarrUserId = activeMap[row.ref_employe]

    if (!dolibarrUserId) {
      onProgress(`⚠ Salaire ignoré (réf CSV "${row.ref_employe}" introuvable dans la map)`)
      errorCount++
      continue
    }

    // ── Validation des champs obligatoires ──────────────────────
    const datesp = parseDateToTimestamp(row.date_debut)
    const dateep = parseDateToTimestamp(row.date_fin)
    const amount = parseAmount(row.montant)

    if (!datesp || !dateep) {
      onProgress(`⚠ Dates invalides — debut="${row.date_debut}" fin="${row.date_fin}"`)
      errorCount++
      continue
    }
    if (!amount) {
      onProgress(`⚠ Montant nul pour ref_employe=${row.ref_employe}`)
      errorCount++
      continue
    }

    // ── Parser les paiements du CSV AVANT création du salaire ────
    const paiements = parsePaiements(row.paiement)
    const totalPaye = paiements.reduce((s, p) => s + p.amount, 0)

    // Statut payé automatique : 1 si somme paiements >= montant
    const paye = totalPaye >= amount ? '1' : '0'

    const label = row.label || row.libelle || 'Salaire'

    let type_payment
    if (row.mode_paiement) {
      const code = String(row.mode_paiement).toUpperCase().trim()
      type_payment = PAYMENT_TYPE_MAP[code]
    }

    const salaryPayload = {
      fk_user: String(dolibarrUserId),
      label,
      amount,
      datesp,
      dateep,
      paye,
    }
    if (type_payment)     salaryPayload.type_payment  = type_payment
    if (row.note_private) salaryPayload.note_private  = row.note_private

    onProgress(
      `Création salaire "${label}" — employé #${dolibarrUserId}` +
      ` (${row.date_debut} → ${row.date_fin}, ${amount} MGA,` +
      ` ${paiements.length} paiement(s) à insérer)…`
    )

    // ── Créer le salaire ─────────────────────────────────────────
    let salaryDolibarrId
    try {
      const resp = await dolibarrApi.post('/salaries', salaryPayload)
      salaryDolibarrId = String(typeof resp === 'object' ? resp.id : resp)
      onProgress(`✅ Salaire créé (ID: ${salaryDolibarrId}, payé: ${paye === '1' ? 'Oui' : 'Non'})`)
      salariesCreated++
    } catch (err) {
      onProgress(`❌ Échec création salaire ref=${row.ref_salaire} : ${err.message}`)
      errorCount++
      continue  // Impossible d'insérer des paiements sans salaire
    }

    // ── Créer chaque paiement lié au salaire ─────────────────────
    for (let i = 0; i < paiements.length; i++) {
      const p        = paiements[i]
      const datepaye = parseShortDate(p.dateStr)

      if (!datepaye) {
        onProgress(`  ⚠ Paiement ${i + 1} ignoré (date invalide : "${p.dateStr}")`)
        continue
      }

      const paymentPayload = {
        fk_salary:      salaryDolibarrId,
        datepaye:       datepaye,
        amount:         p.amount,
        fk_typepayment: type_payment ?? 4,   // LIQ par défaut
      }

      try {
        const presp = await dolibarrApi.post('/salaries/payments', paymentPayload)
        const pid   = typeof presp === 'object' ? presp.id : presp
        onProgress(
          `  ✅ Paiement ${i + 1}/${paiements.length} — ID: ${pid},` +
          ` date: ${p.dateStr}, montant: ${p.amount} MGA`
        )
        paymentsCreated++
      } catch (err) {
        onProgress(`  ❌ Échec paiement ${i + 1} (salaire #${salaryDolibarrId}) : ${err.message}`)
        errorCount++
      }
    }
  }

  onProgress(
    `Import terminé — ${salariesCreated} salaire(s) et ${paymentsCreated} paiement(s) créé(s)` +
    `${errorCount > 0 ? `, ${errorCount} erreur(s)` : ''}.`
  )
}

// ─────────────────────────────────────────────────────────────────
// 3. IMPORT DES IMAGES DE PROFIL (ZIP)
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
    const filename   = zipEntry.name.split('/').pop()
    const refEmploye = filename.replace(/\.[^.]+$/, '').trim()

    onProgress(`Analyse de l'image ${filename} (ref: ${refEmploye})…`)

    const dolibarrUserId = activeMap[refEmploye]
    if (!dolibarrUserId) {
      onProgress(`⚠ Aucune correspondance pour "${refEmploye}". Image ignorée.`)
      continue
    }

    onProgress(`Téléversement de l'image pour l'employé ID #${dolibarrUserId}…`)

    try {
      const base64Content = await zipEntry.async('base64')
      const ext = filename.split('.').pop().toLowerCase()
      const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg'
                     : ext === 'png'                   ? 'image/png'
                     : ext === 'gif'                   ? 'image/gif'
                     : 'image/jpeg'

      await dolibarrApi.put(`/users/${dolibarrUserId}`, {
        photo: `data:${mimeType};base64,${base64Content}`
      })

      onProgress(`✅ Image ${filename} envoyée (employé ID #${dolibarrUserId})`)
      successCount++

    } catch {
      // Fallback : base64 brut sans data URI
      onProgress(`⚠ Méthode data-URI échouée, tentative base64 brut…`)
      try {
        const base64Content = await zipEntry.async('base64')
        await dolibarrApi.put(`/users/${dolibarrUserId}`, { photo: base64Content })
        onProgress(`✅ Image ${filename} envoyée (base64 brut, ID #${dolibarrUserId})`)
        successCount++
      } catch (err2) {
        onProgress(`❌ Échec envoi image ${filename} : ${err2.message}`)
        errorCount++
      }
    }
  }

  onProgress(`Import des images terminé : ${successCount} réussi(s), ${errorCount} échec(s).`)
}