import { BOARD_SIZE, TOTAL_CELLS, countTurns, neighbors, type Difficulty } from '#utils/board'
import { createRng, pick, randomInt, shuffle, type Rng } from '#utils/random'
import PathSolverService from '#services/path_solver_service'
import GameValidatorService from '#services/game_validator_service'

export interface DifficultyMetrics {
  checkpointCount: number
  /** distancia promedio (en pasos) entre checkpoints consecutivos */
  averageGap: number
  /** número de soluciones distintas (tope = SOLUTION_CAP) */
  solutionCount: number
  /** nodos que necesita una búsqueda SIN heurística para hallar la 1a solución */
  searchEffort: number
  /** cambios de dirección de la solución guardada */
  turns: number
  /** puntaje final 0..100 aprox. */
  score: number
}

export interface GeneratedLevel {
  name: string
  difficulty: Difficulty
  size: number
  checkpoints: number[]
  solution: number[]
  checkpointCount: number
  difficultyScore: number
  metrics: DifficultyMetrics
}

/*
|--------------------------------------------------------------------------
| Rangos de checkpoints por dificultad (más pistas = más guía)
|--------------------------------------------------------------------------
*/
export const CHECKPOINT_RANGE: Record<Difficulty, [number, number]> = {
  easy: [10, 13],
  medium: [7, 9],
  hard: [4, 6],
}

/*
| Límites del puntaje de dificultad. Calibrados generando 180 tableros
| (60 por categoría): mediana fácil = 41, media = 61, difícil = 77.
*/
export const SCORE_THRESHOLDS = { medium: 45, hard: 68 }

const SOLUTION_CAP = 50

/*
|--------------------------------------------------------------------------
| LevelGeneratorService
|--------------------------------------------------------------------------
| Algoritmo:
|  1. Se crea un camino hamiltoniano (pasa por las 36 celdas) partiendo de un
|     recorrido en serpiente y aplicando miles de movimientos "backbite"
|     aleatorios, lo que produce caminos muy variados y SIEMPRE válidos.
|  2. Sobre ese camino se colocan los checkpoints (1 al inicio y el mayor al
|     final). Como el propio camino respeta todas las reglas, el nivel
|     tiene al menos una solución garantizada.
|  3. Se verifica con GameValidatorService y PathSolverService.
|  4. Se mide la dificultad con métricas objetivas (ver DifficultyMetrics)
|     y se repite hasta que el puntaje cae en la banda pedida.
*/
export default class LevelGeneratorService {
  constructor(
    private solver = new PathSolverService(),
    private validator = new GameValidatorService()
  ) {}

  generate(difficulty: Difficulty, seed?: number, name?: string): GeneratedLevel {
    const rng = createRng(seed ?? Date.now() ^ Math.floor(Math.random() * 1e9))
    let best: GeneratedLevel | null = null
    let bestDistance = Number.POSITIVE_INFINITY

    for (let attempt = 0; attempt < 40; attempt++) {
      const solution = this.randomHamiltonianPath(rng)
      const [min, max] = CHECKPOINT_RANGE[difficulty]
      const count = randomInt(rng, min, max)
      const checkpoints = this.placeCheckpoints(rng, solution, count, difficulty)
      const board = { size: BOARD_SIZE, checkpoints }

      // Comprobación de solubilidad: el camino base debe ser una solución válida
      if (!this.validator.validateSolution(board, solution).valid) continue

      const metrics = this.measure(checkpoints, solution)
      const level: GeneratedLevel = {
        name: name ?? this.defaultName(difficulty, rng),
        difficulty,
        size: BOARD_SIZE,
        checkpoints,
        solution,
        checkpointCount: checkpoints.length,
        difficultyScore: metrics.score,
        metrics,
      }

      const distance = this.distanceToBand(metrics.score, difficulty)
      if (distance === 0) return level
      if (distance < bestDistance) {
        best = level
        bestDistance = distance
      }
    }

    return best!
  }

