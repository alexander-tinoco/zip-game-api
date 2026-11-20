import { BaseSeeder } from '@adonisjs/lucid/seeders'
import app from '@adonisjs/core/services/app'
import User from '#models/user'

/*
| Usuario de DEMOSTRACIÓN (sólo desarrollo). La contraseña se hashea
| automáticamente con scrypt al guardarse (withAuthFinder).
|   email:    demo@zipgame.test
|   password: demo12345
*/
export default class UserSeeder extends BaseSeeder {
  static environment = ['development', 'test']

  async run() {
    if (app.inProduction) return
    await User.updateOrCreate(
      { email: 'demo@zipgame.test' },
      { username: 'demo', email: 'demo@zipgame.test', password: 'demo12345', recommendedDifficulty: 'easy' }
    )
  }
}
