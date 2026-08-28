import { type ReactElement, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import SoFuLandingC from '../landing-c/SoFuLandingC'
import { apiFetch } from '../lib/api/client'

type Campaign = components['schemas']['Campaign']

export default function LandingPage(): ReactElement {
  const navigate = useNavigate()
  const [campaign, setCampaign] = useState<Campaign | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await apiFetch('/api/v1/founding/campaign')
        if (!res.ok || cancelled) return
        const json = (await res.json()) as { data: Campaign }
        if (!cancelled) setCampaign(json.data)
      } catch {
        /* landing resta leggibile anche senza API */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <SoFuLandingC
      campaign={campaign}
      onSostieni={() => navigate('/sostieni')}
      onAccediImpegno={() => navigate('/login?next=/sostieni/stato')}
    />
  )
}
