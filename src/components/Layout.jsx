import { LayoutProvider } from '../contexts/LayoutContext'
import { BreadcrumbProvider } from '../contexts/BreadcrumbContext'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import ChatWidget from './ChatWidget'
import Breadcrumb from './Breadcrumb'

function LayoutInner({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <div className="app-main">
        <TopBar />
        <main className="app-content">
          <Breadcrumb />
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
      <BreadcrumbProvider>
        <LayoutInner>{children}</LayoutInner>
      </BreadcrumbProvider>
    </LayoutProvider>
  )
}
