import { test } from '@japa/runner'
import ScoringService from '#services/scoring_service'
import HintService from '#services/hint_service'
import AdaptiveDifficultyService from '#services/adaptive_difficulty_service'
import LevelGeneratorService from '#services/level_generator_service'

test.group('ScoringService', () => {
  const scoring = new ScoringService()

  test('fast game without mistakes gets base + time bonus', ({ assert }) => {
    const r = scoring.calculate({ difficulty: 'easy', durationSeconds: 60, mistakes: 0, hintsUsed: 0 })
    assert.equal(r.total, 1000 + 60 * 3)
  })

  test('mistakes, hints and slow time reduce the score', ({ assert }) => {
    const r = scoring.calculate({ difficulty: 'medium', durationSeconds: 200, mistakes: 4, hintsUsed: 2 })
    assert.equal(r.total, 2000 - 20 * 2 - 4 * 25 - 2 * 150)
  })

  test('score never goes below 10% of the base', ({ assert }) => {
    const r = scoring.calculate({ difficulty: 'hard', durationSeconds: 99999, mistakes: 500, hintsUsed: 50 })
    assert.equal(r.total, 300)
  })
})

test.group('HintService', () => {
  const generator = new LevelGeneratorService()
  const hints = new HintService()
  const level = generator.generate('medium', 4242)
  const board = { size: 6, checkpoints: level.checkpoints }

  test('suggests the next cell of the solution', ({ assert }) => {
    const hint = hints.getHint(board, level.solution, level.solution.slice(0, 5))
    assert.deepEqual(hint, { status: 'next', nextCell: level.solution[5] })
  })

  test('rejects invalid paths', ({ assert }) => {
    const hint = hints.getHint(board, level.solution, [level.solution[0], 99])
    assert.equal(hint.status, 'invalid')
  })

  test('empty path hints the cell with number 1', ({ assert }) => {
    const hint = hints.getHint(board, level.solution, [])
    assert.deepEqual(hint, { status: 'next', nextCell: level.checkpoints[0] })
  })
})

test.group('AdaptiveDifficultyService', () => {
  const adaptive = new AdaptiveDifficultyService()
  const fast = { difficulty: 'easy' as const, durationSeconds: 50, mistakes: 0, hintsUsed: 0 }
  const slow = { difficulty: 'medium' as const, durationSeconds: 500, mistakes: 12, hintsUsed: 3 }

  test('increases after two excellent games', ({ assert }) => {
    assert.equal(adaptive.decide('easy', [fast, fast]).recommended, 'medium')
  })

  test('decreases after two poor games', ({ assert }) => {
    assert.equal(adaptive.decide('medium', [slow, slow]).recommended, 'easy')
  })

  test('keeps difficulty with mixed results', ({ assert }) => {
    assert.equal(adaptive.decide('easy', [fast]).change, 'keep')
  })

  test('never goes above hard', ({ assert }) => {
    const hardFast = { ...fast, difficulty: 'hard' as const }
    assert.equal(adaptive.decide('hard', [hardFast, hardFast]).recommended, 'hard')
  })
})
