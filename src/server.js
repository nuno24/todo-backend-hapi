'use strict'

const Hapi = require('@hapi/hapi')
const Joi = require('joi')

const init = async () => {

  const server = Hapi.server({
    port: 3000,
    host: 'localhost'
  })

  server.route({
    method: 'GET',
    path: '/user/{username*}',
    options: {
      validate: {
        params: Joi.object({
          username: Joi.string().min(2)
        })}
    },
    handler: (req, h) => { 
      if(req.params.username){
        return `Hello ${req.params.username}`
      } else {
        return `Hello Random user`
      }
    }
  })

  server.route({
    method: 'GET',
    path: '/health',
    handler: (req, h) => { 
      return {status: 'ok'}
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