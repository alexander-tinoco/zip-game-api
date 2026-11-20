import { assert } from '@japa/assert'
import { apiClient } from '@japa/api-client'
import app from '@adonisjs/core/services/app'
import ace from '@adonisjs/core/services/ace'
import type { Config } from '@japa/runner/types'
import { pluginAdonisJS } from '@japa/plugin-adonisjs'
import testUtils from '@adonisjs/core/services/test_utils'
import { authApiClient } from '@adonisjs/auth/plugins/api_client'

export const plugins: Config['plugins'] = [
  assert(),
  apiClient(),
  pluginAdonisJS(app),
  authApiClient(app),
]

export const runnerHooks: Required<Pick<Config, 'setup' | 'teardown'>> = {
  setup: [],
  teardown: [],
}

/*
| Recrea el esquema de la BD de pruebas (zip_game_test) con las migraciones.
| Cada prueba funcional corre dentro de una transacción global que se revierte
| al terminar, así la BD queda limpia entre pruebas.
*/
async function migrateTestDatabase() {
  for (const [name, args] of [
    ['db:wipe', ['--force']],
    ['migration:run', ['--force', '--disable-locks']],
  ] as const) {
    const command = await ace.exec(name, [...args])
    if (command.exitCode !== 0) {
      throw command.error ?? new Error(`Unable to run ${name} on the test database`)
    }
  }
}

/*
| Sólo la suite "functional" usa MySQL y el servidor HTTP real.
| La suite "unit" prueba la lógica del juego sin base de datos.
*/
export const configureSuite: Config['configureSuite'] = (suite) => {
  if (['browser', 'functional', 'e2e'].includes(suite.name)) {
    return suite.setup(async () => {
      await migrateTestDatabase()
      return testUtils.httpServer().start()
    })
  }
}
