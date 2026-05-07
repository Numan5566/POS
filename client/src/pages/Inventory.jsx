import React, { useState, useEffect, useRef } from 'react';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { InputText } from 'primereact/inputtext';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { Toast } from 'primereact/toast';
import api from '../api';

const Inventory = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Dialog visibility
  const [productDialog, setProductDialog] = useState(false);
  const [deleteProductDialog, setDeleteProductDialog] = useState(false);
  const [categoryDialog, setCategoryDialog] = useState(false);

  // Form states
  const [product, setProduct] = useState({
    id: null,
    name: '',
    barcode: '',
    purchase_price: 0,
    retail_price: 0,
    stock_quantity: 0,
    min_stock_alert: 5,
    category_id: null,
  });

  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');

  const toast = useRef(null);
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const isAdmin = user.role === 'admin';

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/products');
      setProducts(res.data);
    } catch (err) {
      toast.current.show({ severity: 'error', summary: 'Error', detail: 'Failed to fetch products catalog.' });
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const res = await api.get('/categories');
      setCategories(res.data);
    } catch (err) {
      console.error('Failed to load categories');
    }
  };

  const openNew = () => {
    setProduct({
      id: null,
      name: '',
      barcode: '',
      purchase_price: 0,
      retail_price: 0,
      stock_quantity: 0,
      min_stock_alert: 5,
      category_id: categories.length > 0 ? categories[0].id : null,
    });
    setProductDialog(true);
  };

  const editProduct = (prod) => {
    setProduct({ ...prod });
    setProductDialog(true);
  };

  const confirmDeleteProduct = (prod) => {
    setProduct(prod);
    setDeleteProductDialog(true);
  };

  const saveProduct = async () => {
    if (!product.name.trim() || !product.barcode.trim()) {
      toast.current.show({ severity: 'error', summary: 'Validation Error', detail: 'Product name and barcode are required.', life: 3000 });
      return;
    }

    try {
      if (product.id) {
        // Update product
        await api.put(`/products/${product.id}`, product);
        toast.current.show({ severity: 'success', summary: 'Successful', detail: 'Product updated successfully.', life: 3000 });
      } else {
        // Create product
        await api.post('/products', product);
        toast.current.show({ severity: 'success', summary: 'Successful', detail: 'Product added to inventory.', life: 3000 });
      }
      
      fetchProducts();
      setProductDialog(false);
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to save product.';
      toast.current.show({ severity: 'error', summary: 'Save Failed', detail: errorMsg, life: 4000 });
    }
  };

  const deleteProduct = async () => {
    try {
      await api.delete(`/products/${product.id}`);
      toast.current.show({ severity: 'success', summary: 'Successful', detail: 'Product deleted from inventory.', life: 3000 });
      fetchProducts();
      setDeleteProductDialog(false);
    } catch (err) {
      toast.current.show({ severity: 'error', summary: 'Delete Failed', detail: 'Failed to delete product.' });
    }
  };

  const handleAddCategory = async (e) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;

    try {
      await api.post('/categories', { name: newCategoryName, description: newCategoryDesc });
      toast.current.show({ severity: 'success', summary: 'Successful', detail: 'New Category created.' });
      fetchCategories();
      setNewCategoryName('');
      setNewCategoryDesc('');
      setCategoryDialog(false);
    } catch (err) {
      toast.current.show({ severity: 'error', summary: 'Failed', detail: 'Could not create category.' });
    }
  };

  // Datatable Templates
  const stockBodyTemplate = (rowData) => {
    const isLow = rowData.stock_quantity <= rowData.min_stock_alert;
    return (
      <span className={`stock-badge ${isLow ? 'low' : 'ok'}`}>
        {rowData.stock_quantity} units {isLow && <i className="pi pi-exclamation-triangle" style={{ fontSize: '0.8rem', marginLeft: '4px' }}></i>}
      </span>
    );
  };

  const priceTemplate = (rowData, field) => {
    return <span>Rs. {parseFloat(rowData[field]).toFixed(0)}</span>;
  };

  const actionBodyTemplate = (rowData) => {
    return (
      <div style={{ display: 'flex', gap: '8px' }}>
        <Button icon="pi pi-pencil" onClick={() => editProduct(rowData)} className="p-button-rounded p-button-success p-button-outlined" style={{ height: '32px', width: '32px' }} disabled={!isAdmin} />
        <Button icon="pi pi-trash" onClick={() => confirmDeleteProduct(rowData)} className="p-button-rounded p-button-danger p-button-outlined" style={{ height: '32px', width: '32px' }} disabled={!isAdmin} />
      </div>
    );
  };

  const header = (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
      <h2 style={{ margin: 0, fontSize: '1.4rem' }}>Product Catalog ({products.length})</h2>
      <div style={{ display: 'flex', gap: '10px' }}>
        <span className="p-input-icon-left">
          <i className="pi pi-search"></i>
          <InputText type="search" onInput={(e) => setGlobalFilter(e.target.value)} placeholder="Search product..." style={{ paddingLeft: '30px', height: '40px' }} />
        </span>
        <Button label="Add Product" icon="pi pi-plus" onClick={openNew} style={{ background: '#3b82f6', borderColor: '#3b82f6', height: '40px' }} disabled={!isAdmin} />
        <Button label="New Category" icon="pi pi-tags" onClick={() => setCategoryDialog(true)} className="p-button-outlined p-button-secondary" style={{ height: '40px' }} disabled={!isAdmin} />
      </div>
    </div>
  );

  return (
    <div className="pos-content">
      <Toast ref={toast} />

      <div className="glass-card" style={{ padding: '24px' }}>
        
        <DataTable 
          value={products} 
          paginator 
          rows={10} 
          rowsPerPageOptions={[5, 10, 25, 50]}
          loading={loading}
          globalFilter={globalFilter}
          header={header}
          emptyMessage="No products found in catalog."
          responsiveLayout="scroll"
        >
          <Column field="barcode" header="Barcode / SKU" sortable style={{ fontWeight: 'bold', width: '12%' }} />
          <Column field="name" header="Product Name" sortable style={{ fontWeight: 600, width: '28%' }} />
          <Column field="category_name" header="Category" sortable style={{ width: '15%' }} body={(r) => r.category_name || <em style={{ color: '#aaa' }}>Unassigned</em>} />
          <Column field="purchase_price" header="Cost Price" body={(r) => priceTemplate(r, 'purchase_price')} sortable style={{ width: '12%' }} />
          <Column field="retail_price" header="Sale Price" body={(r) => priceTemplate(r, 'retail_price')} sortable style={{ width: '12%' }} />
          <Column field="stock_quantity" header="Stock Qty" body={stockBodyTemplate} sortable style={{ width: '11%' }} />
          <Column header="Actions" body={actionBodyTemplate} style={{ width: '10%', textAlign: 'center' }} />
        </DataTable>
      </div>

      {/* Add / Edit Product Dialogue */}
      <Dialog 
        header={product.id ? 'Modify Catalog Product' : 'Register New Product'} 
        visible={productDialog} 
        style={{ width: '480px' }} 
        modal 
        onHide={() => setProductDialog(false)}
        footer={(
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '10px' }}>
            <Button label="Cancel" icon="pi pi-times" className="p-button-text" onClick={() => setProductDialog(false)} />
            <Button label="Save Product" icon="pi pi-check" onClick={saveProduct} style={{ background: '#3b82f6', borderColor: '#3b82f6' }} />
          </div>
        )}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Barcode / UPC *</label>
            <InputText value={product.barcode} onChange={(e) => setProduct({ ...product, barcode: e.target.value })} placeholder="Scan or Type SKU" style={{ width: '100%' }} disabled={product.id !== null} />
          </div>

          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Product Title *</label>
            <InputText value={product.name} onChange={(e) => setProduct({ ...product, name: e.target.value })} placeholder="Item Name & Specification" style={{ width: '100%' }} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Category</label>
              <Dropdown 
                value={product.category_id} 
                options={categories} 
                onChange={(e) => setProduct({ ...product, category_id: e.value })} 
                optionValue="id"
                optionLabel="name" 
                placeholder="Select Category"
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Low Stock Limit</label>
              <InputNumber value={product.min_stock_alert} onValueChange={(e) => setProduct({ ...product, min_stock_alert: e.value || 0 })} min={0} style={{ width: '100%' }} />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Purchase Price (Cost) *</label>
              <InputNumber value={parseFloat(product.purchase_price)} onValueChange={(e) => setProduct({ ...product, purchase_price: e.value || 0 })} mode="decimal" min={0} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Retail Price (Sale) *</label>
              <InputNumber value={parseFloat(product.retail_price)} onValueChange={(e) => setProduct({ ...product, retail_price: e.value || 0 })} mode="decimal" min={0} style={{ width: '100%' }} />
            </div>
          </div>

          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Current Stock Quantity</label>
            <InputNumber value={product.stock_quantity} onValueChange={(e) => setProduct({ ...product, stock_quantity: e.value || 0 })} min={0} style={{ width: '100%' }} />
          </div>
        </div>
      </Dialog>

      {/* Delete Product Confirmation Dialogue */}
      <Dialog 
        header="Confirm Deletion" 
        visible={deleteProductDialog} 
        style={{ width: '350px' }} 
        modal 
        onHide={() => setDeleteProductDialog(false)}
        footer={(
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
            <Button label="No" icon="pi pi-times" className="p-button-text" onClick={() => setDeleteProductDialog(false)} />
            <Button label="Yes, Delete" icon="pi pi-trash" className="p-button-danger" onClick={deleteProduct} />
          </div>
        )}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <i className="pi pi-exclamation-triangle" style={{ fontSize: '2rem', color: '#ef4444' }}></i>
          <span>Are you sure you want to delete <strong>{product.name}</strong> from stock inventory? This is permanent.</span>
        </div>
      </Dialog>

      {/* Add Category Dialog */}
      <Dialog 
        header="Create Product Category" 
        visible={categoryDialog} 
        style={{ width: '380px' }} 
        modal 
        onHide={() => setCategoryDialog(false)}
      >
        <form onSubmit={handleAddCategory} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Category Name *</label>
            <InputText value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="e.g. Dairy, Cosmetics" style={{ width: '100%' }} required />
          </div>
          <div>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '6px' }}>Description</label>
            <InputText value={newCategoryDesc} onChange={(e) => setNewCategoryDesc(e.target.value)} placeholder="Optional category overview" style={{ width: '100%' }} />
          </div>
          <Button type="submit" label="ADD CATEGORY" icon="pi pi-check" className="p-button-primary" style={{ padding: '10px', marginTop: '10px' }} />
        </form>
      </Dialog>
    </div>
  );
};

export default Inventory;
