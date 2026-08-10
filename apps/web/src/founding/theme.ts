import type { CSSProperties } from 'react'
import './founding.css'

/** Palette e tipografia del flusso fondante (da sfondo.svg). */
export const founding = {
  teal: '#15607a',
  tealDeep: '#0c3d4f',
  mustard: '#c9a01a',
  orange: '#c6761d',
  red: '#c63a1d',
  cream: '#f7f1e6',
  ink: '#1a1208',
  fontDisplay: '"Bricolage Grotesque", "Figtree", system-ui, sans-serif',
  fontBody: '"Figtree", system-ui, sans-serif',
} as const

export const foundingPageBg: CSSProperties = {
  backgroundColor: founding.teal,
  backgroundImage: [
    'radial-gradient(ellipse 90% 55% at 12% -10%, rgba(247,241,230,0.16), transparent 55%)',
    'radial-gradient(ellipse 70% 45% at 100% 20%, rgba(201,160,26,0.2), transparent 50%)',
    'radial-gradient(ellipse 60% 40% at 50% 100%, rgba(198,58,29,0.14), transparent 55%)',
  ].join(', '),
  minHeight: '100dvh',
  fontFamily: founding.fontBody,
  overflowX: 'hidden',
}
