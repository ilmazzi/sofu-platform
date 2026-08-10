import { type ReactElement, type ReactNode, useEffect, useState } from 'react'
import { Box, Button, Group, Image, Stack, Text, Title } from '@mantine/core'
import {
  IconBulb,
  IconHeartHandshake,
  IconPlayerPlay,
  IconRoute,
  IconSeedling,
} from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import type { components } from '@sofu/contracts'
import { FoundingBrand } from '../founding/FoundingBrand'
import { FoundingCampaignPulse } from '../founding/FoundingCampaignPulse'
import { FoundingCostBreakdown } from '../founding/FoundingCostBreakdown'
import { FoundingShell } from '../founding/FoundingShell'
import { founding } from '../founding/theme'
import { apiFetch } from '../lib/api/client'

type Campaign = components['schemas']['Campaign']

const { teal, mustard, orange, red, cream, ink, fontDisplay, fontBody } = founding

const IMG_COSA =
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80'
const IMG_PERCHE =
  'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1400&q=80'

export default function LandingPage(): ReactElement {
  const [campaign, setCampaign] = useState<Campaign | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await apiFetch('/api/v1/founding/campaign')
        if (!res.ok || cancelled) return
        const json = (await res.json()) as { data: Campaign }
        if (!cancelled) setCampaign(json.data)
      } catch {
        /* landing resta leggibile anche senza API */
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <FoundingShell maxWidth={860}>
        {/* Hero — un solo messaggio + brand Sofu dominante */}
        <Box
          component="section"
          mb={{ base: 'xl', sm: '2.5rem' }}
          className="founding-fade-up"
        >
          <Stack gap="lg" align="center" ta="center">
            <Box className="founding-float">
              <FoundingBrand size="lg" />
            </Box>
            <Title
              order={1}
              c={cream}
              fz={{ base: '1.55rem', sm: '2rem' }}
              fw={650}
              lh={1.2}
              maw={560}
              className="founding-fade-up founding-fade-up-delay-1"
              style={{ fontFamily: fontDisplay, letterSpacing: '-0.02em', textWrap: 'balance' }}
            >
              Più persone sostengono, meno paga ciascuna.
            </Title>
            <Text
              size="md"
              c={cream}
              maw={480}
              lh={1.6}
              className="founding-fade-up founding-fade-up-delay-2"
              style={{ opacity: 0.9, fontFamily: fontBody }}
            >
              Guarda il video dimostrativo.
            </Text>

            <Box
              w="100%"
              maw={640}
              className="founding-fade-up founding-fade-up-delay-3"
              style={{
                aspectRatio: '16 / 9',
                borderRadius: 4,
                border: '1px solid rgba(247,241,230,0.28)',
                background:
                  'linear-gradient(145deg, rgba(8,40,52,0.85) 0%, rgba(21,96,122,0.55) 55%, rgba(201,160,26,0.25) 100%)',
                display: 'grid',
                placeItems: 'center',
                position: 'relative',
                overflow: 'hidden',
              }}
              role="img"
              aria-label="Segnaposto video dimostrativo Sofu"
            >
              <Box
                className="founding-soft-pulse"
                aria-hidden
                style={{
                  position: 'absolute',
                  width: 180,
                  height: 180,
                  borderRadius: '50%',
                  background: 'rgba(247,241,230,0.12)',
                }}
              />
              <Button
                size="md"
                radius="md"
                leftSection={<IconPlayerPlay size={18} />}
                styles={{
                  root: {
                    background: cream,
                    color: teal,
                    fontWeight: 700,
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
                    fontFamily: fontBody,
                    position: 'relative',
                    zIndex: 1,
                  },
                }}
                onClick={() => {
                  /* Collegare qui l’URL del video demo */
                }}
              >
                Play
              </Button>
            </Box>
          </Stack>
        </Box>

        <Section bg={mustard} title="Cos'è SoFu?" icon={<IconBulb size={22} stroke={1.7} />} rail>

          <Image
            src={IMG_COSA}
            alt="Persone insieme: comunità e progetti condivisi"
            radius={4}
            mah={300}
            fit="cover"
            w="100%"
            style={{ animation: 'foundingFadeUp 0.55s ease both' }}
          />
          <Copy>
            SoFu vuole essere una piattaforma di crowdfunding rivoluzionaria, che riporta al centro le
            persone e la realizzazione di progetti, togliendo potere all&apos;elemento capitalista. Se si
            vuole realizzare un progetto, ma non si dispone della somma necessaria per partire, una
            raccolta fondi è esattamente quel che serve, MA… le attuali piattaforme di crowdfunding non
            fanno che ricalcare le dinamiche divisive in cui il fine è il guadagno, e chi ha successo,
            può arricchirsi a dismisura.
          </Copy>
          <Copy>
            SoFu pone un limite al possibile guadagno di chi propone una campagna, in cambio di un
            risparmio per le persone che sostengono i progetti e credono nel cambiamento. Infatti,
            diversamente dalle attuali piattaforme, in cui il goal da raggiungere è una soglia minima
            per la realizzazione del progetto, in SoFu il goal da raggiungere diventa la soglia{' '}
            <strong>massima</strong> e più persone sostengono il progetto, meno pagherà ciascuna di
            loro.
          </Copy>
          <Copy>
            Per comprendere al meglio e facilmente come funzioni, basterà sostenere la campagna che si
            trova a fondo pagina, che serve esattamente per la realizzazione stessa della piattaforma.
          </Copy>
        </Section>

        <Section
          bg={orange}
          title="Perché supportarci?"
          icon={<IconHeartHandshake size={22} stroke={1.7} />}
          rail
        >
          <Image
            src={IMG_PERCHE}
            alt="Cura del pianeta e futuro condiviso"
            radius={4}
            mah={300}
            fit="cover"
            w="100%"
          />
          <Copy>
            A noi sembra evidente che il capitalismo abbia fallito e che le idee di guadagno esagerato
            e di crescita continua siano inumane, per questo motivo vorremmo realizzare uno strumento
            che, senza uscire dall&apos;attuale sistema economico, permetta di realizzare progetti in
            maniera umana e socialmente accettabile, dimostrando che un mondo migliore è possibile.
          </Copy>
          <Copy>
            Se attualmente artiste e artisti, artigiane e artigiani, oppure semplici persone
            intraprendenti, devono far fronte a difficoltà economiche per realizzare i propri progetti
            e, anzi, non possono prescindere dal lato economico per sopravvivere ed esprimere i propri
            talenti, con SoFu vorremmo fare un passo verso una società più equa e umana, dove il
            denaro e il lavoro non siano un giogo, ma tornino a essere un mezzo per realizzarsi e
            vivere meglio.
          </Copy>
          <Copy>
            Supportando la creazione di questa piattaforma ci aiuterai a creare uno strumento semplice
            e utile per aiutare chi ha a cuore il pianeta, le persone e il futuro.
          </Copy>
        </Section>

        <Section
          bg={red}
          title="Come fare e cosa si ottiene?"
          icon={<IconRoute size={22} stroke={1.7} />}
          last
          rail
        >
          <Copy>
            Esattamente come funzionerà quando la piattaforma verrà realizzata, questa campagna
            sfrutta il nostro meccanismo rivoluzionario di raccolta fondi: abbiamo bisogno di circa{' '}
            <strong>140mila euro</strong> per realizzare SoFu. A noi non importa guadagnare
            all&apos;eccesso: il guadagno della piattaforma è di <strong>1 euro</strong>, perché
            crediamo nella nostra idea (speriamo voglia crederci anche tu).
          </Copy>

          <Box
            p="md"
            style={{
              background: 'rgba(247,241,230,0.22)',
              borderRadius: 12,
              border: '1px solid rgba(26,18,8,0.08)',
            }}
          >
            {campaign?.cost_items?.length ? (
              <FoundingCostBreakdown
                items={campaign.cost_items}
                currency={campaign.currency}
                totalCents={campaign.cost_subtotal_cents ?? campaign.total_amount_cents}
                tone="ink"
              />
            ) : (
              <FoundingCostBreakdown
                items={STATIC_FOUNDING_COSTS}
                currency="EUR"
                totalCents={14_000_100}
                tone="ink"
              />
            )}
          </Box>

          <Copy>
            Essendo un investimento, la quota che chiediamo è di <strong>5mila euro</strong>, ma già
            da questo elemento si può notare la bellezza del nostro meccanismo: 5mila euro sono il
            valore <strong>massimo</strong> di una quota! Quando completerai l&apos;operazione di
            sottoscrizione non ti verrà prelevata nessuna cifra. La tua sarà una promessa di
            corrispondere il valore della quota, al termine della campagna.
          </Copy>
          <Copy>
            Quando il periodo di raccolta fondi sarà terminato, a ogni persona che avrà promesso di
            sostenerci verrà prelevato il valore finale delle quote.
          </Copy>
          <Copy>
            Al raggiungimento dei circa 140mila euro si sprigionerà il vero potenziale di SoFu: a ogni
            nuova quota sottoscritta, il valore delle quote andrà a diminuire. Per chiarire meglio il
            tutto, non serve che un esempio:
          </Copy>
          <Stack
            gap="sm"
            p="md"
            style={{
              background: 'rgba(20,8,8,0.12)',
              borderRadius: 12,
            }}
          >
            <Example>
              a noi servono circa <strong>140mila euro</strong>;
            </Example>
            <Example>
              vengono sottoscritte <strong>10 quote</strong> → la campagna non si realizza, cercheremo
              altri modi per trovare fondi e realizzare l&apos;idea;
            </Example>
            <Example>
              troviamo abbastanza persone che sottoscrivono le <strong>28 quote</strong> necessarie →
              la campagna si realizza e SoFu prende vita, a tutte le persone verranno prelevati{' '}
              <strong>5mila euro</strong> per ogni quota sottoscritta (ogni persona può richiedere più
              quote);
            </Example>
            <Example>
              troviamo un sacco di persone che credono in noi e sottoscrivono{' '}
              <strong>140 mila quote</strong> → non solo la campagna si realizza, ma ciascuna
              persona pagherebbe soltanto <strong>1 euro</strong> (obiettivo ÷ quote
              sottoscritte). È questa la forza di SoFu: più persone sostengono, meno paga
              ciascuna.
            </Example>
          </Stack>

          <Button
            component={Link}
            to="/sostieni"
            size="lg"
            fullWidth
            color="dark"
            mt="sm"
            leftSection={<IconSeedling size={20} stroke={1.75} />}
            className="founding-cta-shimmer"
            styles={{
              root: {
                minHeight: 56,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontSize: '0.9rem',
                fontFamily: fontBody,
                borderRadius: 10,
                position: 'relative',
                overflow: 'hidden',
              },
            }}
          >
            Sostieni SoFu
          </Button>
          <Text size="sm" ta="center" mt="sm" c={ink} style={{ opacity: 0.85, fontFamily: fontBody }}>
            Hai già sostenuto?{' '}
            <Link to="/login?next=/sostieni/stato" style={{ color: ink, fontWeight: 700 }}>
              Accedi al tuo impegno
            </Link>
          </Text>
        </Section>

        {campaign ? (
          <Box mt={{ base: 'lg', sm: 'xl' }}>
            <FoundingCampaignPulse campaign={campaign} />
          </Box>
        ) : null}
    </FoundingShell>
  )
}

