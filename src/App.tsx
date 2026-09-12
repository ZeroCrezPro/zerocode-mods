import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import Home from '@/pages/Home'
import Mods from '@/pages/Mods'
import ModDetail from '@/pages/ModDetail'
import NotFound from '@/pages/NotFound'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />

        <Route path="/modok" element={<Mods />} />
        <Route path="/modok/:slug" element={<ModDetail />} />

        {/* Angol nyelvű útvonalak átirányítása a magyar megfelelőre */}
        <Route path="/mods" element={<Navigate to="/modok" replace />} />
        <Route path="/mods/:slug" element={<AliasMod />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function AliasMod() {
  const { slug } = useParams()
  return <Navigate to={slug ? `/modok/${slug}` : '/modok'} replace />
}
