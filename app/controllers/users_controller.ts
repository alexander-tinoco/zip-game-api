import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import UserRepository from '#repositories/user_repository'
import LevelRepository from '#repositories/level_repository'
import { presentUser } from '#utils/presenters'

@inject()
export default class UsersController {
  constructor(
    private users: UserRepository,
    private levels: LevelRepository
  ) {}

  /** GET /api/users/me -> perfil + estadísticas + niveles completados */
  async me({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    const stats = await this.users.stats(user.id)
    const levels = await this.levels.listWithProgress(user.id)

    return {
      user: presentUser(user),
      stats: {
        games_played: stats.gamesPlayed,
        games_completed: stats.gamesCompleted,
        levels_completed: stats.levelsCompleted,
        total_points: stats.totalPoints,
        best_score: stats.bestScore,
      },
      completed_levels: levels
        .filter((l) => l.completed)
        .map((l) => ({
          id: l.level.id,
          name: l.level.name,
          difficulty: l.level.difficulty,
          best_score: l.bestScore,
        })),
    }
  }
}
