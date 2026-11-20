import env from '#start/env'
import app from '@adonisjs/core/services/app'
import { defineConfig } from '@adonisjs/cors'

/*
|--------------------------------------------------------------------------
| CORS para Flutter Web
|--------------------------------------------------------------------------
| Flutter Web (flutter run -d chrome) se sirve en http://localhost:<puerto aleatorio>.
| En desarrollo se permite cualquier puerto de localhost / 127.0.0.1.
| En producción sólo los orígenes listados en CORS_ORIGINS.
*/
const allowedOrigins = (env.get('CORS_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

const localhostPattern = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/

const corsConfig = defineConfig({
  enabled: true,
  origin: (requestOrigin) => {
    if (allowedOrigins.includes(requestOrigin)) return true
    return !app.inProduction && localhostPattern.test(requestOrigin)
  },
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
  headers: true,
  exposeHeaders: [],
  credentials: true,
  maxAge: 90,
})

export default corsConfig
