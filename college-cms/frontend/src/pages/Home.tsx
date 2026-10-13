import CmsSection from './CmsSection'
import Reveal from '../components/Reveal'
import ProgramsExplorer from '../components/ProgramsExplorer'
import DepartmentCarousel from '../components/DepartmentCarousel'
import { AboutLinks, ApplyBand, ExcellenceHighlights, FacultyHighlights } from '../components/HomeHighlights'

export default function Home() {
  return <CmsSection slug="home" hero={{ eyebrow: 'Welcome', ctas: [
    { to: '/departments', label: 'Explore departments', variant: 'primary' },
    { to: '/faculty', label: 'Meet the faculty', variant: 'secondary' },
  ] }}>
    <Reveal><AboutLinks /></Reveal>
    <Reveal><ProgramsExplorer /></Reveal>
    <Reveal><DepartmentCarousel /></Reveal>
    <Reveal><FacultyHighlights /></Reveal>
    <Reveal><ExcellenceHighlights /></Reveal>
    <Reveal><ApplyBand /></Reveal>
  </CmsSection>
}
