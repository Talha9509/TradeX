import express, { type Request, type Response, type NextFunction, type Errback } from 'express'
import cookieParser from 'cookie-parser'
import authRoutes from './routes/auth.Route'
import orderRoutes from './routes/order.Route'

declare global {
  namespace Express {
    export interface Request {
      userId?: number;
    }
  }
}

const app = express()

const PORT = 3001
app.use(express.json())
app.use(cookieParser())

app.use("/auth/v1", authRoutes)
app.use("/api/v1/order", orderRoutes)

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.log(err)
  return res.status(500).json({ meessage: 'Internal Server Error' })
});

app.listen( PORT, () => {
  console.log(`App running in port ${PORT}`)
})