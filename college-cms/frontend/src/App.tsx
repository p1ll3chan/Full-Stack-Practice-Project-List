import { BrowserRouter, Route, Routes } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Academics from './pages/Academics'
import Faculty from './pages/Faculty'
import DynamicPage from './pages/DynamicPage'
import Dashboard from './admin/Dashboard'
import PageEditor from './admin/PageEditor'
import CourseEditor from './admin/CourseEditor'

function AdminNewPage() {
  return <PageEditor />
}

function AdminNewCourse() {
  return <CourseEditor />
}

export default function App() {
  return (
    <BrowserRouter>
      <Header />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/academics" element={<Academics />} />
          <Route path="/faculty" element={<Faculty />} />
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/pages/new" element={<AdminNewPage />} />
          <Route path="/admin/courses/new" element={<AdminNewCourse />} />
          <Route path="/:slug" element={<DynamicPage />} />
        </Routes>
      </main>
      <Footer />
    </BrowserRouter>
  )
}
