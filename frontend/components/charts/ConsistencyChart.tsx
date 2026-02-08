'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from 'recharts';
import { ConsistencyEntry } from '@/lib/api';

interface ConsistencyChartProps {
    data: ConsistencyEntry[];
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

export function ConsistencyChart({ data }: ConsistencyChartProps) {
    // Handle empty or undefined data
    if (!data || data.length === 0) {
        return (
            <div className="h-96 flex items-center justify-center text-gray-500">
                <div className="text-center">
                    <p className="text-lg font-semibold mb-2">Consistency Chart</p>
                    <p className="text-sm">No weekly performance data available yet</p>
                </div>
            </div>
        );
    }

    // Get unique teams sorted by total points
    const teamTotals = data.reduce((acc, entry) => {
        if (!acc[entry.manager_name]) acc[entry.manager_name] = 0;
        acc[entry.manager_name] += entry.weekly_points;
        return acc;
    }, {} as Record<string, number>);

    const teams = Object.entries(teamTotals)
        .sort(([, a], [, b]) => b - a)
        .map(([team]) => team);

    return (
        <div className="w-full" style={{ height: teams.length * 140 + 40 }}>
            <div className="grid grid-cols-1 gap-1">
                {teams.map((team) => {
                    const teamData = data
                        .filter(d => d.manager_name === team)
                        .sort((a, b) => a.gameweek - b.gameweek);

                    return (
                        <div key={team} className="relative">
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 -ml-2 text-xs font-semibold text-gray-700 w-24 text-right pr-2">
                                {team}
                            </div>
                            <div className="ml-28">
                                <ResponsiveContainer width="100%" height={120}>
                                    <BarChart
                                        data={teamData}
                                        margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} vertical={false} />
                                        <XAxis
                                            dataKey="gameweek"
                                            stroke="#6B7280"
                                            style={{ fontSize: '10px' }}
                                            tick={{ fontSize: 10 }}
                                        />
                                        <YAxis
                                            stroke="#6B7280"
                                            style={{ fontSize: '10px' }}
                                            tick={{ fontSize: 10 }}
                                            width={30}
                                        />
                                        <Tooltip
                                            contentStyle={{
                                                backgroundColor: '#FFFFFF',
                                                border: '1px solid #E5E7EB',
                                                borderRadius: '6px',
                                                fontSize: '11px',
                                                padding: '6px 8px'
                                            }}
                                            labelFormatter={(value) => `GW ${value}`}
                                            formatter={(value: any) => [`${value} pts`, 'Points']}
                                        />
                                        <Bar
                                            dataKey="weekly_points"
                                            fill={TEAM_COLORS[team] || DEFAULT_COLOR}
                                            radius={[3, 3, 0, 0]}
                                        >
                                            <LabelList
                                                dataKey="weekly_points"
                                                position="top"
                                                style={{ fontSize: '9px', fill: '#FFFFFF', fontWeight: 600 }}
                                            />
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    );
                })}
            </div>
            <div className="text-center text-xs text-gray-600 mt-2">Gameweek</div>
        </div>
    );
}
