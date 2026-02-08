'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { MomentumEntry } from '@/lib/api';

interface MomentumChartProps {
    data: MomentumEntry[];
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
                    <span className="font-medium">Last 4 GWs:</span> {payload[0].value} pts
                </p>
            </div>
        );
    }
    return null;
};

export function MomentumChart({ data }: MomentumChartProps) {
    const sortedData = [...data].sort((a, b) => b.total_points_last_4_gw - a.total_points_last_4_gw);

    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart
                data={sortedData}
                layout="vertical"
                margin={{ top: 20, right: 60, left: 20, bottom: 20 }}
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.5} horizontal={false} />
                <XAxis
                    type="number"
                    stroke="#6B7280"
                    style={{ fontSize: '12px' }}
                />
                <YAxis
                    type="category"
                    dataKey="manager_name"
                    stroke="#6B7280"
                    style={{ fontSize: '12px', fontWeight: 500 }}
                    width={130}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6', opacity: 0.3 }} />
                <Bar
                    dataKey="total_points_last_4_gw"
                    radius={[0, 8, 8, 0]}
                    barSize={30}
                >
                    <LabelList
                        dataKey="total_points_last_4_gw"
                        position="right"
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
