import express from 'express'
import cors from 'cors'
import { analyzeRouter } from './routes/analyze'
import { errorHandler } from './middleware/errorHandler'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/analyze', analyzeRouter)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`Repolens API running on http://localhost:${PORT}`)
})
