import { useEffect, useState, type ReactElement } from 'react'
import { Badge, Box, Button, Group, Paper, Select, Skeleton, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api/client'

type User = {
  id: number
  name: string
  email: string
  role: string
  email_verified_at: string | null
  created_at: string
}

type Paginated = { data: User[] }

function roleColor(role: string): string {
  switch (role) {
    case 'admin':
      return 'red'
    case 'operator':
      return 'orange'
    case 'creator':
      return 'blue'
    default:
      return 'gray'
  }
}

function roleLabel(role: string): string {
  switch (role) {
    case 'admin':
      return 'Admin'
    case 'operator':
      return 'Operatore'
    case 'creator':
      return 'Creator'
    default:
      return 'Supporter'
  }
}

export default function BackofficeUsersPage(): ReactElement {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [editingUserId, setEditingUserId] = useState<number | null>(null)
  const [newRole, setNewRole] = useState<string>('')

  const loadUsers = async () => {
    try {
      const res = await apiFetch('/api/v1/backoffice/users')
      if (res.ok) {
        const json = (await res.json()) as Paginated
        setUsers(json.data)
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!currentUser?.role || !['operator', 'admin'].includes(currentUser.role)) return
    void loadUsers()
  }, [currentUser])

  const handleUpdateRole = async (userId: number) => {
    if (!newRole) return
    try {
      const res = await apiFetch(`/api/v1/backoffice/users/${userId}`, {
        method: 'PATCH',
        json: { role: newRole },
      })
      if (res.ok) {
        await loadUsers()
        setEditingUserId(null)
        setNewRole('')
      }
    } catch {
      // ignore
    }
  }

  if (!currentUser || !['operator', 'admin'].includes(currentUser.role)) {
    return (
      <Stack gap="md" py="md">
        <Title order={2}>Gestione Utenti</Title>
        <Text c="dimmed">Accesso riservato a operatori e amministratori.</Text>
      </Stack>
    )
  }

  const filtered = users?.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Stack gap="xl" py="lg">
      <Box>
        <Title order={2} fw={600} style={{ letterSpacing: '-0.03em' }}>
          Gestione Utenti
        </Title>
        <Text c="dimmed" size="sm" mt="xs">
          Visualizza e modifica i ruoli degli utenti
        </Text>
      </Box>

      <TextInput
        placeholder="Cerca per nome, email o ruolo..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        style={{ maxWidth: 400 }}
      />

      <Paper withBorder style={{ borderRadius: 0, overflow: 'hidden' }}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>ID</Table.Th>
              <Table.Th>Nome</Table.Th>
              <Table.Th>Email</Table.Th>
              <Table.Th>Ruolo</Table.Th>
              <Table.Th>Verificato</Table.Th>
              <Table.Th>Registrato</Table.Th>
              <Table.Th>Azioni</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <Table.Tr key={i}>
                  <Table.Td>
                    <Skeleton height={20} width={40} />
                  </Table.Td>
                  <Table.Td>
                    <Skeleton height={20} width="80%" />
                  </Table.Td>
                  <Table.Td>
                    <Skeleton height={20} width="90%" />
                  </Table.Td>
                  <Table.Td>
                    <Skeleton height={20} width={80} />
                  </Table.Td>
                  <Table.Td>
                    <Skeleton height={20} width={60} />
                  </Table.Td>
                  <Table.Td>
                    <Skeleton height={20} width="70%" />
                  </Table.Td>
                  <Table.Td>
                    <Skeleton height={28} width={80} />
                  </Table.Td>
                </Table.Tr>
              ))
            ) : filtered && filtered.length > 0 ? (
              filtered.map((u) => (
                <Table.Tr key={u.id}>
                  <Table.Td>
                    <Text size="sm" ff="monospace">
                      {u.id}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" fw={500}>
                      {u.name}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {u.email}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {editingUserId === u.id ? (
                      <Select
                        size="xs"
                        value={newRole}
                        onChange={(val) => setNewRole(val ?? '')}
                        data={[
                          { value: 'supporter', label: 'Supporter' },
                          { value: 'creator', label: 'Creator' },
                          { value: 'operator', label: 'Operatore' },
                          { value: 'admin', label: 'Admin' },
                        ]}
                        style={{ width: 140 }}
                      />
                    ) : (
                      <Badge variant="light" color={roleColor(u.role)} size="sm" tt="none">
                        {roleLabel(u.role)}
                      </Badge>
                    )}
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c={u.email_verified_at ? 'teal' : 'dimmed'}>
                      {u.email_verified_at ? '✓' : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      {new Date(u.created_at).toLocaleDateString('it-IT')}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    {editingUserId === u.id ? (
                      <Group gap="xs">
                        <Button size="xs" onClick={() => handleUpdateRole(u.id)}>
                          Salva
                        </Button>
                        <Button
                          size="xs"
                          variant="subtle"
                          color="gray"
                          onClick={() => {
                            setEditingUserId(null)
                            setNewRole('')
                          }}
                        >
                          Annulla
                        </Button>
                      </Group>
                    ) : (
                      <Button
                        size="xs"
                        variant="light"
                        onClick={() => {
                          setEditingUserId(u.id)
                          setNewRole(u.role)
                        }}
                        disabled={currentUser.role !== 'admin'}
                      >
                        Modifica
                      </Button>
                    )}
                  </Table.Td>
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={7}>
                  <Text ta="center" c="dimmed" py="xl">
                    Nessun utente trovato
                  </Text>
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </Paper>
    </Stack>
  )
}
