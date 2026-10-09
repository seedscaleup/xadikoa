import {defineArrayMember, defineField, defineType} from 'sanity'

const articleRef = defineArrayMember({
  type: 'reference',
  to: [{type: 'article'}],
  options: {disableNew: true, filter: 'defined(slug.current)'},
})

export default defineType({
  name: 'accueil',
  title: 'Page d’accueil',
  type: 'document',
  fields: [
    defineField({
      name: 'une',
      title: 'L’article à la une',
      description: 'Le grand article en haut de l’accueil. Laissez vide : le site prend l’article publié le plus récent.',
      type: 'reference',
      to: [{type: 'article'}],
      options: {disableNew: true},
    }),
    defineField({
      name: 'aLaUne',
      title: '« À la une » (4 articles)',
      description: 'Les quatre articles de la sélection du moment. Laissez vide : le site choisit les plus récents.',
      type: 'array',
      of: [articleRef],
      validation: (Rule) => Rule.max(4).error('Quatre articles au maximum.'),
    }),
    defineField({
      name: 'tendances',
      title: '« Ce qui fait parler » (5 articles)',
      description: 'La liste numérotée 01 à 05. Laissez vide : le site choisit les articles de la rubrique Tendances puis les plus récents.',
      type: 'array',
      of: [articleRef],
      validation: (Rule) => Rule.max(5).error('Cinq articles au maximum.'),
    }),
    defineField({
      name: 'bandeau',
      title: 'Bandeau défilant (jusqu’à 8 articles)',
      description: 'Les titres qui défilent sous le menu. Laissez vide : le site utilise les derniers articles.',
      type: 'array',
      of: [articleRef],
      validation: (Rule) => Rule.max(8).error('Huit articles au maximum.'),
    }),
  ],
  preview: {prepare: () => ({title: 'Page d’accueil'})},
})
