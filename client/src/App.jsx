import React, { useState, useEffect } from 'react';
import Login from './pages/Login';
import Sidebar from './components/Sidebar';
import Navbar from './components/Navbar';
import Billing from './pages/Billing';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import api from './api';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activePage, setActivePage] = useState('billing');

  useEffect(() => {
    // Check if token exists and verify session with backend
    const checkAuth = async () => {
      const storedToken = localStorage.getItem('token');
      const storedUser = localStorage.getItem('user');

      if (storedToken && storedUser) {
        try {
          // Verify with backend
          const res = await api.get('/auth/verify');
          setUser(res.data.user);
        } catch (err) {
          console.error('Session verification failed, logging out...');
          handleLogout();
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, []);

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    setActivePage('billing');
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('username');
    setUser(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)', color: 'white' }}>
        <i className="pi pi-spin pi-spinner" style={{ fontSize: '3rem', marginBottom: '15px' }}></i>
        <h3 style={{ margin: 0, fontWeight: 500 }}>Verifying POS Session...</h3>
      </div>
    );
  }

  // If not authenticated, display the login screen
  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  // Render the appropriate main page component
  const renderPage = () => {
    switch (activePage) {
      case 'billing':
        return <Billing />;
      case 'inventory':
        return <Inventory />;
      case 'customers':
        return <Customers />;
      case 'reports':
        // Safeguard reports route
        return user.role === 'admin' ? <Reports /> : <Billing />;
      case 'settings':
        return <Settings />;
      default:
        return <Billing />;
    }
  };

  return (
    <div className="pos-container">
      {/* 1. Left Side Navigation Sidebar */}
      <Sidebar 
        activePage={activePage} 
        setActivePage={setActivePage} 
        onLogout={handleLogout} 
      />

      {/* 2. Right Side Content Space */}
      <div className="pos-main">
        {/* Dynamic header navbar containing clocks & low stock alert indicators */}
        <Navbar 
          activePage={activePage} 
          setActivePage={setActivePage} 
        />
        
        {/* Main page workspace */}
        <div style={{ flexGrow: 1, overflowY: 'auto' }}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

export default App;
