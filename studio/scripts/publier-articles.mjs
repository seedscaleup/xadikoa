// Met en ligne sur xadikoa.com (Sanity) les articles déposés par l'agent Site dans publication/articles/<slug>/.
// Chaque dossier contient :
//   article.json  — { titre, rubrique (actu|societe|culture|business|tendance), chapo, corps:[blocs], themes:[],
//                     photoDescription, photoLegende, photoCredit, datePublication? }
//   photo.jpg|png|webp (facultatif) — photo principale, paysage, ≥ 1600 px
//   retirer       (fichier vide, facultatif) — retire l'article du site
// Usage : SANITY_WRITE_TOKEN=... node scripts/publier-articles.mjs [dossier...]   (sans argument : tous les dossiers)
import { readFileSync, readdirSync, existsSync, statSync, lstatSync } from 'node:fs'
import { dirname, resolve, join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const base = resolve(root, '..', 'publication', 'articles')
const config = JSON.parse(readFileSync(resolve(root, 'config.json'), 'utf8'))
const token = process.env.SANITY_WRITE_TOKEN
const dryRun = process.argv.includes('--dry-run')
const host = `https://${config.projectId}.api.sanity.io/v${config.apiVersion}`

const RUBRIQUES = { actu: 'rubrique-actualite', actualite: 'rubrique-actualite', societe: 'rubrique-societe', culture: 'rubrique-culture', business: 'rubrique-business', tendance: 'rubrique-tendances', tendances: 'rubrique-tendances' }
const AUTEUR = { _id: 'auteur-redaction-xadikoa', _type: 'auteur', nom: 'La rédaction XADIKOA', fonction: 'Rédaction', accroche: 'on se dit tout', bio: "L'équipe de XADIKOA, le média panafricain qui raconte simplement ce dont tout le monde parle.", couleur: '#6C2BFF', exemple: false }
const TYPES_BLOCS = new Set(['paragraphe', 'intertitre', 'citation', 'aRetenir'])
const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

if (!token && !dryRun) { console.error('✗ SANITY_WRITE_TOKEN manquant.'); process.exit(1) }
if (!existsSync(base)) { console.log('Aucun dossier publication/articles : rien à faire.'); process.exit(0) }

const args = process.argv.slice(2).filter((a) => !a.startsWith('--'))
// Sécurité (M-011) : les liens symboliques sont refusés (ils pourraient faire lire un fichier hors du dépôt).
const lien = (p) => { try { return lstatSync(p).isSymbolicLink() } catch { return false } }
const fichier = (p) => existsSync(p) && !lien(p)
const dossiers = (args.length ? args.map((a) => a.split('/').filter(Boolean).pop()) : readdirSync(base))
  .filter((d) => {
    if (!existsSync(join(base, d)) || !statSync(join(base, d)).isDirectory()) return false
    if (!/^[a-z0-9][a-z0-9-]{0,99}$/.test(d) || lien(join(base, d))) { console.log(`::warning::${d.replace(/[^A-Za-z0-9._-]/g, '?')} : nom de dossier non permis ou lien symbolique, ignoré`); return false }
    return true
  })

async function mutate(mutations) {
  if (dryRun) { console.log('  (simulation)', JSON.stringify(mutations).slice(0, 300)); return }
  const r = await fetch(`${host}/data/mutate/${config.dataset}?visibility=sync`, { method: 'POST', headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` }, body: JSON.stringify({ mutations }) })
  const b = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`Sanity a refusé (HTTP ${r.status}) : ${JSON.stringify(b.error || b)}`)
}
async function envoyerPhoto(fichier) {
  const ext = extname(fichier).slice(1).toLowerCase()
  const mime = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' }[ext]
  if (dryRun) return 'image-simulation'
  const r = await fetch(`${host}/assets/images/${config.dataset}?filename=${encodeURIComponent(fichier.split('/').pop())}`, { method: 'POST', headers: { 'content-type': mime, authorization: `Bearer ${token}` }, body: readFileSync(fichier) })
  const b = await r.json().catch(() => ({}))
  if (!r.ok) throw new Error(`Envoi de la photo refusé (HTTP ${r.status}) : ${JSON.stringify(b.error || b)}`)
  return b.document._id
}

let erreurs = 0
await mutate([{ createIfNotExists: AUTEUR }])
for (const d of dossiers) {
  const dir = join(base, d)
  const id = 'article-xdk-' + slugify(d)
  try {
    if (fichier(join(dir, 'retirer'))) {
      await mutate([{ delete: { id } }, { delete: { id: 'drafts.' + id } }])
      console.log(`✓ Retiré du site : ${d}`); continue
    }
    const liens = ['article.json', 'retirer', 'photo.jpg', 'photo.jpeg', 'photo.png', 'photo.webp'].filter((f) => lien(join(dir, f)))
    if (liens.length) throw new Error('lien symbolique refusé : ' + liens.join(', '))
    if (!fichier(join(dir, 'article.json'))) { console.log(`- ${d} : pas d'article.json, ignoré`); continue }
    const a = JSON.parse(readFileSync(join(dir, 'article.json'), 'utf8'))
    const manque = ['titre', 'rubrique', 'chapo', 'corps'].filter((k) => !a[k] || (Array.isArray(a[k]) && !a[k].length))
    if (manque.length) throw new Error('champs manquants : ' + manque.join(', '))
    const rub = RUBRIQUES[slugify(a.rubrique).replace(/-/g, '')]
    if (!rub) throw new Error('rubrique inconnue : ' + a.rubrique)
    const corps = a.corps.filter((b) => TYPES_BLOCS.has(b._type)).map((b, i) => ({ ...b, _key: 'b' + String(i).padStart(2, '0') }))
    const doc = {
      _id: id, _type: 'article', titre: String(a.titre).slice(0, 160), slug: { _type: 'slug', current: slugify(d) },
      rubrique: { _type: 'reference', _ref: rub }, chapo: String(a.chapo).slice(0, 320), corps,
      themes: (a.themes || []).slice(0, 5), auteur: { _type: 'reference', _ref: AUTEUR._id },
      datePublication: a.datePublication || new Date().toISOString(), relu: true, exemple: false,
      photoDescription: a.photoDescription || a.titre, photoLegende: a.photoLegende || '', photoCredit: a.photoCredit || '',
    }
    const photo = ['photo.jpg', 'photo.jpeg', 'photo.png', 'photo.webp'].map((f) => join(dir, f)).find(fichier)
    if (photo) doc.photo = { _type: 'image', asset: { _type: 'reference', _ref: await envoyerPhoto(photo) } }
    else if (a.photoUrl) doc.photoUrl = a.photoUrl
    await mutate([{ createOrReplace: doc }, { delete: { id: 'drafts.' + id } }])
    console.log(`✓ En ligne : https://xadikoa.com/  →  ${doc.titre}  (adresse : ${doc.slug.current})`)
  } catch (e) { erreurs++; console.error(`✗ ${d} : ${e.message}`) }
}
process.exit(erreurs ? 1 : 0)
