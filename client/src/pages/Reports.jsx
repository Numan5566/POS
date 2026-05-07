import React, { useState, useEffect, useRef } from 'react';
import { Chart } from 'primereact/chart';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Toast } from 'primereact/toast';
import api from '../api';
import ThermalReceipt from '../components/ThermalReceipt';

const Reports = () => {
  const [analytics, setAnalytics] = useState(null);
  const [salesLogs, setSalesLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Invoice reprint state
  const [invoiceVisible, setInvoiceVisible] = useState(false);
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);

  const toast = useRef(null);

  useEffect(() => {
    fetchReports();
    fetchSalesLogs();
    fetchStoreSettings();
  }, []);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/sales/analytics/reports');
      setAnalytics(res.data);
    } catch (err) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Failed to compile business reports.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesLogs = async () => {
    try {
      const res = await api.get('/sales');
      setSalesLogs(res.data);
    } catch (err) {
      console.error('Failed to load transaction history.');
    }
  };

  const fetchStoreSettings = async () => {
    try {
      const res = await api.get('/settings');
      setStoreSettings(res.data);
    } catch (err) {
      console.error('Failed to load store configs');
    }
  };

  const viewInvoiceDetails = async (saleId) => {
    try {
      const res = await api.get(`/sales/${saleId}`);
      setActiveInvoice(res.data);
      setInvoiceVisible(true);
    } catch (err) {
      toast.current.show({ severity: 'error', summary: 'Load Failed', detail: 'Could not fetch invoice details.' });
    }
  };

  const printReprint = () => {
    window.print();
  };

  // 1. Prepare Line Chart Data (Daily Sales Trend)
  const getLineChartData = () => {
    if (!analytics || !analytics.dailyTrend) return {};
    
    const dates = analytics.dailyTrend.map(d => d.date);
    const revenues = analytics.dailyTrend.map(d => d.revenue);
    const profits = analytics.dailyTrend.map(d => d.profit);

    return {
      labels: dates,
      datasets: [
        {
          label: 'Total Revenue (Rs.)',
          data: revenues,
          fill: false,
          borderColor: '#42a5f5',
          tension: 0.4,
        },
        {
          label: 'Net Profit (Rs.)',
          data: profits,
          fill: false,
          borderColor: '#66bb6a',
          tension: 0.4,
        },
      ],
    };
  };

  // 2. Prepare Pie Chart Data (Payment Distribution)
  const getPieChartData = () => {
    if (!analytics || !analytics.paymentDistribution) return {};

    const labels = analytics.paymentDistribution.map(p => p.payment_method);
    const counts = analytics.paymentDistribution.map(p => p.count);

    return {
      labels: labels,
      datasets: [
        {
          data: counts,
          backgroundColor: ['#42A5F5', '#66BB6A', '#FFA726', '#EF5350'],
          hoverBackgroundColor: ['#64B5F6', '#81C784', '#FFB74D', '#E57373'],
        },
      ],
    };
  };

  const lineOptions = {
    plugins: {
      legend: {
        labels: {
          color: '#495057',
        },
      },
    },
    scales: {
      x: {
        grid: { color: '#ebedef' },
        ticks: { color: '#495057' },
      },
      y: {
        grid: { color: '#ebedef' },
        ticks: { color: '#495057' },
      },
    },
  };

  const pieOptions = {
    plugins: {
      legend: {
        position: 'bottom',
      },
    },
  };

  return (
    <div className="pos-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <Toast ref={toast} />

      {/* Summary Cards Row */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          
          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#dbeafe', color: '#2563eb', height: '50px', width: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="pi pi-dollar" style={{ fontSize: '1.5rem' }}></i>
            </div>
            <div>
              <small style={{ color: '#64748b', fontWeight: 'bold' }}>TOTAL REVENUE</small>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '1.6rem' }}>Rs. {analytics.summaries.totalRevenue.toFixed(0)}</h2>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#dcfce7', color: '#16a34a', height: '50px', width: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="pi pi-chart-line" style={{ fontSize: '1.5rem' }}></i>
            </div>
            <div>
              <small style={{ color: '#64748b', fontWeight: 'bold' }}>GROSS PROFIT</small>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '1.6rem', color: '#16a34a' }}>Rs. {analytics.summaries.grossProfit.toFixed(0)}</h2>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#fef3c7', color: '#d97706', height: '50px', width: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="pi pi-receipt" style={{ fontSize: '1.5rem' }}></i>
            </div>
            <div>
              <small style={{ color: '#64748b', fontWeight: 'bold' }}>TOTAL INVOICES</small>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '1.6rem' }}>{analytics.summaries.totalSalesCount} bills</h2>
            </div>
          </div>

          <div className="glass-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{ background: '#fee2e2', color: '#dc2626', height: '50px', width: '50px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="pi pi-exclamation-triangle" style={{ fontSize: '1.5rem' }}></i>
            </div>
            <div>
              <small style={{ color: '#64748b', fontWeight: 'bold' }}>STOCK WARNINGS</small>
              <h2 style={{ margin: '4px 0 0 0', fontSize: '1.6rem', color: '#dc2626' }}>{analytics.summaries.lowStockCount} items</h2>
            </div>
          </div>

        </div>
      )}

      {/* Charts Row */}
      {analytics && (
        <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1fr', gap: '20px' }}>
          
          <div className="glass-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>Daily Sales & Profit Analysis (Past 10 Days)</h3>
            <Chart type="line" data={getLineChartData()} options={lineOptions} style={{ height: '300px' }} />
          </div>

          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <h3 style={{ margin: '0 0 20px 0' }}>Payment Mode Shares</h3>
            <div style={{ flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Chart type="doughnut" data={getPieChartData()} options={pieOptions} style={{ width: '80%' }} />
            </div>
          </div>

        </div>
      )}

      {/* Sales Transactions Logs DataTable */}
      <div className="glass-card" style={{ padding: '24px' }}>
        <h3 style={{ margin: '0 0 16px 0' }}>Store Sales Transaction Logs</h3>
        
        <DataTable 
          value={salesLogs} 
          paginator 
          rows={5} 
          loading={loading}
          emptyMessage="No completed transactions found."
          responsiveLayout="scroll"
        >
          <Column field="invoice_number" header="Invoice ID" sortable style={{ fontWeight: 'bold', width: '18%' }} />
          <Column field="created_at" header="Date & Time" body={(r) => new Date(r.created_at).toLocaleString()} sortable style={{ width: '22%' }} />
          <Column field="customer_name" header="Customer" body={(r) => r.customer_name || 'Walk-In'} sortable style={{ width: '20%' }} />
          <Column field="payment_method" header="Payment" sortable style={{ width: '12%' }} />
          <Column field="net_amount" header="Bill Total" body={(r) => <strong style={{ color: '#0f172a' }}>Rs. {parseFloat(r.net_amount).toFixed(0)}</strong>} sortable style={{ width: '15%' }} />
          <Column header="Invoice Details" body={(r) => <Button label="View Bill" icon="pi pi-eye" onClick={() => viewInvoiceDetails(r.id)} className="p-button-sm p-button-outlined" />} style={{ width: '13%' }} />
        </DataTable>
      </div>

      {/* Invoice Reprint Modal */}
      <Dialog 
        header="Store Invoice Reprint Preview" 
        visible={invoiceVisible} 
        onHide={() => setInvoiceVisible(false)}
        style={{ width: '420px' }}
        footer={(
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
            <Button label="REPRINT INVOICE" icon="pi pi-print" onClick={printReprint} className="p-button-primary" style={{ flexGrow: 1 }} />
            <Button label="CLOSE" icon="pi pi-times" onClick={() => setInvoiceVisible(false)} className="p-button-text p-button-secondary" />
          </div>
        )}
        modal
      >
        <div style={{ background: '#f1f5f9', padding: '15px 0', overflowY: 'auto', maxHeight: '450px' }}>
          <ThermalReceipt sale={activeInvoice} settings={storeSettings} />
        </div>
      </Dialog>
    </div>
  );
};

export default Reports;
