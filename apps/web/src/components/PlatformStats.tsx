import { type ReactElement } from 'react'
import { Box, Group, SimpleGrid, Stack, Text } from '@mantine/core'

type Stat = {
  value: string
  label: string
  sublabel?: string
  color?: string
}

export function PlatformStats({ stats }: { stats: Stat[] }): ReactElement {
  return (
    <Box
      style={{
        borderTop: '1px solid #e9ecef',
        borderBottom: '1px solid #e9ecef',
      }}
      py="xl"
    >
      <SimpleGrid cols={{ base: 1, xs: stats.length }} spacing={0}>
        {stats.map((stat, i) => (
          <Box
            key={i}
            style={{
              borderRight: i < stats.length - 1 ? '1px solid #e9ecef' : undefined,
            }}
            px={{ base: 0, xs: 'xl' }}
            py={{ base: 'md', xs: 0 }}
          >
            <Stack gap={4} align="center">
              <Text
                size="3rem"
                fw={300}
                lh={1}
                c="dark"
                style={{ 
                  letterSpacing: '-0.04em', 
                  fontVariantNumeric: 'tabular-nums',
                  fontFamily: 'system-ui, -apple-system, sans-serif'
                }}
              >
                {stat.value}
              </Text>
              <Text size="sm" fw={500} c="dark" tt="uppercase" style={{ letterSpacing: '0.1em' }}>
                {stat.label}
              </Text>
              {stat.sublabel ? (
                <Text size="xs" c="dimmed" fw={400}>
                  {stat.sublabel}
                </Text>
              ) : null}
            </Stack>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  )
}
