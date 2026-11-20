-- =====================================================================
--  ZIP GAME — Consultas útiles para la demostración y el reporte
--     mysql -u zip_user -p zip_game < database/sql/03_useful_queries.sql
-- =====================================================================
USE zip_game;

-- Niveles cargados por los seeders (sin mostrar la solución)
SELECT id, name, difficulty, checkpoint_count, difficulty_score, is_generated FROM levels;

-- Jugadores registrados (la contraseña aparece como hash scrypt)
SELECT id, username, email, recommended_difficulty, LEFT(password, 20) AS password_hash FROM users;

-- Últimas partidas
SELECT gs.id, u.username, l.name AS level, gs.status, gs.duration_seconds, gs.mistakes, gs.hints_used
  FROM game_sessions gs JOIN users u ON u.id = gs.user_id JOIN levels l ON l.id = gs.level_id
 ORDER BY gs.id DESC LIMIT 10;

-- Movimientos de una partida
SELECT sequence, move_type, cell_index, elapsed_ms FROM game_moves WHERE game_session_id = 1 ORDER BY sequence;

-- Ranking (misma regla que GET /api/leaderboard)
SELECT u.username, SUM(b.best_points) AS total_score, COUNT(*) AS levels_completed, SUM(b.best_time) AS total_time
  FROM (SELECT user_id, level_id, MAX(points) best_points, MIN(duration_seconds) best_time
          FROM scores GROUP BY user_id, level_id) b
  JOIN users u ON u.id = b.user_id
 GROUP BY u.id, u.username
 ORDER BY total_score DESC, levels_completed DESC, total_time ASC;
