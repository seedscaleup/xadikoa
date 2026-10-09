// Vérifie que seed/seed.json est conforme au schéma réel de l'éditeur (extrait par Sanity).
// Usage : npm run check   (génère d'abord schema-extract.json avec « sanity schema extract »)
import { readFileSync, existsSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
execSync('npx --no-install sanity schema extract --force --enforce-required-fields --path schema-extract.json', { cwd: root, stdio: 'ignore' })
const schema = JSON.parse(readFileSync(resolve(root, 'schema-extract.json'), 'utf8'))
const seed = JSON.parse(readFileSync(process.env.SEED_PATH || resolve(root, 'seed/seed.json'), 'utf8'))
const docTypes = Object.fromEntries(schema.filter((t) => t.type === 'document').map((t) => [t.name, t]))
const SYSTEM = new Set(['_id', '_type', '_key', '_ref', '_weak', '_createdAt', '_updatedAt', '_rev'])
const errors = []
const err = (path, msg) => errors.push(`${path} : ${msg}`)

function validate(value, node, path) {
  switch (node.type) {
    case 'string': if (typeof value !== 'string') err(path, 'texte attendu'); return
    case 'number': if (typeof value !== 'number') err(path, 'nombre attendu'); return
    case 'boolean': if (typeof value !== 'boolean') err(path, 'oui/non attendu'); return
    case 'null': case 'unknown': case 'inline': return
    case 'array':
      if (!Array.isArray(value)) return err(path, 'liste attendue')
      value.forEach((v, i) => validate(v, node.of, `${path}[${i}]`))
      return
    case 'union': {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        const m = node.of.find((n) => n.type === 'object' && n.attributes?._type?.value?.value === value._type)
        if (m) return validate(value, m, path)
        // référence ou autre objet « inline » accepté s'il en existe un
        if (node.of.some((n) => n.type === 'inline' || n.type === 'unknown')) return
        return err(path, `type de bloc inconnu « ${value._type} »`)
      }
      const m = node.of.find((n) => n.type === typeof value)
      if (!m) err(path, 'valeur non prévue')
      return
    }
    case 'object': {
      if (!value || typeof value !== 'object') return err(path, 'objet attendu')
      const attrs = node.attributes || {}
      for (const k of Object.keys(value)) if (!SYSTEM.has(k) && !(k in attrs)) err(path, `champ inexistant « ${k} »`)
      for (const [k, a] of Object.entries(attrs)) {
        if (SYSTEM.has(k)) continue
        if (!(k in value)) { if (!a.optional) err(path, `champ obligatoire absent « ${k} »`); continue }
        validate(value[k], a.value, `${path}.${k}`)
      }
      return
    }
    default: err(path, `type de schéma non géré : ${node.type}`)
  }
}

const ids = new Set(seed.map((d) => d._id))
const seen = new Set()
for (const doc of seed) {
  const path = doc._id
  if (seen.has(doc._id)) err(path, 'identifiant en double')
  seen.add(doc._id)
  const t = docTypes[doc._type]
  if (!t) { err(path, `type de document inconnu « ${doc._type} »`); continue }
  validate(doc, { type: 'object', attributes: t.attributes }, path)
  // références
  JSON.stringify(doc, (k, v) => { if (k === '_ref' && !ids.has(v)) err(path, `référence cassée → ${v}`); return v })
}
// règles métier du site
const slugs = seed.filter((d) => d._type === 'article').map((d) => d.slug?.current)
if (new Set(slugs).size !== slugs.length) err('articles', 'adresses (slugs) en double')
if (slugs.some((s) => !s || /[^a-z0-9-]/.test(s))) err('articles', 'adresse (slug) invalide')
for (const t of ['accueil', 'reglages']) if (seed.filter((d) => d._type === t).length !== 1) err(t, 'un seul document attendu')

if (errors.length) { console.error('✗ seed.json non conforme :\n' + errors.map((e) => '  - ' + e).join('\n')); process.exit(1) }
console.log(`✓ seed.json conforme au schéma : ${seed.length} documents, références valides, adresses uniques`)
