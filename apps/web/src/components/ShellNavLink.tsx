import type { ReactElement } from 'react'
import { NavLink as RouterNavLink, useMatch } from 'react-router-dom'
import { Text } from '@mantine/core'

export function ShellNavLink({
  to,
  label,
  end = false,
  active: activeOverride,
  tone = 'default',
}: {
  to: string
  label: string
  end?: boolean
  /** Se impostato, sostituisce il match automatico (es. /campagne vs /campagne/new). */
  active?: boolean
  /** `onTeal` per header scuro della landing. */
  tone?: 'default' | 'onTeal'
}): ReactElement {
  const match = useMatch({ path: to, end })
  const active = activeOverride !== undefined ? activeOverride : !!match
  const onTeal = tone === 'onTeal'

  return (
    <RouterNavLink to={to} style={{ textDecoration: 'none' }}>
      <Text
        size="sm"
        fw={active ? 600 : 500}
        c={
          onTeal
            ? active
              ? '#f7f1e6'
              : 'rgba(247,241,230,0.72)'
            : active
              ? undefined
              : 'dimmed'
        }
        style={{ padding: '4px 8px', borderRadius: 8 }}
      >
        {label}
      </Text>
    </RouterNavLink>
  )
}
