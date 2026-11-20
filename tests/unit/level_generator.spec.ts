import { test } from '@japa/runner'
import LevelGeneratorService, { CHECKPOINT_RANGE } from '#services/level_generator_service'
import GameValidatorService from '#services/game_validator_service'
import PathSolverService from '#services/path_solver_service'
import { createRng } from '#utils/random'
import { DIFFICULTIES } from '#utils/board'

const generator = new LevelGeneratorService()
const validator = new GameValidatorService()
const solver = new PathSolverService()

test.group('LevelGeneratorService', () => {
  test('random Hamiltonian paths visit the 36 cells once', ({ assert }) => {
    const rng = createRng(7)
    for (let i = 0; i < 50; i++) {
      const path = generator.randomHamiltonianPath(rng)
      assert.lengthOf(path, 36)
      assert.equal(new Set(path).size, 36)
    }
  })

  test('generated {difficulty} levels are solvable and respect the rules')
    .with(DIFFICULTIES)
    .run(({ assert }, difficulty) => {
      for (let seed = 1; seed <= 10; seed++) {
        const level = generator.generate(difficulty, seed)
        const board = { size: 6, checkpoints: level.checkpoints }

        // La solución guardada es válida
        assert.isTrue(validator.validateSolution(board, level.solution).valid)
        // Un solucionador independiente también encuentra solución
        const found = solver.hasSolution(board)
        assert.isNotNull(found)
        assert.isTrue(validator.validateSolution(board, found!).valid)
        // Cantidad de checkpoints dentro del rango de la dificultad
        const [min, max] = CHECKPOINT_RANGE[difficulty]
        assert.isAtLeast(level.checkpointCount, min)
        assert.isAtMost(level.checkpointCount, max)
      }
    })

  test('the same seed generates the same level', ({ assert }) => {
    const a = generator.generate('medium', 99)
    const b = generator.generate('medium', 99)
    assert.deepEqual(a.checkpoints, b.checkpoints)
    assert.deepEqual(a.solution, b.solution)
  })

  test('hard levels score higher on average than easy levels', ({ assert }) => {
    const avg = (d: 'easy' | 'hard') => {
      let sum = 0
      for (let s = 1; s <= 8; s++) sum += generator.generate(d, s).difficultyScore
      return sum / 8
    }
    assert.isAbove(avg('hard'), avg('easy'))
  })
})
