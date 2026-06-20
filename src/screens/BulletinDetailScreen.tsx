import { useParams } from 'react-router-dom'
import PublicationDetail from '@/components/PublicationDetail'
import { useResource } from '@/hooks/useResource'
import { getBulletin } from '@/lib/endpoints'

export default function BulletinDetailScreen() {
  const { id } = useParams<{ id: string }>()
  const bulletinId = Number(id)
  const state = useResource(() => getBulletin(bulletinId), [bulletinId])
  return <PublicationDetail title="Bulletin" state={state} />
}
