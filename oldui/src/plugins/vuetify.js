// Styles
import 'vuetify/styles'

// Vuetify
import { createVuetify } from 'vuetify'
import { aliases, mdi } from 'vuetify/lib/iconsets/mdi-svg'

export default createVuetify({
  icons: {
    defaultSet: 'mdi',
    aliases,
    sets: {
      mdi,
    },
  },
  display: {
    mobileBreakpoint: 'sm'
  },
  theme: {
    defaultTheme: 'custom',
    themes: {
      custom: {
        dark: true,
        colors: {
          primary: '#1976D2',
          secondary: '#424242',
          tertiary: '#FFD300',
          accent: '#82B1FF',
          error: '#FF5252',
          info: '#2196F3',
          success: '#4CAF50',
          warning: '#FFC107',
        }
      }
    }
  }
})
