import type { ReactElement, ReactNode } from 'react'
import { Box } from '@mantine/core'
import { founding, foundingPageBg } from './theme'

type Props = {
  children: ReactNode
  /** Larghezza colonna contenuto (landing più ampia). */
  maxWidth?: number
}

/** Shell condiviso: sfondo gradient + rotaie come in landing. */
export function FoundingShell({ children, maxWidth = 720 }: Props): ReactElement {
  return (
    <Box component="main" style={{ ...foundingPageBg, minHeight: '100dvh' }}>
      <Box
        maw={maxWidth}
        mx="auto"
        px={{ base: 'md', sm: 'xl' }}
        py={{ base: 'xl', sm: '2.75rem' }}
        pos="relative"
      >
        <AccompanimentRails />
        <Box pos="relative" style={{ zIndex: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  )
}

function AccompanimentRails(): ReactElement {
  const sw = 1.75
  const common = {
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    vectorEffect: 'non-scaling-stroke' as const,
  }

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'visible',
        opacity: 0.95,
      }}
    >
      <path
        {...common}
        d="M 97.2 1.2 V 21.5 Q 97.2 23.2 95.5 23.2 H 4.2 Q 2.2 23.2 2.2 25.2 V 97"
        stroke={founding.red}
        strokeWidth={sw}
      />
      <path
        {...common}
        d="M 95.4 1.2 V 20.6 Q 95.4 22.4 93.6 22.4 H 5.6 Q 3.8 22.4 3.8 24.2 V 72"
        stroke={founding.orange}
        strokeWidth={sw}
      />
      <path
        {...common}
        d="M 93.6 1.2 V 19.7 Q 93.6 21.5 91.8 21.5 H 7 Q 5.4 21.5 5.4 23.2 V 42"
        stroke={founding.mustard}
        strokeWidth={sw}
      />
    </svg>
  )
}
