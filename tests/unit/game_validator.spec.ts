import { test } from '@japa/runner'
import GameValidatorService from '#services/game_validator_service'

/* Tablero de prueba: camino en serpiente con checkpoints en 0, 5, 10, ..., 35 del camino */
const serpentine: number[] = []
for (let r = 0; r < 6; r++) {
  for (let c = 0; c < 6; c++) serpentine.push(r * 6 + (r % 2 === 0 ? c : 5 - c))
}
const board = { size: 6, checkpoints: [0, 5, 10, 15, 20, 25, 30, 35].map((i) => serpentine[i]) }
const validator = new GameValidatorService()

test.group('GameValidatorService', () => {
  test('accepts a complete valid solution', ({ assert }) => {
    const result = validator.validateSolution(board, serpentine)
    assert.isTrue(result.valid)
  })

  test('rejects a path that does not start on number 1', ({ assert }) => {
    const result = validator.validatePrefix(board, [1, 2])
    assert.equal(result.code, 'INVALID_START')
  })

  test('rejects diagonal movements', ({ assert }) => {
    const result = validator.validatePrefix(board, [0, 7])
    assert.equal(result.code, 'NOT_ADJACENT')
  })

  test('rejects jumps of more than one cell', ({ assert }) => {
    const result = validator.validatePrefix(board, [0, 2])
    assert.equal(result.code, 'NOT_ADJACENT')
  })

  test('rejects repeated cells', ({ assert }) => {
    const result = validator.validatePrefix(board, [0, 1, 0])
    assert.equal(result.code, 'REPEATED_CELL')
  })

  test('rejects skipping a checkpoint', ({ assert }) => {
    // Checkpoint 2 está en la celda 5. Bajamos a la fila 2 sin pasar por ella.
    const custom = { size: 6, checkpoints: [0, 5, 35] }
    const result = validator.validatePrefix(custom, [0, 6, 7, 8, 9, 10, 11, 5])
    assert.isTrue(result.valid) // aquí sí la pisa en orden
    const skip = validator.validatePrefix({ size: 6, checkpoints: [0, 5, 4, 35] }, [0, 1, 2, 3, 4])
    assert.equal(skip.code, 'CHECKPOINT_ORDER')
  })

  test('rejects reaching the last number before covering every cell', ({ assert }) => {
    const result = validator.validatePrefix({ size: 6, checkpoints: [0, 2] }, [0, 1, 2])
    assert.equal(result.code, 'PREMATURE_END')
  })

  test('rejects incomplete paths', ({ assert }) => {
    const result = validator.validateSolution(board, serpentine.slice(0, 20))
    assert.equal(result.code, 'INCOMPLETE')
  })

  test('rejects cells outside the board', ({ assert }) => {
    const result = validator.validatePrefix(board, [0, 36])
    assert.equal(result.code, 'OUT_OF_BOUNDS')
  })
})
