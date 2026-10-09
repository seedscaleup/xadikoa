import type {StructureResolver} from 'sanity/structure'
import config from './config.json'

type Rubrique = {_id: string; nom: string; code: string}

const RECENT = [{field: 'datePublication', direction: 'desc' as const}]

// Organisation du menu de gauche : tout est rangé rubrique par rubrique.
export const structure: StructureResolver = async (S, context) => {
  const client = context.getClient({apiVersion: config.apiVersion})
  const rubriques: Rubrique[] = await client.fetch('*[_type=="rubrique"]|order(ordre asc){_id,nom,code}')

  const unique = (id: string, titre: string, type: string) =>
    S.listItem().id(id).title(titre).child(S.document().schemaType(type).documentId(id).title(titre))

  const liste = (id: string, titre: string, filtre: string, params: Record<string, unknown> = {}) =>
    S.listItem()
      .id(id)
      .title(titre)
      .child(S.documentList().title(titre).schemaType('article').filter(filtre).params(params).defaultOrdering(RECENT))

  const parRubrique = rubriques.map((r) =>
    S.listItem()
      .id('rub-' + r.code)
      .title(r.nom)
      .child(
        S.list()
          .title(r.nom)
          .items([
            liste('tous-' + r.code, 'Tous les articles', '_type=="article" && rubrique._ref==$r', {r: r._id}),
            liste('exemples-' + r.code, '🧪 À remplacer (contenus d’exemple)', '_type=="article" && rubrique._ref==$r && exemple==true', {r: r._id}),
            liste('relire-' + r.code, '⏳ À relire', '_type=="article" && rubrique._ref==$r && exemple!=true && relu!=true', {r: r._id}),
            S.listItem()
              .id('videos-' + r.code)
              .title('Vidéos courtes de la rubrique')
              .child(S.documentList().title('Vidéos courtes · ' + r.nom).schemaType('video').filter('_type=="video" && format=="short" && rubrique._ref==$r').params({r: r._id}).defaultOrdering(RECENT)),
          ])
      )
  )

  return S.list()
    .title('XADIKOA')
    .items([
      unique('accueil', '🏠 Page d’accueil', 'accueil'),
      S.divider(),
      S.listItem().id('par-rubrique').title('📰 Articles, rubrique par rubrique').child(S.list().title('Rubriques').items(parRubrique)),
      S.listItem()
        .id('tous-articles')
        .title('📝 Tous les articles')
        .child(S.documentList().title('Tous les articles').schemaType('article').filter('_type=="article"').defaultOrdering(RECENT)),
      S.divider(),
      S.listItem()
        .id('videos')
        .title('🎬 Vidéos')
        .child(
          S.list()
            .title('Vidéos')
            .items([
              S.listItem().id('episodes').title('Épisodes du Brief XDK').child(S.documentList().title('Épisodes du Brief XDK').schemaType('video').filter('_type=="video" && format=="episode"').defaultOrdering(RECENT)),
              S.listItem().id('courtes').title('Vidéos courtes (XDK en 60 secondes)').child(S.documentList().title('Vidéos courtes').schemaType('video').filter('_type=="video" && format=="short"').defaultOrdering(RECENT)),
            ])
        ),
      S.documentTypeListItem('auteur').title('👥 Auteurs'),
      S.documentTypeListItem('rubrique').title('🎨 Rubriques (textes et couleurs)'),
      S.divider(),
      unique('reglages', '⚙️ Réglages du site (réseaux sociaux)', 'reglages'),
    ])
}
