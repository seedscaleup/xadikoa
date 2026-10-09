import {defineField, defineType} from 'sanity'

export default defineType({
  name: 'auteur',
  title: 'Auteur',
  type: 'document',
  fields: [
    defineField({name: 'nom', title: 'Nom complet', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({name: 'fonction', title: 'Fonction', description: 'Ex. « Journaliste Business ».', type: 'string', validation: (Rule) => Rule.required()}),
    defineField({
      name: 'accroche',
      title: 'Accroche manuscrite',
      description: 'Trois ou quatre mots en écriture manuscrite sur la fiche (ex. « elle couvre la ville »).',
      type: 'string',
      validation: (Rule) => Rule.max(40),
    }),
    defineField({name: 'bio', title: 'Biographie', type: 'text', rows: 4, validation: (Rule) => Rule.required().max(400)}),
    defineField({
      name: 'couleur',
      title: 'Couleur de la fiche',
      description: 'Couleur d’accent de l’auteur (format #RRGGBB).',
      type: 'string',
      initialValue: '#D3F90F',
      validation: (Rule) => Rule.required().regex(/^#[0-9A-Fa-f]{6}$/).error('Format attendu : #RRGGBB'),
    }),
    defineField({name: 'photo', title: 'Portrait', type: 'image', options: {hotspot: true}}),
    defineField({
      name: 'photoUrl',
      title: 'Portrait d’exemple (lien)',
      description: 'Utilisé tant qu’aucun portrait n’est ajouté ci-dessus.',
      type: 'url',
      hidden: ({document}) => Boolean((document?.photo as any)?.asset),
    }),
    defineField({
      name: 'exemple',
      title: 'Contenu d’exemple, à remplacer',
      description: 'Décochez dès que cette fiche est celle d’une vraie personne de la rédaction.',
      type: 'boolean',
      initialValue: false,
    }),
  ],
  preview: {
    select: {title: 'nom', subtitle: 'fonction', media: 'photo', exemple: 'exemple'},
    prepare: ({title, subtitle, media, exemple}) => ({title: (exemple ? '🧪 ' : '') + title, subtitle, media}),
  },
})
