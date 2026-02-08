'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ConsistencyEntry } from '@/lib/api';

interface CumulativeChartProps {
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

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                <p className="font-semibold text-gray-900 mb-2">Gameweek {label}</p>
                {payload
                    .sort((a: any, b: any) => b.value - a.value)
                    .map((entry: any, index: number) => (
                        <p key={index} className="text-sm text-gray-600">
                            <span className="font-medium" style={{ color: entry.color }}>
                                {entry.name}:
                            </span>{' '}
                            {entry.payload[`${entry.name}_weekly`]} pts
                        </p>
                    ))}
            </div>
        );
    }
    return null;
};

export function CumulativeChart({ data }: CumulativeChartProps) {
    // Handle empty or undefined data
    if (!data || data.length === 0) {
        return (
            <div className="h-96 flex items-center justify-center text-gray-500">
                <div className="text-center">
                    <p className="text-lg font-semibold mb-2">Delta from Last Place</p>
                    <p className="text-sm">No weekly data available yet</p>
                </div>
            </div>
        );
    }

    // Calculate cumulative points for each team
    const teamCumulative: Record<string, Record<number, number>> = {};
    const teamWeekly: Record<string, Record<number, number>> = {};

    // Sort by gameweek first
    const sortedData = [...data].sort((a, b) => a.gameweek - b.gameweek);

    sortedData.forEach(entry => {
        if (!teamCumulative[entry.manager_name]) {
            teamCumulative[entry.manager_name] = {};
            teamWeekly[entry.manager_name] = {};
        }

        const previousGW = entry.gameweek - 1;
        const previousTotal = teamCumulative[entry.manager_name][previousGW] || 0;
        teamCumulative[entry.manager_name][entry.gameweek] = previousTotal + entry.weekly_points;
        teamWeekly[entry.manager_name][entry.gameweek] = entry.weekly_points;
    });

    // Get all unique gameweeks
    const gameweeks = [...new Set(data.map(d => d.gameweek))].sort((a, b) => a - b);

    // Calculate delta from minimum (last place) for each gameweek
    const chartData = gameweeks.map(gw => {
        const dataPoint: any = { gameweek: gw };

        // Find minimum cumulative points for this gameweek
        const cumulativeValues = Object.keys(teamCumulative).map(team => teamCumulative[team][gw] || 0);
        const minimum = Math.min(...cumulativeValues);

        // Calculate delta from minimum for each team and store weekly points
        Object.keys(teamCumulative).forEach(team => {
            const cumulative = teamCumulative[team][gw] || 0;
            dataPoint[team] = cumulative - minimum;
            dataPoint[`${team}_weekly`] = teamWeekly[team][gw] || 0;
        });

        return dataPoint;
    });

    const teams = Object.keys(teamCumulative);

    return (
        <ResponsiveContainer width="100%" height={400}>
            <LineChart
                data={chartData}
                margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} vertical={true} horizontal={true} />
                <XAxis
                    dataKey="gameweek"
                    stroke="#6B7280"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'Gameweek', position: 'insideBottom', offset: -10, style: { fill: '#6B7280' } }}
                    ticks={gameweeks.filter((gw, index) => index % 2 === 0)}
                />
                <YAxis
                    stroke="#6B7280"
                    style={{ fontSize: '12px' }}
                    label={{ value: 'Points Ahead of Last', angle: -90, position: 'insideLeft', style: { fill: '#6B7280' } }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                    iconType="line"
                    layout="horizontal"
                    align="center"
                    verticalAlign="bottom"
                />
                {teams.map((team, index) => (
                    <Line
                        key={team}
                        type="monotone"
                        dataKey={team}
                        stroke={TEAM_COLORS[team] || DEFAULT_COLOR}
                        strokeWidth={2}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                    />
                ))}
            </LineChart>
        </ResponsiveContainer>
    );
}
