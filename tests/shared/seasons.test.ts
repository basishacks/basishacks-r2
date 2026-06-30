import hackathonSeasons from '~~/shared/seasons'

describe('hackathonSeasons', () => {
  it('has at least one entry', () => {
    expect(Object.keys(hackathonSeasons)).not.toHaveLength(0)
  })

  describe('each season', () => {
    for (const [idStr, season] of Object.entries(hackathonSeasons)) {
      const id = Number(idStr)

      describe(`season ${id}`, () => {
        it('has an id field', () => {
          expect(season).toHaveProperty('id')
          expect(typeof season.id).toBe('number')
        })

        it('id matches the registry key', () => {
          expect(season.id).toBe(id)
        })

        it('has a theme_name field', () => {
          expect(season).toHaveProperty('theme_name')
        })

        it('has a theme_description field', () => {
          expect(season).toHaveProperty('theme_description')
        })

        it('has a date field', () => {
          expect(season).toHaveProperty('date')
        })

        it('has a docs field', () => {
          expect(season).toHaveProperty('docs')
        })
      })
    }
  })

  it('season IDs are unique', () => {
    const ids = Object.values(hackathonSeasons).map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  describe('season 1', () => {
    it('exists', () => {
      expect(hackathonSeasons[1]).toBeDefined()
    })

    it('has the correct theme name', () => {
      expect(hackathonSeasons[1].theme_name).toBe('Beneath the Surface')
    })

    it('has the correct theme description', () => {
      expect(hackathonSeasons[1].theme_description).toBe('Explore the hidden depths of our world')
    })

    it('has the correct date', () => {
      expect(hackathonSeasons[1].date).toBe('May 2026')
    })

    it('has null docs', () => {
      expect(hackathonSeasons[1].docs).toBeNull()
    })
  })

  describe('season 2', () => {
    it('exists', () => {
      expect(hackathonSeasons[2]).toBeDefined()
    })

    it('has the correct theme name', () => {
      expect(hackathonSeasons[2].theme_name).toBe('Signal')
    })

    it('has the correct theme description', () => {
      expect(hackathonSeasons[2].theme_description).toBe('signal')
    })

    it('has the correct date', () => {
      expect(hackathonSeasons[2].date).toBe('February 2026')
    })

    it('has a docs URL', () => {
      expect(hackathonSeasons[2].docs).toBeTruthy()
      expect(typeof hackathonSeasons[2].docs).toBe('string')
    })
  })
})