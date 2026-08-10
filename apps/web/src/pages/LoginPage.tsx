import { useState, type FormEvent, type ReactElement } from 'react'
import { Alert, Anchor, Button, Card, PasswordInput, Stack, Text, TextInput, Title } from '@mantine/core'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api/client'

type UserWrapped = { data: components['schemas']['User'] }

export default function LoginPage(): ReactElement {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { refresh } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const res = await apiFetch('/api/v1/identity/login', {
        method: 'POST',
        json: { email, password },
      })
      const raw = await res.text()
      let body: unknown = null
      try {
        body = raw === '' ? null : JSON.parse(raw)
      } catch {
        body = null
      }
      if (!res.ok) {
        if (res.status === 419) {
          setError('Sessione o CSRF scaduti: aggiorna la pagina e riprova.')
          return
        }
        const msg =
          typeof body === 'object' && body !== null && 'message' in body
            ? String((body as { message: string }).message)
            : `Accesso non riuscito (${res.status}).`
        setError(msg)
        return
      }
      const json = body as UserWrapped
      if (!json?.data) {
        setError('Risposta imprevista dal server.')
        return
      }
      await refresh()
      const next = searchParams.get('next')
      navigate(next && next.startsWith('/') ? next : '/', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Richiesta non riuscita.'
      setError(
        message === 'Failed to fetch'
          ? 'Impossibile contattare l’API. In locale: Herd su sofu-platform.test, VITE_API_URL vuoto in apps/web/.env, apri http://localhost:5173; dopo modifiche a apps/api/.env esegui `php artisan config:clear` e riavvia `npm run dev`.'
          : message,
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <Stack align="center" py={{ base: 'lg', sm: 'xl' }}>
      <Card withBorder shadow="md" radius="lg" p={{ base: 'md', sm: 'xl' }} maw={440} w="100%">
        <Stack gap="lg">
          <div>
            <Title order={2} mb="xs" style={{ letterSpacing: '-0.03em' }}>
              Accedi
            </Title>
            <Text size="sm" c="dimmed" lh={1.6}>
              Usa l’email e la password del tuo account Sofu.
            </Text>
          </div>

          <form onSubmit={(e) => void onSubmit(e)}>
            <Stack gap="md">
              <TextInput
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
                radius="md"
              />
              <PasswordInput
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                radius="md"
              />
              {error ? (
                <Alert color="red" variant="light">
                  {error}
                </Alert>
              ) : null}
              <Button type="submit" loading={pending} color="teal" fullWidth size="md" radius="md">
                Entra
              </Button>
            </Stack>
          </form>

          <Text size="sm" c="dimmed" ta="center">
            Non hai un account?{' '}
            <Anchor component={Link} to="/register" fw={600}>
              Registrati
            </Anchor>
          </Text>
        </Stack>
      </Card>
    </Stack>
  )
}
