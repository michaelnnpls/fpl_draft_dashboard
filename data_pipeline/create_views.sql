-- 1. dim_player_match_stats
-- Legacy: match_data
CREATE OR REPLACE VIEW `{project_id}.{dataset_id}.dim_player_match_stats` AS
SELECT
    s.gameweek,
    s.element_id,
    p.web_name,
    t.name AS team_name,
    t.short_name AS team_short_name,
    et.singular_name_short AS position_short_name,
    s.total_points,
    s.minutes,
    s.goals_scored,
    s.assists,
    s.clean_sheets,
    s.goals_conceded,
    s.own_goals,
    s.penalties_saved,
    s.penalties_missed,
    s.yellow_cards,
    s.red_cards,
    s.saves,
    s.bonus,
    s.bps
FROM `{project_id}.{dataset_id}.fact_gameweek_live` s
JOIN `{project_id}.{dataset_id}.dim_elements` p ON s.element_id = p.id
JOIN `{project_id}.{dataset_id}.dim_teams` t ON p.team = t.id
JOIN `{project_id}.{dataset_id}.dim_element_types` et ON p.element_type = et.id;


-- 2. dim_manager_gameweek
-- Legacy: draft_match_data
CREATE OR REPLACE VIEW `{project_id}.{dataset_id}.dim_manager_gameweek` AS
SELECT
    ew.gameweek,
    ew.entry_id,
    e.entry_name as manager_name,
    e.player_first_name,
    e.player_last_name,
    ew.element as element_id,
    pms.web_name,
    pms.position_short_name,
    CASE WHEN ew.position < 12 THEN 'On Field' ELSE 'Sub' END as lineup,
    pms.total_points,
    ew.is_captain,
    ew.is_vice_captain
FROM `{project_id}.{dataset_id}.fact_entry_weekly` ew
JOIN `{project_id}.{dataset_id}.dim_player_match_stats` pms 
    ON ew.element = pms.element_id AND ew.gameweek = pms.gameweek
JOIN `{project_id}.{dataset_id}.dim_entries` e
    ON ew.entry_id = e.entry_id;

-- 3. agg_league_standings
-- Legacy: aggregate_df
CREATE OR REPLACE VIEW `{project_id}.{dataset_id}.agg_league_standings` AS
SELECT
    entry_id,
    manager_name,
    SUM(total_points) as total_points,
    RANK() OVER (ORDER BY SUM(total_points) DESC) as rank
FROM `{project_id}.{dataset_id}.dim_manager_gameweek`
WHERE lineup = 'On Field'
GROUP BY 1, 2;

-- 4. agg_manager_momentum
-- Legacy: aggregate_momentum_df
-- Assuming current_gw is max in data
CREATE OR REPLACE VIEW `{project_id}.{dataset_id}.agg_manager_momentum` AS
WITH max_gw AS (SELECT MAX(gameweek) as gw FROM `{project_id}.{dataset_id}.fact_gameweek_live`)
SELECT
    entry_id,
    manager_name,
    SUM(total_points) as total_points_last_4_gw
FROM `{project_id}.{dataset_id}.dim_manager_gameweek`
CROSS JOIN max_gw
WHERE lineup = 'On Field'
  AND gameweek > (max_gw.gw - 4)
GROUP BY 1, 2;

-- 5. agg_player_contribution
-- Legacy: aggregate_player_df
CREATE OR REPLACE VIEW `{project_id}.{dataset_id}.agg_player_contribution` AS
SELECT
    entry_id,
    manager_name,
    web_name,
    SUM(total_points) as total_points
FROM `{project_id}.{dataset_id}.dim_manager_gameweek`
WHERE lineup = 'On Field'
GROUP BY 1, 2, 3;

-- 6. agg_bench_points
-- Legacy: bp_df
CREATE OR REPLACE VIEW `{project_id}.{dataset_id}.agg_bench_points` AS
SELECT
    entry_id,
    manager_name,
    SUM(total_points) as bench_points
FROM `{project_id}.{dataset_id}.dim_manager_gameweek`
WHERE lineup = 'Sub'
GROUP BY 1, 2;

-- 7. agg_manager_consistency
-- Legacy: weekly_team_trend
CREATE OR REPLACE VIEW `{project_id}.{dataset_id}.agg_manager_consistency` AS
SELECT
    gameweek,
    entry_id,
    manager_name,
    SUM(total_points) as weekly_points
FROM `{project_id}.{dataset_id}.dim_manager_gameweek`
WHERE lineup = 'On Field'
GROUP BY 1, 2, 3;

-- 8. agg_draft_picks_analysis
-- Legacy: pick_analysis_df
CREATE OR REPLACE VIEW `{project_id}.{dataset_id}.agg_draft_picks_analysis` AS
SELECT
    mgr.manager_name,
    CASE
        WHEN dp.pick IS NOT NULL AND dp.pick <= 3 THEN 1
        WHEN dp.pick IS NOT NULL THEN dp.pick
        ELSE 999 
    END as pick,
    CASE
        WHEN dp.round IS NOT NULL THEN dp.round
        ELSE 99
    END as round,
    mgr.element_id,
    mgr.web_name as player_name,
    COALESCE(SUM(mgr.total_points), 0) as total_points_contributed,
    CASE 
        WHEN dp.pick IS NOT NULL AND dp.pick <= 3 THEN 'First 3 Picks'
        WHEN dp.pick IS NOT NULL THEN 'Other Picks'
        ELSE 'Transfer'
    END as pick_bucket
FROM `{project_id}.{dataset_id}.dim_manager_gameweek` mgr
LEFT JOIN `{project_id}.{dataset_id}.fact_draft_picks` dp
    ON mgr.element_id = dp.element
    AND mgr.entry_id = dp.entry
WHERE mgr.lineup = 'On Field'
GROUP BY 1, 2, 3, 4, 5, 7;

-- 9. agg_top_transfers
-- Legacy: fig_top_transfers logic
CREATE OR REPLACE VIEW `{project_id}.{dataset_id}.agg_top_transfers` AS
SELECT
    player_name,
    manager_name,
    SUM(total_points_contributed) as total_points
FROM `{project_id}.{dataset_id}.agg_draft_picks_analysis`
WHERE pick_bucket = 'Transfer'
GROUP BY 1, 2
ORDER BY total_points DESC
LIMIT 20;
