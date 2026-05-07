import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { Toast } from 'primereact/toast';
import api from '../api';

const Customers = () => {
  const [customers, setCustomers] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [loading, setLoading] = useState(true);

  // Dialogs
  const [customerDialog, setCustomerDialog] = useState(false);
  const [payDebtDialog, setPayDebtDialog] = useState(false);
  const [deleteCustomerDialog, setDeleteCustomerDialog] = useState(false);

  // Customer State
  const [customer, setCustomer] = useState({
    id: null,
    name: '',
    phone: '',
    email: '',
    debt_balance: 0.00,
  });

  const [paymentAmount, setPaymentAmount] = useState(0);

  const toast = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
    } catch (err) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Failed to retrieve customer lists.' });
    } finally {
      setLoading(false);
    }
  };

  const openNew = () => {
    setCustomer({
      id: null,
      name: '',
      phone: '',
      email: '',
      debt_balance: 0.00,
    });
    setCustomerDialog(true);
  };

  const editCustomer = (cust) => {
    setCustomer({ ...cust });
    setCustomerDialog(true);
  };

  const openPayDebt = (cust) => {
    setCustomer({ ...cust });
    setPaymentAmount(parseFloat(cust.debt_balance));
    setPayDebtDialog(true);
  };

  const confirmDeleteCustomer = (cust) => {
    setCustomer(cust);
    setDeleteCustomerDialog(true);
  };

  const saveCustomer = async () => {
    if (!customer.name.trim()) {
      toast.current.show({ severity: 'error', summary: 'Validation Error', detail: 'Customer name is required.' });
      return;
    }

    try {
      if (customer.id) {
        await api.put(`/customers/${customer.id}`, customer);
        toast.current.show({ severity: 'success', summary: 'Successful', detail: 'Customer record updated.' });
      } else {
        await api.post('/customers', customer);
        toast.current.show({ severity: 'success', summary: 'Successful', detail: 'Customer ledger created.' });
      }
      fetchCustomers();
      setCustomerDialog(false);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to save customer.';
      toast.current.show({ severity: 'error', summary: 'Save Failed', detail: errorMsg });
    }
  };

  const handlePayDebtSubmit = async () => {
    if (paymentAmount <= 0) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Amount must be greater than zero.' });
      return;
    }

    try {
      const res = await api.post(`/customers/${customer.id}/pay-debt`, { amount: paymentAmount });
      toast.current.show({ severity: 'success', summary: 'Payment Recorded', detail: res.data.message, life: 3000 });
      fetchCustomers();
      setPayDebtDialog(false);
    } catch (err) {
      toast.current.show({ severity: 'error', summary: 'Transaction Failed', detail: 'Failed to log debt payment.' });
    }
  };

  const deleteCustomer = async () => {
    try {
      await api.delete(`/customers/${customer.id}`);
      toast.current.show({ severity: 'success', summary: 'Successful', detail: 'Customer ledger deleted.' });
      fetchCustomers();
      setDeleteCustomerDialog(false);
    } catch (err) {
      toast.current.show({ severity: 'error', summary: 'Delete Failed', detail: 'Failed to delete customer record.' });
    }
  };

  // Templates
  const debtBalanceTemplate = (rowData) => {
    const bal = parseFloat(rowData.debt_balance);
    const hasDebt = bal > 0;
    return (
      <span style={{ fontWeight: 'bold', color: hasDebt ? '#ef4444' : '#22c55e' }}>
        Rs. {bal.toFixed(2)}
      </span>
    );
  };

  const actionBodyTemplate = (rowData) => {
    if (rowData.name === 'Walk-in Customer') return null;
    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        {parseFloat(rowData.debt_balance) > 0 && (
          <Button label="Pay Debt" icon="pi pi-dollar" onClick={() => openPayDebt(rowData)} className="p-button-sm p-button-success" style={{ height: '32px' }} />
        )}
        <Button icon="pi pi-pencil" onClick={() => editCustomer(rowData)} className="p-button-rounded p-button-secondary p-button-text" style={{ height: '32px', width: '32px' }} />
        <Button icon="pi pi-trash" onClick={() => confirmDeleteCustomer(rowData)} className="p-button-rounded p-button-danger p-button-text" style={{ height: '32px', width: '32px' }} disabled={!isAdmin} />
      </div>
    );
  };

  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
      <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Customer Credit Ledger</h2>
      <div style={{ display: 'flex', gap: '10px' }}>
        <span className="p-input-icon-left">
          <i className="pi pi-search"></i>
          <InputText type="search" onInput={(e) => setGlobalFilter(e.target.value)} placeholder="Search customer..." style={{ paddingLeft: '30px', height: '40px' }} />
        </span>
        <Button label="Add Customer" icon="pi pi-user-plus" onClick={openNew} style={{ background: '#3b82f6', borderColor: '#3b82f6', height: '40px' }} />
      </div>
    </div>
  );

  return (
    <div className="pos-content">
      <Toast ref={toast} />

      <div className="glass-card" style={{ padding: '24px' }}>
        <DataTable 
          value={customers} 
          paginator 
          rows={10} 
          rowsPerPageOptions={[5, 10, 25]}
          loading={loading}
          globalFilter={globalFilter}
          header={header}
          emptyMessage="No customers found."
          responsiveLayout="scroll"
        >
          <Column field="id" header="ID" sortable style={{ width: '8%', fontWeight: 'bold' }} />
          <Column field="name" header="Customer Name" sortable style={{ width: '25%', fontWeight: 600 }} />
          <Column field="phone" header="Phone Number" body={(r) => r.phone || <em style={{ color: '#aaa' }}>None</em>} sortable style={{ width: '20%' }} />
          <Column field="email" header="Email Address" body={(r) => r.email || <em style={{ color: '#aaa' }}>None</em>} sortable style={{ width: '22%' }} />
          <Column field="debt_balance" header="Ledger Balance" body={debtBalanceTemplate} sortable style={{ width: '15%' }} />
          <Column header="Actions" body={actionBodyTemplate} style={{ width: '10%' }} />
        </DataTable>
      </div>

      {/* Add / Edit Customer Dialog */}
      <Dialog 
        header={customer.id ? 'Modify Customer Info' : 'Add New Customer Ledger'} 
        visible={customerDialog} 
        style={{ width: '400px' }} 
        modal 
        onHide={() => setCustomerDialog(false)}
        footer={(
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={() => setCustomerDialog(false)} />
            <Button label="Save Record" icon="pi pi-check" onClick={saveCustomer} style={{ background: '#3b82f6', borderColor: '#3b82f6' }} />
          </div>
        )}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Customer Name *</label>
            <InputText value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="Full Name" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Phone Number</label>
            <InputText value={customer.phone || ''} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="e.g. 0312-xxxxxxx" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Email Address</label>
            <InputText value={customer.email || ''} onChange={(e) => setCustomer({ ...customer, email: e.target.value })} placeholder="name@domain.com" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Starting Ledger Balance (Debt)</label>
            <InputNumber value={parseFloat(customer.debt_balance)} onValueChange={(e) => setCustomer({ ...customer, debt_balance: e.value || 0 })} mode="decimal" min={0} style={{ width: '100%' }} disabled={customer.id !== null} />
          </div>
        </div>
      </Dialog>

      {/* Pay Debt Repayment Dialog */}
      <Dialog 
        header="Record Ledger Repayment" 
        visible={payDebtDialog} 
        style={{ width: '380px' }} 
        modal 
        onHide={() => setPayDebtDialog(false)}
        footer={(
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={() => setPayDebtDialog(false)} />
            <Button label="Record Repayment" icon="pi pi-check" className="p-button-success" onClick={handlePayDebtSubmit} />
          </div>
        )}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
              <span>Account Name:</span>
              <strong>{customer.name}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Current Outstanding Debt:</span>
              <strong style={{ color: '#ef4444' }}>Rs. {parseFloat(customer.debt_balance).toFixed(2)}</strong>
            </div>
          </div>

          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Payment Received Amount (Rs.)</label>
            <InputNumber value={paymentAmount} onValueChange={(e) => setPaymentAmount(e.value || 0)} mode="decimal" min={0.01} max={parseFloat(customer.debt_balance)} style={{ width: '100%' }} inputStyle={{ fontSize: '1.25rem', fontWeight: 'bold' }} ref={(el) => el && setTimeout(() => el.input && el.input.select(), 50)} />
          </div>
        </div>
      </Dialog>

      {/* Delete Customer Confirmation Dialog */}
      <Dialog 
        header="Confirm Ledger Deletion" 
        visible={deleteCustomerDialog} 
        style={{ width: '350px' }} 
        modal 
        onHide={() => setDeleteCustomerDialog(false)}
        footer={(
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={() => setDeleteCustomerDialog(false)} />
            <Button label="Delete Account" icon="pi pi-trash" className="p-button-danger" onClick={deleteCustomer} />
          </div>
        )}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="pi pi-exclamation-triangle" style={{ fontSize: '2rem', color: '#ef4444' }}></i>
          <span>Are you sure you want to delete customer <strong>{customer.name}</strong>? This will erase their entire shopping and transaction history.</span>
        </div>
      </Dialog>
    </div>
  );
};

export default Customers;
