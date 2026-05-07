import React, { useState, useRef } from 'react';
import { InputText } from 'primereact/inputtext';
import { Password } from 'primereact/password';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { Card } from 'primereact/card';
import api from '../api';

const Login = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const toast = useRef(null);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Please fill in all fields.', life: 3000 });
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { username, password });
      toast.current.show({ severity: 'success', summary: 'Success', detail: 'Login Successful!', life: 1500 });
      
      // Save to localStorage after 500ms and trigger success
      setTimeout(() => {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        localStorage.setItem('username', response.data.user.username);
        onLoginSuccess(response.data.user);
      }, 500);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to authenticate. Please check your credentials.';
      toast.current.show({ severity: 'error', summary: 'Authentication Failed', detail: errMsg, life: 4000 });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #1d4ed8 100%)',
    }}>
      <Toast ref={toast} />

      <Card className="glass-card" style={{
        width: '100%',
        maxWidth: '420px',
        padding: '20px 10px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        background: 'rgba(255, 255, 255, 0.15)',
        boxShadow: '0 20px 40px rgba(0, 0, 0, 0.2)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '30px', color: 'white' }}>
          <i className="pi pi-shopping-bag" style={{ fontSize: '3rem', marginBottom: '10px' }}></i>
          <h1 style={{ margin: '0', fontSize: '2rem', fontWeight: 'bold' }}>NumanPOS</h1>
          <p style={{ margin: '5px 0 0 0', opacity: 0.8, fontSize: '0.9rem' }}>Professional Store POS Software</p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            <div className="p-inputgroup">
              <span className="p-inputgroup-addon">
                <i className="pi pi-user"></i>
              </span>
              <InputText 
                value={username} 
                onChange={(e) => setUsername(e.target.value)} 
                placeholder="Username (e.g., admin, cashier)" 
                style={{ height: '45px' }}
                disabled={loading}
              />
            </div>

            <div className="p-inputgroup">
              <span className="p-inputgroup-addon">
                <i className="pi pi-lock"></i>
              </span>
              <Password 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                placeholder="Password (e.g., admin123)" 
                feedback={false}
                toggleMask
                style={{ width: '100%' }}
                inputStyle={{ width: '100%', height: '45px' }}
                disabled={loading}
              />
            </div>

            <Button 
              type="submit" 
              label={loading ? 'Logging in...' : 'Sign In'} 
              icon="pi pi-sign-in" 
              loading={loading}
              style={{
                background: '#2563eb',
                borderColor: '#2563eb',
                fontWeight: 'bold',
                padding: '12px',
                borderRadius: '6px',
                fontSize: '1rem',
              }}
            />
          </div>
        </form>

        <div style={{ textAlign: 'center', marginTop: '30px', color: 'white', opacity: 0.7, fontSize: '0.8rem' }}>
          <span>Demo Accounts: admin/admin123, cashier/cashier123</span>
        </div>
      </Card>
    </div>
  );
};

export default Login;
