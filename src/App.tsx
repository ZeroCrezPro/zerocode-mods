import { Navigate, Route, Routes, useParams } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import Home from '@/pages/Home'
import Mods from '@/pages/Mods'
import ModDetail from '@/pages/ModDetail'
import NotFound from '@/pages/NotFound'
import { Belepes, ElfelejtettJelszo, FiokOldal, Regisztracio, UjJelszo } from '@/pages/Fiok'
import { FiokProvider } from '@/lib/fiok'

export function App() {
  return (
    <FiokProvider>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />

          <Route path="/modok" element={<Mods />} />
          <Route path="/modok/:slug" element={<ModDetail />} />

          {/* Fiók: belépés, regisztráció, jelszó-visszaállítás, saját fiók */}
          <Route path="/belepes" element={<Belepes />} />
          <Route path="/regisztracio" element={<Regisztracio />} />
          <Route path="/elfelejtett-jelszo" element={<ElfelejtettJelszo />} />
          <Route path="/uj-jelszo" element={<UjJelszo />} />
          <Route path="/fiok" element={<FiokOldal />} />

          {/* Angol nyelvű útvonalak átirányítása a magyar megfelelőre */}
          <Route path="/mods" element={<Navigate to="/modok" replace />} />
          <Route path="/mods/:slug" element={<AliasMod />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </FiokProvider>
  )
}

function AliasMod() {
  const { slug } = useParams()
  return <Navigate to={slug ? `/modok/${slug}` : '/modok'} replace />
}
