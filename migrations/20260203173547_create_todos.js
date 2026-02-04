/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('todos', (table) => {
    table.uuid("id").primary();
    table.enu('state', ['COMPLETE', 'INCOMPLETE']).notNullable().defaultTo("INCOMPLETE");
    table.string("description").notNullable();
    table.dateTime("createdAt").notNullable().defaultTo(knex.fn.now());
    table.dateTime("completedAt").nullable();
  })
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('todos')
};