/** Fallback se l’API non risponde: allineato al seed founding. */
const STATIC_FOUNDING_COSTS: components['schemas']['CampaignCostItem'][] = [
  { id: '1', type: 'campaign_cost_item', label: 'Sviluppo', amount_cents: 5_000_000, sort_order: 0 },
  { id: '2', type: 'campaign_cost_item', label: 'Sicurezza', amount_cents: 800_000, sort_order: 1 },
  { id: '3', type: 'campaign_cost_item', label: 'Costi legali', amount_cents: 2_000_000, sort_order: 2 },
  {
    id: '4',
    type: 'campaign_cost_item',
    label: 'Marketing e comunicazione',
    amount_cents: 5_000_000,
    sort_order: 3,
  },
  { id: '5', type: 'campaign_cost_item', label: 'Server+HelpDesk', amount_cents: 1_200_000, sort_order: 4 },
  { id: '6', type: 'campaign_cost_item', label: 'Guadagno', amount_cents: 100, sort_order: 5 },
]

function Section({
  bg,
  title,
  icon,
  children,
  last = false,
  rail = false,
}: {
  bg: string
  title: string
  icon?: ReactNode
  children: ReactNode
  last?: boolean
  rail?: boolean
}): ReactElement {
  return (
    <Box
      component="section"
      mb={last ? 0 : { base: 'lg', sm: 'xl' }}
      px={{ base: 'lg', sm: 'xl' }}
      py={{ base: 'xl', sm: '2.25rem' }}
      ml={rail ? { base: 14, sm: 18 } : undefined}
      pos="relative"
      className="founding-fade-up"
      style={{
        backgroundColor: bg,
        borderRadius: 28,
        zIndex: 1,
        boxShadow: '0 18px 40px rgba(8, 40, 52, 0.16)',
      }}
    >
      <Stack gap="md">
        <Group gap="sm" wrap="nowrap" align="center">
          {icon ? (
            <Box
              style={{
                width: 42,
                height: 42,
                borderRadius: 12,
                background: 'rgba(26,18,8,0.1)',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              {icon}
            </Box>
          ) : null}
          <Title
            order={2}
            fz={{ base: '1.55rem', sm: '1.95rem' }}
            fw={800}
            c={ink}
            style={{ letterSpacing: '-0.02em', fontFamily: fontDisplay }}
          >
            {title}
          </Title>
        </Group>
        {children}
      </Stack>
    </Box>
  )
}

function Copy({ children }: { children: ReactNode }): ReactElement {
  return (
    <Text size="md" lh={1.7} style={{ color: 'rgba(26,18,8,0.92)', fontFamily: fontBody }}>
      {children}
    </Text>
  )
}

function Example({ children }: { children: ReactNode }): ReactElement {
  return (
    <Text size="sm" lh={1.6} style={{ color: 'rgba(26,18,8,0.92)', fontFamily: fontBody }}>
      {children}
    </Text>
  )
}
