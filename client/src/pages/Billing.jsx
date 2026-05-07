import React, { useState, useEffect, useRef } from 'react';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dropdown } from 'primereact/dropdown';
import { Dialog } from 'primereact/dialog';
import { InputNumber } from 'primereact/inputnumber';
import { Toast } from 'primereact/toast';
import { AutoComplete } from 'primereact/autocomplete';
import api from '../api';
import ThermalReceipt from '../components/ThermalReceipt';

const Billing = () => {
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [cart, setCart] = useState([]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  
  // Dialogs
  const [checkoutVisible, setCheckoutVisible] = useState(false);
  const [customerModalVisible, setCustomerModalVisible] = useState(false);
  const [receiptVisible, setReceiptVisible] = useState(false);
  
  // Checkout particulars
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [cashReceived, setCashReceived] = useState(0);
  const [cashChange, setCashChange] = useState(0);
  
  // New Customer Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  
  // Receipts & Settings
  const [activeInvoice, setActiveInvoice] = useState(null);
  const [storeSettings, setStoreSettings] = useState(null);
  
  const toast = useRef(null);
  const searchInputRef = useRef(null);

  // Load initial store settings, products, and customers
  useEffect(() => {
    fetchStoreSettings();
    fetchProducts();
    fetchCustomers();
    
    // Add event listener for keyboard shortcuts
    const handleKeyDown = (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        focusSearch();
      } else if (e.key === 'F8') {
        e.preventDefault();
        openCheckout();
      } else if (e.key === 'F9' && activeInvoice) {
        e.preventDefault();
        printReceipt();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cart, activeInvoice]);

  const fetchStoreSettings = async () => {
    try {
      const res = await api.get('/settings');
      setStoreSettings(res.data);
      setTaxRate(parseFloat(res.data.tax_rate || 0));
    } catch (err) {
      console.error('Failed to load store settings:', err.message);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      console.error('Failed to fetch product list:', err.message);
    }
  };

  const fetchCustomers = async () => {
    try {
      const res = await api.get('/customers');
      setCustomers(res.data);
      // Select walk-in by default
      const walkIn = res.data.find(c => c.name.toLowerCase().includes('walk-in'));
      if (walkIn) setSelectedCustomer(walkIn);
    } catch (err) {
      console.error('Failed to fetch customers list:', err.message);
    }
  };

  const focusSearch = () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  };

  const searchProduct = (event) => {
    const query = event.query.toLowerCase().trim();
    setSearchQuery(event.query);
    
    // 1. Check for exact Barcode match (Simulating laser scanner)
    const exactBarcodeMatch = products.find(p => p.barcode === query);
    if (exactBarcodeMatch) {
      addToCart(exactBarcodeMatch);
      setSearchQuery('');
      return;
    }

    // 2. Filter products for autocomplete dropdown
    const results = products.filter(p => {
      return p.name.toLowerCase().includes(query) || p.barcode.includes(query);
    });
    setFilteredProducts(results);
  };

  const handleSelectProduct = (e) => {
    addToCart(e.value);
    setSearchQuery('');
  };

  const addToCart = (product) => {
    if (product.stock_quantity <= 0) {
      toast.current.show({ severity: 'warn', summary: 'Stock Out', detail: `${product.name} is out of stock!`, life: 3000 });
      return;
    }

    const existingIndex = cart.findIndex(item => item.product_id === product.id);
    let updatedCart = [...cart];

    if (existingIndex > -1) {
      const currentQty = updatedCart[existingIndex].quantity;
      if (currentQty + 1 > product.stock_quantity) {
        toast.current.show({ severity: 'warn', summary: 'Stock Limit', detail: `Only ${product.stock_quantity} units available in stock.`, life: 3000 });
        return;
      }
      updatedCart[existingIndex].quantity += 1;
      updatedCart[existingIndex].total_price = updatedCart[existingIndex].quantity * parseFloat(product.retail_price);
    } else {
      updatedCart.push({
        product_id: product.id,
        name: product.name,
        barcode: product.barcode,
        quantity: 1,
        unit_price: parseFloat(product.retail_price),
        total_price: parseFloat(product.retail_price),
        stock_quantity: product.stock_quantity,
      });
    }

    setCart(updatedCart);
    toast.current.show({ severity: 'success', summary: 'Item Added', detail: `${product.name} added to cart.`, life: 1000 });
  };

  const updateQuantity = (productId, qty) => {
    const parsedQty = parseInt(qty) || 0;
    const existing = cart.find(item => item.product_id === productId);
    if (!existing) return;

    if (parsedQty > existing.stock_quantity) {
      toast.current.show({ severity: 'warn', summary: 'Stock Limit', detail: `Only ${existing.stock_quantity} units available.`, life: 3000 });
      return;
    }

    if (parsedQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const updatedCart = cart.map(item => {
      if (item.product_id === productId) {
        return {
          ...item,
          quantity: parsedQty,
          total_price: parsedQty * item.unit_price,
        };
      }
      return item;
    });

    setCart(updatedCart);
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.product_id !== productId));
  };

  // Calculations
  const getSubtotal = () => cart.reduce((sum, item) => sum + item.total_price, 0);
  const getTaxAmount = () => (getSubtotal() * taxRate) / 100;
  const getNetTotal = () => Math.max(0, getSubtotal() - discount + getTaxAmount());

  // Handle Checkout
  const openCheckout = () => {
    if (cart.length === 0) {
      toast.current.show({ severity: 'warn', summary: 'Cart Empty', detail: 'Please add items to cart before checking out.', life: 3000 });
      return;
    }
    setCashReceived(Math.ceil(getNetTotal()));
    setCheckoutVisible(true);
  };

  useEffect(() => {
    const net = getNetTotal();
    setCashChange(Math.max(0, cashReceived - net));
  }, [cashReceived, discount]);

  const handleCheckoutSubmit = async () => {
    const net = getNetTotal();
    if (paymentMethod === 'Cash' && cashReceived < net) {
      toast.current.show({ severity: 'error', summary: 'Insufficient Cash', detail: 'Cash received is less than the payable amount.', life: 3000 });
      return;
    }

    if (paymentMethod === 'Debt' && (!selectedCustomer || selectedCustomer.name.toLowerCase().includes('walk-in'))) {
      toast.current.show({ severity: 'error', summary: 'Ledger Required', detail: 'Please select a registered customer to record ledger debt payments.', life: 3000 });
      return;
    }

    const payload = {
      customer_id: selectedCustomer ? selectedCustomer.id : null,
      items: cart,
      subtotal: getSubtotal(),
      discount,
      tax: getTaxAmount(),
      net_amount: net,
      payment_method: paymentMethod,
      cash_received: paymentMethod === 'Cash' ? cashReceived : null,
      cash_change: paymentMethod === 'Cash' ? cashChange : null,
    };

    try {
      const res = await api.post('/sales', payload);
      toast.current.show({ severity: 'success', summary: 'Sale Recorded', detail: 'Invoice successfully registered.', life: 2000 });
      
      setActiveInvoice(res.data.invoice);
      setCart([]);
      setDiscount(0);
      setCheckoutVisible(false);
      
      // Refresh inventory stock lists
      fetchProducts();
      fetchCustomers();

      // Automatically pop up thermal receipt for printing
      setReceiptVisible(true);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to complete checkout.';
      toast.current.show({ severity: 'error', summary: 'Checkout Error', detail: errorMsg, life: 4000 });
    }
  };

  // Dial pad helper
  const handleKeypadPress = (val) => {
    if (val === 'C') {
      setCashReceived(0);
    } else if (val === 'Exact') {
      setCashReceived(Math.ceil(getNetTotal()));
    } else {
      setCashReceived(prev => parseFloat(`${prev}${val}`));
    }
  };

  // Quick Add Customer
  const handleAddCustomer = async (e) => {
    e.preventDefault();
    if (!newCustName.trim()) return;

    try {
      const res = await api.post('/customers', {
        name: newCustName,
        phone: newCustPhone || null,
        email: newCustEmail || null,
      });
      toast.current.show({ severity: 'success', summary: 'Customer Created', detail: 'Customer ledger added successfully.' });
      
      // Reload list and set active
      const updatedListRes = await api.get('/customers');
      setCustomers(updatedListRes.data);
      const created = updatedListRes.data.find(c => c.id === res.data.id);
      if (created) setSelectedCustomer(created);
      
      // Reset form
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      setCustomerModalVisible(false);
    } catch (err) {
      const errMsg = err.response?.data?.error || 'Failed to add customer.';
      toast.current.show({ severity: 'error', summary: 'Save Failed', detail: errMsg });
    }
  };

  const printReceipt = () => {
    window.print();
  };

  return (
    <div className="pos-content" style={{ padding: '16px', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 65px)', gap: '16px' }}>
      <Toast ref={toast} />

      {/* Main Grid: Left Side Cart (70%), Right Side Calculations/Keypad (30%) */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1fr', gap: '16px', flexGrow: 1, minHeight: 0 }}>
        
        {/* Left Hand: Search & Cart Table */}
        <div className="glass-card" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px', minHeight: 0 }}>
          
          {/* Autocomplete Product Search */}
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span className="p-input-icon-left" style={{ flexGrow: 1 }}>
              <i className="pi pi-search" style={{ left: '12px' }}></i>
              <AutoComplete 
                ref={searchInputRef}
                value={searchQuery}
                suggestions={filteredProducts}
                completeMethod={searchProduct}
                field="name"
                placeholder="Scan Barcode or Search Product (F2)..."
                onChange={(e) => setSearchQuery(e.value)}
                onSelect={handleSelectProduct}
                style={{ width: '100%' }}
                inputStyle={{ width: '100%', height: '48px', textIndent: '25px', borderRadius: '8px', fontSize: '1.1rem' }}
                panelStyle={{ maxHeight: '300px' }}
                itemTemplate={(item) => (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px' }}>
                    <strong>{item.name}</strong>
                    <span style={{ color: '#64748b' }}>Barcode: {item.barcode} | Stock: {item.stock_quantity}</span>
                  </div>
                )}
              />
            </span>
          </div>

          {/* Cart Table Area */}
          <div style={{ flexGrow: 1, overflowY: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
            {cart.length === 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8' }}>
                <i className="pi pi-shopping-cart" style={{ fontSize: '4rem', marginBottom: '16px' }}></i>
                <h3>Cash Register Empty</h3>
                <p style={{ margin: '5px 0' }}>Scan barcode or type name in search to register items.</p>
                <small>F2 to Focus Search | F8 to Check Out</small>
              </div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', position: 'sticky', top: 0 }}>
                    <th style={{ padding: '12px 16px', color: '#475569' }}>Item Details</th>
                    <th style={{ padding: '12px 16px', color: '#475569', textAlign: 'center' }}>Qty</th>
                    <th style={{ padding: '12px 16px', color: '#475569', textAlign: 'right' }}>Price</th>
                    <th style={{ padding: '12px 16px', color: '#475569', textAlign: 'right' }}>Total</th>
                    <th style={{ padding: '12px 16px', textAlign: 'center' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {cart.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <small style={{ color: '#64748b' }}>BC: {item.barcode}</small>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          <Button 
                            icon="pi pi-minus" 
                            onClick={() => updateQuantity(item.product_id, item.quantity - 1)}
                            className="p-button-rounded p-button-text p-button-sm"
                            style={{ height: '24px', width: '24px' }}
                          />
                          <InputText 
                            value={item.quantity}
                            onChange={(e) => updateQuantity(item.product_id, e.target.value)}
                            style={{ width: '45px', textAlign: 'center', padding: '4px', fontSize: '0.9rem', fontWeight: 'bold' }}
                          />
                          <Button 
                            icon="pi pi-plus" 
                            onClick={() => updateQuantity(item.product_id, item.quantity + 1)}
                            className="p-button-rounded p-button-text p-button-sm"
                            style={{ height: '24px', width: '24px' }}
                          />
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 500 }}>Rs. {item.unit_price}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: '#0f172a' }}>Rs. {item.total_price}</td>
                      <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                        <Button 
                          icon="pi pi-trash" 
                          onClick={() => removeFromCart(item.product_id)}
                          className="p-button-rounded p-button-danger p-button-text"
                          style={{ color: '#ef4444' }}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Hand: Customers, Subtotals, and Big Checkout Button */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Customer Selection */}
          <div className="glass-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: '1rem' }}>Selected Customer</span>
              <Button 
                icon="pi pi-user-plus" 
                label="New Customer" 
                onClick={() => setCustomerModalVisible(true)}
                className="p-button-sm p-button-text p-button-outlined"
                style={{ padding: '4px 8px', fontSize: '0.8rem' }}
              />
            </div>
            <Dropdown 
              value={selectedCustomer} 
              options={customers} 
              onChange={(e) => setSelectedCustomer(e.value)} 
              optionLabel="name" 
              placeholder="Select Customer"
              filter
              style={{ width: '100%' }}
            />
            {selectedCustomer && selectedCustomer.name !== 'Walk-in Customer' && (
              <div style={{ background: '#f1f5f9', padding: '8px 12px', borderRadius: '6px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#475569' }}>Ledger Balance (Debt):</span>
                <strong style={{ color: parseFloat(selectedCustomer.debt_balance) > 0 ? '#ef4444' : '#22c55e' }}>
                  Rs. {parseFloat(selectedCustomer.debt_balance).toFixed(2)}
                </strong>
              </div>
            )}
          </div>

          {/* Subtotals & Payment Details */}
          <div className="glass-card" style={{ padding: '20px', flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '16px' }}>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                <span style={{ color: '#64748b' }}>Subtotal:</span>
                <span style={{ fontWeight: 600 }}>Rs. {getSubtotal().toFixed(0)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#64748b', fontSize: '1.1rem' }}>Discount (Rs.):</span>
                <InputNumber 
                  value={discount} 
                  onValueChange={(e) => setDiscount(e.value || 0)} 
                  mode="decimal" 
                  min={0}
                  max={getSubtotal()}
                  inputStyle={{ width: '100px', textAlign: 'right', padding: '4px 8px', fontSize: '1rem', fontWeight: 'bold' }}
                />
              </div>

              {taxRate > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.1rem' }}>
                  <span style={{ color: '#64748b' }}>GST / Tax ({taxRate}%):</span>
                  <span style={{ fontWeight: 600 }}>Rs. {getTaxAmount().toFixed(0)}</span>
                </div>
              )}

              <div style={{ borderTop: '2px dashed #cbd5e1', margin: '8px 0' }}></div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#1e293b' }}>NET TOTAL:</span>
                <span style={{ fontSize: '2rem', fontWeight: '800', color: '#10b981' }}>Rs. {getNetTotal().toFixed(0)}</span>
              </div>
            </div>

            <Button 
              label="CHECKOUT & PAY (F8)" 
              icon="pi pi-credit-card" 
              onClick={openCheckout}
              disabled={cart.length === 0}
              style={{
                width: '100%',
                padding: '16px',
                fontSize: '1.3rem',
                fontWeight: 'bold',
                background: '#10b981',
                borderColor: '#10b981',
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
              }}
            />
          </div>
        </div>
      </div>

      {/* Checkout Dialog */}
      <Dialog 
        header="Complete Store Sale Checkout" 
        visible={checkoutVisible} 
        onHide={() => setCheckoutVisible(false)}
        style={{ width: '650px' }}
        modal
      >
        <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '20px' }}>
          
          {/* Checkout Parameters Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Payment Mode</label>
              <Dropdown 
                value={paymentMethod} 
                options={['Cash', 'Card', 'Mobile', 'Debt']} 
                onChange={(e) => setPaymentMethod(e.value)} 
                style={{ width: '100%' }}
              />
            </div>

            {paymentMethod === 'Cash' && (
              <>
                <div>
                  <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Cash Tendered</label>
                  <InputNumber 
                    value={cashReceived} 
                    onValueChange={(e) => setCashReceived(e.value || 0)} 
                    mode="decimal" 
                    min={0}
                    style={{ width: '100%' }}
                    inputStyle={{ fontSize: '1.4rem', fontWeight: 'bold', height: '45px' }}
                    ref={(el) => el && setTimeout(() => el.input && el.input.select(), 50)}
                  />
                </div>

                <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span>Amount Payable:</span>
                    <strong>Rs. {getNetTotal().toFixed(0)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.25rem' }}>
                    <span style={{ color: '#64748b' }}>Change to Return:</span>
                    <strong style={{ color: '#10b981' }}>Rs. {cashChange.toFixed(0)}</strong>
                  </div>
                </div>
              </>
            )}

            {paymentMethod === 'Debt' && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', padding: '12px', borderRadius: '8px', color: '#991b1b', fontSize: '0.9rem' }}>
                <i className="pi pi-info-circle" style={{ marginRight: '6px' }}></i>
                This sale will be charged to <strong>{selectedCustomer ? selectedCustomer.name : 'N/A'}</strong>'s ledger account. They can settle this later.
              </div>
            )}

            <Button 
              label="FINALIZE TRANSACTION" 
              icon="pi pi-check" 
              onClick={handleCheckoutSubmit}
              className="p-button-success" 
              style={{ padding: '12px', fontSize: '1.1rem', fontWeight: 'bold' }}
            />
          </div>

          {/* Numeric Touch Screen Keypad (Available for Cash tenders) */}
          <div>
            {paymentMethod === 'Cash' ? (
              <>
                <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Touch Keypad</label>
                <div className="keypad-grid">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(num => (
                    <button key={num} onClick={() => handleKeypadPress(num)} className="keypad-btn">
                      {num}
                    </button>
                  ))}
                  <button onClick={() => handleKeypadPress('C')} className="keypad-btn">C</button>
                  <button onClick={() => handleKeypadPress('Exact')} className="keypad-btn action" style={{ gridColumn: 'span 2', fontSize: '0.9rem' }}>
                    Exact Cash
                  </button>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#94a3b8', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                <span>No keypad required for {paymentMethod}.</span>
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {/* Receipt Print Dialogue */}
      <Dialog 
        header="Sale Complete - Thermal Receipt" 
        visible={receiptVisible} 
        onHide={() => setReceiptVisible(false)}
        style={{ width: '420px' }}
        footer={(
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '10px' }}>
            <Button label="PRINT RECEIPT (F9)" icon="pi pi-print" onClick={printReceipt} className="p-button-primary" style={{ flexGrow: 1 }} />
            <Button label="CLOSE" icon="pi pi-times" onClick={() => setReceiptVisible(false)} className="p-button-text p-button-secondary" />
          </div>
        )}
        modal
      >
        <div style={{ background: '#f1f5f9', padding: '15px 0', overflowY: 'auto', maxHeight: '450px' }}>
          <ThermalReceipt sale={activeInvoice} settings={storeSettings} />
        </div>
      </Dialog>

      {/* Add Customer Modal */}
      <Dialog 
        header="Register New Customer Ledger" 
        visible={customerModalVisible} 
        onHide={() => setCustomerModalVisible(false)}
        style={{ width: '400px' }}
        modal
      >
        <form onSubmit={handleAddCustomer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Customer Name *</label>
            <InputText value={newCustName} onChange={(e) => setNewCustName(e.target.value)} placeholder="Full Name" style={{ width: '100%' }} required />
          </div>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Phone Number</label>
            <InputText value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} placeholder="e.g. 0312-xxxxxxx" style={{ width: '100%' }} />
          </div>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Email Address</label>
            <InputText value={newCustEmail} onChange={(e) => setNewCustEmail(e.target.value)} placeholder="name@domain.com" style={{ width: '100%' }} />
          </div>
          <Button type="submit" label="REGISTER CLIENT" icon="pi pi-user-plus" className="p-button-primary" style={{ padding: '10px', marginTop: '10px' }} />
        </form>
      </Dialog>
    </div>
  );
};

export default Billing;
