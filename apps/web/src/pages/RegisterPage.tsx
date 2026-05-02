import { useState, type FormEvent, type ReactElement } from 'react'
import {
  Alert,
  Anchor,
  Button,
  Card,
  Checkbox,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core'
import { Link, useNavigate } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { useAuth } from '../context/AuthContext'
import { apiFetch } from '../lib/api/client'

type UserWrapped = { data: components['schemas']['User'] }

export default function RegisterPage(): ReactElement {
  const navigate = useNavigate()
  const { refresh } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [asCreator, setAsCreator] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function onSubmit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setError(null)
    setPending(true)
    try {
      const res = await apiFetch('/api/v1/identity/register', {
        method: 'POST',
        json: {
          name,
          email,
          password,
          password_confirmation: passwordConfirmation,
          ...(asCreator ? { role: 'creator' as const } : {}),
        },
      })
      const raw = await res.text()
      let body: unknown = null
      try {
        body = raw === '' ? null : JSON.parse(raw)
      } catch {
        body = null
      }
      if (!res.ok) {
        if (res.status === 422 && body && typeof body === 'object' && 'errors' in body) {
          const errors = (body as { errors: Record<string, string[]> }).errors
          const first = Object.values(errors).flat()[0]
          setError(first ?? 'Dati non validi.')
        } else if (res.status === 419) {
          setError('Sessione o CSRF scaduti: aggiorna la pagina e riprova.')
        } else if (body === null && raw.length > 0) {
          setError(`Registrazione non riuscita (${res.status}). Risposta non valida dal server.`)
        } else {
          setError(`Registrazione non riuscita (${res.status}).`)
        }
        return
      }
      const json = body as UserWrapped
      if (!json?.data) {
        setError('Risposta imprevista dal server.')
        return
      }
      await refresh()
      navigate('/campaigns', { replace: true })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Richiesta non riuscita.'
      setError(
        message === 'Failed to fetch'
          ? 'Impossibile contattare l’API (verifica che il backend sia avviato, es. porta 8000).'
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
              Crea un account
            </Title>
            <Text size="sm" c="dimmed" lh={1.6}>
              Registrati come sostenitore o, se vuoi pubblicare campagne, attiva l’opzione creator.
            </Text>
          </div>

          <form onSubmit={(e) => void onSubmit(e)}>
            <Stack gap="md">
              <TextInput
                label="Nome"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                required
                radius="md"
              />
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
                autoComplete="new-password"
                required
                radius="md"
              />
              <PasswordInput
                label="Conferma password"
                value={passwordConfirmation}
                onChange={(e) => setPasswordConfirmation(e.target.value)}
                autoComplete="new-password"
                required
                radius="md"
              />
              <Checkbox
                label="Voglio creare campagne (account creator)"
                checked={asCreator}
                onChange={(e) => setAsCreator(e.currentTarget.checked)}
              />
              {error ? (
                <Alert color="red" variant="light">
                  {error}
                </Alert>
              ) : null}
              <Button type="submit" loading={pending} color="teal" fullWidth size="md" radius="md">
                Registrati
              </Button>
            </Stack>
          </form>

          <Text size="sm" c="dimmed" ta="center">
            Hai già un account?{' '}
            <Anchor component={Link} to="/login" fw={600}>
              Accedi
            </Anchor>
          </Text>
        </Stack>
      </Card>
    </Stack>
  )
}
