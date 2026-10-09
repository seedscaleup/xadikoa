import {defineCliConfig} from 'sanity/cli'
import config from './config.json'

export default defineCliConfig({
  api: {projectId: config.projectId || 'placeholder', dataset: config.dataset},
})