  /** Camino hamiltoniano aleatorio mediante movimientos backbite */
  randomHamiltonianPath(rng: Rng, size = BOARD_SIZE): number[] {
    let path: number[] = []
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        path.push(r * size + (r % 2 === 0 ? c : size - 1 - c))
      }
    }

    const iterations = size * size * 60
    for (let i = 0; i < iterations; i++) {
      if (rng() < 0.5) path.reverse()
      const end = path[path.length - 1]
      const before = path[path.length - 2]
      const options = neighbors(end, size).filter((n) => n !== before)
      if (options.length === 0) continue
      const target = pick(rng, options)
      const idx = path.indexOf(target)
      // une end-target y elimina la arista target-(idx+1): invierte el tramo final
      path = [...path.slice(0, idx + 1), ...path.slice(idx + 1).reverse()]
    }
    return path
  }

  /**
   * Coloca `count` checkpoints sobre el camino solución.
   * Devuelve las celdas ordenadas: [celda del 1, celda del 2, ...].
   */
  placeCheckpoints(rng: Rng, solution: number[], count: number, difficulty: Difficulty) {
    const last = solution.length - 1
    const positions = new Set<number>([0, last])

    if (difficulty === 'easy') {
      // Espaciado uniforme: guía constante
      for (let i = 1; i < count - 1; i++) positions.add(Math.round((i * last) / (count - 1)))
    } else if (difficulty === 'medium') {
      // Espaciado uniforme con variación de ±2 pasos
      for (let i = 1; i < count - 1; i++) {
        const base = Math.round((i * last) / (count - 1))
        positions.add(Math.min(last - 1, Math.max(1, base + randomInt(rng, -2, 2))))
      }
    } else {
      // Difícil: posiciones aleatorias, preferentemente sobre giros del camino
      const turnPositions: number[] = []
      for (let i = 1; i < last; i++) {
        if (solution[i] - solution[i - 1] !== solution[i + 1] - solution[i]) turnPositions.push(i)
      }
      for (const p of shuffle(rng, turnPositions)) {
        if (positions.size >= count) break
        positions.add(p)
      }
    }

    // Completar si hubo colisiones
    while (positions.size < count) positions.add(randomInt(rng, 1, last - 1))

    return [...positions].sort((a, b) => a - b).map((p) => solution[p])
  }

  /**
   * Métricas objetivas de dificultad:
   *  - menos checkpoints / mayor separación  => menos guía
   *  - más soluciones posibles               => más decisiones
   *  - más esfuerzo de búsqueda sin heurística => más razonamiento
   *  - más giros                              => recorrido más complejo
   */
  measure(checkpoints: number[], solution: number[]): DifficultyMetrics {
    const board = { size: BOARD_SIZE, checkpoints }
    const count = this.solver.solve(board, [], {
      maxSolutions: SOLUTION_CAP,
      maxNodes: 150_000,
    })
    const effort = this.solver.solve(board, [], {
      maxSolutions: 1,
      maxNodes: 150_000,
      heuristic: false,
    })

    const averageGap = (TOTAL_CELLS - 1) / (checkpoints.length - 1)
    const solutionCount = count.solutions.length
    const searchEffort = effort.nodes
    const turns = countTurns(solution)

    const gapPart = Math.min(35, (averageGap / 9) * 35) // 0..35
    const decisionPart = (Math.log2(solutionCount) / Math.log2(SOLUTION_CAP)) * 25 // 0..25
    const effortPart = Math.min(25, (Math.log10(searchEffort + 1) / 5) * 25) // 0..25
    const turnPart = Math.min(15, (turns / 30) * 15) // 0..15

    return {
      checkpointCount: checkpoints.length,
      averageGap: Number(averageGap.toFixed(2)),
      solutionCount,
      searchEffort,
      turns,
      score: Math.round(gapPart + decisionPart + effortPart + turnPart),
    }
  }

  classify(score: number): Difficulty {
    if (score >= SCORE_THRESHOLDS.hard) return 'hard'
    if (score >= SCORE_THRESHOLDS.medium) return 'medium'
    return 'easy'
  }

  private distanceToBand(score: number, difficulty: Difficulty) {
    const bands: Record<Difficulty, [number, number]> = {
      easy: [0, SCORE_THRESHOLDS.medium - 1],
      medium: [SCORE_THRESHOLDS.medium, SCORE_THRESHOLDS.hard - 1],
      hard: [SCORE_THRESHOLDS.hard, 100],
    }
    const [lo, hi] = bands[difficulty]
    if (score < lo) return lo - score
    if (score > hi) return score - hi
    return 0
  }

  private defaultName(difficulty: Difficulty, rng: Rng) {
    const words: Record<Difficulty, string[]> = {
      easy: ['Sunrise', 'Meadow', 'Breeze', 'Pebble', 'Ripple'],
      medium: ['Canyon', 'Labyrinth', 'Circuit', 'Orbit', 'Delta'],
      hard: ['Vortex', 'Eclipse', 'Inferno', 'Abyss', 'Titan'],
    }
    return `${pick(rng, words[difficulty])} #${randomInt(rng, 100, 999)}`
  }
}
