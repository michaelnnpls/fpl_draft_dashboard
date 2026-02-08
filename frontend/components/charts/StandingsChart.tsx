'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { Standing } from '@/lib/api';

interface StandingsChartProps {
    data: Standing[];
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

// Fallback color for any teams not in the map
const DEFAULT_COLOR = "#3B82F6";

const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                <p className="font-semibold text-gray-900 mb-1">{payload[0].payload.manager_name}</p>
                <p className="text-sm text-gray-600">
                    <span className="font-medium">Total Points:</span> {payload[0].value}
                </p>
            </div>
        );
    }
    return null;
};


const renderCustomLabel = (props: any) => {
    const { x, y, width, value } = props;
    return (
        <text
            x={x + width + 10}
            y={y + 20}
            fill="#FFFFFF"
            fontWeight="600"
            fontSize="14px"
            style={{
                textShadow: '1px 1px 2px rgba(0,0,0,0.5)',
            }}
        >
            {value}
        </text>
    );
};

export function StandingsChart({ data }: StandingsChartProps) {
    // Sort data by total_points descending for horizontal chart
    const sortedData = [...data].sort((a, b) => b.total_points - a.total_points);

    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart
                data={sortedData}
                layout="vertical"
                margin={{ top: 20, right: 80, left: 20, bottom: 20 }}
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
                    style={{ fontSize: '13px', fontWeight: 500 }}
                    width={150}
                />

                <Bar
                    dataKey="total_points"
                    radius={[0, 8, 8, 0]}
                    barSize={35}
                >
                    <LabelList
                        dataKey="total_points"
                        position="right"
                        style={{ fill: '#FFFFFF', fontWeight: 700, fontSize: '14px', textShadow: '1px 1px 3px rgba(0,0,0,0.8)' }}
                        offset={10}
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
