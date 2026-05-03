import { useState, type ReactElement } from 'react'
import { Box, Image } from '@mantine/core'
import { campaignCoverGradient, campaignCoverPhotoUrl } from '../lib/campaignVisual'

export function CampaignCoverImage({
  slug,
  title,
  mediaUrls,
  height = 200,
}: {
  slug: string
  title: string
  /** First URL is used as hero/cover; falls back to stock visual by slug if missing or broken. */
  mediaUrls?: string[] | null
  height?: number
}): ReactElement {
  const primary = mediaUrls?.map((u) => u.trim()).find((u) => u.length > 0)
  const stockUrl = campaignCoverPhotoUrl(slug)
  const candidates = primary ? [primary, stockUrl] : [stockUrl]
  const [index, setIndex] = useState(0)

  if (index >= candidates.length) {
    return <Box h={height} style={{ background: campaignCoverGradient(slug) }} aria-hidden />
  }

  return (
    <Image
      src={candidates[index]}
      alt={title}
      h={height}
      fit="cover"
      onError={() => setIndex((i) => i + 1)}
    />
  )
}
