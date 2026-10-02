import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import About from './pages/About'
import Contact from './pages/Contact'
import Departments from './pages/Departments'
import DepartmentDetail from './pages/DepartmentDetail'
import Academics from './pages/Academics'
import AcademicDetail from './pages/AcademicDetail'
import CourseDetail from './pages/CourseDetail'
import Faculty from './pages/Faculty'
import FacultyStream from './pages/FacultyStream'
import FacultyDetail from './pages/FacultyDetail'
import Excellence from './pages/Excellence'
import ExcellenceDomainPage from './pages/ExcellenceDomain'
import DynamicPage from './pages/DynamicPage'
import NotFound from './pages/NotFound'
import { RequireAuth } from './admin/auth'
import AdminLayout from './admin/AdminLayout'
import LoginPage from './admin/LoginPage'
import Dashboard from './admin/Dashboard'
import PagesManager from './admin/PagesManager'
import PageEditor from './admin/PageEditor'
import AboutPage from './admin/AboutPage'
import DepartmentsManager from './admin/DepartmentsManager'
import DepartmentEditor from './admin/DepartmentEditor'
import DegreeLevelsManager from './admin/DegreeLevelsManager'
import DegreeLevelEditor from './admin/DegreeLevelEditor'
import CoursesManager from './admin/CoursesManager'
import CourseEditor from './admin/CourseEditor'
import FacultyManager from './admin/FacultyManager'
import FacultyEditor from './admin/FacultyEditor'
import ExcellenceManager from './admin/ExcellenceManager'
import ExcellenceEditor from './admin/ExcellenceEditor'
import { ExcellenceDomainEditor, ExcellenceDomainsManager } from './admin/ExcellenceDomains'
import MediaManager from './admin/MediaManager'
import ContactEditor from './admin/ContactEditor'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/about" element={<About />} />
      <Route path="/contact" element={<Contact />} />
      <Route path="/departments" element={<Departments />} />
      <Route path="/departments/:slug" element={<DepartmentDetail />} />
      <Route path="/streams/:slug" element={<DepartmentDetail />} />
      <Route path="/academics" element={<Academics />} />
      <Route path="/academics/streams/:slug" element={<AcademicDetail />} />
      <Route path="/academics/courses/:id" element={<CourseDetail />} />
      <Route path="/faculty" element={<Faculty />} />
      <Route path="/faculty/streams/:slug" element={<FacultyStream />} />
      <Route path="/faculty/:id" element={<FacultyDetail />} />
      <Route path="/excellence" element={<Excellence />} />
      <Route path="/excellence/domains/:slug" element={<ExcellenceDomainPage />} />
      <Route path="/admin/login" element={<LoginPage />} />
      <Route path="/admin" element={<RequireAuth />}>
        <Route element={<AdminLayout />}>
          <Route index element={<Dashboard />} />
          <Route path="pages" element={<PagesManager />} />
          <Route path="pages/new" element={<PageEditor />} />
          <Route path="pages/:id" element={<PageEditor />} />
          <Route path="about" element={<AboutPage />} />
          <Route path="departments" element={<DepartmentsManager />} />
          <Route path="departments/new" element={<DepartmentEditor />} />
          <Route path="departments/:id" element={<DepartmentEditor />} />
          <Route path="academics" element={<Navigate to="degree-levels" replace />} />
          <Route path="academics/degree-levels" element={<DegreeLevelsManager />} />
          <Route path="academics/degree-levels/new" element={<DegreeLevelEditor />} />
          <Route path="academics/degree-levels/:id" element={<DegreeLevelEditor />} />
          <Route path="academics/courses" element={<CoursesManager />} />
          <Route path="academics/courses/new" element={<CourseEditor />} />
          <Route path="academics/courses/:id" element={<CourseEditor />} />
          <Route path="faculty" element={<FacultyManager />} />
          <Route path="faculty/new" element={<FacultyEditor />} />
          <Route path="faculty/:id" element={<FacultyEditor />} />
          <Route path="excellence" element={<ExcellenceManager />} />
          <Route path="excellence/new" element={<ExcellenceEditor />} />
          <Route path="excellence/domains" element={<ExcellenceDomainsManager />} />
          <Route path="excellence/domains/new" element={<ExcellenceDomainEditor />} />
          <Route path="excellence/domains/:id" element={<ExcellenceDomainEditor />} />
          <Route path="excellence/:id" element={<ExcellenceEditor />} />
          <Route path="media" element={<MediaManager />} />
          <Route path="contact" element={<ContactEditor />} />
        </Route>
      </Route>
      <Route path="/:slug" element={<DynamicPage />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  )
}
