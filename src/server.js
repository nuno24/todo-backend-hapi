'use strict'

const Hapi = require('@hapi/hapi')
const Joi = require('joi')
const Inert = require('@hapi/inert')
const Vision = require('@hapi/vision')
const HapiSwagger = require('hapi-swagger')
const DbPlugin = require('./plugins/db')

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

  server.route(  {
    method: 'GET',
    path: '/db',
    options: {
      tags: ['api']
    },
    handler: async (req, h) => {
      const res = await req.server.app.db.raw('select 1')
      return {ok: true}
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