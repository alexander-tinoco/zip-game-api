import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'game_sessions'

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
      table
        .enum('status', ['in_progress', 'completed', 'abandoned'])
        .notNullable()
        .defaultTo('in_progress')
      table.enum('difficulty', ['easy', 'medium', 'hard']).notNullable()
      table.dateTime('started_at').notNullable()
      table.dateTime('finished_at').nullable()
      table.integer('duration_seconds').unsigned().nullable()
      table.integer('mistakes').unsigned().notNullable().defaultTo(0)
      table.integer('hints_used').unsigned().notNullable().defaultTo(0)
      table.integer('failed_attempts').unsigned().notNullable().defaultTo(0)
      table.json('final_path').nullable()
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()

      table.index(['user_id', 'status'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
