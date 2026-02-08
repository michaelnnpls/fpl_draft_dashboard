'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DraftPickAnalysis } from '@/lib/api';

interface DraftAnalysisChartProps {
    data: DraftPickAnalysis[];
}

// Team colors from legacy project
const TEAM_COLORS: Record<string, string> = {
    "Wirtzuose": "#F1C40F",
    "Diego FC": "#6B5B95",
    "FacePalmer FC": "#88B04B",
    "Put it in in": "#F7CAC9",
    "The Habibi Army": "#E67E22",
    "Guinness FC": "#955251",
};

const DEFAULT_COLOR = "#3B82F6";

// Pick bucket colors (different shades for different pick types)
const PICK_COLORS = {
    "First 3 Picks": "#2563EB",      // Blue
    "Other Picks": "#F59E0B",        // Amber
    "Transfer": "#10B981"            // Green
};

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        return (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                <p className="font-semibold text-gray-900 mb-2">{data.team}</p>
                <p className="text-sm text-gray-600">
                    <span className="font-medium">First 3 Picks:</span> {data.raw_first3} pts ({data["First 3 Picks"].toFixed(1)}%)
                </p>
                <p className="text-sm text-gray-600">
                    <span className="font-medium">Other Picks:</span> {data.raw_other} pts ({data["Other Picks"].toFixed(1)}%)
                </p>
                <p className="text-sm text-gray-600">
                    <span className="font-medium">Transfer:</span> {data.raw_transfer} pts ({data["Transfer"].toFixed(1)}%)
                </p>
            </div>
        );
    }
    return null;
};

export function DraftAnalysisChart({ data }: DraftAnalysisChartProps) {
    // Handle empty or undefined data
    if (!data || data.length === 0) {
        return (
            <div className="h-96 flex items-center justify-center text-gray-500">
                <div className="text-center">
                    <p className="text-lg font-semibold mb-2">Draft Analysis</p>
                    <p className="text-sm">No draft pick data available yet</p>
                </div>
            </div>
        );
    }

    // Group by team and pick bucket
    const teamData = data.reduce((acc, pick) => {
        const team = pick.manager_name;
        if (!acc[team]) {
            acc[team] = {
                team,
                "First 3 Picks": 0,
                "Other Picks": 0,
                "Transfer": 0
            };
        }

        // Categorize picks
        let category: string;
        if (pick.pick_bucket === "Transfer") {
            category = "Transfer";
        } else if (pick.pick <= 3) {
            category = "First 3 Picks";
        } else {
            category = "Other Picks";
        }

        acc[team][category] += pick.total_points_contributed;
        return acc;
    }, {} as Record<string, any>);

    // Convert to array and calculate percentages
    const chartData = Object.values(teamData).map((team: any) => {
        const total = team["First 3 Picks"] + team["Other Picks"] + team["Transfer"];
        return {
            team: team.team,
            "First 3 Picks": total > 0 ? (team["First 3 Picks"] / total) * 100 : 0,
            "Other Picks": total > 0 ? (team["Other Picks"] / total) * 100 : 0,
            "Transfer": total > 0 ? (team["Transfer"] / total) * 100 : 0,
            total: total,
            // Store raw values for tooltip
            raw_first3: team["First 3 Picks"],
            raw_other: team["Other Picks"],
            raw_transfer: team["Transfer"]
        };
    }).sort((a, b) => b.total - a.total);

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 10, bottom: 40 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} horizontal={false} />
                <XAxis
                    type="number"
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(value) => `${value}%`}
                    stroke="#6B7280"
                    style={{ fontSize: '12px' }}
                />
                <YAxis
                    type="category"
                    dataKey="team"
                    stroke="#6B7280"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    width={100}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6', opacity: 0.3 }} />
                <Legend
                    wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }}
                />
                <Bar
                    dataKey="First 3 Picks"
                    stackId="a"
                    fill={PICK_COLORS["First 3 Picks"]}
                    radius={[0, 0, 0, 0]}
                />
                <Bar
                    dataKey="Other Picks"
                    stackId="a"
                    fill={PICK_COLORS["Other Picks"]}
                    radius={[0, 0, 0, 0]}
                />
                <Bar
                    dataKey="Transfer"
                    stackId="a"
                    fill={PICK_COLORS["Transfer"]}
                    radius={[0, 8, 8, 0]}
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
