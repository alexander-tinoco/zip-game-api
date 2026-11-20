import { DateTime } from 'luxon'
import { BaseModel, column, hasMany } from '@adonisjs/lucid/orm'
import type { HasMany } from '@adonisjs/lucid/types/relations'
import GameSession from '#models/game_session'
import type { BoardDefinition, Difficulty } from '#utils/board'

/* Columnas JSON: se guardan como texto y se leen como arreglos */
const jsonColumn = {
  prepare: (value: unknown) => JSON.stringify(value),
  consume: (value: unknown) => (typeof value === 'string' ? JSON.parse(value) : value),
}

export default class Level extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column()
  declare name: string

  @column()
  declare difficulty: Difficulty

  @column()
  declare size: number

  /** checkpoints[i] = índice de celda del número i+1 */
  @column(jsonColumn)
  declare checkpoints: number[]

  /** Solución guardada: NUNCA se serializa hacia el cliente */
  @column({ ...jsonColumn, serializeAs: null })
  declare solution: number[]

  @column()
  declare checkpointCount: number

  @column()
  declare difficultyScore: number

  @column({ consume: (value: unknown) => Boolean(value) })
  declare isGenerated: boolean

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ autoCreate: true, autoUpdate: true })
  declare updatedAt: DateTime | null

  @hasMany(() => GameSession)
  declare gameSessions: HasMany<typeof GameSession>

  get board(): BoardDefinition {
    return { size: this.size, checkpoints: this.checkpoints }
  }
}
