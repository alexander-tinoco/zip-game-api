import vine from '@vinejs/vine'
import { TOTAL_CELLS } from '#utils/board'

const cell = () => vine.number().withoutDecimals().min(0).max(TOTAL_CELLS - 1)

/* POST /api/games  { level_id? } */
export const startGameValidator = vine.compile(
  vine.object({
    level_id: vine.number().withoutDecimals().positive().optional(),
  })
)

/* POST /api/games/:id/hint  { path: [celdas] } */
export const hintValidator = vine.compile(
  vine.object({
    path: vine.array(cell()).maxLength(TOTAL_CELLS),
  })
)

/* POST /api/games/:id/finish  { path, moves } */
export const finishGameValidator = vine.compile(
  vine.object({
    path: vine.array(cell()).minLength(1).maxLength(TOTAL_CELLS),
    moves: vine
      .array(
        vine.object({
          type: vine.enum(['add', 'undo', 'invalid', 'restart'] as const),
          cell: cell().nullable().optional(),
          elapsed_ms: vine.number().withoutDecimals().min(0).optional(),
        })
      )
      .maxLength(5000)
      .optional(),
  })
)

/* POST /api/levels/generate  { difficulty } */
export const generateLevelValidator = vine.compile(
  vine.object({
    difficulty: vine.enum(['easy', 'medium', 'hard'] as const),
    name: vine.string().trim().minLength(3).maxLength(80).optional(),
  })
)

/* GET /api/levels?difficulty=  y  GET /api/games/history?page=&per_page= */
export const listQueryValidator = vine.compile(
  vine.object({
    difficulty: vine.enum(['easy', 'medium', 'hard'] as const).optional(),
    page: vine.number().withoutDecimals().positive().optional(),
    per_page: vine.number().withoutDecimals().range([1, 50]).optional(),
    limit: vine.number().withoutDecimals().range([1, 100]).optional(),
  })
)
