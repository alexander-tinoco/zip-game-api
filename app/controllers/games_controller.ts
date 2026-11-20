import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import GameService from '#services/game_service'
import GameSessionRepository from '#repositories/game_session_repository'
import {
  finishGameValidator,
  hintValidator,
  listQueryValidator,
  startGameValidator,
} from '#validators/game_validator'
import { presentLevel, presentSession } from '#utils/presenters'
import GameException from '#exceptions/game_exception'

@inject()
export default class GamesController {
  constructor(
    private games: GameService,
    private sessions: GameSessionRepository
  ) {}

  /** POST /api/games { level_id? } -> 201 { session, level } */
  async store({ auth, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { level_id: levelId } = await request.validateUsing(startGameValidator)
    const { session, level } = await this.games.start(user, levelId)

    return response.created({ session: presentSession(session), level: presentLevel(level) })
  }

  /** GET /api/games/:id -> estado de una sesión propia */
  async show({ auth, params }: HttpContext) {
    const user = auth.getUserOrFail()
    const session = await this.sessions.findOwned(Number(params.id), user.id)
    if (!session) {
      throw new GameException('Game session not found', { status: 404, code: 'E_SESSION_NOT_FOUND' })
    }
    return { session: presentSession(session) }
  }

  /** POST /api/games/:id/hint { path } -> { hint, hints_used } */
  async hint({ auth, params, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const { path } = await request.validateUsing(hintValidator)
    const { hint, hintsUsed } = await this.games.hint(user, Number(params.id), path)

    return {
      hint:
        hint.status === 'next'
          ? { type: 'next', next_cell: hint.nextCell }
          : hint.status === 'backtrack'
            ? { type: 'backtrack', undo_steps: hint.undoSteps, next_cell: hint.nextCell }
            : hint,
      hints_used: hintsUsed,
    }
  }

  /**
   * POST /api/games/:id/finish { path, moves }
   *  200 -> solución válida, puntaje calculado en el servidor
   *  422 -> solución inválida (con el motivo)
   *  409 -> la partida ya estaba terminada
   */
  async finish({ auth, params, request, response }: HttpContext) {
    const user = auth.getUserOrFail()
    const { path, moves } = await request.validateUsing(finishGameValidator)
    const result = await this.games.finish(user, Number(params.id), path, moves ?? [])

    if (!result.valid) {
      return response.unprocessableEntity({
        message: result.validation.message,
        code: `E_${result.validation.code}`,
        details: { index: result.validation.index },
        session: presentSession(result.session),
      })
    }

    return {
      message: 'Puzzle solved!',
      session: presentSession(result.session),
      score: {
        points: result.score.points,
        duration_seconds: result.score.durationSeconds,
        mistakes: result.score.mistakes,
        hints_used: result.score.hintsUsed,
        breakdown: {
          base: result.breakdown.base,
          time_bonus: result.breakdown.timeBonus,
          time_penalty: result.breakdown.timePenalty,
          mistake_penalty: result.breakdown.mistakePenalty,
          hint_penalty: result.breakdown.hintPenalty,
        },
      },
      performance: result.rating,
      difficulty: {
        previous: result.decision.current,
        recommended: result.decision.recommended,
        change: result.decision.change,
        reason: result.decision.reason,
      },
    }
  }

  /** GET /api/games/history?page=1&per_page=10 -> historial del usuario autenticado */
  async history({ auth, request }: HttpContext) {
    const user = auth.getUserOrFail()
    const query = await listQueryValidator.validate(request.qs())
    const page = await this.sessions.history(user.id, query.page ?? 1, query.per_page ?? 10)

    return {
      meta: {
        total: page.total,
        per_page: page.perPage,
        current_page: page.currentPage,
        last_page: page.lastPage,
      },
      data: page.all().map((session) => ({
        ...presentSession(session),
        level: { id: session.level.id, name: session.level.name },
        points: session.score?.points ?? null,
      })),
    }
  }
}
