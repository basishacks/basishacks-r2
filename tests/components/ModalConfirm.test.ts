import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const source = readFileSync(
  resolve(import.meta.dirname, '..', '..', 'app', 'components', 'ModalConfirm.vue'),
  'utf-8',
)

describe('ModalConfirm.vue', () => {
  it('closes the modal after the Confirm action runs', () => {
    expect(source).toContain('@click="click(); close()"')
  })
})
