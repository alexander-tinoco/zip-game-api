import db from '@adonisjs/lucid/services/db'
import Level from '#models/level'
import type { Difficulty } from '#utils/board'
import type { GeneratedLevel } from '#services/level_generator_service'

export interface LevelWithProgress {
  level: Level
  completed: boolean
  bestScore: number | null
}

/* Encapsula el acceso a la tabla levels */
export default class LevelRepository {
  findOrFail(id: number) {
    return Level.findOrFail(id)
  }

  /** Lista de niveles + si el usuario ya lo completó y su mejor puntaje */
  async listWithProgress(userId: number, difficulty?: Difficulty): Promise<LevelWithProgress[]> {
    const query = Level.query().orderByRaw("FIELD(difficulty, 'easy', 'medium', 'hard')").orderBy('id')
    if (difficulty) query.where('difficulty', difficulty)
    const levels = await query

    const best = await db
      .from('scores')
      .where('user_id', userId)
      .groupBy('level_id')
      .select('level_id')
      .max('points as best')

    const bestByLevel = new Map<number, number>(
      best.map((row: { level_id: number; best: number }) => [row.level_id, Number(row.best)])
    )

    return levels.map((level) => ({
      level,
      completed: bestByLevel.has(level.id),
      bestScore: bestByLevel.get(level.id) ?? null,
    }))
  }

  /** Primer nivel NO completado de una dificultad (para la dificultad adaptativa) */
  async firstPendingFor(userId: number, difficulty: Difficulty) {
    return Level.query()
      .where('difficulty', difficulty)
      .whereNotIn('id', db.from('scores').where('user_id', userId).select('level_id'))
      .orderBy('id')
      .first()
  }

  create(generated: GeneratedLevel, isGenerated = true) {
    return Level.create({
      name: generated.name,
      difficulty: generated.difficulty,
      size: generated.size,
      checkpoints: generated.checkpoints,
      solution: generated.solution,
      checkpointCount: generated.checkpointCount,
      difficultyScore: generated.difficultyScore,
      isGenerated,
    })
  }
}
