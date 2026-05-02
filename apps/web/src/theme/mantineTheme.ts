import { createTheme, type MantineColorsTuple } from '@mantine/core'

const brand: MantineColorsTuple = [
  '#f8f0ed',
  '#edd8d2',
  '#e2c0b6',
  '#d7a899',
  '#cc907d',
  '#c17861',
  '#b66045',
  '#a84830',
  '#96321c',
  '#7a2815',
]

export const mantineTheme = createTheme({
  primaryColor: 'brand',
  colors: {
    brand,
  },
  defaultRadius: 'md',
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
  headings: {
    fontWeight: '600',
  },
})
