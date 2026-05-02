import { useState, type ReactElement } from 'react'
import { Box, Image } from '@mantine/core'
import { campaignCoverGradient, campaignCoverPhotoUrl } from '../lib/campaignVisual'

export function CampaignCoverImage({
  slug,
  title,
  height = 200,
}: {
  slug: string
  title: string
  height?: number
}): ReactElement {
  const [usePhoto, setUsePhoto] = useState(true)

  if (!usePhoto) {
    return <Box h={height} style={{ background: campaignCoverGradient(slug) }} aria-hidden />
  }

  return (
    <Image
      src={campaignCoverPhotoUrl(slug)}
      alt={title}
      h={height}
      fit="cover"
      onError={() => setUsePhoto(false)}
    />
  )
}
