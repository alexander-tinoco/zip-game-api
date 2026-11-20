import vine from '@vinejs/vine'

/* POST /api/auth/register */
export const registerValidator = vine.compile(
  vine.object({
    username: vine
      .string()
      .trim()
      .minLength(3)
      .maxLength(30)
      .regex(/^[a-zA-Z0-9_]+$/)
      .unique(async (db, value) => {
        const row = await db.from('users').where('username', value).first()
        return !row
      }),
    email: vine
      .string()
      .trim()
      .email()
      .normalizeEmail()
      .maxLength(254)
      .unique(async (db, value) => {
        const row = await db.from('users').where('email', value).first()
        return !row
      }),
    password: vine.string().minLength(8).maxLength(64),
  })
)

/* POST /api/auth/login */
export const loginValidator = vine.compile(
  vine.object({
    email: vine.string().trim().email().normalizeEmail(),
    password: vine.string().minLength(1),
  })
)
