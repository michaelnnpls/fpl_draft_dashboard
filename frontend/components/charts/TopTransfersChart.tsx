'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { TopTransfersEntry } from '@/lib/api';

interface TopTransfersChartProps {
    data: TopTransfersEntry[];
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
                <p className="font-semibold text-gray-900 mb-1">{payload[0].payload.player_name}</p>
                <p className="text-sm text-gray-600 mb-1">
                    <span className="font-medium">Manager:</span> {payload[0].payload.manager_name}
                </p>
                <p className="text-sm text-gray-600">
                    <span className="font-medium">Total Points:</span> {payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};

export function TopTransfersChart({ data }: TopTransfersChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-96 flex items-center justify-center text-gray-500">
                <div className="text-center">
                    <p className="text-lg font-semibold mb-2">Top Transfers</p>
                    <p className="text-sm">No transfer data available</p>
                </div>
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart
                data={data}
                layout="vertical"
                margin={{ top: 20, right: 30, left: 10, bottom: 50 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} horizontal={false} />
                <XAxis
                    type="number"
                    stroke="#6B7280"
                    style={{ fontSize: '12px' }}
                />
                <YAxis
                    type="category"
                    dataKey="player_name"
                    stroke="#6B7280"
                    style={{ fontSize: '10px', fontWeight: 500 }}
                    width={140}
                    interval={0}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6', opacity: 0.3 }} />
                <Bar
                    dataKey="total_points"
                    radius={[0, 4, 4, 0]}
                    barSize={20}
                >
                    {data.map((entry, index) => (
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
