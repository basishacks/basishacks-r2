import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const pages = [
  'app/pages/developers/users.vue',
  'app/pages/developers/applications/index.vue',
  'app/pages/developers/seasons.vue',
  'app/pages/developers/teams.vue',
  'app/pages/developers/debug.vue',
  'app/pages/developers/deepseek.vue',
  'app/pages/temp/vote/index.vue',
  'app/pages/temp/vote/all.vue',
]

describe('developer page navigation guards', () => {
  for (const page of pages) {
    it(`uses throw await navigateTo in ${page}`, () => {
      const source = readFileSync(resolve(import.meta.dirname, '..', '..', page), 'utf-8')
      expect(source).toContain('throw await navigateTo')
    })
  }
})
