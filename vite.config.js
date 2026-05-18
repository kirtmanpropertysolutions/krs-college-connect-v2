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
    build: {
      // Modern target — every browser supporting React 19 supports es2020.
      // Smaller, faster output than the default (which still emits some
      // legacy-friendly polyfill scaffolding).
      target: 'es2020',
      sourcemap: false,
      // Split a few heavy third-party libraries out of the entry chunk so
      // the initial JS download is smaller AND the vendor code can be
      // cached independently of our app code across deploys. We only
      // split things that:
      //   - are ≥ ~50 KB on their own
      //   - get loaded on the first dashboard view (so they can't be
      //     deferred via React.lazy)
      //   - rarely change (so a vendor-chunk cache hit is likely after
      //     an app-code deploy)
      // Don't over-split — every extra chunk is another HTTP request on
      // first load.
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined
            // Supabase JS client (gotrue + postgrest + realtime + storage)
            if (id.includes('@supabase/')) return 'vendor-supabase'
            // React + ReactDOM + React Router — the framework itself
            if (
              id.includes('/react/') ||
              id.includes('/react-dom/') ||
              id.includes('/react-router/') ||
              id.includes('/react-router-dom/') ||
              id.includes('/scheduler/')
            ) {
              return 'vendor-react'
            }
            // @dnd-kit — only loaded by the MySchools kanban; treated as a
            // shared vendor chunk because @dnd-kit/core also imports
            // sortable + utilities so they should land together.
            // Intentionally do NOT manualChunk @dnd-kit — it's only used by
            // the MySchools kanban which is lazy-loaded. Forcing it into a
            // shared vendor chunk would add it to <link rel=modulepreload>
            // on every page. Letting Rollup default-bundle it into the
            // MySchools chunk means it only ships when an athlete opens
            // the pipeline page.
            return undefined
          },
        },
      },
    },
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
