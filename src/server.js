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
    host: 'localhost'
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
    path: '/user/{username*}',
    options: {
      tags: ['api'],
      validate: {
        params: Joi.object({
          username: Joi.string().min(2)
        })
      },
      response: {
        schema: Joi.string()
      },
    },
    handler: (req, h) => { 
      if(req.params.username){
        return `Hello ${req.params.username}`
      } else {
        return `Hello Random user`
      }
    }
  })

  server.route(  {
    method: 'GET',
    path: '/health',
    options:{
      tags: ['api'],
      response: {
        schema: Joi.object({
          status: Joi.string()
        })
      }
    },
    handler: (req, h) => { 
      return {status:"ok"}
    }
  }
  )

  server.route({
    method: 'GET',
    path: '/todos',
    options: {
      description: 'GET ALL TODOS',
      tags: ['api'],
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
      const knex = req.server.app.db

      const rows = await knex('todos').select('*')
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
    path:'/todo',
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
  

  await server.start()
  console.log('Server running on %s', server.info.uri)
}


process.on('unhandledRejection', (err) => {
  console.log(err)
  process.exit(1)
})

init()