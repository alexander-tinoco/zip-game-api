/*
|--------------------------------------------------------------------------
| Kernel HTTP: middleware global, de router y con nombre
|--------------------------------------------------------------------------
*/
import router from '@adonisjs/core/services/router'
import server from '@adonisjs/core/services/server'

server.errorHandler(() => import('#exceptions/handler'))

/* Se ejecuta en TODAS las peticiones, incluso si no existe la ruta */
server.use([
  () => import('#middleware/container_bindings_middleware'),
  () => import('#middleware/force_json_response_middleware'),
  () => import('@adonisjs/cors/cors_middleware'),
])

/* Se ejecuta sólo en peticiones que coinciden con una ruta */
router.use([
  () => import('@adonisjs/core/bodyparser_middleware'),
  () => import('@adonisjs/auth/initialize_auth_middleware'),
])

/* Middleware con nombre que se asigna a rutas específicas */
export const middleware = router.named({
  auth: () => import('#middleware/auth_middleware'),
})
