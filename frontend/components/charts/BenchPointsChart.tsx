'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { BenchPointsEntry } from '@/lib/api';

interface BenchPointsChartProps {
    data: BenchPointsEntry[];
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

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                <p className="font-semibold text-gray-900 mb-1">{payload[0].payload.manager_name}</p>
                <p className="text-sm text-gray-600">
                    <span className="font-medium">Bench Points:</span> {payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};

export function BenchPointsChart({ data }: BenchPointsChartProps) {
    const sortedData = [...data].sort((a, b) => b.bench_points - a.bench_points);

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart
                data={sortedData}
                margin={{ top: 20, right: 30, left: 10, bottom: 30 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} vertical={false} />
                <XAxis
                    dataKey="manager_name"
                    angle={0}
                    textAnchor="middle"
                    height={40}
                    stroke="#6B7280"
                    style={{ fontSize: '11px', fontWeight: 500 }}
                    tick={{ dy: 5 }}
                    interval={0}
                />
                <YAxis
                    stroke="#6B7280"
                    style={{ fontSize: '12px' }}
                    width={40}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6', opacity: 0.3 }} />
                <Bar
                    dataKey="bench_points"
                    radius={[8, 8, 0, 0]}
                    maxBarSize={60}
                >
                    <LabelList
                        dataKey="bench_points"
                        position="top"
                        style={{ fill: '#FFFFFF', fontWeight: 700, fontSize: '13px', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}
                        offset={8}
                    />
                    {sortedData.map((entry, index) => (
                        <Cell
                            key={`cell-${index}`}
                            fill={TEAM_COLORS[entry.manager_name] || DEFAULT_COLOR}
                        />
                    ))}
                </Bar>
            </BarChart>
        </ResponsiveContainer>
    );
}
