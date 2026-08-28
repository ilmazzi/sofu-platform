import { Anchor, AppShell, Button, Group, Menu, Text } from '@mantine/core'
import { IconChevronDown } from '@tabler/icons-react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { ShellNavLink } from '../components/ShellNavLink'
import { useAuth } from '../context/AuthContext'

function canCreateCampaigns(role: string | undefined): boolean {
  return role === 'creator' || role === 'operator' || role === 'admin'
}

export default function RootLayout(): React.ReactElement {
  const { user, loading, logout } = useAuth()
  const location = useLocation()
  const campaignsNavActive =
    location.pathname.startsWith('/campaigns') && location.pathname !== '/campaigns/new'
  const backofficeActive = location.pathname.startsWith('/backoffice')
  const myCampaignsSectionActive =
    location.pathname.startsWith('/me/campaigns') || location.pathname.startsWith('/me/reservations')
  const isLanding =
    location.pathname === '/' ||
    location.pathname === '/welcome' ||
    location.pathname.startsWith('/sostieni')

  return (
    <AppShell header={isLanding ? undefined : { height: 56 }} padding={isLanding ? 0 : 'md'}>
      {isLanding ? null : (
        <AppShell.Header px="md" style={{ display: 'flex', alignItems: 'center' }}>
          <Group justify="space-between" w="100%" wrap="wrap" gap="sm">
            <Anchor component={Link} to="/" fw={700} size="lg" c="inherit" underline="never">
              Sofu
            </Anchor>
            <Group gap="xs" wrap="wrap" align="center">
              <ShellNavLink to="/campaigns" label="Campagne" active={campaignsNavActive} />
              {loading ? null : user ? (
                <>
                  {!canCreateCampaigns(user.role) ? (
                    <ShellNavLink to="/me/reservations" label="Le mie drop" end />
                  ) : (
                    <>
                      <Menu shadow="md" width={200}>
                        <Menu.Target>
                          <Button
                            variant={myCampaignsSectionActive ? 'light' : 'subtle'}
                            size="compact-sm"
                            rightSection={<IconChevronDown size={14} />}
                          >
                            Le mie campagne
                          </Button>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item component={Link} to="/me/campaigns">
                            Create
                          </Menu.Item>
                          <Menu.Item component={Link} to="/me/reservations">
                            Le mie drop
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                      <Button component={Link} to="/campaigns/new" color="teal" size="compact-sm">
                        Nuova campagna
                      </Button>
                    </>
                  )}
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
                        {user.role === 'admin' ? (
                          <Menu.Item component={Link} to="/backoffice/simulation">
                            Simulazione carico
                          </Menu.Item>
                        ) : null}
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
      )}
      <AppShell.Main
        maw={isLanding ? undefined : 1180}
        mx="auto"
        w="100%"
        p={isLanding ? 0 : undefined}
        style={
          isLanding
            ? {
                backgroundColor: 'oklch(95.5% 0.012 80)',
                minHeight: '100dvh',
              }
            : undefined
        }
      >
        <Outlet />
      </AppShell.Main>
    </AppShell>
  )
}
