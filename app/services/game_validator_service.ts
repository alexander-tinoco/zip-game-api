import { areAdjacent, checkpointMap, type BoardDefinition } from '#utils/board'

export type PathErrorCode =
  | 'EMPTY_PATH'
  | 'OUT_OF_BOUNDS'
  | 'INVALID_START'
  | 'REPEATED_CELL'
  | 'NOT_ADJACENT'
  | 'CHECKPOINT_ORDER'
  | 'PREMATURE_END'
  | 'INCOMPLETE'
  | 'INVALID_END'

export interface PathValidationResult {
  valid: boolean
  code?: PathErrorCode
  message?: string
  /** posición (dentro del arreglo path) donde se detectó el error */
  index?: number
  /** siguiente número de checkpoint que el jugador debe alcanzar */
  nextCheckpoint: number
}

/*
|--------------------------------------------------------------------------
| GameValidatorService
|--------------------------------------------------------------------------
| Implementa TODAS las reglas de ZIP en el servidor. El backend nunca
| confía en el estado "completado" que envía Flutter: recalcula todo.
|
| Reglas verificadas:
|  1. El camino inicia en la celda con el número 1.
|  2. Cada paso es horizontal o vertical (sin diagonales ni saltos).
|  3. Ninguna celda se repite.
|  4. Los checkpoints se visitan en orden ascendente (sin saltarse ninguno).
|  5. El último checkpoint sólo puede pisarse como celda final.
|  6. (solución) Se visitan las 36 celdas y se termina en el mayor número.
*/
export default class GameValidatorService {
  /** Valida un camino parcial (usado por las pistas) */
  validatePrefix(board: BoardDefinition, path: number[]): PathValidationResult {
    const total = board.size * board.size
    const cps = checkpointMap(board)
    const lastNumber = board.checkpoints.length

    if (path.length === 0) {
      return this.fail('EMPTY_PATH', 'The path is empty', 0, 1)
    }

    for (let i = 0; i < path.length; i++) {
      const cell = path[i]
      if (!Number.isInteger(cell) || cell < 0 || cell >= total) {
        return this.fail('OUT_OF_BOUNDS', `Cell ${cell} is outside the board`, i, 1)
      }
    }

    if (path[0] !== board.checkpoints[0]) {
      return this.fail('INVALID_START', 'The path must start on number 1', 0, 1)
    }

    const seen = new Set<number>()
    let next = 1

    for (let i = 0; i < path.length; i++) {
      const cell = path[i]

      if (seen.has(cell)) {
        return this.fail('REPEATED_CELL', `Cell ${cell} is visited twice`, i, next)
      }

      if (i > 0 && !areAdjacent(path[i - 1], cell, board.size)) {
        return this.fail(
          'NOT_ADJACENT',
          `Move ${path[i - 1]} -> ${cell} is not horizontal/vertical`,
          i,
          next
        )
      }

      const number = cps.get(cell)
      if (number !== undefined) {
        if (number !== next) {
          return this.fail(
            'CHECKPOINT_ORDER',
            `Expected checkpoint ${next} but reached ${number}`,
            i,
            next
          )
        }
        if (number === lastNumber && i !== total - 1) {
          return this.fail(
            'PREMATURE_END',
            'The last checkpoint can only be reached after visiting every cell',
            i,
            next
          )
        }
        next++
      }

      seen.add(cell)
    }

    return { valid: true, nextCheckpoint: next }
  }

  /** Valida una solución completa enviada al terminar la partida */
  validateSolution(board: BoardDefinition, path: number[]): PathValidationResult {
    const total = board.size * board.size
    const prefix = this.validatePrefix(board, path)
    if (!prefix.valid) return prefix

    if (path.length !== total) {
      return this.fail(
        'INCOMPLETE',
        `The path covers ${path.length} of ${total} cells`,
        path.length,
        prefix.nextCheckpoint
      )
    }

    const lastCheckpointCell = board.checkpoints[board.checkpoints.length - 1]
    if (path[path.length - 1] !== lastCheckpointCell) {
      return this.fail(
        'INVALID_END',
        'The path must end on the highest number',
        path.length - 1,
        prefix.nextCheckpoint
      )
    }

    return { valid: true, nextCheckpoint: prefix.nextCheckpoint }
  }

  private fail(
    code: PathErrorCode,
    message: string,
    index: number,
    nextCheckpoint: number
  ): PathValidationResult {
    return { valid: false, code, message, index, nextCheckpoint }
  }
}
