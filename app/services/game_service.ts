import { inject } from '@adonisjs/core'
import { DateTime } from 'luxon'
import db from '@adonisjs/lucid/services/db'
import GameException from '#exceptions/game_exception'
import GameValidatorService from '#services/game_validator_service'
import HintService from '#services/hint_service'
import ScoringService from '#services/scoring_service'
import AdaptiveDifficultyService from '#services/adaptive_difficulty_service'
import GameSessionRepository, { type MoveInput } from '#repositories/game_session_repository'
import LevelRepository from '#repositories/level_repository'
import ScoreRepository from '#repositories/score_repository'
import UserRepository from '#repositories/user_repository'
import type User from '#models/user'
import type Level from '#models/level'

/*
|--------------------------------------------------------------------------
| GameService — flujo completo de una partida
|--------------------------------------------------------------------------
| start  -> crea la sesión con hora de inicio del SERVIDOR
| hint   -> valida el camino actual y devuelve una pista (cuenta hints_used)
| finish -> valida la solución completa, calcula puntaje y adapta dificultad
|           dentro de UNA transacción con bloqueo de fila (sin doble finalización)
*/
@inject()
export default class GameService {
  constructor(
    private sessions: GameSessionRepository,
    private levels: LevelRepository,
    private scores: ScoreRepository,
    private users: UserRepository,
    private validator: GameValidatorService,
    private hints: HintService,
    private scoring: ScoringService,
    private adaptive: AdaptiveDifficultyService
  ) {}

  async start(user: User, levelId?: number) {
    let level: Level | null
    if (levelId) {
      level = await this.levels.findOrFail(levelId)
    } else {
      // Sin nivel => el sistema adaptativo elige uno de la dificultad recomendada
      level =
        (await this.levels.firstPendingFor(user.id, user.recommendedDifficulty)) ??
        (await this.levels.firstPendingFor(user.id, 'easy'))
      if (!level) {
        throw new GameException('There are no pending levels. Generate a new one.', {
          status: 404,
          code: 'E_NO_LEVELS',
        })
      }
    }

    const session = await this.sessions.start(user.id, level)
    return { session, level }
  }

  async hint(user: User, sessionId: number, path: number[]) {
    const session = await this.sessions.findOwned(sessionId, user.id)
    if (!session) throw this.notFound()
    if (session.status !== 'in_progress') throw this.alreadyFinished()

    const level = await this.levels.findOrFail(session.levelId)
    const result = this.hints.getHint(level.board, level.solution, path)

    if (result.status === 'invalid') {
      throw new GameException(result.message, {
        status: 422,
        code: `E_${result.code}`,
        details: { index: result.index },
      })
    }

    session.hintsUsed += 1
    await session.save()

    return { hint: result, hintsUsed: session.hintsUsed }
  }

  async finish(user: User, sessionId: number, path: number[], moves: MoveInput[]) {
    return db.transaction(async (trx) => {
      const session = await this.sessions.findOwnedForUpdate(sessionId, user.id, trx)
      if (!session) throw this.notFound()
      if (session.status !== 'in_progress') throw this.alreadyFinished()

      const level = await this.levels.findOrFail(session.levelId)
      const validation = this.validator.validateSolution(level.board, path)

      if (!validation.valid) {
        session.failedAttempts += 1
        await session.useTransaction(trx).save()
        return { valid: false as const, validation, session }
      }

      const finishedAt = DateTime.now()
      const durationSeconds = Math.max(
        1,
        Math.round(finishedAt.diff(session.startedAt, 'seconds').seconds)
      )
      // Los errores se cuentan a partir del registro de movimientos
      const mistakes = moves.filter((m) => m.type === 'invalid').length

      await this.sessions.saveMoves(session.id, moves, trx)

      const breakdown = this.scoring.calculate({
        difficulty: session.difficulty,
        durationSeconds,
        mistakes,
        hintsUsed: session.hintsUsed,
      })

      session.merge({
        status: 'completed',
        finishedAt,
        durationSeconds,
        mistakes,
        finalPath: path,
      })
      await session.useTransaction(trx).save()

      const score = await this.scores.create(
        {
          userId: user.id,
          levelId: level.id,
          gameSessionId: session.id,
          points: breakdown.total,
          durationSeconds,
          mistakes,
          hintsUsed: session.hintsUsed,
          difficulty: session.difficulty,
        },
        trx
      )

      // Dificultad adaptativa (sólo afecta partidas futuras)
      const recent = await this.sessions.recentCompleted(user.id, 10, trx)
      const decision = this.adaptive.decide(
        user.recommendedDifficulty,
        recent.map((g) => ({
          difficulty: g.difficulty,
          durationSeconds: g.durationSeconds ?? 0,
          mistakes: g.mistakes,
          hintsUsed: g.hintsUsed,
        }))
      )
      if (decision.recommended !== user.recommendedDifficulty) {
        await this.users.updateRecommendedDifficulty(user.id, decision.recommended, trx)
      }

      return {
        valid: true as const,
        session,
        score,
        breakdown,
        decision,
        rating: this.adaptive.rate({
          difficulty: session.difficulty,
          durationSeconds,
          mistakes,
          hintsUsed: session.hintsUsed,
        }),
      }
    })
  }

  private notFound() {
    return new GameException('Game session not found', { status: 404, code: 'E_SESSION_NOT_FOUND' })
  }

  private alreadyFinished() {
    return new GameException('This game session is already finished', {
      status: 409,
      code: 'E_ALREADY_FINISHED',
    })
  }
}
