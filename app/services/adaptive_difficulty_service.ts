import { DIFFICULTIES, type Difficulty } from '#utils/board'
import { TARGET_SECONDS } from '#services/scoring_service'

export interface GamePerformance {
  difficulty: Difficulty
  durationSeconds: number
  mistakes: number
  hintsUsed: number
}

export type PerformanceRating = 'excellent' | 'normal' | 'poor'

export interface AdaptiveDecision {
  current: Difficulty
  recommended: Difficulty
  change: 'increase' | 'decrease' | 'keep'
  reason: string
}

/*
|--------------------------------------------------------------------------
| Dificultad adaptativa
|--------------------------------------------------------------------------
| Cada partida terminada se califica:
|   EXCELENTE: tiempo <= objetivo, 0 pistas y <= 2 errores
|   DEFICIENTE: tiempo > 2x objetivo, o >= 3 pistas, o >= 10 errores
|   NORMAL: cualquier otro caso
|
| Se observan las últimas 3 partidas jugadas en la dificultad actual:
|   - 2 o más EXCELENTES  => sube un nivel (fácil→medio→difícil)
|   - 2 o más DEFICIENTES => baja un nivel
|   - en otro caso        => se mantiene
|
| La recomendación sólo afecta a las PRÓXIMAS partidas: una sesión ya iniciada
| guarda su propia dificultad y su tablero, por lo que nunca cambia en curso.
*/
export default class AdaptiveDifficultyService {
  static WINDOW = 3

  rate(game: GamePerformance): PerformanceRating {
    const target = TARGET_SECONDS[game.difficulty]
    if (game.durationSeconds <= target && game.hintsUsed === 0 && game.mistakes <= 2) {
      return 'excellent'
    }
    if (game.durationSeconds > target * 2 || game.hintsUsed >= 3 || game.mistakes >= 10) {
      return 'poor'
    }
    return 'normal'
  }

  /** @param recentGames partidas terminadas, la más reciente primero */
  decide(current: Difficulty, recentGames: GamePerformance[]): AdaptiveDecision {
    const window = recentGames
      .filter((g) => g.difficulty === current)
      .slice(0, AdaptiveDifficultyService.WINDOW)

    const ratings = window.map((g) => this.rate(g))
    const excellent = ratings.filter((r) => r === 'excellent').length
    const poor = ratings.filter((r) => r === 'poor').length
    const index = DIFFICULTIES.indexOf(current)

    if (excellent >= 2 && index < DIFFICULTIES.length - 1) {
      return {
        current,
        recommended: DIFFICULTIES[index + 1],
        change: 'increase',
        reason: `${excellent} excellent games in the last ${window.length}`,
      }
    }
    if (poor >= 2 && index > 0) {
      return {
        current,
        recommended: DIFFICULTIES[index - 1],
        change: 'decrease',
        reason: `${poor} poor games in the last ${window.length}`,
      }
    }
    return { current, recommended: current, change: 'keep', reason: 'Performance is stable' }
  }
}
