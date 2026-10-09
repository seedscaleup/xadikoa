import {defineField, defineType} from 'sanity'
import {blocsArticle} from './blocs'

// Slug sans accents : « Délestages à Yaoundé » → « delestages-a-yaounde »
const slugify = (input: string) =>
  input.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)

export default defineType({
  name: 'article',
  title: 'Article',
  type: 'document',
  groups: [
    {name: 'contenu', title: 'Contenu', default: true},
    {name: 'photo', title: 'Photo'},
    {name: 'publication', title: 'Publication'},
  ],
  fields: [
    defineField({
      name: 'titre',
      title: 'Titre',
      type: 'string',
      group: 'contenu',
      validation: (Rule) => Rule.required().max(160).warning('Un titre de moins de 110 caractères est plus lisible.'),
    }),
    defineField({
      name: 'rubrique',
      title: 'Rubrique',
      type: 'reference',
      to: [{type: 'rubrique'}],
      group: 'contenu',
      options: {disableNew: true},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'chapo',
      title: 'Chapô (introduction)',
      description: '2 à 3 phrases qui donnent envie de lire. Affiché sous le titre et sur les pages de liste.',
      type: 'text',
      rows: 3,
      group: 'contenu',
      validation: (Rule) => Rule.required().max(320).warning('Au-delà de 320 caractères, le chapô sera très long.'),
    }),
    defineField({
      name: 'corps',
      title: 'Texte de l’article',
      description: 'Ajoutez des blocs : paragraphes, intertitres, citations, photos, encadré « À retenir ».',
      type: 'array',
      of: blocsArticle,
      group: 'contenu',
    }),
    defineField({
      name: 'themes',
      title: 'Thèmes',
      description: 'Mots-clés de l’article (ex. Marchés, Jeunesse). Ils servent aux filtres de la rubrique et à la recherche.',
      type: 'array',
      of: [{type: 'string'}],
      options: {layout: 'tags'},
      group: 'contenu',
      validation: (Rule) => Rule.max(5),
    }),
    defineField({
      name: 'photo',
      title: 'Photo principale',
      description: 'Format paysage conseillé (au moins 1600 px de large). Cliquez sur la photo pour choisir la zone importante.',
      type: 'image',
      options: {hotspot: true},
      group: 'photo',
      validation: (Rule) =>
        Rule.custom((value, context) =>
          (value as any)?.asset || context.document?.photoUrl ? true : 'Ajoutez une photo principale.'
        ),
    }),
    defineField({
      name: 'photoUrl',
      title: 'Photo d’exemple (lien)',
      description: 'Photo provisoire, utilisée tant qu’aucune photo n’est ajoutée ci-dessus.',
      type: 'url',
      group: 'photo',
      hidden: ({document}) => Boolean((document?.photo as any)?.asset),
    }),
    defineField({
      name: 'photoDescription',
      title: 'Description de la photo (accessibilité)',
      description: 'Une phrase qui décrit ce qu’on voit. Lue par les lecteurs d’écran.',
      type: 'string',
      group: 'photo',
      validation: (Rule) =>
        Rule.custom((value, context) => {
          const hasPhoto = Boolean((context.document?.photo as any)?.asset)
          return hasPhoto && !value ? 'Décrivez la photo en une phrase.' : true
        }),
    }),
    defineField({name: 'photoLegende', title: 'Légende', type: 'string', group: 'photo'}),
    defineField({name: 'photoCredit', title: 'Crédit photo', description: 'Ex. « Photo : Nom Prénom ».', type: 'string', group: 'photo'}),
    defineField({
      name: 'slug',
      title: 'Adresse de l’article',
      description: 'Générée à partir du titre. Elle fait partie du lien partagé : ne la changez plus après publication.',
      type: 'slug',
      group: 'publication',
      options: {source: 'titre', maxLength: 80, slugify},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'auteur',
      title: 'Auteur',
      type: 'reference',
      to: [{type: 'auteur'}],
      group: 'publication',
      options: {disableNew: true},
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'datePublication',
      title: 'Date et heure de publication',
      description: 'Un article daté du futur n’apparaît sur le site qu’à partir de cette date.',
      type: 'datetime',
      group: 'publication',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'tempsLecture',
      title: 'Temps de lecture (minutes)',
      description: 'Laissez vide : le site le calcule à partir du texte.',
      type: 'number',
      group: 'publication',
      validation: (Rule) => Rule.integer().min(1).max(60),
    }),
    defineField({
      name: 'relu',
      title: 'Relu par la rédaction',
      description: 'À cocher après relecture (orthographe, faits, noms propres, photo). Impossible de publier sans cette case.',
      type: 'boolean',
      group: 'publication',
      initialValue: false,
      validation: (Rule) => Rule.custom((value) => (value === true ? true : 'Cochez « Relu par la rédaction » avant de publier.')),
    }),
    defineField({
      name: 'exemple',
      title: 'Contenu d’exemple, à remplacer',
      description: 'Coché pour les articles fictifs d’origine. Décochez-le quand vous réécrivez l’article avec le vrai contenu.',
      type: 'boolean',
      group: 'publication',
      initialValue: false,
    }),
  ],
  orderings: [
    {title: 'Plus récents d’abord', name: 'recent', by: [{field: 'datePublication', direction: 'desc'}]},
    {title: 'Titre (A → Z)', name: 'titre', by: [{field: 'titre', direction: 'asc'}]},
  ],
  preview: {
    select: {titre: 'titre', rubrique: 'rubrique.nom', date: 'datePublication', media: 'photo', exemple: 'exemple', relu: 'relu'},
    prepare: ({titre, rubrique, date, media, exemple, relu}) => ({
      title: (exemple ? '🧪 ' : '') + (titre || 'Sans titre'),
      subtitle: [rubrique, date ? String(date).slice(0, 10) : 'sans date', relu ? '✓ relu' : 'à relire'].filter(Boolean).join(' · '),
      media,
    }),
  },
})
