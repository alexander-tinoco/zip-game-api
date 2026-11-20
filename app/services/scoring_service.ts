import type { Difficulty } from '#utils/board'

export interface ScoreInput {
  difficulty: Difficulty
  durationSeconds: number
  mistakes: number
  hintsUsed: number
}

export interface ScoreBreakdown {
  base: number
  timeBonus: number
  timePenalty: number
  mistakePenalty: number
  hintPenalty: number
  total: number
}

/*
|--------------------------------------------------------------------------
| Reglas de puntuación (se calculan SOLO en el backend)
|--------------------------------------------------------------------------
|  base:            fácil 1000 | medio 2000 | difícil 3000
|  tiempo objetivo: fácil 120s | medio 180s | difícil 300s
|  bonus:           +3 pts por cada segundo por debajo del objetivo
|  penalización:    -2 pts por cada segundo por encima del objetivo
|  errores:         -25 pts por movimiento inválido
|  pistas:          -150 pts por pista
|  mínimo:          10% de la base (terminar siempre da puntos)
*/
export const BASE_POINTS: Record<Difficulty, number> = { easy: 1000, medium: 2000, hard: 3000 }
export const TARGET_SECONDS: Record<Difficulty, number> = { easy: 120, medium: 180, hard: 300 }
export const MISTAKE_PENALTY = 25
export const HINT_PENALTY = 150

export default class ScoringService {
  calculate(input: ScoreInput): ScoreBreakdown {
    const base = BASE_POINTS[input.difficulty]
    const target = TARGET_SECONDS[input.difficulty]
    const duration = Math.max(0, Math.round(input.durationSeconds))

    const timeBonus = Math.max(0, target - duration) * 3
    const timePenalty = Math.max(0, duration - target) * 2
    const mistakePenalty = Math.max(0, input.mistakes) * MISTAKE_PENALTY
    const hintPenalty = Math.max(0, input.hintsUsed) * HINT_PENALTY

    const raw = base + timeBonus - timePenalty - mistakePenalty - hintPenalty
    const total = Math.max(Math.round(base * 0.1), raw)

    return { base, timeBonus, timePenalty, mistakePenalty, hintPenalty, total }
  }
}
