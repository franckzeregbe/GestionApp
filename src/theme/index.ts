export const COLORS = {
  dark: {
    bg: '#0f0f1a',
    surface: '#1a1a2e',
    surface2: '#222240',
    card: '#16213e',
    primary: '#6c63ff',
    primarySoft: 'rgba(108,99,255,0.15)',
    green: '#2ecc71',
    greenSoft: 'rgba(46,204,113,0.15)',
    red: '#e74c3c',
    redSoft: 'rgba(231,76,60,0.15)',
    orange: '#f39c12',
    orangeSoft: 'rgba(243,156,18,0.15)',
    text: '#e8e8f0',
    text2: '#9898b0',
    border: 'rgba(255,255,255,0.06)',
    shadow: 'rgba(0,0,0,0.3)',
  },
  light: {
    bg: '#e4e6eb',
    surface: '#d8dbe3',
    surface2: '#ccd0d8',
    card: '#d2d6df',
    primary: '#4f46b5',
    primarySoft: 'rgba(79,70,181,0.12)',
    green: '#1e8449',
    greenSoft: 'rgba(30,132,73,0.12)',
    red: '#a93226',
    redSoft: 'rgba(169,50,38,0.12)',
    orange: '#d35400',
    orangeSoft: 'rgba(211,84,0,0.12)',
    text: '#12121e',
    text2: '#505068',
    border: 'rgba(0,0,0,0.06)',
    shadow: 'rgba(0,0,0,0.1)',
  },
}

export const CHART_COLORS = [
  '#6c63ff', '#2ecc71', '#e74c3c', '#f39c12', '#3498db',
  '#9b59b6', '#1abc9c', '#e67e22', '#2c3e50', '#d35400',
  '#27ae60', '#8e44ad', '#16a085', '#c0392b', '#2980b9',
]

export const commonStyles = {
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end' as const,
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderWidth: 1,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center' as const,
    marginVertical: 8,
  },
}
