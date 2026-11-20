import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Level from '#models/level'
import GameSession from '#models/game_session'
import type { Difficulty } from '#utils/board'

/* Puntaje validado por el servidor. Una fila por partida completada. */
export default class Score extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare levelId: number

  @column()
  declare gameSessionId: number

  @column()
  declare points: number

  @column()
  declare durationSeconds: number

  @column()
  declare mistakes: number

  @column()
  declare hintsUsed: number

  @column()
  declare difficulty: Difficulty

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Level)
  declare level: BelongsTo<typeof Level>

  @belongsTo(() => GameSession)
  declare gameSession: BelongsTo<typeof GameSession>
}
