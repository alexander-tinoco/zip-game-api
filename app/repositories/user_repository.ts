import db from '@adonisjs/lucid/services/db'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import User from '#models/user'
import type { Difficulty } from '#utils/board'

/* Encapsula el acceso a la tabla users */
export default class UserRepository {
  create(data: { username: string; email: string; password: string }) {
    return User.create({ ...data, recommendedDifficulty: 'easy' })
  }

  findOrFail(id: number) {
    return User.findOrFail(id)
  }

  async updateRecommendedDifficulty(
    userId: number,
    difficulty: Difficulty,
    trx?: TransactionClientContract
  ) {
    const user = await User.findOrFail(userId, { client: trx })
    user.recommendedDifficulty = difficulty
    await user.save()
    return user
  }

  /** Estadísticas agregadas del perfil */
  async stats(userId: number) {
    const totals = await db
      .from('scores')
      .where('user_id', userId)
      .count('* as games_completed')
      .sum('points as total_points')
      .max('points as best_score')
      .first()

    const levels = await db
      .from('scores')
      .where('user_id', userId)
      .countDistinct('level_id as levels_completed')
      .first()

    const played = await db
      .from('game_sessions')
      .where('user_id', userId)
      .count('* as games_played')
      .first()

    return {
      gamesPlayed: Number(played?.games_played ?? 0),
      gamesCompleted: Number(totals?.games_completed ?? 0),
      levelsCompleted: Number(levels?.levels_completed ?? 0),
      totalPoints: Number(totals?.total_points ?? 0),
      bestScore: Number(totals?.best_score ?? 0),
    }
  }
}
