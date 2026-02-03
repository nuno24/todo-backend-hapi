// Update with your config settings.

/**
 * @type { Object.<string, import("knex").Knex.Config> }
 */
require('dotenv').config()

module.exports = {
  development: {
    client: 'pg',
    connection: {
      host: 'localhost',
      port: 5432,
      user: 'postgres',
      password: process.env.DB_PASSWORD,
      database: 'todo_app'
    },
    migrations: {
      directory:'./migrations'
    }
  },

};
