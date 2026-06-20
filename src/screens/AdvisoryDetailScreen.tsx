import { useParams } from 'react-router-dom'
import PublicationDetail from '@/components/PublicationDetail'
import { useResource } from '@/hooks/useResource'
import { getAdvisory } from '@/lib/endpoints'

export default function AdvisoryDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const advisoryId = Number(id)
  const state = useResource(() => getAdvisory(advisoryId), [advisoryId])
  return <PublicationDetail title="Advisory" state={state} />
}
