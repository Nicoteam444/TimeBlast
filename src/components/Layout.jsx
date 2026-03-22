import { LayoutProvider } from '../contexts/LayoutContext'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ChatWidget from './ChatWidget'

function LayoutInner({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className="app-content">
          {children}
        </main>
      </div>
      <ChatWidget />
    </div>
  )
}

export default function Layout({ children }) {
  return (
    <LayoutProvider>
      <LayoutInner>{children}</LayoutInner>
    </LayoutProvider>
  )
}
