import app from '@adonisjs/core/services/app'
import { HttpContext, ExceptionHandler } from '@adonisjs/core/http'
import { errors as lucidErrors } from '@adonisjs/lucid'

/*
|--------------------------------------------------------------------------
| Manejador global de errores
|--------------------------------------------------------------------------
| - 404 de Lucid (findOrFail) => { message: 'Resource not found' }
| - Errores de VineJS => 422 { errors: [...] } (manejo propio de VineJS)
| - Errores de auth  => 401 { errors: [...] } (manejo propio de @adonisjs/auth)
| - En producción nunca se exponen stack traces ni detalles de SQL.
*/
export default class HttpExceptionHandler extends ExceptionHandler {
  protected debug = !app.inProduction

  async handle(error: unknown, ctx: HttpContext) {
    if (error instanceof lucidErrors.E_ROW_NOT_FOUND) {
      return ctx.response.status(404).send({ message: 'Resource not found', code: 'E_NOT_FOUND' })
    }

    const status = (error as { status?: number }).status ?? 500
    if (status >= 500 && app.inProduction) {
      return ctx.response.status(500).send({ message: 'Internal server error', code: 'E_INTERNAL' })
    }

    return super.handle(error, ctx)
  }

  async report(error: unknown, ctx: HttpContext) {
    return super.report(error, ctx)
  }
}
