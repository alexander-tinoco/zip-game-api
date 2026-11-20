import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'levels'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.increments('id')
      table.string('name', 80).notNullable()
      table.enum('difficulty', ['easy', 'medium', 'hard']).notNullable().index()
      table.tinyint('size').unsigned().notNullable().defaultTo(6)
      table.json('checkpoints').notNullable() // [celda del 1, celda del 2, ...]
      table.json('solution').notNullable() // 36 celdas; nunca se envía al cliente
      table.tinyint('checkpoint_count').unsigned().notNullable()
      table.smallint('difficulty_score').unsigned().notNullable().defaultTo(0)
      table.boolean('is_generated').notNullable().defaultTo(false)
      table.timestamp('created_at').notNullable()
      table.timestamp('updated_at').nullable()
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
