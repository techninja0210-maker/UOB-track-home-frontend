'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import Cookies from 'js-cookie';

interface Receipt {
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
}

interface User {
  id: number;
  fullName: string;
  email: string;
  role: string;
}

export default function HomePage() {
  const [user, setUser] = useState<User | null>(null);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
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
      
      const userData = response.data.user;
      
      // Redirect admin users to admin panel
      if (userData.role === 'admin') {
        router.push('/admin');
        return;
      }
      
      setUser(userData);
    } catch (error) {
      console.error('Authentication error:', error);
      Cookies.remove('authToken');
      sessionStorage.removeItem('authToken');
      router.push('/login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!referenceNumber.trim()) {
      setError('Please enter a reference number');
      return;
    }

    await trackReceipt(referenceNumber.trim());
  };

  const trackReceipt = async (refNumber: string) => {
    setLoading(true);
    setError('');
    setReceipt(null);

    try {
      const response = await axios.get(`/api/receipts/${refNumber}`);
      setReceipt(response.data);
    } catch (error: any) {
      if (error.response?.status === 404) {
        setError('Receipt not found with the provided reference number');
      } else {
        setError('Error retrieving receipt information');
      }
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = async () => {
    if (!receipt) return;

    try {
      const response = await axios.get(`/api/receipts/${receipt.referenceNumber}/pdf`);
      const receiptData = response.data;

      // Dynamic import for jsPDF
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // Draw repeating diagonal watermark across the page first
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(26);
      doc.setTextColor(200, 200, 200);
      const watermarkText = 'UOB Security House';
      const xStep = 85;
      const yStep = 65;
      for (let y = -20; y < pageHeight + 40; y += yStep) {
        for (let x = -20; x < pageWidth + 60; x += xStep) {
          doc.text(watermarkText, x, y, { angle: 45 });
        }
      }

      // Reset text color for normal content
      doc.setTextColor(0, 0, 0);

      // Header with logo
      const logoPath = '/UOB Security House Logo Option 3.jpg';
      try {
        const logoResponse = await fetch(logoPath);
        const logoBlob = await logoResponse.blob();
        const logoDataUrl = await new Promise<string>((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result as string);
          reader.readAsDataURL(logoBlob);
        });
        doc.addImage(logoDataUrl, 'JPEG', 15, 10, 28, 28);
      } catch (error) {
        // If addImage fails, continue without blocking PDF generation
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('UOB SECURITY HOUSE', 50, 20);
      doc.setFontSize(14);
      doc.text('CUSTODIAL RECEIPT', 50, 30);
      doc.setDrawColor(150);
      doc.line(15, 40, pageWidth - 15, 40);
      let cursorY = 50;

      // Reference Number
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Reference Number: ${receiptData.referenceNumber}`, 20, cursorY);
      cursorY += 10;
      doc.text(`Date of Issue: ${receiptData.dateOfIssue}`, 20, cursorY);
      cursorY += 10;
      doc.text(`Date of Release: ${receiptData.dateOfRelease}`, 20, cursorY);
      cursorY += 15;

      // Custodial Details
      doc.setFontSize(14);
      doc.text('CUSTODIAL DETAILS', 20, cursorY);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      cursorY += 10;
      doc.text(`Date of Issue: ${receiptData.dateOfIssue}`, 20, cursorY);
      cursorY += 10;
      doc.text(`Date of Release: ${receiptData.dateOfRelease}`, 20, cursorY);
      cursorY += 10;
      doc.text(`Date of Initial Deposit: ${receiptData.dateOfInitialDeposit}`, 20, cursorY);
      cursorY += 15;

      // Depositor Details
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('DEPOSITOR DETAILS', 20, cursorY);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      cursorY += 10;
      doc.text(`Depositor Name: ${receiptData.depositorName}`, 20, cursorY);
      cursorY += 10;
      doc.text(`Representative: ${receiptData.representative || 'N/A'}`, 20, cursorY);
      cursorY += 10;
      doc.text(`Depositor's Address: ${receiptData.depositorsAddress}`, 20, cursorY);
      cursorY += 10;
      doc.text(`Type: ${receiptData.type}`, 20, cursorY);
      cursorY += 15;

      // Item Details
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('ITEM DETAILS', 20, cursorY);
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      cursorY += 10;
      doc.text(`Name/Type: ${receiptData.nameType}`, 20, cursorY);
      cursorY += 10;
      doc.text(`Number of Items: ${receiptData.numberOfItems}`, 20, cursorY);
      cursorY += 10;
      doc.text(`Charge Per Box: $${receiptData.chargePerBox.toFixed(2)}`, 20, cursorY);
      cursorY += 10;
      doc.text(`Origin: ${receiptData.origin}`, 20, cursorY);
      cursorY += 10;
      doc.text(`Declared Value: $${receiptData.declaredValue.toFixed(2)}`, 20, cursorY);
      cursorY += 10;
      doc.text(`Weight: ${receiptData.weight} kg`, 20, cursorY);
      cursorY += 15;

      // Legal Notice
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('IMPORTANT NOTICE', 20, cursorY);
      
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const legalText = `We UOB Security House hereby irrevocably acknowledge with full corporate responsibility that this CUSTODIAL RECEIPT with REFERENCE NUMBER: ${receiptData.referenceNumber} was issued by us on Date: ${receiptData.dateOfIssue} and the contents and assets stated herein are deposited with us.

We affirm and certify that assets were received by us sealed and have not been tampered with and have been deposited in safe custody "as is" by the custodian agreement. This safekeeping receipt (SKR) has been issued with full corporate responsibility and this can be relied on.

We wish to notify you that UOB Security House must be given 24 hours prior notice before the goods can be inspected and collected for safekeeping.`;

      cursorY += 10;
      doc.text(legalText, 20, cursorY, { maxWidth: 170 });

      // Download the PDF
      doc.save(`custodial_receipt_${receiptData.referenceNumber}.pdf`);

    } catch (error) {
      setError('Error generating PDF: ' + (error as Error).message);
    }
  };

  const logout = async () => {
    try {
      const token = Cookies.get('authToken') || sessionStorage.getItem('authToken');
      await axios.post('/api/auth/logout', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      Cookies.remove('authToken');
      sessionStorage.removeItem('authToken');
      router.push('/login');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (!user) {
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
            UOB Security House
          </a>
          <span className="navbar-text">
            Welcome, {user.fullName} | <a href="#" onClick={logout} className="text-white text-decoration-none">Logout</a>
          </span>
        </div>
      </nav>

      {/* Main Content */}
      <div className="container mt-4">
        <div className="row justify-content-center">
          <div className="col-lg-8">
            {/* Search Section */}
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-light">
                <h4 className="mb-0">
                  <i className="fas fa-search me-2"></i>
                  Track Your Custodial Receipt
                </h4>
              </div>
              <div className="card-body">
                <form onSubmit={handleSubmit}>
                  <div className="row">
                    <div className="col-md-8">
                      <div className="mb-3">
                        <label htmlFor="referenceNumber" className="form-label">Reference Number</label>
                        <input 
                          type="text" 
                          className="form-control" 
                          id="referenceNumber" 
                          value={referenceNumber}
                          onChange={(e) => setReferenceNumber(e.target.value)}
                          placeholder="Enter your reference number (e.g., UOB12345678)" 
                          required 
                        />
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="mb-3">
                        <label className="form-label">&nbsp;</label>
                        <button type="submit" className="btn btn-primary w-100">
                          <i className="fas fa-search me-2"></i>Track Receipt
                        </button>
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>

            {/* Loading Spinner */}
            {loading && (
              <div className="text-center">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="mt-2">Searching for your receipt...</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="alert alert-danger" role="alert">
                <i className="fas fa-exclamation-triangle me-2"></i>
                {error}
              </div>
            )}

            {/* Receipt Details */}
            {receipt && (
              <div id="receiptDetails">
                <div className="card shadow-sm mb-4">
                  <div className="card-header bg-success text-white">
                    <h4 className="mb-0">
                      <i className="fas fa-file-invoice me-2"></i>
                      Custodial Receipt Details
                    </h4>
                  </div>
                  <div className="card-body">
                    {/* Basic Information */}
                    <div className="row mb-4">
                      <div className="col-md-6">
                        <h6 className="text-muted">Reference Number</h6>
                        <p className="fw-bold">{receipt.referenceNumber}</p>
                      </div>
                      <div className="col-md-6">
                        <h6 className="text-muted">Status</h6>
                        <span className={`badge ${
                          receipt.status === 'active' ? 'bg-success' : 
                          receipt.status === 'released' ? 'bg-info' : 'bg-warning'
                        }`}>
                          {receipt.status.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Custodial Details */}
                    <h5 className="border-bottom pb-2 mb-3">CUSTODIAL DETAILS</h5>
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <h6 className="text-muted">Date of Issue</h6>
                        <p>{formatDate(receipt.dateOfIssue)}</p>
                      </div>
                      <div className="col-md-4">
                        <h6 className="text-muted">Date of Release</h6>
                        <p>{receipt.dateOfRelease ? formatDate(receipt.dateOfRelease) : 'N/A'}</p>
                      </div>
                      <div className="col-md-4">
                        <h6 className="text-muted">Date of Initial Deposit</h6>
                        <p>{formatDate(receipt.dateOfInitialDeposit)}</p>
                      </div>
                    </div>

                    {/* Depositor Details */}
                    <h5 className="border-bottom pb-2 mb-3">DEPOSITOR DETAILS</h5>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <h6 className="text-muted">Depositor Name</h6>
                        <p>{receipt.depositorName}</p>
                      </div>
                      <div className="col-md-6">
                        <h6 className="text-muted">Representative</h6>
                        <p>{receipt.representative || 'N/A'}</p>
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <h6 className="text-muted">Depositor's Address</h6>
                        <p>{receipt.depositorsAddress}</p>
                      </div>
                      <div className="col-md-6">
                        <h6 className="text-muted">Type</h6>
                        <p>{receipt.type}</p>
                      </div>
                    </div>

                    {/* Item Details */}
                    <h5 className="border-bottom pb-2 mb-3">ITEM DETAILS</h5>
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <h6 className="text-muted">Name/Type</h6>
                        <p>{receipt.nameType}</p>
                      </div>
                      <div className="col-md-4">
                        <h6 className="text-muted">Number of Items</h6>
                        <p>{receipt.numberOfItems}</p>
                      </div>
                      <div className="col-md-4">
                        <h6 className="text-muted">Charge Per Box</h6>
                        <p>${receipt.chargePerBox.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="row mb-3">
                      <div className="col-md-4">
                        <h6 className="text-muted">Origin</h6>
                        <p>{receipt.origin}</p>
                      </div>
                      <div className="col-md-4">
                        <h6 className="text-muted">Declared Value</h6>
                        <p>${receipt.declaredValue.toFixed(2)}</p>
                      </div>
                      <div className="col-md-4">
                        <h6 className="text-muted">Weight</h6>
                        <p>{receipt.weight} kg</p>
                      </div>
                    </div>

                    {/* Download PDF Button */}
                    <div className="text-center mt-4">
                      <button onClick={generatePDF} className="btn btn-success btn-lg">
                        <i className="fas fa-download me-2"></i>
                        Download Receipt as PDF
                      </button>
                    </div>
                  </div>
                </div>

                {/* Legal Notice */}
                <div className="card shadow-sm">
                  <div className="card-header bg-info text-white">
                    <h5 className="mb-0">
                      <i className="fas fa-info-circle me-2"></i>
                      Important Notice
                    </h5>
                  </div>
                  <div className="card-body">
                    <p className="mb-2">
                      <strong>We UOB Security House hereby irrevocably acknowledge with full corporate responsibility</strong> 
                      that this CUSTODIAL RECEIPT with REFERENCE NUMBER: <span className="fw-bold">{receipt.referenceNumber}</span> 
                      was issued by us on Date: <span className="fw-bold">{formatDate(receipt.dateOfIssue)}</span> 
                      and the contents and assets stated herein are deposited with us.
                    </p>
                    <p className="mb-2">
                      We affirm and certify that assets were received by us sealed and have not been tampered with 
                      and have been deposited in safe custody "as is" by the custodian agreement. This safekeeping 
                      receipt (SKR) has been issued with full corporate responsibility and this can be relied on.
                    </p>
                    <p className="mb-0">
                      <strong>We wish to notify you that UOB Security House must be given 24 hours prior notice 
                      before the goods can be inspected and collected for safekeeping.</strong>
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-dark text-white text-center py-3 mt-5">
        <div className="container">
          <p className="mb-0">&copy; 2024 UOB Security House. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

