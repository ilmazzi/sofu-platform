import type { ReactElement } from 'react'
import { Text } from '@mantine/core'
import { founding } from './theme'

type Props = {
  size?: 'sm' | 'md' | 'lg'
  color?: string
  className?: string
}

const sizes = {
  sm: { base: '1.75rem', sm: '2rem' },
  md: { base: '2.35rem', sm: '2.85rem' },
  lg: { base: '2.85rem', sm: '3.6rem' },
} as const

/** Wordmark Sofu con ingresso animato. */
export function FoundingBrand({ size = 'md', color = founding.cream, className }: Props): ReactElement {
  return (
    <Text
      component="span"
      fz={sizes[size]}
      fw={800}
      lh={1}
      c={color}
      className={['founding-brand', className].filter(Boolean).join(' ')}
      style={{
        fontFamily: founding.fontDisplay,
        letterSpacing: '-0.045em',
        display: 'inline-block',
      }}
    >
      Sofu
    </Text>
  )
}
