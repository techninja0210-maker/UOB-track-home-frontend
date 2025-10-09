'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';

interface Receipt {
  _id: string;
  referenceNumber: string;
  dateOfIssue: string;
  dateOfRelease: string | null;
  depositorName: string;
  representative: string | null;
  depositorsAddress: string;
  type: string;
  dateOfInitialDeposit: string;
  nameType: string;
  numberOfItems: number;
  chargePerBox: number;
  origin: string;
  declaredValue: number;
  weight: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

interface Statistics {
  total: number;
  active: number;
  released: number;
  pending: number;
}

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [statistics, setStatistics] = useState<Statistics>({ total: 0, active: 0, released: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<Receipt | null>(null);
  const [formData, setFormData] = useState({
    dateOfIssue: '',
    dateOfRelease: '',
    depositorName: '',
    representative: '',
    depositorsAddress: '',
    type: '',
    dateOfInitialDeposit: '',
    nameType: '',
    numberOfItems: '',
    chargePerBox: '',
    origin: '',
    declaredValue: '',
    weight: '',
    status: 'active'
  });
  const [deleteModal, setDeleteModal] = useState<{ show: boolean; receipt: Receipt | null }>({ show: false, receipt: null });
  const router = useRouter();

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
    
    if (!token) {
      router.push('/login');
      return;
    }

    try {
      const response = await axios.get('/api/auth/verify', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.user.role !== 'admin') {
        router.push('/');
        return;
      }
      
      setUser(response.data.user);
      await loadReceipts();
    } catch (error) {
      console.error('Authentication error:', error);
      Cookies.remove('authToken');
      sessionStorage.removeItem('authToken');
      router.push('/login');
    }
  };

  const loadReceipts = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const response = await axios.get('/api/admin/receipts', {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setReceipts(response.data);
      calculateStatistics(response.data);
    } catch (error) {
      console.error('Error loading receipts:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (receiptsData: Receipt[]) => {
    const stats = {
      total: receiptsData.length,
      active: receiptsData.filter(r => r.status === 'active').length,
      released: receiptsData.filter(r => r.status === 'released').length,
      pending: receiptsData.filter(r => r.status === 'pending').length
    };
    setStatistics(stats);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      const receiptData = {
        ...formData,
        numberOfItems: parseInt(formData.numberOfItems),
        chargePerBox: parseFloat(formData.chargePerBox),
        declaredValue: parseFloat(formData.declaredValue),
        weight: parseFloat(formData.weight),
        dateOfIssue: new Date(formData.dateOfIssue),
        dateOfRelease: formData.dateOfRelease ? new Date(formData.dateOfRelease) : null,
        dateOfInitialDeposit: new Date(formData.dateOfInitialDeposit)
      };

      if (editingReceipt) {
        await axios.put(`/api/admin/receipts/${editingReceipt._id}`, receiptData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post('/api/admin/receipts', receiptData, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }

      setShowModal(false);
      setEditingReceipt(null);
      resetForm();
      await loadReceipts();
    } catch (error) {
      console.error('Error saving receipt:', error);
    }
  };

  const handleEdit = (receipt: Receipt) => {
    setEditingReceipt(receipt);
    setFormData({
      dateOfIssue: receipt.dateOfIssue.split('T')[0],
      dateOfRelease: receipt.dateOfRelease ? receipt.dateOfRelease.split('T')[0] : '',
      depositorName: receipt.depositorName,
      representative: receipt.representative || '',
      depositorsAddress: receipt.depositorsAddress,
      type: receipt.type,
      dateOfInitialDeposit: receipt.dateOfInitialDeposit.split('T')[0],
      nameType: receipt.nameType,
      numberOfItems: receipt.numberOfItems.toString(),
      chargePerBox: receipt.chargePerBox.toString(),
      origin: receipt.origin,
      declaredValue: receipt.declaredValue.toString(),
      weight: receipt.weight.toString(),
      status: receipt.status
    });
    setShowModal(true);
  };

  const handleDelete = async () => {
    if (!deleteModal.receipt) return;

    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      await axios.delete(`/api/admin/receipts/${deleteModal.receipt._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setDeleteModal({ show: false, receipt: null });
      await loadReceipts();
    } catch (error) {
      console.error('Error deleting receipt:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      dateOfIssue: '',
      dateOfRelease: '',
      depositorName: '',
      representative: '',
      depositorsAddress: '',
      type: '',
      dateOfInitialDeposit: '',
      nameType: '',
      numberOfItems: '',
      chargePerBox: '',
      origin: '',
      declaredValue: '',
      weight: '',
      status: 'active'
    });
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid">
      {/* Header */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <a className="navbar-brand" href="#">
            <i className="fas fa-shield-alt me-2"></i>
            UOB Security House - Admin Panel
          </a>
          <div className="navbar-nav ms-auto">
            <a className="nav-link" href="/">
              <i className="fas fa-home me-1"></i>Client View
            </a>
          </div>
        </div>
      </nav>

      <div className="container mt-4">
        {/* Dashboard Stats */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card bg-primary text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h4 className="card-title">{statistics.total}</h4>
                    <p className="card-text">Total Receipts</p>
                  </div>
                  <div className="align-self-center">
                    <i className="fas fa-file-invoice fa-2x"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-success text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h4 className="card-title">{statistics.active}</h4>
                    <p className="card-text">Active</p>
                  </div>
                  <div className="align-self-center">
                    <i className="fas fa-check-circle fa-2x"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-info text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h4 className="card-title">{statistics.released}</h4>
                    <p className="card-text">Released</p>
                  </div>
                  <div className="align-self-center">
                    <i className="fas fa-unlock fa-2x"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-warning text-white">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <div>
                    <h4 className="card-title">{statistics.pending}</h4>
                    <p className="card-text">Pending</p>
                  </div>
                  <div className="align-self-center">
                    <i className="fas fa-clock fa-2x"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="row mb-4">
          <div className="col-md-12">
            <button 
              className="btn btn-success" 
              onClick={() => {
                resetForm();
                setEditingReceipt(null);
                setShowModal(true);
              }}
            >
              <i className="fas fa-plus me-2"></i>Add New Receipt
            </button>
          </div>
        </div>

        {/* Receipts Table */}
        <div className="card shadow-sm">
          <div className="card-header bg-light">
            <h4 className="mb-0">
              <i className="fas fa-list me-2"></i>
              All Custodial Receipts
            </h4>
          </div>
          <div className="card-body">
            <div className="table-responsive">
              <table className="table table-striped table-hover">
                <thead className="table-dark">
                  <tr>
                    <th>Reference Number</th>
                    <th>Depositor Name</th>
                    <th>Type</th>
                    <th>Date of Issue</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((receipt) => (
                    <tr key={receipt._id}>
                      <td>{receipt.referenceNumber}</td>
                      <td>{receipt.depositorName}</td>
                      <td>{receipt.type}</td>
                      <td>{formatDate(receipt.dateOfIssue)}</td>
                      <td>
                        <span className={`badge ${
                          receipt.status === 'active' ? 'bg-success' : 
                          receipt.status === 'released' ? 'bg-info' : 'bg-warning'
                        }`}>
                          {receipt.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <button 
                          className="btn btn-outline-primary btn-sm me-2"
                          onClick={() => handleEdit(receipt)}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button 
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => setDeleteModal({ show: true, receipt })}
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add/Edit Receipt Modal */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingReceipt ? 'Edit Custodial Receipt' : 'Add New Custodial Receipt'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => {
                    setShowModal(false);
                    setEditingReceipt(null);
                    resetForm();
                  }}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {/* Custodial Details */}
                  <h6 className="text-muted mb-3">CUSTODIAL DETAILS</h6>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="dateOfIssue" className="form-label">Date of Issue</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        id="dateOfIssue" 
                        name="dateOfIssue"
                        value={formData.dateOfIssue}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="dateOfRelease" className="form-label">Date of Release</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        id="dateOfRelease" 
                        name="dateOfRelease"
                        value={formData.dateOfRelease}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>

                  {/* Depositor Details */}
                  <h6 className="text-muted mb-3">DEPOSITOR DETAILS</h6>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="depositorName" className="form-label">Depositor Name</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        id="depositorName" 
                        name="depositorName"
                        value={formData.depositorName}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="representative" className="form-label">Representative</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        id="representative" 
                        name="representative"
                        value={formData.representative}
                        onChange={handleInputChange}
                      />
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-12">
                      <label htmlFor="depositorsAddress" className="form-label">Depositor's Address</label>
                      <textarea 
                        className="form-control" 
                        id="depositorsAddress" 
                        name="depositorsAddress"
                        value={formData.depositorsAddress}
                        onChange={handleInputChange}
                        rows={2} 
                        required 
                      ></textarea>
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="type" className="form-label">Type</label>
                      <select 
                        className="form-control" 
                        id="type" 
                        name="type"
                        value={formData.type}
                        onChange={handleInputChange}
                        required
                      >
                        <option value="">Select Type</option>
                        <option value="Personal">Personal</option>
                        <option value="Corporate">Corporate</option>
                        <option value="Government">Government</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="dateOfInitialDeposit" className="form-label">Date of Initial Deposit</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        id="dateOfInitialDeposit" 
                        name="dateOfInitialDeposit"
                        value={formData.dateOfInitialDeposit}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                  </div>

                  {/* Item Details */}
                  <h6 className="text-muted mb-3">ITEM DETAILS</h6>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="nameType" className="form-label">Name/Type</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        id="nameType" 
                        name="nameType"
                        value={formData.nameType}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="numberOfItems" className="form-label">Number of Items</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="numberOfItems" 
                        name="numberOfItems"
                        value={formData.numberOfItems}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-4">
                      <label htmlFor="chargePerBox" className="form-label">Charge Per Box</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="form-control" 
                        id="chargePerBox" 
                        name="chargePerBox"
                        value={formData.chargePerBox}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="origin" className="form-label">Origin</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        id="origin" 
                        name="origin"
                        value={formData.origin}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                    <div className="col-md-4">
                      <label htmlFor="declaredValue" className="form-label">Declared Value</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="form-control" 
                        id="declaredValue" 
                        name="declaredValue"
                        value={formData.declaredValue}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                  </div>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label htmlFor="weight" className="form-label">Weight (kg)</label>
                      <input 
                        type="number" 
                        step="0.01" 
                        className="form-control" 
                        id="weight" 
                        name="weight"
                        value={formData.weight}
                        onChange={handleInputChange}
                        required 
                      />
                    </div>
                    <div className="col-md-6">
                      <label htmlFor="status" className="form-label">Status</label>
                      <select 
                        className="form-control" 
                        id="status" 
                        name="status"
                        value={formData.status}
                        onChange={handleInputChange}
                      >
                        <option value="active">Active</option>
                        <option value="released">Released</option>
                        <option value="pending">Pending</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => {
                      setShowModal(false);
                      setEditingReceipt(null);
                      resetForm();
                    }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save Receipt
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal.show && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Delete</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setDeleteModal({ show: false, receipt: null })}
                ></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to delete this receipt? This action cannot be undone.</p>
                <p><strong>Reference Number:</strong> {deleteModal.receipt?.referenceNumber}</p>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setDeleteModal({ show: false, receipt: null })}
                >
                  Cancel
                </button>
                <button 
                  type="button" 
                  className="btn btn-danger" 
                  onClick={handleDelete}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

