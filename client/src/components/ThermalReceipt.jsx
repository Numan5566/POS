import React from 'react';

const ThermalReceipt = ({ sale, settings }) => {
  if (!sale) return null;

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const storeName = settings?.store_name || 'GRAND SUPERMARKET';
  const storePhone = settings?.store_phone || '0300-1234567';
  const storeAddress = settings?.store_address || 'Main Boulevard, Lahore';
  const footerMsg = settings?.receipt_footer || 'Thank you for shopping with us!';

  return (
    <div id="thermal-receipt" className="thermal-receipt-preview">
      <div style={{ textAlign: 'center', marginBottom: '10px' }}>
        <h2 style={{ margin: '0 0 4px 0', fontSize: '18px', fontWeight: 'bold' }}>{storeName}</h2>
        <p style={{ margin: '0 0 2px 0', fontSize: '11px' }}>{storeAddress}</p>
        <p style={{ margin: '0', fontSize: '11px' }}>Ph: {storePhone}</p>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>

      <div style={{ fontSize: '11px', marginBottom: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Invoice:</span>
          <strong>{sale.invoice_number}</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Date:</span>
          <span>{formatDate(sale.created_at || new Date())}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Cashier:</span>
          <span>{sale.cashier_name || localStorage.getItem('username') || 'Cashier'}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Customer:</span>
          <span>{sale.customer_name || 'Walk-in Customer'}</span>
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
        <thead>
          <tr style={{ textAlign: 'left', borderBottom: '1px dashed #000' }}>
            <th style={{ paddingBottom: '4px' }}>Item Description</th>
            <th style={{ textAlign: 'center', paddingBottom: '4px' }}>Qty</th>
            <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Price</th>
            <th style={{ textAlign: 'right', paddingBottom: '4px' }}>Total</th>
          </tr>
        </thead>
        <tbody>
          {sale.items && sale.items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ paddingTop: '4px', paddingBottom: '4px', maxWidth: '140px', wordBreak: 'break-word' }}>
                {item.product_name || item.name}
              </td>
              <td style={{ textAlign: 'center', paddingTop: '4px', paddingBottom: '4px' }}>
                {item.quantity}
              </td>
              <td style={{ textAlign: 'right', paddingTop: '4px', paddingBottom: '4px' }}>
                {parseFloat(item.unit_price || item.retail_price).toFixed(0)}
              </td>
              <td style={{ textAlign: 'right', paddingTop: '4px', paddingBottom: '4px' }}>
                {parseFloat(item.total_price || (item.quantity * item.retail_price)).toFixed(0)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>

      <div style={{ fontSize: '11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Subtotal:</span>
          <span>Rs. {parseFloat(sale.subtotal).toFixed(0)}</span>
        </div>
        {parseFloat(sale.discount) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', color: '#000' }}>
            <span>Discount:</span>
            <span>-Rs. {parseFloat(sale.discount).toFixed(0)}</span>
          </div>
        )}
        {parseFloat(sale.tax) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>GST / Tax:</span>
            <span>Rs. {parseFloat(sale.tax).toFixed(0)}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '13px', marginTop: '4px' }}>
          <span>NET PAYABLE:</span>
          <span>Rs. {parseFloat(sale.net_amount).toFixed(0)}</span>
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>

      <div style={{ fontSize: '11px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Paid Via:</span>
          <span><strong>{sale.payment_method}</strong></span>
        </div>
        {sale.payment_method === 'Cash' && sale.cash_received && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Cash Received:</span>
              <span>Rs. {parseFloat(sale.cash_received).toFixed(0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Change Returned:</span>
              <span>Rs. {parseFloat(sale.cash_change).toFixed(0)}</span>
            </div>
          </>
        )}
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>

      <div style={{ textAlign: 'center', fontSize: '10px', marginTop: '10px' }}>
        <p style={{ margin: '0 0 5px 0' }}>{footerMsg}</p>
        <p style={{ margin: '0', letterSpacing: '2px', fontWeight: 'bold', fontSize: '9px' }}>
          * * * barcode * * *
        </p>
        <small style={{ color: '#888', display: 'block', marginTop: '4px', fontSize: '8px' }}>
          POS System Software by Antigravity
        </small>
      </div>
    </div>
  );
};

export default ThermalReceipt;
