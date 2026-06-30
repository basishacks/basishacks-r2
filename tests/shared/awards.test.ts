import { AWARD_REGISTRY, type Award } from '~~/shared/awards'

describe('AWARD_REGISTRY', () => {
  it('has at least one entry', () => {
    expect(Object.keys(AWARD_REGISTRY)).not.toHaveLength(0)
  })

  it('contains the perfect_score award', () => {
    expect(AWARD_REGISTRY).toHaveProperty('perfect_score')
  })

  describe('perfect_score award', () => {
    const award = AWARD_REGISTRY.perfect_score

    it('has a namespace', () => {
      expect(award.namespace).toBe('perfect_score')
      expect(typeof award.namespace).toBe('string')
    })

    it('has a name', () => {
      expect(award.name).toBeTruthy()
      expect(typeof award.name).toBe('string')
    })

    it('has a description', () => {
      expect(award.description).toBeTruthy()
      expect(typeof award.description).toBe('string')
    })

    it('has an icon', () => {
      expect(award.icon).toBeTruthy()
      expect(typeof award.icon).toBe('string')
    })
  })

  describe('each award', () => {
    for (const [key, award] of Object.entries(AWARD_REGISTRY)) {
      describe(`award '${key}'`, () => {
        it('has a non-empty namespace', () => {
          expect(award.namespace).toBeTruthy()
          expect(typeof award.namespace).toBe('string')
        })

        it('has a non-empty name', () => {
          expect(award.name).toBeTruthy()
          expect(typeof award.name).toBe('string')
        })

        it('has a non-empty description', () => {
          expect(award.description).toBeTruthy()
          expect(typeof award.description).toBe('string')
        })

        it('has a non-empty icon', () => {
          expect(award.icon).toBeTruthy()
          expect(typeof award.icon).toBe('string')
        })

        it('namespace matches the registry key', () => {
          expect(award.namespace).toBe(key)
        })
      })
    }
  })
})