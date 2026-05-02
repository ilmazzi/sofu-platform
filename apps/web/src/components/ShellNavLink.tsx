import type { ReactElement } from 'react'
import { NavLink as RouterNavLink, useMatch } from 'react-router-dom'
import { Text } from '@mantine/core'

export function ShellNavLink({
  to,
  label,
  end = false,
  active: activeOverride,
}: {
  to: string
  label: string
  end?: boolean
  /** Se impostato, sostituisce il match automatico (es. /campagne vs /campagne/new). */
  active?: boolean
}): ReactElement {
  const match = useMatch({ path: to, end })
  const active = activeOverride !== undefined ? activeOverride : !!match

  return (
    <RouterNavLink to={to} style={{ textDecoration: 'none' }}>
      <Text
        size="sm"
        fw={active ? 600 : 500}
        c={active ? undefined : 'dimmed'}
        style={{ padding: '4px 8px', borderRadius: 8 }}
      >
        {label}
      </Text>
    </RouterNavLink>
  )
}
