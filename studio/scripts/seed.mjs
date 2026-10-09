// Installe le contenu d'exemple (seed/seed.json) dans le projet Sanity.
//   - ne remplace JAMAIS un document existant (createIfNotExists) : relancer ce script est sans risque
//     et n'écrase aucune modification de la rédaction ;
//   - tout est envoyé en une seule transaction : soit tout est créé, soit rien.
// Usage : SANITY_WRITE_TOKEN=... node scripts/seed.mjs [--dry-run]
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const config = JSON.parse(readFileSync(resolve(root, 'config.json'), 'utf8'))
const docs = JSON.parse(readFileSync(resolve(root, 'seed/seed.json'), 'utf8'))
const dryRun = process.argv.includes('--dry-run')
const token = process.env.SANITY_WRITE_TOKEN
const host = process.env.SANITY_API_HOST || `https://${config.projectId}.api.sanity.io`

if (!dryRun && !config.projectId && !process.env.SANITY_API_HOST) {
  console.error('✗ Identifiant de projet manquant : renseignez "projectId" dans studio/config.json.')
  process.exit(1)
}
if (!dryRun && !token) {
  console.error('✗ Jeton manquant : définissez la variable SANITY_WRITE_TOKEN (jeton « Éditeur » créé sur sanity.io/manage).')
  process.exit(1)
}

const mutations = docs.map((doc) => ({ createIfNotExists: doc }))
console.log(`${docs.length} documents à installer dans « ${config.dataset} » (${dryRun ? 'simulation' : 'envoi réel'}).`)
if (dryRun) {
  const parType = docs.reduce((a, d) => ((a[d._type] = (a[d._type] || 0) + 1), a), {})
  console.log('Répartition :', parType)
  process.exit(0)
}

const url = `${host}/v${config.apiVersion}/data/mutate/${config.dataset}?returnIds=true&returnDocuments=false&visibility=sync`
const res = await fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
  body: JSON.stringify({ mutations }),
})
const body = await res.json().catch(() => ({}))
if (!res.ok) {
  console.error(`✗ Sanity a refusé l'envoi (HTTP ${res.status}) :`, JSON.stringify(body.error || body))
  process.exit(1)
}
const creations = (body.results || []).filter((r) => r.operation === 'create').length
const existants = (body.results || []).filter((r) => r.operation === 'none').length
console.log(`✓ Terminé : ${creations} document(s) créé(s), ${existants} déjà présent(s) (laissé(s) intact(s)).`)
