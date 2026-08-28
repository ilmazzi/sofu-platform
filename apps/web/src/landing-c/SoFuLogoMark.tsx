import type { ReactElement } from 'react'

type Props = {
  height?: number
  className?: string
  color?: string
}

/** Simbolo (due figure) — solo per spazi stretti. */
function LogoSymbol(): ReactElement {
  return (
    <g transform="matrix(1.8299624,0,0,1.8299624,30.894409,23.955496)">
      <path d="m 56.174137,27.820797 c 0,0 1.748142,-14.26115 8.326673,-15.733271 0,0 -4.554368,-0.87407 -7.590613,6.992566 0,0 1.058086,-9.292751 -7.912639,-13.111059 0,0 4.508364,3.312267 5.888476,7.498606 1.380111,4.186338 0.184013,4.232339 1.288103,14.353158 z" />
      <path d="m 44.81122,4.542917 c 1.840148,6.026486 7.82063,6.992564 7.82063,6.992564 0,0 -8.878716,-0.368028 -9.108735,-7.820631 0,0 10.488848,-6.210501 12.190985,6.946562 0,0 -1.932154,-9.79879305 -10.90288,-6.118495 z" />
      <path d="m 68.733151,9.971354 c -7.544609,-1.97816 -9.384757,2.484202 -9.384757,2.484202 0,0 2.116171,-7.222583 10.626859,-3.082248 0,0 0.598048,6.762546 -8.41868,6.164498 0,0 7.498602,-1.656138 7.176578,-5.566452 z" />
    </g>
  )
}

/** Logo completo: simbolo + scritta SOFU (Bebas Neue). */
export function SoFuLogoFull({
  height = 52,
  className,
  color = 'currentColor',
}: Props): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 105 118"
      aria-label="SoFu"
      role="img"
      className={className}
      height={height}
      style={{ width: 'auto', display: 'block', color }}
    >
      <g transform="translate(-55.902906,-27.831336)" fill="currentColor">
        <LogoSymbol />
        <text
          x="54.598976"
          y="111.15381"
          fontFamily="'Bebas Neue', sans-serif"
          fontSize="59.2712"
          fill="currentColor"
        >
          SOFU
        </text>
      </g>
    </svg>
  )
}

/** Solo simbolo (legacy / spazi piccoli). */
export function SoFuLogoMark({
  height = 20,
  className,
  color = 'var(--teal-950)',
}: Props): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="18 0 88 72"
      aria-hidden
      className={className}
      height={height}
      style={{ width: 'auto', display: 'block', color }}
    >
      <LogoSymbol />
    </svg>
  )
}

/** Watermark hero/CTA — logo completo, grande e tenue. */
export function SoFuLogoWatermark({ className }: { className?: string }): ReactElement {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 105 118"
      aria-hidden
      className={className}
    >
      <g transform="translate(-55.902906,-27.831336)" fill="currentColor">
        <LogoSymbol />
        <text
          x="54.598976"
          y="111.15381"
          fontFamily="'Bebas Neue', sans-serif"
          fontSize="59.2712"
          fill="currentColor"
        >
          SOFU
        </text>
      </g>
    </svg>
  )
}
