import { BrowserRouter } from 'react-router-dom'
import { AppDataProvider } from './app/AppDataContext'
import { ThemeProvider } from './app/ThemeContext'
import { AppRoutes } from './app/routes'

export default function App() {
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
