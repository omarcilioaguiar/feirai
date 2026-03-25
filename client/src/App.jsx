import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import { ShoppingCart, Package, Storefront, ChartPieSlice, ClockCounterClockwise, Leaf, Moon, ShoppingBag, DeviceMobile } from '@phosphor-icons/react';
import { useState, useEffect } from 'react';
import Home from './pages/Home';
import Products from './pages/Products';
import Places from './pages/Places';
import Reports from './pages/Reports';
import History from './pages/History';
import Indica from './pages/Indica';
import List from './pages/List';
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
          <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="mobile-badge" style={{ 
               background: 'linear-gradient(135deg, var(--secondary), var(--secondary-dark))',
               color: 'white',
               padding: '4px 10px',
               borderRadius: '12px',
               fontSize: '0.65rem',
               fontWeight: 'bold',
               display: 'flex',
               alignItems: 'center',
               gap: '5px',
               cursor: 'pointer',
               boxShadow: '0 2px 8px rgba(99, 102, 241, 0.3)'
            }}
            onClick={() => window.open('https://omarcilioaguiar.vercel.app', '_blank')}
            >
              <DeviceMobile size={14} weight="fill" />
              <span>APP EM BREVE</span>
            </div>
            <a 
              href="https://omarcilioaguiar.vercel.app" 
              target="_blank" 
              rel="noopener noreferrer"
              className="portfolio-link"
              style={{
                fontSize: '0.6rem',
                color: 'var(--text-secondary)',
                opacity: 0.8,
                textDecoration: 'none',
                transition: 'opacity 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.opacity = '1'}
              onMouseLeave={(e) => e.target.style.opacity = '0.8'}
            >
              saiba mais em omarcilioaguiar.vercel.app
            </a>
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
            <Route path="/list" element={<List />} />
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
           <NavLink to="/list" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              {({ isActive }) => (
               <>
                 <ShoppingBag weight={isActive ? "fill" : "regular"} />
                 <span>Lista</span>
               </>
             )}
           </NavLink>
        </nav>
      </div>
    </Router>
  );
}

export default App;
