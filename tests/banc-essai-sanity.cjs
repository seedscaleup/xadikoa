// Banc d'essai du site XADIKOA en mode « Sanity ».
// Le service Sanity est simulé avec groq-js (l'interpréteur officiel de son langage de requête) :
// la VRAIE requête du site est exécutée sur le contenu d'exemple (studio/seed/seed.json), dans un vrai navigateur.
//   cd tests && npm install && npm test          (variable CHROMIUM_PATH pour indiquer un navigateur existant)
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const http = require('http');
const ROOT = path.resolve(__dirname, '..');
const SEED = JSON.parse(fs.readFileSync(path.join(ROOT, 'studio/seed/seed.json'), 'utf8'));
let PORT = 0;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.png': 'image/png', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/\/$/, '/index.html'));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
  res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream' }); fs.createReadStream(f).pipe(res);
});
const LAUNCH = { executablePath: process.env.CHROMIUM_PATH || (fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined), args: ['--ignore-certificate-errors'] };
const GIF = Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64');
const clone = (x) => JSON.parse(JSON.stringify(x));
let passed = 0, failed = 0;
const ok = (cond, label, extra = '') => { if (cond) { passed++; console.log('  ✓', label); } else { failed++; console.log('  ✗ ÉCHEC :', label, extra); } };

