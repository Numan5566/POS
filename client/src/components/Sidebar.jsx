import React from 'react';
import { Button } from 'primereact/button';

const Sidebar = ({ activePage, setActivePage, onLogout }) => {
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  const menuItems = [
    { id: 'billing', label: 'POS Billing', icon: 'pi pi-shopping-cart', roles: ['admin', 'cashier'] },
    { id: 'inventory', label: 'Stock Catalog', icon: 'pi pi-box', roles: ['admin', 'cashier'] },
    { id: 'customers', label: 'Credit Ledger', icon: 'pi pi-users', roles: ['admin', 'cashier'] },
    { id: 'reports', label: 'Sales Reports', icon: 'pi pi-chart-bar', roles: ['admin'] },
    { id: 'settings', label: 'System Settings', icon: 'pi pi-cog', roles: ['admin', 'cashier'] },
  ];

  return (
    <div className="pos-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100vh', justifyContent: 'space-between' }}>
      
      <div>
        {/* Branding Title */}
        <div style={{
          height: '65px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '0 20px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          background: '#0f172a',
        }}>
          <i className="pi pi-shopping-bag" style={{ fontSize: '1.5rem', color: '#3b82f6' }}></i>
          <span style={{ fontSize: '1.25rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>NumanPOS</span>
        </div>

        {/* User Info Segment */}
        <div style={{ padding: '16px 20px', background: 'rgba(255, 255, 255, 0.02)', borderBottom: '1px solid rgba(255, 255, 255, 0.05)', display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ height: '36px', width: '36px', borderRadius: '50%', background: isAdmin ? '#3b82f6' : '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.1rem' }}>
            {user.username ? user.username.charAt(0).toUpperCase() : 'C'}
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{user.username || 'Cashier'}</div>
            <small style={{ color: '#94a3b8', fontSize: '0.75rem', textTransform: 'uppercase', fontWeight: 'bold' }}>{user.role || 'cashier'}</small>
          </div>
        </div>

        {/* Navigation Menu Links */}
        <div style={{ display: 'flex', flexDirection: 'column', padding: '10px', gap: '4px' }}>
          {menuItems.map((item) => {
            if (!item.roles.includes(user.role || 'cashier')) return null;
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActivePage(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  border: 'none',
                  borderRadius: '8px',
                  background: isActive ? '#3b82f6' : 'transparent',
                  color: isActive ? 'white' : '#cbd5e1',
                  textAlign: 'left',
                  fontSize: '0.95rem',
                  fontWeight: isActive ? 600 : 500,
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  width: '100%',
                }}
                onMouseOver={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'; }}
                onMouseOut={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                <i className={item.icon} style={{ fontSize: '1.1rem' }}></i>
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Logout button area */}
      <div style={{ padding: '16px' }}>
        <Button 
          label="Log Out" 
          icon="pi pi-sign-out" 
          onClick={onLogout}
          className="p-button-danger p-button-outlined"
          style={{ width: '100%', borderRadius: '8px', fontWeight: 'bold' }}
        />
      </div>
    </div>
  );
};

export default Sidebar;
