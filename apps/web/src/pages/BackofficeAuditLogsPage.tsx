import { useEffect, useState, type ReactElement } from 'react'
import { Badge, Box, Paper, Skeleton, Stack, Table, Text, TextInput, Title } from '@mantine/core'
import { IconSearch } from '@tabler/icons-react'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api/client'

type AuditLog = {
  id: number
  action: string
  actor_id: number | null
  actor_name: string | null
  target_type: string | null
  target_id: number | null
  metadata: Record<string, unknown> | null
  request_id: string
  created_at: string
}

type Paginated = { data: AuditLog[] }

export default function BackofficeAuditLogsPage(): ReactElement {
  const { user } = useAuth()
  const [logs, setLogs] = useState<AuditLog[] | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!user?.role || !['operator', 'admin'].includes(user.role)) return
    let cancelled = false
    void (async () => {
      try {
        const res = await apiFetch('/api/v1/backoffice/audit-logs')
        if (cancelled) return
        if (res.ok) {
          const json = (await res.json()) as Paginated
          setLogs(json.data)
        }
      } catch {
        // ignore
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [user])

  if (!user || !['operator', 'admin'].includes(user.role)) {
    return (
      <Stack gap="md" py="md">
        <Title order={2}>Audit Logs</Title>
        <Text c="dimmed">Accesso riservato a operatori e amministratori.</Text>
      </Stack>
    )
  }

  const filtered = logs?.filter(
    (log) =>
      log.action.toLowerCase().includes(search.toLowerCase()) ||
      log.actor_name?.toLowerCase().includes(search.toLowerCase()) ||
      log.target_type?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Stack gap="xl" py="lg">
      <Box>
        <Title order={2} fw={600} style={{ letterSpacing: '-0.03em' }}>
          Audit Logs
        </Title>
        <Text c="dimmed" size="sm" mt="xs">
          Registro completo delle azioni sulla piattaforma
        </Text>
      </Box>

      <TextInput
        placeholder="Cerca per azione, utente o target..."
        leftSection={<IconSearch size={16} />}
        value={search}
        onChange={(e) => setSearch(e.currentTarget.value)}
        style={{ maxWidth: 400 }}
      />

      <Paper withBorder style={{ borderRadius: 0, overflow: 'hidden' }}>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Azione</Table.Th>
              <Table.Th>Attore</Table.Th>
              <Table.Th>Target</Table.Th>
              <Table.Th>Request ID</Table.Th>
              <Table.Th>Data</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <Table.Tr key={i}>
                  <Table.Td>
                    <Skeleton height={20} width="80%" />
                  </Table.Td>
                  <Table.Td>
                    <Skeleton height={20} width="60%" />
                  </Table.Td>
                  <Table.Td>
                    <Skeleton height={20} width="70%" />
                  </Table.Td>
                  <Table.Td>
                    <Skeleton height={20} width="50%" />
                  </Table.Td>
                  <Table.Td>
                    <Skeleton height={20} width="90%" />
                  </Table.Td>
                </Table.Tr>
              ))
            ) : filtered && filtered.length > 0 ? (
              filtered.map((log) => (
                <Table.Tr key={log.id}>
                  <Table.Td>
                    <Badge variant="light" size="sm" tt="none">
                      {log.action}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm">{log.actor_name ?? `ID ${log.actor_id}`}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {log.target_type ? `${log.target_type}#${log.target_id}` : '—'}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" ff="monospace" c="dimmed">
                      {log.request_id.slice(0, 8)}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="xs" c="dimmed">
                      {new Date(log.created_at).toLocaleString('it-IT')}
                    </Text>
                  </Table.Td>
                </Table.Tr>
              ))
            ) : (
              <Table.Tr>
                <Table.Td colSpan={5}>
                  <Text ta="center" c="dimmed" py="xl">
                    Nessun log trovato
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
