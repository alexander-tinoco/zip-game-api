import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Level from '#models/level'
import LevelGeneratorService from '#services/level_generator_service'
import GameValidatorService from '#services/game_validator_service'
import type { Difficulty } from '#utils/board'

/*
| Inserta los niveles de demostración.
| Se usan semillas FIJAS: cualquier integrante del equipo obtiene exactamente
| los mismos tableros al ejecutar `node ace db:seed`.
| Es idempotente: si el nivel ya existe (mismo nombre) lo actualiza.
*/
export default class LevelSeeder extends BaseSeeder {
  async run() {
    const generator = new LevelGeneratorService()
    const validator = new GameValidatorService()

    // Nivel tutorial: recorrido en serpiente con un número cada 5 celdas
    const serpentine: number[] = []
    for (let r = 0; r < 6; r++) {
      for (let c = 0; c < 6; c++) serpentine.push(r * 6 + (r % 2 === 0 ? c : 5 - c))
    }
    const tutorialCheckpoints = [0, 5, 10, 15, 20, 25, 30, 35].map((i) => serpentine[i])

    const levels = [
      {
        name: 'Tutorial',
        difficulty: 'easy' as Difficulty,
        size: 6,
        checkpoints: tutorialCheckpoints,
        solution: serpentine,
        checkpointCount: tutorialCheckpoints.length,
        difficultyScore: generator.measure(tutorialCheckpoints, serpentine).score,
        isGenerated: false,
      },
    ]

    const plan: Array<[Difficulty, string, number]> = [
      ['easy', 'Sunrise', 1001],
      ['easy', 'Meadow', 1002],
      ['easy', 'Pebble', 1003],
      ['medium', 'Canyon', 2001],
      ['medium', 'Circuit', 2002],
      ['medium', 'Orbit', 2003],
      ['hard', 'Vortex', 3001],
      ['hard', 'Eclipse', 3002],
      ['hard', 'Titan', 3003],
    ]

    for (const [difficulty, name, seed] of plan) {
      const generated = generator.generate(difficulty, seed, name)
      levels.push({
        name: generated.name,
        difficulty: generated.difficulty,
        size: generated.size,
        checkpoints: generated.checkpoints,
        solution: generated.solution,
        checkpointCount: generated.checkpointCount,
        difficultyScore: generated.difficultyScore,
        isGenerated: false,
      })
    }

    for (const level of levels) {
      // Doble verificación: nunca se guarda un nivel sin solución válida
      const check = validator.validateSolution(level, level.solution)
      if (!check.valid) throw new Error(`Seed level ${level.name} is invalid: ${check.message}`)
      await Level.updateOrCreate({ name: level.name }, level)
    }
  }
}
