import { Card } from '@tremor/react';
import { getStandings, getMomentum, getBenchPoints, getConsistency, getContributions, getDraftAnalysis, getTopTransfers } from '@/lib/api';
import { StandingsChart } from '@/components/charts/StandingsChart';
import { MomentumChart } from '@/components/charts/MomentumChart';
import { PointsAheadChart } from '@/components/charts/PointsAheadChart';
import { ConsistencyChart } from '@/components/charts/ConsistencyChart';
import { CumulativeChart } from '@/components/charts/CumulativeChart';
import { PlayerSunburstChart } from '@/components/charts/PlayerSunburstChart';
import { BenchPointsChart } from '@/components/charts/BenchPointsChart';
import { DraftAnalysisChart } from '@/components/charts/DraftAnalysisChart';
import { TopTransfersChart } from '@/components/charts/TopTransfersChart';

export default async function Dashboard() {
  const [standings, momentum, benchPoints, consistency, contributions, draftAnalysis, topTransfers] = await Promise.all([
    getStandings(),
    getMomentum(),
    getBenchPoints(),
    getConsistency(),
    getContributions(),
    getDraftAnalysis(),
    getTopTransfers()
  ]);

  return (
    <main className="p-4 md:p-10 mx-auto max-w-7xl">
      <div className="mb-6 flex justify-center">
        <img
          src="/logo.png"
          alt="Bacon FPL Logo"
          className="h-24 w-auto object-contain"
        />
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Row 1: Standings, Form Guide, and Point Margin - Three columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
              League Standings
            </h3>
            <StandingsChart data={standings} />
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
              Form Guide (Last 4 GWs)
            </h3>
            <MomentumChart data={momentum} />
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
              Point Margin
            </h3>
            <PointsAheadChart data={standings} />
          </Card>
        </div>

        {/* Row 3: Cumulative and Sunburst - Side by Side */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
              Cumulative Points
            </h3>
            <CumulativeChart data={consistency} />
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
              Player Contributions
            </h3>
            <PlayerSunburstChart data={contributions} />
          </Card>
        </div>

        {/* Row 4: Bench Points, Draft Analysis and Top Transfers - Three Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
              Points Left on Bench
            </h3>
            <BenchPointsChart data={benchPoints} />
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
              Draft Analysis
            </h3>
            <DraftAnalysisChart data={draftAnalysis} />
          </Card>

          <Card>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
              Top Transfers
            </h3>
            <TopTransfersChart data={topTransfers} />
          </Card>
        </div>

        {/* Row 5: Consistency - Full Width */}
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-50 mb-4">
            Weekly Performance
          </h3>
          <ConsistencyChart data={consistency} />
        </Card>
      </div>
    </main>
  );
}
