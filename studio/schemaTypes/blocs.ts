import {defineArrayMember, defineField} from 'sanity'

// Les « blocs » qui composent le corps d'un article. Chaque bloc correspond à un élément
// que le site sait afficher : paragraphe, intertitre, citation, photo, encadré « À retenir ».

export const blocsArticle = [
  defineArrayMember({
    name: 'paragraphe',
    title: 'Paragraphe',
    type: 'object',
    fields: [defineField({name: 'texte', title: 'Texte', type: 'text', rows: 6, validation: (Rule) => Rule.required()})],
    preview: {select: {title: 'texte'}, prepare: ({title}) => ({title: title, subtitle: 'Paragraphe'})},
  }),
  defineArrayMember({
    name: 'intertitre',
    title: 'Intertitre',
    type: 'object',
    fields: [defineField({name: 'texte', title: 'Intertitre', type: 'string', validation: (Rule) => Rule.required().max(120)})],
    preview: {select: {title: 'texte'}, prepare: ({title}) => ({title: title, subtitle: 'Intertitre'})},
  }),
  defineArrayMember({
    name: 'citation',
    title: 'Citation',
    type: 'object',
    fields: [
      defineField({name: 'texte', title: 'Citation', type: 'text', rows: 3, validation: (Rule) => Rule.required()}),
      defineField({name: 'auteur', title: 'Qui parle ?', description: 'Ex. « Pauline, 54 ans, habitante de Makepe ».', type: 'string'}),
    ],
    preview: {select: {title: 'texte', subtitle: 'auteur'}, prepare: ({title, subtitle}) => ({title: '« ' + title + ' »', subtitle: 'Citation · ' + (subtitle || '')})},
  }),
  defineArrayMember({
    name: 'photoArticle',
    title: 'Photo',
    type: 'object',
    fields: [
      defineField({name: 'image', title: 'Photo', type: 'image', options: {hotspot: true}}),
      defineField({
        name: 'imageUrl',
        title: 'Photo d’exemple (lien)',
        description: 'Utilisée tant qu’aucune photo n’est ajoutée ci-dessus.',
        type: 'url',
        hidden: ({parent}) => Boolean(parent?.image?.asset),
      }),
      defineField({name: 'description', title: 'Description de la photo (accessibilité)', description: 'Décrivez ce qu’on voit, en une phrase.', type: 'string'}),
      defineField({name: 'legende', title: 'Légende', type: 'string'}),
      defineField({name: 'credit', title: 'Crédit photo', description: 'Ex. « Photo : Nom Prénom ».', type: 'string'}),
    ],
    preview: {select: {title: 'legende', media: 'image'}, prepare: ({title, media}) => ({title: title || 'Photo', subtitle: 'Photo', media})},
  }),
  defineArrayMember({
    name: 'aRetenir',
    title: 'À retenir (encadré)',
    type: 'object',
    fields: [
      defineField({
        name: 'points',
        title: 'Les points à retenir',
        type: 'array',
        of: [{type: 'string'}],
        validation: (Rule) => Rule.required().min(1).max(5),
      }),
    ],
    preview: {select: {points: 'points'}, prepare: ({points}) => ({title: (points || []).length + ' point(s) à retenir', subtitle: 'Encadré'})},
  }),
]
