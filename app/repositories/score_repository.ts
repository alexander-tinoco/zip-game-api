import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import Score from '#models/score'
import type { Difficulty } from '#utils/board'

export interface LeaderboardRow {
  rank: number
  user_id: number
  username: string
  total_score: number
  levels_completed: number
  total_time_seconds: number
  best_single_score: number
}

/* Encapsula el acceso a la tabla scores y la consulta del ranking */
export default class ScoreRepository {
  create(
    data: {
      userId: number
      levelId: number
      gameSessionId: number
      points: number
      durationSeconds: number
      mistakes: number
      hintsUsed: number
      difficulty: Difficulty
    },
    trx: TransactionClientContract
  ) {
    return Score.create(data, { client: trx })
  }

  /*
  | Ranking: por cada (usuario, nivel) se toma SOLO el mejor puntaje
  | (repetir un nivel no permite "farmear" puntos). Luego se suma por usuario.
  | Orden: total_score DESC, levels_completed DESC, total_time ASC, user_id ASC
  */
  async leaderboard(limit: number): Promise<LeaderboardRow[]> {
    const [rows] = await db.rawQuery(
      `SELECT u.id AS user_id, u.username,
              SUM(b.best_points)      AS total_score,
              COUNT(*)                AS levels_completed,
              SUM(b.best_time)        AS total_time_seconds,
              MAX(b.best_points)      AS best_single_score
         FROM (
               SELECT user_id, level_id,
                      MAX(points)           AS best_points,
                      MIN(duration_seconds) AS best_time
                 FROM scores
                GROUP BY user_id, level_id
              ) b
         JOIN users u ON u.id = b.user_id
        GROUP BY u.id, u.username
        ORDER BY total_score DESC, levels_completed DESC, total_time_seconds ASC, u.id ASC
        LIMIT ?`,
      [limit]
    )

    return (rows as Record<string, unknown>[]).map((row, i) => ({
      rank: i + 1,
      user_id: Number(row.user_id),
      username: String(row.username),
      total_score: Number(row.total_score),
      levels_completed: Number(row.levels_completed),
      total_time_seconds: Number(row.total_time_seconds),
      best_single_score: Number(row.best_single_score),
    }))
  }
}
