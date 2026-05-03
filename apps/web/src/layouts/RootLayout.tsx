import { Anchor, AppShell, Button, Group, Menu, Text } from '@mantine/core'
import { IconChevronDown } from '@tabler/icons-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ShellNavLink } from '../components/ShellNavLink'
import { useAuth } from '../context/AuthContext'

export default function RootLayout(): React.ReactElement {
  const { user, loading, logout } = useAuth()
  const location = useLocation()
  const campaignsNavActive =
    location.pathname.startsWith('/campaigns') && location.pathname !== '/campaigns/new'
  const backofficeActive = location.pathname.startsWith('/backoffice')

  return (
    <AppShell header={{ height: 56 }} padding="md">
      <AppShell.Header px="md" style={{ display: 'flex', alignItems: 'center' }}>
        <Group justify="space-between" w="100%" wrap="wrap" gap="sm">
          <Anchor component={Link} to="/" fw={700} size="lg" c="inherit" underline="never">
            Sofu
          </Anchor>
          <Group gap="xs" wrap="wrap" align="center">
            <ShellNavLink to="/" label="Inizio" end />
            <ShellNavLink to="/campaigns" label="Campagne" active={campaignsNavActive} />
            {loading ? null : user ? (
              <>
                <ShellNavLink to="/me/reservations" label="I miei droplets" />
                {user.role === 'creator' || user.role === 'operator' || user.role === 'admin' ? (
                  <>
                    <ShellNavLink to="/me/campaigns" label="Le mie campagne" />
                    <ShellNavLink to="/campaigns/new" label="Nuova campagna" end />
                  </>
                ) : null}
                {user.role === 'operator' || user.role === 'admin' ? (
                  <Menu shadow="md" width={200}>
                    <Menu.Target>
                      <Button
                        variant={backofficeActive ? 'light' : 'subtle'}
                        size="compact-sm"
                        rightSection={<IconChevronDown size={14} />}
                      >
                        Backoffice
                      </Button>
                    </Menu.Target>
                    <Menu.Dropdown>
                      <Menu.Item component={Link} to="/backoffice">
                        Dashboard
                      </Menu.Item>
                      <Menu.Item component={Link} to="/backoffice/review">
                        Revisioni
                      </Menu.Item>
                      <Menu.Item component={Link} to="/backoffice/audit-logs">
                        Audit Logs
                      </Menu.Item>
                      <Menu.Item component={Link} to="/backoffice/users">
                        Utenti
                      </Menu.Item>
                    </Menu.Dropdown>
                  </Menu>
                ) : null}
                <Text size="xs" c="dimmed" maw={160} truncate="end" visibleFrom="sm">
                  {user.email}
                </Text>
                <Button variant="subtle" size="compact-sm" onClick={() => void logout()}>
                  Esci
                </Button>
              </>
            ) : (
              <>
                <ShellNavLink to="/login" label="Accedi" />
                <ShellNavLink to="/register" label="Registrati" />
              </>
            )}
          </Group>
        </Group>
      </AppShell.Header>
      <AppShell.Main maw={1180} mx="auto" w="100%">
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
