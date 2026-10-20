import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppDataProvider } from './app/AppDataContext'
import { ThemeProvider } from './app/ThemeContext'
import { AppRoutes } from './app/routes'
import { preloadDefaultBodies } from './pages/sportik/modelLoader'

export default function App() {
  useEffect(() => {
    preloadDefaultBodies()
  }, [])

  return (
    <ThemeProvider>
      <BrowserRouter>
        <AppDataProvider>
          <AppRoutes />
        </AppDataProvider>
      </BrowserRouter>
    </ThemeProvider>
  )
}
