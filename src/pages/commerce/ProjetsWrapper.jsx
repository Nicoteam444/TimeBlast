import { useState } from 'react'
import ProjetsPage from '../temps/ProjetsPage'
import ProjetDetailPage from '../temps/ProjetDetailPage'

export default function ProjetsWrapper() {
  const [selected, setSelected] = useState(null)
  if (selected) return <ProjetDetailPage projet={selected} onBack={() => setSelected(null)} />
  return <ProjetsPage onSelect={setSelected} />
}
