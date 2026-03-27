import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Trophy, BarChart2 } from 'lucide-react';
import { ThemeProvider } from './context/ThemeContext';
import ThemeToggle from './components/ThemeToggle';
import Dashboard from './pages/Dashboard';
import MonthlyLeaderboard from './pages/MonthlyLeaderboard';

function Navbar() {
  return (
    <nav className="navbar">
      <NavLink to="/" className="navbar-brand">
        <span className="brand-icon">
          <Trophy size={18} />
        </span>
        <span>LeetTrack</span>
      </NavLink>
      <div className="navbar-right">
        <NavLink
          to="/"
          end
          className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
          id="nav-dashboard"
        >
          <Trophy size={14} /> <span>Today</span>
        </NavLink>
        <NavLink
          to="/monthly"
          className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}
          id="nav-monthly"
        >
          <BarChart2 size={14} /> <span>Monthly</span>
        </NavLink>
        <ThemeToggle />
      </div>
    </nav>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <div className="app-wrapper">
          <Navbar />
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/monthly" element={<MonthlyLeaderboard />} />
          </Routes>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  );
}
