import { inject } from '@adonisjs/core'
import ScoreRepository from '#repositories/score_repository'

/*
| Reglas del ranking (documentadas en el manual):
|  1. Por cada nivel se toma el MEJOR puntaje del jugador.
|  2. total_score = suma de esos mejores puntajes.
|  3. Desempates: más niveles completados, menor tiempo total, registro más antiguo.
*/
@inject()
export default class LeaderboardService {
  constructor(private scores: ScoreRepository) {}

  top(limit = 20) {
    const safeLimit = Math.min(Math.max(1, limit), 100)
    return this.scores.leaderboard(safeLimit)
  }
}
