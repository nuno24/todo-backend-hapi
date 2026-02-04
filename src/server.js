'use strict'

const Hapi = require('@hapi/hapi')
const Joi = require('joi')
const Inert = require('@hapi/inert')
const Vision = require('@hapi/vision')
const HapiSwagger = require('hapi-swagger')
const DbPlugin = require('./plugins/db')
const Knex = require('knex') 
const { v4: uuidv4 } = require('uuid')


const init = async () => {

  const server = Hapi.server({
    port: 3000,
    host: 'localhost',
    routes: {
      cors: {
        origin: ['http://localhost:3001'],
        additionalHeaders: ['Content-Type', 'Authorization'],
        credentials: false
      }
    }
  })

  await server.register([
    Inert,
    Vision,
    {
      plugin: HapiSwagger,
      options: {
        info: {
          title: 'API DOCS',
          version: '1.0.0',
        },
      documentationPath: '/docs'
      }
    },
    DbPlugin
  ])

  server.route({
    method: 'GET',
    path: '/todos',
    options: {
      description: 'GET ALL TODOS',
      tags: ['api'],
      validate: {
        query: Joi.object({
          filter: Joi.string().valid('ALL', 'COMPLETE', 'INCOMPLETE').insensitive().default('ALL'),
          orderBy: Joi.string().valid('DESCRIPTION', 'CREATED_AT', 'COMPLETED_AT').insensitive().default('CREATED_AT')
        })
      },
      response: {
        schema: Joi.array().items(Joi.object({
          id: Joi.string().uuid().required(),
          state: Joi.string().required(),
          description: Joi.string().min(1).required(),
          createdAt: Joi.date().iso().required(),
          completedAt: Joi.date().iso().allow(null)
        }))
      },
    },
    handler: async (req, h) => {
      const { filter, orderBy } = req.query
      const knex = req.server.app.db

      let query = knex('todos').select('*')
      if(filter !== 'ALL'){
        query = query.where({state: filter})
      }

      const order = orderBy === 'DESCRIPTION' ? 'description' : (orderBy === 'COMPLETED_AT' ? 'completedAt' : 'createdAt')
      
      const rows = await query.orderBy(order, 'asc')
      const todos = rows.map(row => ({
          id: row.id,
          state: row.state,
          description: row.description,
          createdAt: row.createdAt,
          completedAt: row.completedAt
      }))

      console.log(todos)

      return h.response(todos).code(200)
    }
  })

  server.route({
    method: 'POST',
    path:'/todos',
    options: {
      description: 'CREATE POST',
      tags: ['api'],
      validate: {
        payload: Joi.object({
          description: Joi.string().min(1).required()
        })
      },
      response: {
        schema: Joi.object({
          id: Joi.string().uuid().required(),
          state: Joi.string().required(),
          description: Joi.string().min(1).required(),
          createdAt: Joi.date().iso().required(),
          completedAt: Joi.date().iso().allow(null)
        })
      },
    },
    handler: async (req, h) => {
      const { description } = req.payload
      const knex = req.server.app.db

      const [row] = await knex('todos')
        .insert({
          id: uuidv4(),
          description,
          state: 'INCOMPLETE'
        })
        .returning('*')
        console.log(row);

        const response = {
          id: row.id,
          state: row.state,
          description: row.description,
          createdAt: row.createdAt,
          completedAt: row.completedAt
        }
        return h.response(response).code(201)
    }
  })

  server.route({
    method: 'PATCH',
    path:'/todo/{id}',
    options: {
      description: 'CREATE POST',
      tags: ['api'],
      validate: {
        params: Joi.object({
          id: Joi.string().uuid().required()
        }),
        payload: Joi.object({
          description: Joi.string().min(1).optional(),
          state: Joi.string().valid('COMPLETE', 'INCOMPLETE').optional()
        }).min(1)
      },
      response: {
        schema: Joi.object({
          id: Joi.string().uuid().required(),
          description: Joi.string().required(),
          state: Joi.string().valid('COMPLETE', 'INCOMPLETE').required(),
          createdAt: Joi.date().iso().required(),
          completedAt: Joi.date().iso().allow(null)
        })
      },
    },
    handler: async (req, h) => {
      const { id } = req.params
      const { description, state } = req.payload
      const knex = req.server.app.db

      const updateFields = {}

      if(description !== undefined){
        updateFields.description = description
      }

      if(state !== undefined){
        updateFields.state = state
        updateFields.completedAt = state === 'COMPLETE' ? knex.fn.now() : null
      }

      const [updated] = await knex('todos')
        .where({id: id})
        .update(updateFields)
        .returning('*')

      console.log(updated)

      if(!updated) {
        return h.response({message: 'Todo not found'}).code(404)
      }

      const response = {
          id: updated.id,
          state: updated.state,
          description: updated.description,
          createdAt: updated.createdAt,
          completedAt: updated.completedAt ?? null
        }
      return h.response(response).code(200)
    }
  })
  
  server.route({
    method: 'DELETE',
    path: '/todo/{id}',
    options: {
      description: 'DELETE TODO',
      tags: ['api'],
      validate: {
        params: Joi.object({
          id: Joi.string().uuid().required()
        })
      },
    },
    handler: async (req, h) => {
      const { id } = req.params
      const knex = req.server.app.db

      const rows = await knex('todos').where({id}).del().returning('*')
      
      if(rows.length === 0){
        return h.response({message: `No TODO was found for ID:${id}`}).code(404)
      }

      return h.response(rows).code(200)
    }
  })
  

  await server.start()
  console.log('Server running on %s', server.info.uri)
}


process.on('unhandledRejection', (err) => {
  console.log(err)
  process.exit(1)
})

init()