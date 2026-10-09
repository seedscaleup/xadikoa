import {defineArrayMember, defineField, defineType} from 'sanity'

export default defineType({
  name: 'reglages',
  title: 'Réglages du site',
  type: 'document',
  fields: [
    defineField({
      name: 'reseaux',
      title: 'Réseaux sociaux',
      description: 'Les comptes affichés dans la barre du haut, la section « On se retrouve aussi ici » et le pied de page.',
      type: 'array',
      validation: (Rule) => Rule.max(8),
      of: [
        defineArrayMember({
          type: 'object',
          name: 'reseau',
          fields: [
            defineField({
              name: 'plateforme',
              title: 'Réseau',
              type: 'string',
              options: {list: ['Instagram', 'TikTok', 'Facebook', 'YouTube', 'X', 'LinkedIn', 'WhatsApp', 'Threads', 'Telegram']},
              validation: (Rule) => Rule.required(),
            }),
            defineField({name: 'url', title: 'Lien du compte', type: 'url', validation: (Rule) => Rule.required().uri({scheme: ['https']})}),
            defineField({name: 'identifiant', title: 'Identifiant affiché', description: 'Ex. @xadikoa', type: 'string'}),
            defineField({name: 'format', title: 'Ce qu’on y trouve', description: 'Ex. « Vidéos courtes ».', type: 'string'}),
          ],
          preview: {select: {title: 'plateforme', subtitle: 'identifiant'}},
        }),
      ],
    }),
  ],
  preview: {prepare: () => ({title: 'Réglages du site'})},
})
