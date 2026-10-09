import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'video',
  title: 'Vidéo',
  type: 'document',
  fields: [
    defineField({
      name: 'format',
      title: 'Format',
      type: 'string',
      options: {
        list: [
          {title: 'Épisode du Brief XDK', value: 'episode'},
          {title: 'Vidéo courte (XDK en 60 secondes)', value: 'short'},
        ],
        layout: 'radio',
      },
      initialValue: 'short',
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'titre', title: 'Titre', type: 'string', validation: (Rule) => Rule.required().max(120)}),
    defineField({
      name: 'numero',
      title: 'Numéro de l’épisode',
      description: 'Ex. 43 pour « Ép. 43 ».',
      type: 'number',
      hidden: ({document}) => document?.format !== 'episode',
      validation: (Rule) =>
        Rule.custom((value, context) => (context.document?.format === 'episode' && !value ? 'Indiquez le numéro de l’épisode.' : true)),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      description: 'Une ou deux phrases sur le contenu de l’épisode.',
      type: 'text',
      rows: 3,
      hidden: ({document}) => document?.format !== 'episode',
    }),
    defineField({
      name: 'rubrique',
      title: 'Rubrique',
      type: 'reference',
      to: [{type: 'rubrique'}],
      options: {disableNew: true},
      hidden: ({document}) => document?.format !== 'short',
      validation: (Rule) =>
        Rule.custom((value, context) => (context.document?.format === 'short' && !value ? 'Choisissez la rubrique de la vidéo.' : true)),
    }),
    defineField({
      name: 'fichier',
      title: 'Fichier vidéo (facultatif)',
      description: 'Envoyez directement une vidéo (.mp4) : elle sera lue sur le site et remplace le lien ci-dessous. Pensez à la compresser avant (idéalement moins de 100 Mo).',
      type: 'file',
      options: {accept: 'video/mp4,video/webm'},
    }),
    defineField({
      name: 'url',
      title: 'Lien de la vidéo',
      description: 'Lien YouTube (youtube.com ou youtu.be) : la vidéo se lit sur le site. Lien TikTok ou Instagram : le bouton ouvre le réseau. Lien .mp4 : lecture directe.',
      type: 'url',
      validation: (Rule) =>
        Rule.uri({scheme: ['https']}).custom((value, context) =>
          value || (context.document?.fichier as any)?.asset ? true : 'Ajoutez un lien ou un fichier vidéo.'
        ),
    }),
    defineField({
      name: 'duree',
      title: 'Durée',
      description: 'Ex. « 12 min » pour un épisode, « 0:58 » pour une vidéo courte.',
      type: 'string',
      validation: (Rule) => Rule.required().max(10),
    }),
    defineField({name: 'miniature', title: 'Image de couverture', type: 'image', options: {hotspot: true}}),
    defineField({
      name: 'miniatureUrl',
      title: 'Image d’exemple (lien)',
      description: 'Utilisée tant qu’aucune image de couverture n’est ajoutée ci-dessus.',
      type: 'url',
      hidden: ({document}) => Boolean((document?.miniature as any)?.asset),
    }),
    defineField({
      name: 'datePublication',
      title: 'Date de publication',
      type: 'datetime',
      initialValue: () => new Date().toISOString(),
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: 'exemple',
      title: 'Contenu d’exemple, à remplacer',
      description: 'Coché pour les vidéos fictives d’origine (le lien pointe vers un clip d’exemple). Décochez après remplacement.',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  orderings: [{title: 'Plus récentes d’abord', name: 'recent', by: [{field: 'datePublication', direction: 'desc'}]}],
  preview: {
    select: {titre: 'titre', format: 'format', duree: 'duree', media: 'miniature', exemple: 'exemple'},
    prepare: ({titre, format, duree, media, exemple}) => ({
      title: (exemple ? '🧪 ' : '') + titre,
      subtitle: (format === 'episode' ? 'Épisode du Brief' : 'Vidéo courte') + ' · ' + duree,
      media,
    }),
  },
})
