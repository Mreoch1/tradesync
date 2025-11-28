'use client'

import { useEffect, useState } from 'react'
import Card from '@/components/ui/Card'

interface EnvDiagnostics {
  status: {
    overall: string
    clientSideReady: boolean
    serverSideReady: boolean
  }
  environment: {
    clientSide: {
      NEXT_PUBLIC_YAHOO_CLIENT_ID: {
        isSet: boolean
        length: number
        preview: string | null
        trimmed: number
      }
    }
    serverSide: {
      YAHOO_CLIENT_ID: {
        isSet: boolean
        length: number
        preview: string | null
      }
      YAHOO_CLIENT_SECRET: {
        isSet: boolean
      }
      YAHOO_REDIRECT_URI: {
        isSet: boolean
        value: string | null
      }
    }
  }
  recommendations: string[]
}

export default function DiagnosticsPage() {
  const [diagnostics, setDiagnostics] = useState<EnvDiagnostics | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchDiagnostics = async () => {
      try {
        const response = await fetch('/api/diagnostics/env')
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`)
        }
        const data = await response.json()
        setDiagnostics(data)
      } catch (err: any) {
        setError(err.message || 'Failed to fetch diagnostics')
      } finally {
        setLoading(false)
      }
    }

    fetchDiagnostics()
  }, [])

  // Get client-side client ID
  const clientId = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_YAHOO_CLIENT_ID : null
  const redirectUri = typeof window !== 'undefined' 
    ? `${window.location.origin}/api/auth/yahoo/callback`.replace(/\/+$/, '')
    : null
  const expectedRedirectUri = 'https://aitradr.netlify.app/api/auth/yahoo/callback'

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <Card>
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Loading diagnostics...</p>
            </div>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <h1 className="text-3xl font-bold text-gray-900">OAuth Diagnostics</h1>

        {error && (
          <Card>
            <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-700">
              <strong>Error:</strong> {error}
            </div>
          </Card>
        )}

        {diagnostics && (
          <>
            <Card>
              <h2 className="text-xl font-semibold mb-4">Environment Variables Status</h2>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-3 h-3 rounded-full ${diagnostics.status.overall === 'ready' ? 'bg-green-500' : 'bg-yellow-500'}`}></span>
                    <strong>Overall Status:</strong> {diagnostics.status.overall}
                  </div>
                  <div className="ml-5 space-y-1 text-sm">
                    <div>Client-side ready: {diagnostics.status.clientSideReady ? '✅' : '❌'}</div>
                    <div>Server-side ready: {diagnostics.status.serverSideReady ? '✅' : '❌'}</div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Client-Side Variables</h3>
                  <div className="ml-4 space-y-2 text-sm">
                    <div>
                      <strong>NEXT_PUBLIC_YAHOO_CLIENT_ID:</strong>{' '}
                      {diagnostics.environment.clientSide.NEXT_PUBLIC_YAHOO_CLIENT_ID.isSet ? (
                        <span className="text-green-600">
                          ✅ Set (length: {diagnostics.environment.clientSide.NEXT_PUBLIC_YAHOO_CLIENT_ID.length}, 
                          preview: {diagnostics.environment.clientSide.NEXT_PUBLIC_YAHOO_CLIENT_ID.preview})
                        </span>
                      ) : (
                        <span className="text-red-600">❌ NOT SET</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Server-Side Variables</h3>
                  <div className="ml-4 space-y-2 text-sm">
                    <div>
                      <strong>YAHOO_CLIENT_ID:</strong>{' '}
                      {diagnostics.environment.serverSide.YAHOO_CLIENT_ID.isSet ? (
                        <span className="text-green-600">✅ Set</span>
                      ) : (
                        <span className="text-red-600">❌ NOT SET</span>
                      )}
                    </div>
                    <div>
                      <strong>YAHOO_CLIENT_SECRET:</strong>{' '}
                      {diagnostics.environment.serverSide.YAHOO_CLIENT_SECRET.isSet ? (
                        <span className="text-green-600">✅ Set</span>
                      ) : (
                        <span className="text-red-600">❌ NOT SET</span>
                      )}
                    </div>
                    <div>
                      <strong>YAHOO_REDIRECT_URI:</strong>{' '}
                      {diagnostics.environment.serverSide.YAHOO_REDIRECT_URI.isSet ? (
                        <span className="text-green-600">
                          ✅ {diagnostics.environment.serverSide.YAHOO_REDIRECT_URI.value}
                        </span>
                      ) : (
                        <span className="text-red-600">❌ NOT SET</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </Card>

            {diagnostics.recommendations.length > 0 && (
              <Card>
                <h2 className="text-xl font-semibold mb-4">Recommendations</h2>
                <ul className="list-disc list-inside space-y-2 text-sm">
                  {diagnostics.recommendations.map((rec, i) => (
                    <li key={i} className="text-yellow-700">{rec}</li>
                  ))}
                </ul>
              </Card>
            )}

            <Card>
              <h2 className="text-xl font-semibold mb-4">OAuth Request Details</h2>
              <div className="space-y-3 text-sm font-mono">
                <div>
                  <strong>Client ID (client-side):</strong>{' '}
                  {clientId ? (
                    <span className="text-green-600">
                      {clientId.substring(0, 30)}... (length: {clientId.length})
                    </span>
                  ) : (
                    <span className="text-red-600">NOT AVAILABLE</span>
                  )}
                </div>
                <div>
                  <strong>Redirect URI (calculated):</strong>{' '}
                  {redirectUri ? (
                    <span className={redirectUri === expectedRedirectUri ? 'text-green-600' : 'text-yellow-600'}>
                      {redirectUri}
                    </span>
                  ) : (
                    <span className="text-red-600">NOT AVAILABLE</span>
                  )}
                </div>
                <div>
                  <strong>Expected Redirect URI:</strong>{' '}
                  <span className="text-blue-600">{expectedRedirectUri}</span>
                </div>
                <div>
                  <strong>Match:</strong>{' '}
                  {redirectUri === expectedRedirectUri ? (
                    <span className="text-green-600">✅ EXACT MATCH</span>
                  ) : (
                    <span className="text-red-600">❌ MISMATCH</span>
                  )}
                </div>
                <div>
                  <strong>Current URL:</strong> {typeof window !== 'undefined' ? window.location.href : 'N/A'}
                </div>
                <div>
                  <strong>Window Origin:</strong> {typeof window !== 'undefined' ? window.location.origin : 'N/A'}
                </div>
              </div>
            </Card>

            <Card>
              <h2 className="text-xl font-semibold mb-4">Yahoo Developer Portal Checklist</h2>
              <div className="space-y-2 text-sm">
                <div>✅ Redirect URI must be exactly: <code className="bg-gray-100 px-2 py-1 rounded">{expectedRedirectUri}</code></div>
                <div>✅ Client ID must match: <code className="bg-gray-100 px-2 py-1 rounded">{clientId ? clientId.substring(0, 30) + '...' : 'N/A'}</code></div>
                <div>✅ App must be approved/active in Yahoo Developer Portal</div>
                <div>✅ Homepage URL should be: <code className="bg-gray-100 px-2 py-1 rounded">https://aitradr.netlify.app</code></div>
              </div>
            </Card>
          </>
        )}
      </div>
    </div>
  )
}

