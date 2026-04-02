import { BrowserRouter, Route, Routes } from 'react-router-dom'
import MainLayout from '@/components/layout/MainLayout'
import { appChildRoutes } from '@/app/navigation'

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          {appChildRoutes.map(({ path, element }) => (
            <Route key={path} path={path} element={element} />
          ))}
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
