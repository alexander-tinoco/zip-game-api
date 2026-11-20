import { DateTime } from 'luxon'
import { BaseModel, belongsTo, column, hasMany, hasOne } from '@adonisjs/lucid/orm'
import type { BelongsTo, HasMany, HasOne } from '@adonisjs/lucid/types/relations'
import User from '#models/user'
import Level from '#models/level'
import GameMove from '#models/game_move'
import Score from '#models/score'
import type { Difficulty } from '#utils/board'

export type GameStatus = 'in_progress' | 'completed' | 'abandoned'

export default class GameSession extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare userId: number

  @column()
  declare levelId: number

  @column()
  declare status: GameStatus

  /* Copia de la dificultad al iniciar: la adaptación nunca cambia una partida en curso */
  @column()
  declare difficulty: Difficulty

  @column.dateTime()
  declare startedAt: DateTime

  @column.dateTime()
  declare finishedAt: DateTime | null

  @column()
  declare durationSeconds: number | null

  @column()
  declare mistakes: number

  @column()
  declare hintsUsed: number

  @column()
  declare failedAttempts: number

  @column({
    prepare: (value: unknown) => (value === null ? null : JSON.stringify(value)),
    consume: (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : value),
  })
  declare finalPath: number[] | null

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @belongsTo(() => User)
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Level)
  declare level: BelongsTo<typeof Level>

  @hasMany(() => GameMove)
  declare moves: HasMany<typeof GameMove>

  @hasOne(() => Score)
  declare score: HasOne<typeof Score>
}
