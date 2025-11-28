'use client'

import { TradeAnalysis, Trade } from '@/types'
import Card from './ui/Card'
import Button from './ui/Button'
import { downloadTrade, downloadTradeAsCSV } from '@/lib/tradeDownload'

interface TradeAnalysisResultsProps {
  analysis: TradeAnalysis
  trade: Trade
}

export default function TradeAnalysisResults({ analysis, trade }: TradeAnalysisResultsProps) {
  const { sideAAnalysis, sideBAnalysis, recommendation, confidence, reasoning } = analysis
  const valueDifference = sideAAnalysis.totalValue - sideBAnalysis.totalValue
  const scoreDisplay = valueDifference > 0 ? `+${valueDifference.toFixed(1)}` : valueDifference.toFixed(1)
  const pointsDifference = (sideAAnalysis.projectedPoints || 0) - (sideBAnalysis.projectedPoints || 0)

  const recommendationColors = {
    accept: 'bg-green-100 text-green-800',
    decline: 'bg-red-100 text-red-800',
    counter: 'bg-yellow-100 text-yellow-800',
  }

  const confidenceColors = {
    high: confidence >= 75,
    medium: confidence >= 50 && confidence < 75,
    low: confidence < 50,
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900">Trade Analysis</h2>
            <div className="flex items-center gap-4">
              <div
                className={`px-4 py-2 rounded-lg font-semibold ${recommendationColors[recommendation]}`}
              >
                {recommendation.toUpperCase()}
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-500">Confidence</div>
                <div
                  className={`text-xl font-bold ${
                    confidenceColors.high
                      ? 'text-green-600'
                      : confidenceColors.medium
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}
                >
                  {confidence}%
                </div>
              </div>
            </div>
          </div>

          {/* Trade Score */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6">
            <div className="text-center">
              <div className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2">
                Trade Score
              </div>
              <div className={`text-5xl font-bold ${
                valueDifference > 0 ? 'text-green-600' : valueDifference < 0 ? 'text-red-600' : 'text-gray-600'
              }`}>
                {scoreDisplay}
              </div>
              <div className="text-sm text-gray-500 mt-2">
                Side A {valueDifference > 0 ? 'favored' : valueDifference < 0 ? 'loses' : 'tied'} by {Math.abs(valueDifference).toFixed(1)} points
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Side A Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Value</span>
                  <span className="font-semibold text-gray-900">
                    {sideAAnalysis.totalValue.toFixed(1)}
                  </span>
                </div>
                {sideAAnalysis.projectedPoints !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Projected Points</span>
                    <span className="font-semibold text-gray-900">
                      {sideAAnalysis.projectedPoints.toFixed(1)}
                    </span>
                  </div>
                )}
                {Object.keys(sideAAnalysis.positionalValue).length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Positional Value
                    </div>
                    <div className="space-y-1">
                      {Object.entries(sideAAnalysis.positionalValue).map(([position, value]) => (
                        <div key={position} className="flex justify-between text-sm">
                          <span className="text-gray-600">{position}</span>
                          <span className="text-gray-900">{value.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Side B Summary</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Value</span>
                  <span className="font-semibold text-gray-900">
                    {sideBAnalysis.totalValue.toFixed(1)}
                  </span>
                </div>
                {sideBAnalysis.projectedPoints !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Projected Points</span>
                    <span className="font-semibold text-gray-900">
                      {sideBAnalysis.projectedPoints.toFixed(1)}
                    </span>
                  </div>
                )}
                {Object.keys(sideBAnalysis.positionalValue).length > 0 && (
                  <div className="mt-3">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      Positional Value
                    </div>
                    <div className="space-y-1">
                      {Object.entries(sideBAnalysis.positionalValue).map(([position, value]) => (
                        <div key={position} className="flex justify-between text-sm">
                          <span className="text-gray-600">{position}</span>
                          <span className="text-gray-900">{value.toFixed(1)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Analysis Reasoning</h3>
            <ul className="space-y-2">
              {reasoning.map((reason, index) => (
                <li key={index} className="flex items-start gap-2">
                  <span className="text-blue-600 mt-1">•</span>
                  <span className="text-gray-700">{reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Download Buttons */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex gap-3">
              <Button
                onClick={() => downloadTrade(trade, analysis)}
                variant="outline"
                className="flex-1"
              >
                Download JSON
              </Button>
              <Button
                onClick={() => downloadTradeAsCSV(trade, analysis)}
                variant="outline"
                className="flex-1"
              >
                Download CSV
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
