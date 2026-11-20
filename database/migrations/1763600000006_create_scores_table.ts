import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'scores'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table
        .integer('user_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('users')
        .onDelete('CASCADE')
      table
        .integer('level_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('levels')
        .onDelete('RESTRICT')
      /* UNIQUE: una partida sólo puede generar un puntaje (evita doble finalización) */
      table
        .integer('game_session_id')
        .unsigned()
        .notNullable()
        .unique()
        .references('id')
        .inTable('game_sessions')
        .onDelete('CASCADE')
      table.integer('points').unsigned().notNullable()
      table.integer('duration_seconds').unsigned().notNullable()
      table.integer('mistakes').unsigned().notNullable().defaultTo(0)
      table.integer('hints_used').unsigned().notNullable().defaultTo(0)
      table.enum('difficulty', ['easy', 'medium', 'hard']).notNullable()
      table.timestamp('created_at').notNullable()

      table.index(['user_id', 'level_id'])
      table.index(['points'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
