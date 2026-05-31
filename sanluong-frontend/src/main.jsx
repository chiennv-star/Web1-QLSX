import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import 'antd/dist/reset.css'
import './index.css'

const theme = {
  token: {
    colorPrimary:        '#607080',
    colorPrimaryHover:   '#748090',
    colorPrimaryActive:  '#485560',
    colorPrimaryBorder:  '#7A9AB8',
    colorLink:           '#607080',
    colorLinkHover:      '#748090',
    borderRadius: 6,
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  components: {
    Button: {
      colorPrimary:      '#607080',
      colorPrimaryHover: '#748090',
      colorPrimaryActive:'#485560',
      algorithm: true,
    },
    Menu: {
      darkItemSelectedBg:    'rgba(77,109,138,0.35)',
      darkItemSelectedColor: '#DDE1E8',
      darkItemColor:         '#B8CDD8',
      darkItemHoverColor:    '#EAECF2',
      darkItemHoverBg:       'rgba(77,109,138,0.2)',
    },
    Tabs: {
      inkBarColor:         '#4db3d4',
      itemColor:           '#B8CDD8',
      itemHoverColor:      '#ffffff',
      itemSelectedColor:   '#ffffff',
      itemActiveColor:     '#ffffff',
    },
    Table: {
      headerBg:    '#485560',
      headerColor: '#DDE1E8',
      rowHoverBg:  '#EAECF2',
    },
    Checkbox: {
      colorPrimary:      '#607080',
      colorPrimaryHover: '#748090',
    },
    Tag: {
      colorSuccess: '#389e0d',
      colorWarning: '#d46b08',
    },
    Badge: {
      colorPrimary: '#607080',
    },
  },
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <ConfigProvider theme={theme}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </ConfigProvider>
  </BrowserRouter>
)
