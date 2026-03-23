import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { ShoppingCart, Package, Storefront, ChartPieSlice, ClockCounterClockwise, Leaf, Moon } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Products from './pages/Products';
import Places from './pages/Places';
import Reports from './pages/Reports';
import History from './pages/History';
import Indica from './pages/Indica';
import './index.css';

function App() {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem('feirai_theme');
    if (savedTheme === 'dark') {
      setTheme('dark');
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
    localStorage.setItem('feirai_theme', newTheme);
    if (newTheme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  };

  return (
    <Router>
      <div className="app-container">
        <header className="top-nav">
          <div className="logo">
            <Leaf weight="fill" />
            <h1>FeirAI</h1>
          </div>
          <div className="header-actions">
            <button onClick={toggleTheme} className="icon-btn">
              <Moon />
            </button>
          </div>
        </header>

        <main className="view-container">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/products" element={<Products />} />
            <Route path="/places" element={<Places />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/history" element={<History />} />
            <Route path="/indica" element={<Indica />} />
          </Routes>
        </main>

        <nav className="bottom-nav">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
            {({ isActive }) => (
              <>
                <ShoppingCart weight={isActive ? "fill" : "regular"} />
                <span>Feira</span>
              </>
            )}
          </NavLink>
          <NavLink to="/products" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             {({ isActive }) => (
              <>
                <Package weight={isActive ? "fill" : "regular"} />
                <span>Produtos</span>
              </>
            )}
          </NavLink>
          <NavLink to="/places" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             {({ isActive }) => (
              <>
                <Storefront weight={isActive ? "fill" : "regular"} />
                <span>Locais</span>
              </>
            )}
          </NavLink>
          <NavLink to="/reports" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             {({ isActive }) => (
              <>
                <ChartPieSlice weight={isActive ? "fill" : "regular"} />
                <span>Relatórios</span>
              </>
            )}
          </NavLink>
          <NavLink to="/history" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             {({ isActive }) => (
              <>
                <ClockCounterClockwise weight={isActive ? "fill" : "regular"} />
                <span>Histórico</span>
              </>
            )}
          </NavLink>
          <NavLink to="/indica" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
             {({ isActive }) => (
              <>
                <Leaf weight={isActive ? "fill" : "regular"} />
                <span>Indica</span>
              </>
            )}
          </NavLink>
        </nav>
      </div>
    </Router>
  );
}

export default App;
