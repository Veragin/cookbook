import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import { App } from './app/App'
import { ThemeModeProvider } from './theme/ThemeModeProvider'
import { RecipesProvider } from './features/recipes/RecipesProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeModeProvider>
      <BrowserRouter>
        <RecipesProvider>
          <App />
        </RecipesProvider>
      </BrowserRouter>
    </ThemeModeProvider>
  </StrictMode>,
)
