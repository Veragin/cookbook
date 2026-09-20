import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from './AppShell'
import { RecipeListPage } from '../features/recipes/RecipeListPage'
import { RecipeViewPage } from '../features/recipes/RecipeViewPage'
import { RecipeFormPage } from '../features/recipes/RecipeFormPage'
import { SuggestPage } from '../features/suggest/SuggestPage'

export function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<Navigate to="/recipes" replace />} />
        <Route path="/recipes" element={<RecipeListPage />} />
        <Route path="/recipes/folder/:folderId" element={<RecipeListPage />} />
        <Route path="/recipes/new" element={<RecipeFormPage mode="create" />} />
        <Route path="/recipes/:id" element={<RecipeViewPage />} />
        <Route path="/recipes/:id/edit" element={<RecipeFormPage mode="edit" />} />
        <Route path="/suggest" element={<SuggestPage />} />
        <Route path="*" element={<Navigate to="/recipes" replace />} />
      </Routes>
    </AppShell>
  )
}
