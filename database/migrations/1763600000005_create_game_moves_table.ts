import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'game_moves'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
      table
        .integer('game_session_id')
        .unsigned()
        .notNullable()
        .references('id')
        .inTable('game_sessions')
        .onDelete('CASCADE')
      table.integer('sequence').unsigned().notNullable()
      table.tinyint('cell_index').unsigned().nullable()
      table.enum('move_type', ['add', 'undo', 'invalid', 'restart']).notNullable()
      table.integer('elapsed_ms').unsigned().nullable()
      table.timestamp('created_at').notNullable()

      table.unique(['game_session_id', 'sequence'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
