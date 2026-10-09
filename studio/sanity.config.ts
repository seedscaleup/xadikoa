import {defineConfig} from 'sanity'
import {structureTool} from 'sanity/structure'
import {visionTool} from '@sanity/vision'
import {schemaTypes} from './schemaTypes'
import {structure} from './structure'
import {suiviTool} from './suivi'
import config from './config.json'

// Documents « uniques » ou de structure : on les modifie, mais on ne les crée ni ne les supprime.
const FIXES = ['accueil', 'reglages', 'rubrique']

export default defineConfig({
  name: 'xadikoa',
  title: 'XADIKOA — Rédaction',
  projectId: config.projectId || 'placeholder',
  dataset: config.dataset,
  plugins: [structureTool({structure}), visionTool({defaultApiVersion: config.apiVersion})],
  tools: (prev) => [...prev, suiviTool],
  schema: {
    types: schemaTypes,
    templates: (templates) => templates.filter(({schemaType}) => !FIXES.includes(schemaType)),
  },
  document: {
    actions: (prev, {schemaType}) =>
      FIXES.includes(schemaType) ? prev.filter(({action}) => !['unpublish', 'delete', 'duplicate'].includes(action as string)) : prev,
  },
})
