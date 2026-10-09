// Extrait le contenu d'exemple actuel de index.html et le convertit en documents Sanity.
// Usage : node scripts/build-seed.mjs   →   écrit studio/seed/seed.json
// Le résultat est versionné : il sert à (re)créer le contenu d'exemple dans Sanity (voir scripts/seed.mjs).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const html = readFileSync(resolve(here, '../../index.html'), 'utf8')

// --- 1. Récupération des données « en dur » du site -------------------------------------------
const start = html.indexOf('D = (() => {')
const end = html.indexOf('\n  })();', start)
if (start < 0 || end < 0) throw new Error('Bloc de données introuvable dans index.html')
const body = html.slice(start + 'D = (() => {'.length, end)
const D = new Function(`return (() => {${body}\n})()`)()
const { CATS, AUTHORS, ARTICLES, BODIES, SHORTS, EPISODES, SHORT_SRC, PH, AUTH_PH, SHORT_PH, BODY_PH } = D

// --- 2. Outils ---------------------------------------------------------------------------------
const unsplash = (id) => 'https://images.unsplash.com/photo-' + id + '?auto=format&fit=crop&w=1400&q=70'
const slugify = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
const key = (prefix, i) => prefix + '-' + String(i).padStart(2, '0')
const ref = (id) => ({ _type: 'reference', _ref: id })
const rubriqueId = (code) => 'rubrique-' + code
const auteurId = (code) => 'auteur-' + code
const articleId = (n) => 'article-' + n

const docs = []

// --- 3. Rubriques --------------------------------------------------------------------------------
CATS.forEach((c, i) => {
  docs.push({
    _id: rubriqueId(c.id), _type: 'rubrique', code: c.id, nom: c.name, ordre: i + 1,
    couleurFond: c.bg, couleurTexte: c.fg, couleurPale: c.tint, accroche: c.short, description: c.role, themes: c.tags,
  })
})

// --- 4. Auteurs ----------------------------------------------------------------------------------
AUTHORS.forEach((a) => {
  docs.push({
    _id: auteurId(a.id), _type: 'auteur', nom: a.name, fonction: a.role, couleur: a.color, accroche: a.hello, bio: a.bio,
    photoUrl: unsplash(AUTH_PH[a.id]),
    exemple: true,
  })
})

// --- 5. Articles ---------------------------------------------------------------------------------
const toBlocks = (artId) =>
  (BODIES[artId] || []).map((b, i) => {
    const _key = key('b', i)
    if (b.t === 'p') return { _key, _type: 'paragraphe', texte: b.text }
    if (b.t === 'h2') return { _key, _type: 'intertitre', texte: b.text }
    if (b.t === 'quote') return { _key, _type: 'citation', texte: b.text, auteur: b.by || '' }
    if (b.t === 'img') return { _key, _type: 'photoArticle', legende: b.text || '', imageUrl: unsplash(BODY_PH[i % BODY_PH.length]) }
    if (b.t === 'retenir') return { _key, _type: 'aRetenir', points: b.items }
    throw new Error('Bloc inconnu : ' + b.t)
  })

const seenSlugs = new Set()
ARTICLES.forEach((a) => {
  let slug = slugify(a.title)
  if (seenSlugs.has(slug)) slug += '-' + a.id
  seenSlugs.add(slug)
  docs.push({
    _id: articleId(a.id), _type: 'article', titre: a.title, slug: { _type: 'slug', current: slug },
    rubrique: ref(rubriqueId(a.cat)), themes: a.tags, auteur: ref(auteurId(a.author)),
    datePublication: a.date + 'T08:00:00.000Z', tempsLecture: a.read, chapo: a.chapo,
    photoDescription: a.photo, photoUrl: unsplash(PH[a.id]),
    corps: toBlocks(a.id),
    exemple: true, relu: false,
  })
})

// --- 6. Vidéos : épisodes du Brief + vidéos courtes ------------------------------------------
EPISODES.forEach((e) => {
  const num = Number(String(e.n).replace(/\D/g, ''))
  docs.push({
    _id: 'video-ep' + num, _type: 'video', format: 'episode', titre: e.t, numero: num, duree: e.d,
    datePublication: e.date + 'T17:00:00.000Z', description: e.desc,
    miniatureUrl: unsplash(e.ph), url: e.src, exemple: true,
  })
})
SHORTS.forEach((v) => {
  docs.push({
    _id: 'video-' + v.id, _type: 'video', format: 'short', titre: v.t, duree: v.d,
    rubrique: ref(rubriqueId(v.cat)), datePublication: '2026-09-' + (20 + Number(v.id.slice(1))) + 'T12:00:00.000Z',
    miniatureUrl: unsplash(SHORT_PH[v.id]), url: SHORT_SRC[v.id], exemple: true,
  })
})

// --- 7. Page d'accueil (mise en avant reprise de la composition actuelle) -----------------------
docs.push({
  _id: 'accueil', _type: 'accueil',
  une: ref(articleId(1)),
  aLaUne: [5, 13, 9, 17].map((n, i) => ({ ...ref(articleId(n)), _key: key('u', i) })),
  tendances: [17, 6, 13, 3, 10].map((n, i) => ({ ...ref(articleId(n)), _key: key('t', i) })),
  bandeau: [17, 6, 13, 3, 10, 1, 5].map((n, i) => ({ ...ref(articleId(n)), _key: key('d', i) })),
})

// --- 8. Réglages du site -----------------------------------------------------------------------
docs.push({
  _id: 'reglages', _type: 'reglages',
  reseaux: [
    { _key: 'r-01', _type: 'reseau', plateforme: 'Instagram', url: 'https://www.instagram.com/xadikoa', identifiant: '@xadikoa', format: 'Carrousels & stories' },
    { _key: 'r-02', _type: 'reseau', plateforme: 'TikTok', url: 'https://www.tiktok.com/@xadikoa', identifiant: '@xadikoa', format: 'Vidéos courtes' },
    { _key: 'r-03', _type: 'reseau', plateforme: 'Facebook', url: 'https://www.facebook.com/profile.php?id=61593740588874', identifiant: 'Page XADIKOA', format: 'Articles & lives' },
    { _key: 'r-04', _type: 'reseau', plateforme: 'YouTube', url: 'https://www.youtube.com/@xadikoa', identifiant: '@xadikoa', format: 'Le Brief XDK' },
    { _key: 'r-05', _type: 'reseau', plateforme: 'X', url: 'https://x.com/XaDiKoa_', identifiant: '@XaDiKoa_', format: 'Actus en bref' },
  ],
})

// --- 9. Écriture ----------------------------------------------------------------------------------
const out = resolve(here, '../seed/seed.json')
mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, JSON.stringify(docs, null, 2) + '\n')
const count = (t) => docs.filter((d) => d._type === t).length
console.log(`seed.json écrit : ${docs.length} documents`,
  `(rubriques ${count('rubrique')}, auteurs ${count('auteur')}, articles ${count('article')}, vidéos ${count('video')})`)
