import type { ReactElement, ReactNode } from 'react'
import { Box, Button, Image, Stack, Text, Title } from '@mantine/core'
import { IconPlayerPlay } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

/** Palette da sfondo.svg — usata come colori di sezione, non come immagine di fondo */
const TEAL = '#15607a'
const MUSTARD = '#c9a01a'
const ORANGE = '#c6761d'
const RED = '#c63a1d'
const CREAM = '#f7f1e6'
const INK = '#1a1208'

const IMG_COSA =
  'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1400&q=80'
const IMG_PERCHE =
  'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1400&q=80'

export default function LandingPage(): ReactElement {
  return (
    <Box component="main" style={{ backgroundColor: TEAL, minHeight: '100%' }}>
      <Box
        maw={860}
        mx="auto"
        px={{ base: 'md', sm: 'xl' }}
        py={{ base: 'xl', sm: '2.75rem' }}
        pos="relative"
      >
        {/* Righe di accompagnamento da sfondo.svg — solo tratto, sotto il contenuto */}
        <AccompanimentRails />

        {/* 1 — Video */}
        <Box component="section" mb={{ base: 'xl', sm: '2.5rem' }} pos="relative" style={{ zIndex: 1 }}>
          <Stack gap="lg" align="center" ta="center">
            <Text
              size="xs"
              fw={700}
              tt="uppercase"
              c={CREAM}
              style={{ letterSpacing: '0.22em', opacity: 0.9 }}
            >
              Sofu
            </Text>
            <Title
              order={1}
              c={CREAM}
              fz={{ base: '1.85rem', sm: '2.5rem' }}
              fw={650}
              lh={1.15}
              maw={640}
              style={{ letterSpacing: '-0.03em', textWrap: 'balance' }}
            >
              Più persone sostengono, meno paga ciascuna.
            </Title>
            <Text size="md" c={CREAM} maw={520} lh={1.6} style={{ opacity: 0.9 }}>
              Guarda il video dimostrativo.
            </Text>

            <Box
              w="100%"
              maw={640}
              style={{
                aspectRatio: '16 / 9',
                borderRadius: 16,
                border: '1px solid rgba(247,241,230,0.25)',
                background: 'rgba(8,40,52,0.65)',
                display: 'grid',
                placeItems: 'center',
              }}
              role="img"
              aria-label="Segnaposto video dimostrativo Sofu"
            >
              <Button
                size="md"
                radius="xl"
                leftSection={<IconPlayerPlay size={18} />}
                styles={{
                  root: {
                    background: CREAM,
                    color: TEAL,
                    fontWeight: 700,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    fontSize: '0.75rem',
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

        {/* 2 — Cos'è SoFu */}
        <Section bg={MUSTARD} title="Cos'è SoFu?" rail>

          <Image
            src={IMG_COSA}
            alt="Persone insieme: comunità e progetti condivisi"
            radius="md"
            mah={280}
            fit="cover"
            w="100%"
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

        {/* 3 — Perché supportarci */}
        <Section bg={ORANGE} title="Perché supportarci?" rail>

          <Image
            src={IMG_PERCHE}
            alt="Cura del pianeta e futuro condiviso"
            radius="md"
            mah={280}
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

        {/* 4 — Come fare e cosa si ottiene */}
        <Section bg={RED} title="Come fare e cosa si ottiene?" last rail>

          <Copy>
            Esattamente come funzionerà quando la piattaforma verrà realizzata, questa campagna
            sfrutta il nostro meccanismo rivoluzionario di raccolta fondi: abbiamo bisogno di{' '}
            <strong>140mila euro</strong> per tutte le spese legali, di marketing e informatiche
            (programmazione, server e sicurezza), ma a noi non importa guadagnare all&apos;eccesso,
            quindi, come si può vedere dallo specchietto relativo alle spese, il nostro guadagno
            simbolico è di <strong>1 euro</strong>, perché crediamo nella nostra idea (speriamo voglia
            crederci anche tu).
          </Copy>
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
            Al raggiungimento dei 140mila euro si sprigionerà il vero potenziale di SoFu: a ogni nuova
            quota sottoscritta, il valore delle quote andrà a diminuire. Per chiarire meglio il tutto,
            non serve che un esempio:
          </Copy>
          <Stack
            gap="sm"
            p="md"
            style={{
              background: 'rgba(20,8,8,0.1)',
              borderRadius: 12,
            }}
          >
            <Example>
              a noi servono <strong>140mila euro</strong>;
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
              troviamo un sacco di persone che credono in noi e sottoscrivono <strong>50 quote</strong>{' '}
              → non solo la campagna si realizza, ma preleveremo soltanto <strong>2800 euro</strong>{' '}
              per ogni quota sottoscritta (goal / quote sottoscritte = valore delle quote).
            </Example>
          </Stack>

          <Button
            component={Link}
            to="/register"
            size="lg"
            fullWidth
            color="dark"
            mt="sm"
            styles={{
              root: {
                minHeight: 56,
                fontWeight: 700,
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontSize: '0.9rem',
              },
            }}
          >
            Sostieni SoFu
          </Button>
        </Section>
      </Box>
    </Box>
  )
}

/** Tre linee (giallo → arancio → rosso) come nello sfondo: dal top-right, curve a sinistra, poi scendono. */
function AccompanimentRails(): ReactElement {
  const sw = 1.75
  const common = {
    fill: 'none' as const,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    vectorEffect: 'non-scaling-stroke' as const,
  }

  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'visible',
      }}
    >
      {/* Rosso — rotaia esterna, fino al pannello rosso */}
      <path
        {...common}
        d="M 97.2 1.2 V 21.5 Q 97.2 23.2 95.5 23.2 H 4.2 Q 2.2 23.2 2.2 25.2 V 97"
        stroke={RED}
        strokeWidth={sw}
      />
      {/* Arancio — media, fino al pannello arancio */}
      <path
        {...common}
        d="M 95.4 1.2 V 20.6 Q 95.4 22.4 93.6 22.4 H 5.6 Q 3.8 22.4 3.8 24.2 V 72"
        stroke={ORANGE}
        strokeWidth={sw}
      />
      {/* Giallo — interna, fino al pannello giallo */}
      <path
        {...common}
        d="M 93.6 1.2 V 19.7 Q 93.6 21.5 91.8 21.5 H 7 Q 5.4 21.5 5.4 23.2 V 42"
        stroke={MUSTARD}
        strokeWidth={sw}
      />
    </svg>
  )
}

function Section({
  bg,
  title,
  children,
  last = false,
  rail = false,
}: {
  bg: string
  title: string
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
      style={{
        backgroundColor: bg,
        borderRadius: 20,
        zIndex: 1,
      }}
    >
      <Stack gap="md">
        <Title
          order={2}
          fz={{ base: '1.55rem', sm: '1.9rem' }}
          fw={700}
          c={INK}
          style={{ letterSpacing: '-0.02em' }}
        >
          {title}
        </Title>
        {children}
      </Stack>
    </Box>
  )
}

function Copy({ children }: { children: ReactNode }): ReactElement {
  return (
    <Text size="md" lh={1.7} style={{ color: 'rgba(26,18,8,0.92)' }}>
      {children}
    </Text>
  )
}

function Example({ children }: { children: ReactNode }): ReactElement {
  return (
    <Text size="sm" lh={1.6} style={{ color: 'rgba(26,18,8,0.92)' }}>
      {children}
    </Text>
  )
}
