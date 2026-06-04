import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom'
import ReferralPage from './pages/ReferralPage.jsx'
import CompaniesPage from './pages/CompaniesPage.jsx'
import LeadsPage from './pages/LeadsPage.jsx'
import TargetCompaniesPage from './pages/TargetCompaniesPage.jsx'
import InterviewPage from './pages/InterviewPage.jsx'

function Sidebar() {
  return (
    <nav className="sidebar">
      <div className="sidebar-logo">
        Jay's Job Hunt
        <span>2026 MBA Search</span>
      </div>
      <NavLink to="/" end className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
        <i className="ti ti-users" />
        Referral details
      </NavLink>
      <NavLink to="/leads" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
        <i className="ti ti-user-search" />
        Leads
      </NavLink>
      <NavLink to="/target-companies" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
        <i className="ti ti-target" />
        Target companies
      </NavLink>
      <NavLink to="/interviews" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
        <i className="ti ti-briefcase" />
        Interviews
      </NavLink>
      <NavLink to="/companies" className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
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
            <Route path="/leads" element={<LeadsPage />} />
            <Route path="/target-companies" element={<TargetCompaniesPage />} />
            <Route path="/interviews" element={<InterviewPage />} />
            <Route path="/companies" element={<CompaniesPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
