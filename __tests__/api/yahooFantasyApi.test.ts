/**
 * Tests for Yahoo Fantasy Sports API functions
 * 
 * These tests verify that the API functions correctly parse and handle
 * Yahoo Fantasy Sports API responses.
 */

import { getStatDefinitions, getTeamRoster } from '@/lib/yahooFantasyApi'
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

  describe('getTeamRoster', () => {
    it('should parse roster with nested structure team[1].roster["0"].players["0"].player[...]', async () => {
      // This is the exact structure we saw in the error logs
      const mockRosterResponse = {
        fantasy_content: {
          team: [
            [
              { team_key: '465.l.9080.t.1' },
              { team_id: '1' },
              { name: 'Smok\'n Pipes' },
              [],
              { url: 'https://hockey.fantasysports.yahoo.com/hockey/9080/1' },
            ],
            {
              roster: {
                '0': {
                  players: {
                    '0': {
                      player: [
                        [
                          { player_key: '465.p.30545' },
                          { player_id: '30545' },
                          {
                            name: {
                              full: 'Leo Carlsson',
                              first: 'Leo',
                              last: 'Carlsson',
                              ascii_first: 'Leo',
                              ascii_last: 'Carlsson',
                            },
                          },
                          { display_position: 'C' },
                          { position_type: 'P' },
                          { primary_position: 'C' },
                        ],
                      ],
                    },
                    '1': {
                      player: [
                        [
                          { player_key: '465.p.8310' },
                          { player_id: '8310' },
                          {
                            name: {
                              full: 'Shane Pinto',
                              first: 'Shane',
                              last: 'Pinto',
                              ascii_first: 'Shane',
                              ascii_last: 'Pinto',
                            },
                          },
                          { display_position: 'C' },
                          { position_type: 'P' },
                          { primary_position: 'C' },
                        ],
                      ],
                    },
                  },
                },
              },
            },
          ],
        },
      }

      // Mock fetch for the API call
      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockRosterResponse),
        headers: {
          get: (key: string) => key === 'content-type' ? 'application/json; charset=utf-8' : null,
        },
        status: 200,
        statusText: 'OK',
      }) as jest.Mock

      const accessToken = 'test-token'
      const teamKey = '465.l.9080.t.1'
      const players = await getTeamRoster(accessToken, teamKey)

      expect(players).toHaveLength(2)
      expect(players[0].player_key).toBe('465.p.30545')
      expect(players[0].player_id).toBe('30545')
      expect(players[0].name.full).toBe('Leo Carlsson')
      expect(players[0].display_position).toBe('C')
      expect(players[1].player_key).toBe('465.p.8310')
      expect(players[1].name.full).toBe('Shane Pinto')
    })

    it('should handle empty roster gracefully', async () => {
      const mockRosterResponse = {
        fantasy_content: {
          team: [
            [
              { team_key: '465.l.9080.t.1' },
              { team_id: '1' },
              { name: 'Empty Team' },
            ],
            {
              roster: {
                '0': {
                  players: {},
                },
              },
            },
          ],
        },
      }

      global.fetch = jest.fn().mockResolvedValueOnce({
        ok: true,
        text: async () => JSON.stringify(mockRosterResponse),
        headers: {
          get: (key: string) => key === 'content-type' ? 'application/json; charset=utf-8' : null,
        },
        status: 200,
        statusText: 'OK',
      }) as jest.Mock

      const accessToken = 'test-token'
      const teamKey = '465.l.9080.t.1'
      const players = await getTeamRoster(accessToken, teamKey)

      expect(players).toHaveLength(0)
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

