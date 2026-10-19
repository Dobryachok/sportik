import { BrowserRouter } from 'react-router-dom'
import { AppDataProvider } from './app/AppDataContext'
import { AppRoutes } from './app/routes'

export default function App() {
  return (
    <BrowserRouter>
      <AppDataProvider>
        <AppRoutes />
      </AppDataProvider>
    </BrowserRouter>
  )
}
