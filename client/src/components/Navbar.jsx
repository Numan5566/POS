import React, { useState, useEffect } from 'react';
import api from '../api';

const Navbar = ({ activePage, setActivePage }) => {
  const [time, setTime] = useState(new Date());
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    // 1. Setup Live Clock
    const timer = setInterval(() => setTime(new Date()), 1000);
    
    // 2. Load low-stock counts
    fetchLowStock();
    const stockTimer = setInterval(fetchLowStock, 30000); // refresh stock alerts every 30s
    
    return () => {
      clearInterval(timer);
      clearInterval(stockTimer);
    };
  }, []);

  const fetchLowStock = async () => {
    try {
      const res = await api.get('/products/low-stock');
      setLowStockCount(res.data.length);
    } catch (err) {
      console.error('Failed to load stock alerts');
    }
  };

  const getPageTitle = () => {
    switch (activePage) {
      case 'billing': return 'Point of Sale Cashier';
      case 'inventory': return 'Stock Inventory Management';
      case 'customers': return 'Credit & Ledger accounts';
      case 'reports': return 'Sales & Revenue Analytics';
      case 'settings': return 'POS System Configuration';
      default: return 'Store POS';
    }
  };

  return (
    <div className="pos-header">
      
      {/* Left side: Active Page Title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <h1 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 'bold', color: '#1e293b' }}>
          {getPageTitle()}
        </h1>
      </div>

      {/* Right side: Alerts & Live Clock */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        
        {/* Live Clock Feed */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f1f5f9', padding: '6px 12px', borderRadius: '8px', fontSize: '0.9rem', fontWeight: 600, color: '#475569' }}>
          <i className="pi pi-clock" style={{ color: '#64748b' }}></i>
          <span>{time.toLocaleTimeString()}</span>
        </div>

        {/* Low Stock Notification Badge */}
        {lowStockCount > 0 && (
          <button 
            onClick={() => setActivePage('inventory')}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: '#fee2e2',
              color: '#dc2626',
              border: '1px solid #fca5a5',
              borderRadius: '8px',
              padding: '6px 12px',
              fontSize: '0.85rem',
              fontWeight: 'bold',
              cursor: 'pointer',
              animation: 'pulse 2s infinite',
            }}
          >
            <i className="pi pi-exclamation-triangle"></i>
            <span>{lowStockCount} Low Stock Items</span>
          </button>
        )}

      </div>
    </div>
  );
};

export default Navbar;
