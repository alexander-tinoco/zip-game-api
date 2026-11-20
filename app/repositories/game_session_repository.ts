import { DateTime } from 'luxon'
import type { TransactionClientContract } from '@adonisjs/lucid/types/database'
import GameSession from '#models/game_session'
import GameMove, { type MoveType } from '#models/game_move'
import type Level from '#models/level'

export interface MoveInput {
  type: MoveType
  cell?: number | null
  elapsed_ms?: number | null
}

/* Encapsula el acceso a game_sessions y game_moves */
export default class GameSessionRepository {
  start(userId: number, level: Level) {
    return GameSession.create({
      userId,
      levelId: level.id,
      difficulty: level.difficulty,
      status: 'in_progress',
      startedAt: DateTime.now(),
      mistakes: 0,
      hintsUsed: 0,
      failedAttempts: 0,
      finalPath: null,
    })
  }

  /** Sólo devuelve la sesión si pertenece al usuario (protege datos ajenos) */
  findOwned(id: number, userId: number, trx?: TransactionClientContract) {
    return GameSession.query({ client: trx }).where('id', id).where('user_id', userId).first()
  }

  /** Igual que findOwned pero bloquea la fila (SELECT ... FOR UPDATE) */
  findOwnedForUpdate(id: number, userId: number, trx: TransactionClientContract) {
    return GameSession.query({ client: trx })
      .where('id', id)
      .where('user_id', userId)
      .forUpdate()
      .first()
  }

  async saveMoves(sessionId: number, moves: MoveInput[], trx: TransactionClientContract) {
    if (moves.length === 0) return
    await GameMove.createMany(
      moves.map((move, i) => ({
        gameSessionId: sessionId,
        sequence: i + 1,
        moveType: move.type,
        cellIndex: move.cell ?? null,
        elapsedMs: move.elapsed_ms ?? null,
      })),
      { client: trx }
    )
  }

  /** Últimas partidas completadas (más reciente primero) */
  recentCompleted(userId: number, limit: number, trx?: TransactionClientContract) {
    return GameSession.query({ client: trx })
      .where('user_id', userId)
      .where('status', 'completed')
      .orderBy('finished_at', 'desc')
      .orderBy('id', 'desc')
      .limit(limit)
  }

  history(userId: number, page: number, perPage: number) {
    return GameSession.query()
      .where('user_id', userId)
      .preload('level')
      .preload('score')
      .orderBy('id', 'desc')
      .paginate(page, perPage)
  }
}
