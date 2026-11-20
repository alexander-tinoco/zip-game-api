import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import LevelRepository from '#repositories/level_repository'
import LevelGeneratorService from '#services/level_generator_service'
import { generateLevelValidator, listQueryValidator } from '#validators/game_validator'
import { presentLevel } from '#utils/presenters'

@inject()
export default class LevelsController {
  constructor(
    private levels: LevelRepository,
    private generator: LevelGeneratorService
  ) {}

  /** GET /api/levels?difficulty=easy -> lista sin soluciones */
  async index({ auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const query = await listQueryValidator.validate(request.qs())
    const rows = await this.levels.listWithProgress(user.id, query.difficulty)

    return {
      recommended_difficulty: user.recommendedDifficulty,
      data: rows.map((row) =>
        presentLevel(row.level, { completed: row.completed, best_score: row.bestScore })
      ),
    }
  }

  /** GET /api/levels/:id -> configuración del tablero (sin solución) */
  async show({ params }: HttpContext) {
    const level = await this.levels.findOrFail(Number(params.id))
    return { data: presentLevel(level) }
  }

  /** POST /api/levels/generate { difficulty } -> 201 nivel nuevo guardado en MySQL */
  async generate({ request, response }: HttpContext) {
    const { difficulty, name } = await request.validateUsing(generateLevelValidator)
    const generated = this.generator.generate(difficulty, undefined, name)
    const level = await this.levels.create(generated)

    return response.created({
      data: presentLevel(level),
      metrics: generated.metrics,
    })
  }
}
