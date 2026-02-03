'use strict'

const Knex = require('knex')
const knexConfig = require('../../knexfile')

module.exports ={
  name: 'db',
  version: '1.0.0',
  register: async (server) => {
    const knex = Knex(knexConfig.development)
    server.app.db = knex
  }
}