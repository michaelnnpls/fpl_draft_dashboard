'use client';

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from 'recharts';
import { PlayerContribution } from '@/lib/api';

interface PlayerContributionsChartProps {
    data: PlayerContribution[];
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

// Custom tooltip to show player contribution details
const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length > 0) {
        // Filter out entries with 0 or undefined values
        const validPayload = payload.filter((entry: any) => entry.value && entry.value > 0);

        if (validPayload.length === 0) return null;

        return (
            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                <p className="font-semibold text-gray-900 mb-2">{label}</p>
                {validPayload.map((entry: any, index: number) => (
                    <p key={index} className="text-sm text-gray-600">
                        <span className="font-medium">{entry.name}:</span> {entry.value.toFixed(1)}%
                    </p>
                ))}
            </div>
        );
    }
    return null;
};

// Function to generate shades of a color
const generateShades = (baseColor: string, count: number): string[] => {
    const hex = baseColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    const shades: string[] = [];
    for (let i = 0; i < count; i++) {
        const factor = 1 - (i * 0.15);
        const newR = Math.round(r * factor);
        const newG = Math.round(g * factor);
        const newB = Math.round(b * factor);
        shades.push(`rgb(${newR}, ${newG}, ${newB})`);
    }
    return shades;
};

// Custom label component to show player names
const CustomLabel = (props: any) => {
    const { x, y, width, height, value, name } = props;

    // Only show label if bar is wide enough
    // Check both percentage value and pixel width to be safe
    if (!value || value < 5 || width < 30 || name === 'Others') return null;

    return (
        <text
            x={x + width / 2}
            y={y + height / 2}
            fill="#FFFFFF"
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize="10px"
            fontWeight="600"
            style={{
                textShadow: '1px 1px 2px rgba(0,0,0,0.8)',
                pointerEvents: 'none' // Prevent label from capturing mouse events
            }}
        >
            {name}
        </text>
    );
};

export function PlayerSunburstChart({ data }: PlayerContributionsChartProps) {
    if (!data || data.length === 0) {
        return (
            <div className="h-96 flex items-center justify-center text-gray-500">
                <div className="text-center">
                    <p className="text-lg font-semibold mb-2">Player Contributions</p>
                    <p className="text-sm">No player contribution data available yet</p>
                </div>
            </div>
        );
    }

    const teamTotals = data.reduce((acc, player) => {
        if (!acc[player.manager_name]) acc[player.manager_name] = 0;
        acc[player.manager_name] += player.total_points;
        return acc;
    }, {} as Record<string, number>);

    const teamData = Object.keys(teamTotals).map(team => {
        const teamPlayers = data
            .filter(p => p.manager_name === team)
            .sort((a, b) => b.total_points - a.total_points);

        const top5 = teamPlayers.slice(0, 5);
        const others = teamPlayers.slice(5);
        const othersTotal = others.reduce((sum, p) => sum + p.total_points, 0);
        const total = teamTotals[team];

        const result: any = {
            team,
            total,
            playerOrder: [] as string[]
        };

        // Add top 5 players first
        top5.forEach((player) => {
            const playerKey = player.web_name;
            result[playerKey] = (player.total_points / total) * 100;
            result[`${playerKey}_pts`] = player.total_points;
            result.playerOrder.push(playerKey);
        });

        // Add Others last (will appear on the right)
        if (othersTotal > 0) {
            result['Others'] = (othersTotal / total) * 100;
            result['Others_pts'] = othersTotal;
            result.playerOrder.push('Others');
        }

        return result;
    }).sort((a, b) => b.total - a.total);

    // Get ordered player keys (top 5 first, then Others)
    const allPlayerKeys = new Set<string>();
    teamData.forEach(team => {
        team.playerOrder.forEach((key: string) => allPlayerKeys.add(key));
    });

    // Separate Others from regular players
    const playerKeys = Array.from(allPlayerKeys).filter(k => k !== 'Others');
    const hasOthers = Array.from(allPlayerKeys).includes('Others');

    return (
        <ResponsiveContainer width="100%" height={400}>
            <BarChart
                data={teamData}
                layout="vertical"
                margin={{ top: 20, right: 40, left: 20, bottom: 20 }}
                barCategoryGap="15%"
            >
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" opacity={0.3} horizontal={false} />
                <XAxis
                    type="number"
                    stroke="#6B7280"
                    style={{ fontSize: '11px' }}
                    domain={[0, 100]}
                    ticks={[0, 25, 50, 75, 100]}
                    tickFormatter={(value) => `${value}%`}
                />
                <YAxis
                    type="category"
                    dataKey="team"
                    stroke="#6B7280"
                    style={{ fontSize: '12px', fontWeight: 600 }}
                    width={100}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F3F4F6', opacity: 0.3 }} />
                {/* Top 5 players */}
                {playerKeys.map((key, index) => (
                    <Bar
                        key={key}
                        dataKey={key}
                        stackId="a"
                        fill="transparent"
                        isAnimationActive={false}
                    >
                        <LabelList content={<CustomLabel name={key} />} />
                        {teamData.map((entry, teamIndex) => {
                            const teamColor = TEAM_COLORS[entry.team] || DEFAULT_COLOR;
                            const shades = generateShades(teamColor, 6);
                            const playerIndex = entry.playerOrder.indexOf(key);
                            const shadeIndex = playerIndex >= 0 ? playerIndex : 5;
                            return (
                                <Cell key={`cell-${teamIndex}`} fill={shades[Math.min(shadeIndex, 5)]} />
                            );
                        })}
                    </Bar>
                ))}
                {/* Others bar (appears last/rightmost) */}
                {hasOthers && (
                    <Bar
                        dataKey="Others"
                        stackId="a"
                        fill="transparent"
                        radius={[0, 4, 4, 0]}
                        isAnimationActive={false}
                    >
                        {teamData.map((entry, teamIndex) => {
                            const teamColor = TEAM_COLORS[entry.team] || DEFAULT_COLOR;
                            const shades = generateShades(teamColor, 6);
                            return (
                                <Cell key={`cell-${teamIndex}`} fill={shades[5]} />
                            );
                        })}
                    </Bar>
                )}
            </BarChart>
        </ResponsiveContainer>
    );
}
