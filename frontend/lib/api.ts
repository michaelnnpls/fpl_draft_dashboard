const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface Standing {
    entry_id: number;
    manager_name: string;
    total_points: number;
    rank: number;
}

export interface MomentumEntry {
    entry_id: number;
    manager_name: string;
    total_points_last_4_gw: number;
}

export interface BenchPointsEntry {
    entry_id: number;
    manager_name: string;
    bench_points: number;
}

export interface ConsistencyEntry {
    gameweek: number;
    entry_id: number;
    manager_name: string;
    weekly_points: number;
}

export interface PlayerContribution {
    entry_id: number;
    manager_name: string;
    web_name: string;
    total_points: number;
}

export interface DraftPickAnalysis {
    manager_name: string;
    pick: number;
    round: number;
    element_id: number;
    player_name: string;
    total_points_contributed: number;
    pick_bucket: string;
}

export async function getStandings(): Promise<Standing[]> {
    const res = await fetch(`${API_URL}/standings`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch standings');
    return res.json();
}

export async function getMomentum(): Promise<MomentumEntry[]> {
    const res = await fetch(`${API_URL}/momentum`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch momentum');
    return res.json();
}

export async function getBenchPoints(): Promise<BenchPointsEntry[]> {
    const res = await fetch(`${API_URL}/bench-points`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch bench points');
    return res.json();
}

export async function getConsistency(): Promise<ConsistencyEntry[]> {
    const res = await fetch(`${API_URL}/consistency`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch consistency');
    return res.json();
}

export async function getContributions(): Promise<PlayerContribution[]> {
    const res = await fetch(`${API_URL}/contributions`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch contributions');
    return res.json();
}

export async function getDraftAnalysis(): Promise<DraftPickAnalysis[]> {
    const res = await fetch(`${API_URL}/draft-analysis`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch draft analysis');
    return res.json();
}

export interface TopTransfersEntry {
    player_name: string;
    manager_name: string;
    total_points: number;
}

export async function getTopTransfers(): Promise<TopTransfersEntry[]> {
    const res = await fetch(`${API_URL}/top-transfers`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch top transfers');
    return res.json();
}