async function open(browser, { docs, hash = '', http = null, viewport = { width: 1440, height: 900 } }) {
  const { parse, evaluate } = await import('groq-js');   // docs === null : mode « contenu intégré » (Sanity non configuré)
  const ctx = await browser.newContext({ viewport, ignoreHTTPSErrors: true });
  const page = await ctx.newPage();
  const errs = []; page.on('pageerror', (e) => errs.push(e.message.slice(0, 160)));
  const state = { calls: 0, http: http };
  if (docs) await page.route('**/index.html', async (route) => {
    const r = await route.fetch(); let body = await r.text();
    body = body.replace("projectId: ''", "projectId: 'testproj'");
    await route.fulfill({ response: r, body });
  });
  if (docs) await page.route('https://testproj.apicdn.sanity.io/**', async (route) => {
    state.calls++;
    if (state.http && state.http(state.calls)) return route.fulfill({ status: state.http(state.calls), body: 'boom', headers: { 'access-control-allow-origin': '*' } });
    const q = new URL(route.request().url()).searchParams.get('query');
    const tree = parse(q); const value = await evaluate(tree, { dataset: docs });
    const result = await value.get();
    await route.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ result, ms: 3 }) });
  });
  await page.route(/^https:\/\/(images\.unsplash\.com|cdn\.sanity\.io)\//, (route) => route.fulfill({ contentType: 'image/gif', body: GIF }));
  await page.route(/youtube-nocookie\.com/, (route) => route.fulfill({ contentType: 'text/html', body: '<html><body>yt</body></html>' }));
  await page.addInitScript(() => { /* pas de cache entre essais */ });
  await page.goto(`http://localhost:${PORT}/index.html${hash}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  await page.addStyleTag({ content: '[style*="opacity: 0"]{opacity:1!important;transform:none!important}' });
  return { page, ctx, errs, state, text: async () => (await page.evaluate(() => document.body.innerText)).replace(/\s+/g, ' ').trim() };
}

(async () => {
  await new Promise((r) => server.listen(0, '127.0.0.1', r)); PORT = server.address().port;
  const browser = await chromium.launch(LAUNCH);
  const art = (docs, n) => docs.find((d) => d._id === 'article-' + n);

  // ── T1 : contenu d'exemple complet = site intégré actuel ──
  console.log('T1  Contenu d’exemple complet (doit reproduire le site actuel)');
  {
    const live = await open(browser, { docs: clone(SEED) });
    const t = await live.text();
    ok(!/Chargement…|n’arrive pas à charger/.test(t), 'le site s’affiche (ni chargement ni erreur)');
    ok(t.includes('Douala sous la pluie') && t.includes('Le prix du plantain'), 'les articles d’exemple sont présents');
    ok(live.errs.length === 0, 'aucune erreur JavaScript', live.errs.join('|'));
    const emb = await open(browser, { docs: null }); const e2 = await emb.text(); await emb.ctx.close();
    const same = e2 === t;
    ok(same, 'l’accueil Sanity est identique mot pour mot à l’accueil intégré', same ? '' : (() => { let i = 0; while (e2[i] === t[i]) i++; return `\n     intégré : …${e2.slice(Math.max(0, i - 40), i + 80)}\n     sanity  : …${t.slice(Math.max(0, i - 40), i + 80)}`; })());
    // pages principales
    for (const [name, sel] of [['Business', 'header nav a'], ['Culture', 'header nav a']]) { await live.page.locator(sel, { hasText: name }).first().click(); await live.page.waitForTimeout(500); }
    ok((await live.text()).includes('Écrans Noirs'), 'la rubrique Culture liste ses articles');
    await live.page.locator('header a', { hasText: 'Vidéos' }).first().click(); await live.page.waitForTimeout(600);
    const tv = await live.text(); ok(tv.includes('Ép. 42') && tv.includes('Le plantain en 60 secondes'), 'la page Vidéos liste épisodes et vidéos courtes');
    await live.ctx.close();
  }

  // ── T2 : adresse directe d'un article ──
  console.log('T2  Lien direct vers un article (#/article/…) et bouton retour');
  {
    const slug = art(SEED, 5).slug.current;
    const s = await open(browser, { docs: clone(SEED), hash: '#/article/' + slug });
    const t = await s.text();
    ok(t.includes('Les fintechs veulent remplacer la tontine') && t.includes('Publié') === false && /À retenir|retenir/i.test(t) || t.includes('tontine'), 'l’article s’ouvre directement depuis son adresse');
    ok((await s.page.title()).startsWith('Les fintechs veulent remplacer la tontine'), 'le titre de l’onglet est celui de l’article', await s.page.title());
    await s.page.locator('header a img').first().click(); await s.page.waitForTimeout(400);
    ok((await s.page.evaluate(() => location.hash)) === '#/', 'retour à l’accueil : adresse #/');
    await s.page.goBack(); await s.page.waitForTimeout(500);
    ok((await s.text()).includes('Les fintechs veulent remplacer la tontine') && (await s.page.evaluate(() => location.hash)).includes(slug), 'le bouton « retour » ramène à l’article');
    await s.ctx.close();
    const u = await open(browser, { docs: clone(SEED), hash: '#/article/adresse-qui-nexiste-pas' });
    ok((await u.text()).includes('On vous explique'), 'une adresse inconnue ramène à l’accueil, sans erreur', u.errs.join('|')); await u.ctx.close();
  }

  // ── T3 : brouillons et publications programmées ──
  console.log('T3  Brouillon et article programmé : invisibles du public');
  {
    const docs = clone(SEED);
    const draft = clone(art(docs, 2)); draft._id = 'drafts.article-99'; draft.titre = 'TITRE DU BROUILLON SECRET'; draft.slug = { _type: 'slug', current: 'brouillon-secret' }; docs.push(draft);
    const future = clone(art(docs, 3)); future._id = 'article-98'; future.titre = 'TITRE PROGRAMME DANS LE FUTUR'; future.slug = { _type: 'slug', current: 'programme-futur' }; future.datePublication = new Date(Date.now() + 5 * 864e5).toISOString(); docs.push(future);
    const past = clone(art(docs, 3)); past._id = 'article-97'; past.titre = 'TITRE PROGRAMME DEJA ARRIVE'; past.slug = { _type: 'slug', current: 'programme-arrive' }; past.datePublication = new Date(Date.now() - 3600e3).toISOString(); docs.push(past);
    const s = await open(browser, { docs });
    await s.page.locator('header a[aria-label="Rechercher"]').click(); await s.page.waitForTimeout(500);
    const t = await s.text();
    ok(!t.includes('BROUILLON SECRET'), 'le brouillon n’apparaît pas');
    ok(!t.includes('PROGRAMME DANS LE FUTUR'), 'l’article daté du futur n’apparaît pas');
    ok(t.includes('PROGRAMME DEJA ARRIVE'), 'l’article programmé dont l’heure est passée apparaît');
    await s.ctx.close();
  }

  // ── T4/T5 : photos ──
  console.log('T4  Photos : photo téléversée, photo d’exemple, article sans photo');
  {
    const docs = clone(SEED);
    docs.push({ _id: 'image-abc123-1600x900-jpg', _type: 'sanity.imageAsset', url: 'https://cdn.sanity.io/images/testproj/production/abc123-1600x900.jpg' });
    const a1 = art(docs, 1); a1.photo = { _type: 'image', asset: { _type: 'reference', _ref: 'image-abc123-1600x900-jpg' } }; a1.photoCredit = 'Photo : Awa Nkoulou'; a1.photoLegende = 'Légende test';
    const a2 = art(docs, 2); delete a2.photoUrl; delete a2.photo;                       // aucune photo
    const a3 = art(docs, 3); a3.photoUrl = 'javascript:alert(1)';                       // lien malveillant
    const s = await open(browser, { docs });
    const imgs = await s.page.evaluate(() => [...document.images].map((i) => i.src));
    ok(imgs.some((u) => u.startsWith('https://cdn.sanity.io/images/testproj') && /[?&]w=\d+/.test(u) && /auto=format/.test(u)), 'la photo téléversée passe par le CDN de Sanity (taille et format optimisés)', imgs.filter((u) => u.includes('sanity')).slice(0, 2).join(' '));
    await s.page.locator('main h1 a, main h2 a, main a:has(h2)').first().click().catch(() => {}); await s.page.waitForTimeout(600);
    ok((await s.text()).includes('Légende test. Photo : Awa Nkoulou'), 'légende et crédit de la photo affichés');
    await s.page.locator('header a img').first().click(); await s.page.waitForTimeout(300);
    await s.page.locator('header nav a', { hasText: 'Actualité' }).first().click(); await s.page.waitForTimeout(600);
    const all = await s.page.evaluate(() => [...document.images].map((i) => i.src));
    ok(all.some((u) => u.startsWith('data:image/svg')), 'un article sans photo reçoit un fond neutre (pas d’image cassée)');
    ok(!all.some((u) => u.toLowerCase().includes('javascript')), 'un lien de photo malveillant (javascript:) est ignoré');
    ok(s.errs.length === 0, 'aucune erreur JavaScript', s.errs.join('|')); await s.ctx.close();
  }

  // ── T6 : rubrique vide ──
  console.log('T6  Rubrique sans aucun article');
  {
    const docs = clone(SEED).filter((d) => !(d._type === 'article' && d.rubrique._ref === 'rubrique-culture'));
    docs.forEach((d) => { if (d._type === 'accueil') { d.aLaUne = d.aLaUne.filter((r) => r._ref !== 'article-13'); d.tendances = d.tendances.filter((r) => r._ref !== 'article-13'); d.bandeau = d.bandeau.filter((r) => r._ref !== 'article-13'); } });
    const s = await open(browser, { docs });
    let t = await s.text(); ok(!/n’arrive pas à charger/.test(t) && t.includes('On vous explique'), 'l’accueil s’affiche malgré la rubrique vide', s.errs.join('|'));
    await s.page.locator('header nav a', { hasText: 'Culture' }).first().click(); await s.page.waitForTimeout(600);
    t = await s.text(); ok(s.errs.length === 0, 'la page de la rubrique vide s’ouvre sans erreur', s.errs.join('|'));
    ok(/Culture/.test(t) && !/Chargement…/.test(t), 'la rubrique vide affiche son en-tête');
    await s.ctx.close();
  }

  // ── T7 : aucune vidéo ──
  console.log('T7  Aucune vidéo publiée');
  {
    const docs = clone(SEED).filter((d) => d._type !== 'video');
    const s = await open(browser, { docs });
    ok((await s.text()).includes('On vous explique'), 'l’accueil s’affiche sans vidéo', s.errs.join('|'));
    await s.page.locator('header a', { hasText: 'Vidéos' }).first().click(); await s.page.waitForTimeout(600);
    ok(s.errs.length === 0, 'la page Vidéos s’ouvre sans erreur', s.errs.join('|')); await s.ctx.close();
  }

  // ── T8 : lecteur vidéo ──
  console.log('T8  Lecteur vidéo : YouTube, TikTok, fichier envoyé, clip .mp4');
  {
    const docs = clone(SEED);
    docs.push({ _id: 'file-vid1-mp4', _type: 'sanity.fileAsset', url: 'https://cdn.sanity.io/files/testproj/production/vid1.mp4' });
    const get = (id) => docs.find((d) => d._id === id);
    get('video-ep42').url = 'https://youtu.be/dQw4w9WgXcQ';
    get('video-ep41').url = 'https://www.youtube.com/watch?v=abcdefghijk&t=3';
    get('video-s1').url = 'https://www.tiktok.com/@xadikoa/video/123';
    get('video-s2').url = 'javascript:alert(1)';
    get('video-s3').fichier = { _type: 'file', asset: { _type: 'reference', _ref: 'file-vid1-mp4' } };
    const s = await open(browser, { docs });
    await s.page.locator('header a', { hasText: 'Vidéos' }).first().click(); await s.page.waitForTimeout(700);
    await s.page.locator('main a', { hasText: 'La pluie, le plantain et le port' }).first().click(); await s.page.waitForTimeout(800);
    let src = await s.page.evaluate(() => (document.querySelector('iframe') || {}).src);
    ok(src && src.startsWith('https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'), 'épisode YouTube : lu dans le site (youtube-nocookie)', String(src));
    await s.page.keyboard.press('Escape'); await s.page.waitForTimeout(300);
    await s.page.locator('main a', { hasText: 'Rentrée : ce que ça coûte vraiment' }).first().click(); await s.page.waitForTimeout(600);
    src = await s.page.evaluate(() => (document.querySelector('iframe') || {}).src); ok(/embed\/abcdefghijk/.test(String(src)), 'lien YouTube « watch?v=… » reconnu', String(src));
    await s.page.keyboard.press('Escape'); await s.page.waitForTimeout(300);
    await s.page.locator('main a', { hasText: 'Le plantain en 60 secondes' }).first().click(); await s.page.waitForTimeout(600);
    let t = await s.text(); const link = await s.page.evaluate(() => { const a = [...document.querySelectorAll('a')].find((x) => /Ouvrir sur TikTok/.test(x.textContent)); return a ? a.href + '|' + a.target + '|' + a.rel : null; });
    ok(link && link.startsWith('https://www.tiktok.com/@xadikoa/video/123|_blank|noopener'), 'vidéo TikTok : bouton « Ouvrir sur TikTok » (nouvel onglet, sécurisé)', String(link));
    await s.page.keyboard.press('Escape'); await s.page.waitForTimeout(300);
    await s.page.locator('main a', { hasText: 'Ndolé chrono' }).first().click(); await s.page.waitForTimeout(600);
    ok(!(await s.page.evaluate(() => !!document.querySelector('a[href^="javascript"], iframe[src^="javascript"], video[src^="javascript"]'))), 'un lien de vidéo malveillant (javascript:) n’est jamais injecté');
    await s.page.keyboard.press('Escape'); await s.page.waitForTimeout(300);
    await s.page.locator('main a', { hasText: '3 choses à savoir sur les délestages' }).first().click(); await s.page.waitForTimeout(600);
    const vsrc = await s.page.evaluate(() => (document.querySelector('video') || {}).src);
    ok(vsrc === 'https://cdn.sanity.io/files/testproj/production/vid1.mp4', 'fichier vidéo envoyé dans Sanity : lecteur natif', String(vsrc));
    ok(s.errs.length === 0, 'aucune erreur JavaScript', s.errs.join('|')); await s.ctx.close();
  }

  // ── T9 : accueil non configuré ──
  console.log('T9  Accueil non renseigné : remplissage automatique par les plus récents');
  {
    const docs = clone(SEED).filter((d) => d._type !== 'accueil');
    const s = await open(browser, { docs });
    const t = await s.text();
    const recent = SEED.filter((d) => d._type === 'article').sort((a, b) => b.datePublication.localeCompare(a.datePublication))[0];
    ok(t.includes(recent.titre), 'l’article le plus récent est mis à la une', recent.titre);
    ok(s.errs.length === 0, 'aucune erreur JavaScript', s.errs.join('|'));
    ok((await s.page.evaluate(() => document.querySelectorAll('main section').length)) > 3, 'toutes les sections de l’accueil sont remplies'); await s.ctx.close();
  }
  console.log('T9b Sélection partielle de la rédaction');
  {
    const docs = clone(SEED); const acc = docs.find((d) => d._type === 'accueil'); acc.une = { _type: 'reference', _ref: 'article-12' }; acc.aLaUne = [{ _key: 'x', _type: 'reference', _ref: 'article-20' }];
    const s = await open(browser, { docs }); const t = await s.text();
    ok(t.indexOf(art(SEED, 12).titre) > -1 && t.indexOf(art(SEED, 12).titre) < t.indexOf(art(SEED, 20).titre), 'l’article choisi pour la une passe en premier, la sélection partielle est complétée', ''); ok(s.errs.length === 0, 'aucune erreur JavaScript', s.errs.join('|')); await s.ctx.close();
  }

  // ── T10 : panne du service puis reprise ──
  console.log('T10 Panne du service Sanity, puis reprise');
  {
    const s = await open(browser, { docs: clone(SEED), http: (n) => (n === 1 ? 500 : 0) });
    let t = await s.text();
    ok(/n’arrive pas à charger ses articles/.test(t) && /Réessayer/.test(t), 'en cas de panne : message clair + bouton « Réessayer »');
    ok(!t.includes('Douala sous la pluie'), 'aucun contenu fictif de secours n’est montré à la place');
    await s.page.locator('button', { hasText: 'Réessayer' }).click(); await s.page.waitForTimeout(1200);
    t = await s.text(); ok(t.includes('Douala sous la pluie') && !/n’arrive pas à charger/.test(t), 'après « Réessayer », le site se charge');
    await s.ctx.close();
    const e = await open(browser, { docs: [] });
    ok(/n’arrive pas à charger/.test(await e.text()), 'une base vide affiche l’écran d’erreur au lieu d’une page blanche', e.errs.join('|')); await e.ctx.close();
  }

  // ── T13 : réseaux sociaux ──
  console.log('T13 Réseaux sociaux pilotés par les réglages');
  {
    const docs = clone(SEED); const r = docs.find((d) => d._type === 'reglages');
    r.reseaux = [r.reseaux[0], { _key: 'z', _type: 'reseau', plateforme: 'Telegram', url: 'https://t.me/xadikoa', identifiant: '@xadikoa', format: 'Alertes' }, { _key: 'y', _type: 'reseau', plateforme: 'Piège', url: 'javascript:alert(1)', identifiant: 'x', format: 'y' }];
    const s = await open(browser, { docs }); const bar = await s.page.evaluate(() => [...document.querySelectorAll('div')].find((d) => /gap: 18px/.test(d.getAttribute('style') || '') && d.children.length >= 2)?.innerText.replace(/\n+/g, ', '));
    ok(bar === 'Instagram, Telegram', 'la barre du haut affiche exactement les réseaux saisis (le lien malveillant est écarté)', String(bar));
    await s.ctx.close();
    const d = clone(SEED).filter((x) => x._type !== 'reglages'); const s2 = await open(browser, { docs: d });
    const bar2 = await s2.page.evaluate(() => [...document.querySelectorAll('div')].find((x) => /gap: 18px/.test(x.getAttribute('style') || '') && x.children.length >= 2)?.innerText.replace(/\n+/g, ', '));
    ok(bar2 === 'Instagram, TikTok, Facebook, YouTube, X', 'sans réglages : les 5 réseaux par défaut', String(bar2)); await s2.ctx.close();
  }

  // ── T15 : téléphone ──
  console.log('T15 Version téléphone en mode Sanity');
  {
    const s = await open(browser, { docs: clone(SEED), viewport: { width: 390, height: 844 } });
    ok((await s.page.evaluate(() => document.documentElement.scrollWidth)) === 390, 'aucun débordement horizontal à 390 px');
    ok(s.errs.length === 0, 'aucune erreur JavaScript', s.errs.join('|')); await s.ctx.close();
  }

  await browser.close(); server.close();
  console.log(`\n${failed ? '✗' : '✓'} ${passed} contrôles réussis, ${failed} échec(s)`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error('ERREUR DU BANC D’ESSAI', e); process.exit(2); });
