import type { ReactElement, ReactNode } from 'react'
import { Box, Button, Group, Stack, Text, Title } from '@mantine/core'
import { Link } from 'react-router-dom'

/** Immagine hero (Unsplash, libera per uso — si consiglia attribuzione in about/credits). */
const HERO_IMAGE =
  'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&w=2400&q=88'

export function HomeHero({
  authLoading,
  user,
}: {
  authLoading: boolean
  user: { name: string } | null
}): ReactElement {
  return (
    <Box
      pos="relative"
      style={{
        overflow: 'hidden',
        borderRadius: 'var(--mantine-radius-lg)',
        minHeight: 'min(52vh, 520px)',
      }}
    >
      <Box
        pos="absolute"
        inset={0}
        style={{
          backgroundImage: `url(${HERO_IMAGE})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center 35%',
        }}
      />
      <Box
        pos="absolute"
        inset={0}
        style={{
          background:
            'linear-gradient(180deg, rgba(12,10,18,0.25) 0%, rgba(12,10,18,0.55) 45%, rgba(12,10,18,0.88) 100%)',
        }}
      />
      <Box pos="relative" py={{ base: '2.5rem', sm: '3.5rem' }} px={{ base: 'md', sm: '2.5rem' }} pb={{ base: '2.75rem', sm: '3.75rem' }}>
        <Stack gap="lg" maw={760}>
          <Stack gap="md">
            <Text size="sm" fw={700} tt="uppercase" c="rgba(255,255,255,0.75)" style={{ letterSpacing: '0.14em' }}>
              Sofu · crowdfunding partecipativo
            </Text>
            <Title
              order={1}
              c="#fff"
              fz={{ base: '2rem', sm: '2.75rem', md: '3.15rem' }}
              fw={800}
              lh={1.12}
              style={{ letterSpacing: '-0.038em', textWrap: 'balance' }}
            >
              Più sostenitori, più il prezzo scende. Scegli il momento giusto per entrare.
            </Title>
            <Text size="lg" c="rgba(255,255,255,0.9)" maw={620} lh={1.65} fz={{ base: 'md', sm: 'lg' }}>
              Ogni campagna ha un obiettivo economico ripartito tra le persone: il contributo si adatta al numero di
              partecipanti. Sotto trovi prezzo attuale, percorso verso il minimo e quanto puoi risparmiare rispetto al
              picco iniziale.
            </Text>
          </Stack>
          {!authLoading && !user ? (
            <Group gap="sm" wrap="wrap">
              <Button component={Link} to="/register" size="md" color="orange" variant="filled" radius="md">
                Inizia da qui
              </Button>
              <Button
                component={Link}
                to="/login"
                size="md"
                variant="outline"
                radius="md"
                styles={{
                  root: {
                    borderColor: 'rgba(255,255,255,0.65)',
                    color: '#fff',
                    background: 'rgba(255,255,255,0.06)',
                  },
                }}
              >
                Ho già un account
              </Button>
            </Group>
          ) : null}
          {!authLoading && user ? (
            <Text size="sm" c="rgba(255,255,255,0.88)" lh={1.6}>
              Bentornato, <strong>{user.name}</strong>. Le tue quote sono in{' '}
              <HeroLink to="/me/reservations">Le mie prenotazioni</HeroLink>.
            </Text>
          ) : null}
          <Text size="xs" c="rgba(255,255,255,0.45)" mt="xs">
            Foto: team — Unsplash
          </Text>
        </Stack>
      </Box>
    </Box>
  )
}

function HeroLink({ to, children }: { to: string; children: ReactNode }): ReactElement {
  return (
    <Link to={to} style={{ color: '#ffb86c', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}>
      {children}
    </Link>
  )
}
