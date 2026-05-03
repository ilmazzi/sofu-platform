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
        minHeight: 'min(60vh, 560px)',
        border: '1px solid #dee2e6',
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
            'linear-gradient(135deg, rgba(102, 126, 234, 0.85) 0%, rgba(118, 75, 162, 0.9) 100%)',
          mixBlendMode: 'multiply',
        }}
      />
      <Box
        pos="absolute"
        inset={0}
        style={{
          background:
            'linear-gradient(180deg, rgba(12,10,18,0.15) 0%, rgba(12,10,18,0.45) 45%, rgba(12,10,18,0.75) 100%)',
        }}
      />
      <Box pos="relative" py={{ base: '3rem', sm: '4rem' }} px={{ base: 'lg', sm: '3rem' }} pb={{ base: '3rem', sm: '4rem' }}>
        <Stack gap="xl" maw={720}>
          <Stack gap="lg">
            <Group gap="sm" align="center">
              <Text size="1.5rem" lh={1}>
                💧
              </Text>
              <Text size="xs" fw={700} tt="uppercase" c="rgba(255,255,255,0.9)" style={{ letterSpacing: '0.15em' }}>
                Sofu — Crowdfunding Etico
              </Text>
            </Group>
            <Title
              order={1}
              c="#fff"
              fz={{ base: '2.25rem', sm: '3rem', md: '3.5rem' }}
              fw={600}
              lh={1.15}
              style={{ letterSpacing: '-0.04em', textWrap: 'balance', textShadow: '0 2px 16px rgba(0,0,0,0.3)' }}
            >
              Più droplets, più il prezzo scende.
            </Title>
            <Text size="lg" c="rgba(255,255,255,0.95)" maw={580} lh={1.7} fz={{ base: 'md', sm: 'lg' }} fw={400} style={{ textShadow: '0 1px 8px rgba(0,0,0,0.25)' }}>
              Ogni campagna ha un obiettivo economico condiviso: più persone si uniscono con i loro droplets, più il prezzo scende per tutti. Trasparenza totale su costi, prezzi e avanzamento.
            </Text>
          </Stack>
          {!authLoading && !user ? (
            <Group gap="md" wrap="wrap">
              <Button 
                component={Link} 
                to="/register" 
                size="lg" 
                color="dark" 
                variant="filled" 
                style={{ 
                  fontWeight: 600,
                  letterSpacing: '0.02em',
                  textTransform: 'uppercase',
                  fontSize: '0.75rem'
                }}
              >
                Inizia ora
              </Button>
              <Button
                component={Link}
                to="/login"
                size="lg"
                variant="outline"
                styles={{
                  root: {
                    borderColor: 'rgba(255,255,255,0.8)',
                    color: '#fff',
                    background: 'rgba(255,255,255,0.08)',
                    backdropFilter: 'blur(8px)',
                    fontWeight: 600,
                    letterSpacing: '0.02em',
                    textTransform: 'uppercase',
                    fontSize: '0.75rem'
                  },
                }}
              >
                Accedi
              </Button>
            </Group>
          ) : null}
          {!authLoading && user ? (
            <Text size="sm" c="rgba(255,255,255,0.95)" lh={1.6} style={{ textShadow: '0 1px 4px rgba(0,0,0,0.3)' }}>
              Bentornato, <strong>{user.name}</strong>. I tuoi droplets sono in{' '}
              <HeroLink to="/me/reservations">Le mie prenotazioni</HeroLink>.
            </Text>
          ) : null}
          <Text size="xs" c="rgba(255,255,255,0.5)" mt="xs">
            Foto: team — Unsplash
          </Text>
        </Stack>
      </Box>
    </Box>
  )
}

function HeroLink({ to, children }: { to: string; children: ReactNode }): ReactElement {
  return (
    <Link to={to} style={{ color: '#ffd43b', fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3 }}>
      {children}
    </Link>
  )
}
