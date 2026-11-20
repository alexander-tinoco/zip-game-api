import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import LeaderboardService from '#services/leaderboard_service'
import { listQueryValidator } from '#validators/game_validator'

@inject()
export default class LeaderboardController {
  constructor(private leaderboard: LeaderboardService) {}

  /** GET /api/leaderboard?limit=20 */
  async index({ request }: HttpContext) {
    const { limit } = await listQueryValidator.validate(request.qs())
    const rows = await this.leaderboard.top(limit ?? 20)
    return {
      rules: 'Sum of best score per level; ties: more levels, less total time',
      data: rows,
    }
  }
}
