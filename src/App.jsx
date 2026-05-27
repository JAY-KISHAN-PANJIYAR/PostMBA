import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import ReferralPage from './pages/ReferralPage.jsx'
import CompaniesPage from './pages/CompaniesPage.jsx'

function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        Jay's Job Hunt
        <span>2026 MBA Search</span>
      </div>
      <NavLink to="/" end className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <i className="ti ti-users" />
        Referral details
      </NavLink>
      <NavLink to="/companies" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
        <i className="ti ti-building" />
        Companies + refs
      </NavLink>
    </nav>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <Sidebar />
        <main className="main">
          <Routes>
            <Route path="/" element={<ReferralPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
