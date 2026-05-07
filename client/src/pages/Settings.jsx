import React, { useState, useEffect, useRef } from 'react';
import { InputText } from 'primereact/inputtext';
import { InputNumber } from 'primereact/inputnumber';
import { Button } from 'primereact/button';
import { Toast } from 'primereact/toast';
import { Dropdown } from 'primereact/dropdown';
import api from '../api';

const Settings = () => {
  const [settings, setSettings] = useState({
    store_name: '',
    store_phone: '',
    store_address: '',
    receipt_footer: '',
    tax_rate: 0,
  });

  // User registration state
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState('cashier');
  
  const [loading, setLoading] = useState(false);
  const [userLoading, setUserLoading] = useState(false);
  const toast = useRef(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await api.get('/settings');
      setSettings(res.data);
    } catch (err) {
      console.error('Failed to load settings');
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;

    setLoading(true);
    try {
      const res = await api.put('/settings', settings);
      toast.current.show({ severity: 'success', summary: 'Successful', detail: 'System configurations saved successfully.' });
      setSettings(res.data);
    } catch (err) {
      toast.current.show({ severity: 'error', summary: 'Save Failed', detail: 'Failed to update system settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterUser = async (e) => {
    e.preventDefault();
    if (!isAdmin) return;
    if (!newUsername.trim() || !newPassword.trim()) return;

    setUserLoading(true);
    try {
      await api.post('/auth/register', {
        username: newUsername,
        password: newPassword,
        role: newRole,
      });
      toast.current.show({ severity: 'success', summary: 'Employee Registered', detail: `Successfully created ${newRole} account for ${newUsername}.` });
      
      setNewUsername('');
      setNewPassword('');
      setNewRole('cashier');
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to register employee.';
      toast.current.show({ severity: 'error', summary: 'Registration Failed', detail: errMsg });
    } finally {
      setUserLoading(false);
    }
  };

  return (
    <div className="pos-content" style={{ display: 'grid', gridTemplateColumns: isAdmin ? '1.2fr 1fr' : '1fr', gap: '20px' }}>
      <Toast ref={toast} />

      {/* Store Information Form */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 20px 0' }}>Store & Receipt Branding</h3>
        
        <form onSubmit={handleSettingsSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Store Name</label>
            <InputText value={settings.store_name} onChange={(e) => setSettings({ ...settings, store_name: e.target.value })} placeholder="e.g. Grand Supermarket" style={{ width: '100%' }} disabled={!isAdmin} required />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Store Address</label>
              <InputText value={settings.store_address} onChange={(e) => setSettings({ ...settings, store_address: e.target.value })} placeholder="Store Address" style={{ width: '100%' }} disabled={!isAdmin} />
            </div>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Phone Number</label>
              <InputText value={settings.store_phone} onChange={(e) => setSettings({ ...settings, store_phone: e.target.value })} placeholder="03xx-xxxxxxx" style={{ width: '100%' }} disabled={!isAdmin} />
            </div>
          </div>

          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Receipt Footer Message</label>
            <InputText value={settings.receipt_footer} onChange={(e) => setSettings({ ...settings, receipt_footer: e.target.value })} placeholder="Thank you for shopping!" style={{ width: '100%' }} disabled={!isAdmin} />
          </div>

          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>GST / Sales Tax Rate (%)</label>
            <InputNumber value={parseFloat(settings.tax_rate)} onValueChange={(e) => setSettings({ ...settings, tax_rate: e.value || 0 })} mode="decimal" min={0} max={100} style={{ width: '100%' }} disabled={!isAdmin} />
            <small style={{ color: '#64748b' }}>If set to greater than zero, tax will automatically calculate during cashier checkout.</small>
          </div>

          {isAdmin ? (
            <Button type="submit" label="SAVE BRANDING CONFIGURATIONS" icon="pi pi-save" loading={loading} style={{ background: '#22c55e', borderColor: '#22c55e', padding: '12px', fontWeight: 'bold', marginTop: '10px' }} />
          ) : (
            <div style={{ background: '#f1f5f9', padding: '12px', borderRadius: '6px', color: '#64748b', fontSize: '0.9rem' }}>
              <i className="pi pi-lock" style={{ marginRight: '6px' }}></i> Only administrators can change system-wide configurations.
            </div>
          )}
        </form>
      </div>

      {/* Admin Panel: Add Employee / Cashier Accounts */}
      {isAdmin && (
        <div className="glass-card" style={{ padding: '24px' }}>
          <h3 style={{ margin: '0 0 20px 0' }}>Register Employee Accounts</h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '-10px', marginBottom: '20px' }}>
            Add and configure user accounts for cashiers or other store managers.
          </p>

          <form onSubmit={handleRegisterUser} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Employee Username *</label>
              <InputText value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Username (used for login)" style={{ width: '100%' }} required />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Employee Password *</label>
              <InputText type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Choose Password" style={{ width: '100%' }} required />
            </div>

            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Assigned System Role</label>
              <Dropdown 
                value={newRole} 
                options={[{ label: 'Cashier (Access POS only)', value: 'cashier' }, { label: 'Administrator (Full Access)', value: 'admin' }]} 
                onChange={(e) => setNewRole(e.value)} 
                style={{ width: '100%' }}
              />
            </div>

            <Button type="submit" label="REGISTER EMPLOYEE ACCOUNT" icon="pi pi-user-plus" loading={userLoading} style={{ background: '#3b82f6', borderColor: '#3b82f6', padding: '12px', fontWeight: 'bold', marginTop: '10px' }} />
          </form>
        </div>
      )}
    </div>
  );
};

export default Settings;
