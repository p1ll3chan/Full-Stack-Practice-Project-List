import classroom from '../assets/marygiri-classroom.png'
import auditorium from '../assets/marygiri-auditorium.png'
import lab from '../assets/marygiri-computer-lab.png'
const photos: Record<string, { src: string; alt: string }> = {
  academics: { src: classroom, alt: 'Students writing in a Marygiri classroom' },
  faculty: { src: auditorium, alt: 'A gathering in the Marygiri auditorium' },
  excellence: { src: lab, alt: 'Students working in the Marygiri computer lab' },
}
export default function PagePhoto({ section }: { section: string }) {
  const photo = photos[section]
  return photo ? <img className="page-photo" src={photo.src} alt={photo.alt} width="780" height="520" fetchPriority="high" /> : null
}
