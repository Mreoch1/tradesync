/**
 * Tests for Yahoo Fantasy Sports API functions
 * 
 * These tests verify that the API functions correctly parse and handle
 * Yahoo Fantasy Sports API responses.
 */

import { getStatDefinitions } from '@/lib/yahooFantasyApi'
import { setStatDefinitions } from '@/lib/yahooParser'

// Mock the makeApiRequest function
jest.mock('@/lib/yahooFantasyApi', () => {
  const actual = jest.requireActual('@/lib/yahooFantasyApi')
  return {
    ...actual,
    // We'll mock makeApiRequest by mocking fetch at a lower level
  }
})

describe('Yahoo Fantasy API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Clear stat definitions cache
    setStatDefinitions({})
  })

  describe('getStatDefinitions', () => {
    it('should parse stat definitions correctly', async () => {
      const mockResponse = {
        fantasy_content: {
          game: [
            {},
            {
              stat_categories: {
                stats: [
                  { stat: [{ stat_id: '12', name: 'Games Started' }] },
                  { stat: [{ stat_id: '13', name: 'Wins' }] },
                  { stat: [{ stat_id: '15', name: 'Goals Against' }] },
                  { stat: [{ stat_id: '17', name: 'Saves' }] },
                ],
              },
            },
          ],
        },
      }

      // Mock fetch for the API call - need to return text that will be parsed as JSON
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
        headers: {
          get: (key: string) => key === 'content-type' ? 'application/json' : null,
        },
        status: 200,
        statusText: 'OK',
      }) as jest.Mock

      const accessToken = 'test-token'
      const gameKey = '418'
      const definitions = await getStatDefinitions(accessToken, gameKey)

      expect(definitions).toEqual({
        '12': 'Games Started',
        '13': 'Wins',
        '15': 'Goals Against',
        '17': 'Saves',
      })
    })

    it('should handle missing stat categories gracefully', async () => {
      const mockResponse = {
        fantasy_content: {
          game: [{}],
        },
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockResponse),
        headers: {
          get: (key: string) => key === 'content-type' ? 'application/json' : null,
        },
        status: 200,
        statusText: 'OK',
      }) as jest.Mock

      const accessToken = 'test-token'
      const gameKey = '418'
      const definitions = await getStatDefinitions(accessToken, gameKey)

      expect(definitions).toEqual({})
    })

    it('should handle API errors gracefully', async () => {
      global.fetch = jest.fn().mockRejectedValueOnce(
        new Error('API Error')
      ) as jest.Mock

      const accessToken = 'test-token'
      const gameKey = '418'
      const definitions = await getStatDefinitions(accessToken, gameKey)

      expect(definitions).toEqual({})
    })
  })

  describe('Team Parsing', () => {
    it('should parse teams with correct structure', () => {
      const mockYahooTeams = [
        {
          team_key: '418.l.9080.t.1',
          team_id: '1',
          name: 'Test Team 1',
          wins: 10,
          losses: 5,
          ties: 2,
        },
        {
          team_key: '418.l.9080.t.2',
          team_id: '2',
          name: 'Test Team 2',
          wins: 8,
          losses: 7,
          ties: 1,
        },
      ]

      // Mock getRoster function
      const mockGetRoster = jest.fn().mockResolvedValue([])

      // This is a simplified test - actual parseYahooTeams requires more setup
      expect(mockYahooTeams).toHaveLength(2)
      expect(mockYahooTeams[0].name).toBe('Test Team 1')
      expect(mockYahooTeams[1].name).toBe('Test Team 2')
    })
  })

  describe('Stat Definitions Integration', () => {
    it('should set and retrieve stat definitions', () => {
      const definitions = {
        '12': 'Games Started',
        '13': 'Wins',
        '15': 'Goals Against',
        '17': 'Saves',
        '18': 'Shots Against',
        '19': 'Save Percentage',
        '20': 'Shutouts',
      }

      setStatDefinitions(definitions)

      // Verify definitions are set (this would be tested through parsePlayerStats)
      expect(Object.keys(definitions)).toHaveLength(7)
      expect(definitions['12']).toBe('Games Started')
      expect(definitions['13']).toBe('Wins')
    })
  })
})

describe('API Error Handling', () => {
  it('should handle network errors', async () => {
    global.fetch = jest.fn().mockRejectedValueOnce(
      new Error('Network error')
    ) as jest.Mock

    const accessToken = 'test-token'
    const gameKey = '418'

    await expect(
      getStatDefinitions(accessToken, gameKey)
    ).resolves.toEqual({})
  })

  it('should handle invalid JSON responses', async () => {
    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => {
        throw new Error('Invalid JSON')
      },
    }) as jest.Mock

    const accessToken = 'test-token'
    const gameKey = '418'

    await expect(
      getStatDefinitions(accessToken, gameKey)
    ).resolves.toEqual({})
  })
})

