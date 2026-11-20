import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import User from '#models/user'
import UserRepository from '#repositories/user_repository'
import { loginValidator, registerValidator } from '#validators/auth_validator'
import { presentUser } from '#utils/presenters'

@inject()
export default class AuthController {
  constructor(private users: UserRepository) {}

  /** POST /api/auth/register -> 201 { user, token } */
  async register({ request, response }: HttpContext) {
    const data = await request.validateUsing(registerValidator)
    const user = await this.users.create(data)
    const token = await User.accessTokens.create(user)

    return response.created({
      user: presentUser(user),
      token: { type: 'bearer', value: token.value!.release(), expires_at: token.expiresAt },
    })
  }

  /** POST /api/auth/login -> 200 { user, token } | 400 credenciales inválidas */
  async login({ request }: HttpContext) {
    const { email, password } = await request.validateUsing(loginValidator)
    const user = await User.verifyCredentials(email, password)
    const token = await User.accessTokens.create(user)

    return {
      user: presentUser(user),
      token: { type: 'bearer', value: token.value!.release(), expires_at: token.expiresAt },
    }
  }

  /** POST /api/auth/logout -> 200 (revoca el token actual) */
  async logout({ auth }: HttpContext) {
    const user = auth.getUserOrFail()
    await User.accessTokens.delete(user, user.currentAccessToken.identifier)
    return { message: 'Logged out' }
  }
}
