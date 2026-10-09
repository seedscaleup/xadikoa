import {defineField, defineType} from 'sanity'

const hex = (Rule: any) =>
  Rule.required().regex(/^#[0-9A-Fa-f]{6}$/, {name: 'couleur'}).error('Couleur au format #RRGGBB (ex. #D3F90F)')

export default defineType({
  name: 'rubrique',
  title: 'Rubrique',
  type: 'document',
  fields: [
    defineField({
      name: 'nom',
      title: 'Nom de la rubrique',
      type: 'string',
      validation: (Rule) => Rule.required().max(24),
    }),
    defineField({
      name: 'code',
      title: 'Identifiant technique',
      description: 'Ne pas modifier : utilisé par le site pour reconnaître la rubrique.',
      type: 'string',
      readOnly: true,
    }),
    defineField({name: 'ordre', title: 'Position dans le menu', type: 'number', validation: (Rule) => Rule.required().integer().min(1)}),
    defineField({
      name: 'accroche',
      title: 'Accroche courte',
      description: 'Quelques mots affichés sur la carte de la rubrique (ex. « Décrypter l’actu »).',
      type: 'string',
      validation: (Rule) => Rule.required().max(40),
    }),
    defineField({
      name: 'description',
      title: 'Description',
      description: 'Une phrase qui présente la rubrique (page de la rubrique, page À propos).',
      type: 'text',
      rows: 3,
      validation: (Rule) => Rule.required().max(200),
    }),
    defineField({
      name: 'themes',
      title: 'Thèmes de la rubrique',
      description: 'Les filtres proposés sur la page de la rubrique (ex. Faits, Décryptages…). Un article peut utiliser ces thèmes.',
      type: 'array',
      of: [{type: 'string'}],
      options: {layout: 'tags'},
      validation: (Rule) => Rule.max(8),
    }),
    defineField({name: 'couleurFond', title: 'Couleur principale', type: 'string', validation: hex}),
    defineField({
      name: 'couleurTexte',
      title: 'Couleur du texte sur la couleur principale',
      type: 'string',
      options: {list: [{title: 'Noir', value: '#000'}, {title: 'Blanc', value: '#fff'}], layout: 'radio'},
      validation: (Rule) => Rule.required(),
    }),
    defineField({name: 'couleurPale', title: 'Couleur pâle (arrière-plans)', type: 'string', validation: hex}),
  ],
  orderings: [{title: 'Position', name: 'ordre', by: [{field: 'ordre', direction: 'asc'}]}],
  preview: {select: {title: 'nom', subtitle: 'accroche'}},
})
