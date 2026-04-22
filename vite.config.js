import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, pathToFileURL } from 'url'
import { dirname, join } from 'path'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env vars from .env.local
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      {
        name: 'api-routes',
        configureServer(server) {
          server.middlewares.use('/api', async (req, res, next) => {
            try {
              // Parse the API route path
              const apiPath = req.url.replace(/^\//,'') // Remove leading slash
              const filePath = join(__dirname, 'api', `${apiPath}.js`)

              // Check if the API route file exists
              if (!fs.existsSync(filePath)) {
                res.statusCode = 404
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: 'API route not found' }))
                return
              }

              // Parse request body for POST requests
              if (req.method === 'POST') {
                let body = ''
                req.on('data', chunk => {
                  body += chunk.toString()
                })
                req.on('end', async () => {
                  try {
                    req.body = JSON.parse(body)
                  } catch {
                    req.body = {}
                  }
                  await handleApiRoute()
                })
              } else {
                await handleApiRoute()
              }

              async function handleApiRoute() {
                try {
                  // Ensure environment variables are available to the handler
                  Object.assign(process.env, env)

                  // Create Vercel-style response adapter
                  const vercelRes = {
                    status(code) {
                      res.statusCode = code
                      return this
                    },
                    json(data) {
                      res.setHeader('Content-Type', 'application/json')
                      res.end(JSON.stringify(data))
                      return this
                    },
                    send(data) {
                      res.end(data)
                      return this
                    }
                  }

                  // Import the handler (with cache busting for dev)
                  const fileUrl = pathToFileURL(filePath) + '?t=' + Date.now()
                  const module = await import(fileUrl)
                  const handler = module.default

                  if (typeof handler !== 'function') {
                    res.statusCode = 500
                    res.setHeader('Content-Type', 'application/json')
                    res.end(JSON.stringify({ error: 'Invalid API handler' }))
                    return
                  }

                  // Call the Vercel-style handler with adapted response
                  await handler(req, vercelRes)
                } catch (error) {
                  console.error('API handler error:', error)
                  res.statusCode = 500
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({
                    error: 'Internal server error',
                    details: error.message
                  }))
                }
              }
            } catch (error) {
              console.error('API middleware error:', error)
              next(error)
            }
          })
        }
      }
    ],
  }
})
