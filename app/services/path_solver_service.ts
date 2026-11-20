import { checkpointMap, neighbors, type BoardDefinition } from '#utils/board'

export interface SolveOptions {
  /** Máximo de nodos (estados) a explorar antes de rendirse */
  maxNodes?: number
  /** Detenerse al encontrar esta cantidad de soluciones */
  maxSolutions?: number
  /** Usar la heurística de Warnsdorff (vecino con menos salidas primero) */
  heuristic?: boolean
}

export interface SolveResult {
  solutions: number[][]
  nodes: number
  /** true si la búsqueda terminó sin alcanzar el límite de nodos */
  exhausted: boolean
}

/*
|--------------------------------------------------------------------------
| PathSolverService — búsqueda en profundidad con backtracking
|--------------------------------------------------------------------------
| Se usa para:
|  - Comprobar que un nivel generado tiene solución.
|  - Contar soluciones (medir ambigüedad / dificultad).
|  - Calcular la siguiente celda de una pista a partir del camino actual.
|
| Podas que hacen la búsqueda rápida en 6x6:
|  a) Orden de checkpoints: no se entra a un checkpoint que no sea el siguiente.
|  b) El último checkpoint sólo se pisa si es la celda número 36.
|  c) Conectividad: todas las celdas libres deben ser alcanzables desde la cabeza.
|  d) Callejones: una celda libre con un único vecino disponible tendría que ser
|     el final del camino; si no es el último checkpoint, el estado es inválido.
*/
export default class PathSolverService {
  solve(board: BoardDefinition, prefix: number[] = [], options: SolveOptions = {}): SolveResult {
    const maxNodes = options.maxNodes ?? 500_000
    const maxSolutions = options.maxSolutions ?? 1
    const heuristic = options.heuristic ?? true

    const size = board.size
    const total = size * size
    const cps = checkpointMap(board)
    const lastNumber = board.checkpoints.length
    const lastCell = board.checkpoints[lastNumber - 1]
    const adj = Array.from({ length: total }, (_, c) => neighbors(c, size))

    const start = prefix.length > 0 ? prefix : [board.checkpoints[0]]
    const visited = new Array<boolean>(total).fill(false)
    const path: number[] = []
    let next = 1
    for (const cell of start) {
      visited[cell] = true
      path.push(cell)
      if (cps.get(cell) === next) next++
    }

    const solutions: number[][] = []
    let nodes = 0
    let aborted = false

    const freeDegree = (cell: number, head: number) => {
      let d = 0
      for (const n of adj[cell]) if (!visited[n] || n === head) d++
      return d
    }

    const isPromising = (head: number) => {
      const remaining = total - path.length
      if (remaining === 0) return true

      // (d) callejones sin salida
      for (let c = 0; c < total; c++) {
        if (visited[c]) continue
        const d = freeDegree(c, head)
        if (d === 0) return false
        if (d === 1 && c !== lastCell) {
          // sólo es válido si es el último paso y está junto a la cabeza
          return false
        }
      }

      // (c) conectividad con flood fill desde la cabeza
      const stack = [head]
      const seen = new Set<number>([head])
      let reached = 0
      while (stack.length) {
        const cur = stack.pop()!
        for (const n of adj[cur]) {
          if (!visited[n] && !seen.has(n)) {
            seen.add(n)
            reached++
            stack.push(n)
          }
        }
      }
      return reached === remaining
    }

    const dfs = () => {
      if (aborted || solutions.length >= maxSolutions) return
      nodes++
      if (nodes > maxNodes) {
        aborted = true
        return
      }

      const head = path[path.length - 1]
      if (path.length === total) {
        if (head === lastCell) solutions.push([...path])
        return
      }

      let candidates = adj[head].filter((n) => {
        if (visited[n]) return false
        const number = cps.get(n)
        if (number !== undefined && number !== next) return false
        if (number === lastNumber && path.length + 1 !== total) return false
        return true
      })

      if (heuristic && candidates.length > 1) {
        candidates = candidates
          .map((n) => ({ n, d: adj[n].filter((m) => !visited[m]).length }))
          .sort((a, b) => a.d - b.d)
          .map((x) => x.n)
      }

      for (const n of candidates) {
        const number = cps.get(n)
        visited[n] = true
        path.push(n)
        if (number !== undefined) next++

        if (isPromising(n)) dfs()

        if (number !== undefined) next--
        path.pop()
        visited[n] = false

        if (aborted || solutions.length >= maxSolutions) return
      }
    }

    if (isPromising(path[path.length - 1])) dfs()

    return { solutions, nodes, exhausted: !aborted }
  }

  /** ¿Existe al menos una forma de completar el camino actual? */
  hasSolution(board: BoardDefinition, prefix: number[] = [], maxNodes = 500_000) {
    const result = this.solve(board, prefix, { maxNodes, maxSolutions: 1 })
    return result.solutions[0] ?? null
  }
}
