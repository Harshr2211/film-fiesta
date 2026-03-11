import React from 'react'
import AppRoutes from './routes/AppRoutes'
import {Header, Footer, ToastStack} from './components'
// DebugPanel removed from production layout
import { AuthProvider } from './context/AuthContext'
import LoginModal from './components/LoginModal'

const App = () => {
  return (
    <AuthProvider>
  <Header />
      <LoginModal />
      <ToastStack />
      <div className='dark:bg-slate-800'>
  <main>
          <AppRoutes />
        </main>
      </div>
      <Footer />
    </AuthProvider>
  )
}

export default App
