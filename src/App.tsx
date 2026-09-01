import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import Home from '@/pages/Home'
import Mods from '@/pages/Mods'
import ModDetail from '@/pages/ModDetail'
import Latest from '@/pages/Latest'
import NotFound from '@/pages/NotFound'
import { About, Contact, Legal, Privacy } from '@/pages/Static'

export function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />

        <Route path="/modok" element={<Mods />} />
        <Route path="/modok/:slug" element={<ModDetail />} />
        <Route path="/legujabb" element={<Latest />} />

        <Route path="/nevjegy" element={<About />} />
        <Route path="/kapcsolat" element={<Contact />} />
        <Route path="/jogi-informaciok" element={<Legal />} />
        <Route path="/adatvedelem" element={<Privacy />} />

        {/* Angol nyelvű útvonalak átirányítása a magyar megfelelőre */}
        <Route path="/mods" element={<Navigate to="/modok" replace />} />
        <Route path="/mods/:slug" element={<AliasMod />} />
        <Route path="/latest" element={<Navigate to="/legujabb" replace />} />
        <Route path="/about" element={<Navigate to="/nevjegy" replace />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

function AliasMod() {
  const { slug } = useParams()
  return <Navigate to={slug ? `/modok/${slug}` : '/modok'} replace />
}
