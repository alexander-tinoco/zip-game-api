/*
|--------------------------------------------------------------------------
| Rutas de la API REST de ZIP Game
|--------------------------------------------------------------------------
| Públicas:   /api/auth/register, /api/auth/login, /api/leaderboard
| Protegidas: todo lo demás (header Authorization: Bearer <token>)
*/
import router from '@adonisjs/core/services/router'
import { middleware } from '#start/kernel'

const AuthController = () => import('#controllers/auth_controller')
const UsersController = () => import('#controllers/users_controller')
const LevelsController = () => import('#controllers/levels_controller')
const GamesController = () => import('#controllers/games_controller')
const LeaderboardController = () => import('#controllers/leaderboard_controller')

router.get('/', async () => ({ name: 'ZIP Game API', version: '1.0.0', status: 'ok' }))

router
  .group(() => {
    /* Autenticación */
    router
      .group(() => {
        router.post('register', [AuthController, 'register'])
        router.post('login', [AuthController, 'login'])
        router.post('logout', [AuthController, 'logout']).use(middleware.auth())
      })
      .prefix('auth')

    /* Ranking público */
    router.get('leaderboard', [LeaderboardController, 'index'])

    /* Rutas protegidas */
    router
      .group(() => {
        router.get('users/me', [UsersController, 'me'])

        router.get('levels', [LevelsController, 'index'])
        router.post('levels/generate', [LevelsController, 'generate'])
        router.get('levels/:id', [LevelsController, 'show']).where('id', router.matchers.number())

        router.post('games', [GamesController, 'store'])
        router.get('games/history', [GamesController, 'history'])
        router.get('games/:id', [GamesController, 'show']).where('id', router.matchers.number())
        router
          .post('games/:id/hint', [GamesController, 'hint'])
          .where('id', router.matchers.number())
        router
          .post('games/:id/finish', [GamesController, 'finish'])
          .where('id', router.matchers.number())
      })
      .use(middleware.auth())
  })
  .prefix('api')
