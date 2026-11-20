import GameValidatorService from '#services/game_validator_service'
import PathSolverService from '#services/path_solver_service'
import type { BoardDefinition } from '#utils/board'

export type HintResult =
  | { status: 'next'; nextCell: number }
  | { status: 'backtrack'; undoSteps: number; nextCell: number }
  | { status: 'invalid'; code: string; message: string; index: number }

/*
|--------------------------------------------------------------------------
| HintService — pistas inteligentes
|--------------------------------------------------------------------------
| 1. Valida el camino actual en el servidor (nunca confía en el cliente).
| 2. Si el camino sigue la solución guardada => la siguiente celda de ésta.
| 3. Si no, busca (backtracking) una continuación válida desde el camino actual.
| 4. Si el camino actual no tiene salida, indica cuántos pasos deshacer y
|    qué celda tomar después. NUNCA devuelve la solución completa.
*/
export default class HintService {
  constructor(
    private validator = new GameValidatorService(),
    private solver = new PathSolverService()
  ) {}

  getHint(board: BoardDefinition, storedSolution: number[], path: number[]): HintResult {
    // Camino vacío: la pista es la celda del número 1
    if (path.length === 0) return { status: 'next', nextCell: board.checkpoints[0] }

    const check = this.validator.validatePrefix(board, path)
    if (!check.valid) {
      return {
        status: 'invalid',
        code: check.code!,
        message: check.message!,
        index: check.index ?? 0,
      }
    }

    const total = board.size * board.size
    if (path.length >= total) {
      return { status: 'invalid', code: 'COMPLETE', message: 'The path is already complete', index: 0 }
    }

    // ¿Cuánto coincide con la solución guardada?
    let common = 0
    while (common < path.length && path[common] === storedSolution[common]) common++

    if (common === path.length) {
      return { status: 'next', nextCell: storedSolution[path.length] }
    }

    // Buscar una continuación desde el camino actual
    const fromCurrent = this.solver.hasSolution(board, path, 60_000)
    if (fromCurrent) return { status: 'next', nextCell: fromCurrent[path.length] }

    // Callejón sin salida: retroceder hasta un punto con solución
    for (let k = path.length - 1; k > common; k--) {
      const prefix = path.slice(0, k)
      const solution = this.solver.hasSolution(board, prefix, 20_000)
      if (solution) {
        return { status: 'backtrack', undoSteps: path.length - k, nextCell: solution[k] }
      }
    }

    // El prefijo común con la solución guardada siempre tiene salida
    return {
      status: 'backtrack',
      undoSteps: path.length - Math.max(common, 1),
      nextCell: storedSolution[Math.max(common, 1)],
    }
  }
}
