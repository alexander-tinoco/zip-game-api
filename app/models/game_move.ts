import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import GameSession from '#models/game_session'

export type MoveType = 'add' | 'undo' | 'invalid' | 'restart'

/* Cada interacción del jugador (avance, deshacer, intento inválido, reinicio) */
export default class GameMove extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare gameSessionId: number

  @column()
  declare sequence: number

  @column()
  declare cellIndex: number | null

  @column()
  declare moveType: MoveType

  @column()
  declare elapsedMs: number | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => GameSession)
  declare gameSession: BelongsTo<typeof GameSession>
}
