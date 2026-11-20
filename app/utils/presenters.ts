import type Level from '#models/level'
import type GameSession from '#models/game_session'
import type User from '#models/user'

/*
| Presentadores: definen EXACTAMENTE qué se envía al cliente.
| La solución del nivel nunca aparece aquí.
*/
export function presentLevel(level: Level, extra: Record<string, unknown> = {}) {
  return {
    id: level.id,
    name: level.name,
    difficulty: level.difficulty,
    size: level.size,
    checkpoints: level.checkpoints,
    checkpoint_count: level.checkpointCount,
    difficulty_score: level.difficultyScore,
    is_generated: level.isGenerated,
    ...extra,
  }
}

export function presentSession(session: GameSession) {
  return {
    id: session.id,
    level_id: session.levelId,
    status: session.status,
    difficulty: session.difficulty,
    started_at: session.startedAt?.toISO(),
    finished_at: session.finishedAt?.toISO() ?? null,
    duration_seconds: session.durationSeconds,
    mistakes: session.mistakes,
    hints_used: session.hintsUsed,
    failed_attempts: session.failedAttempts,
  }
}

export function presentUser(user: User) {
  return {
    id: user.id,
    username: user.username,
    email: user.email,
    recommended_difficulty: user.recommendedDifficulty,
    created_at: user.createdAt?.toISO(),
  }
}
