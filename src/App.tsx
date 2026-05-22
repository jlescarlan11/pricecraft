import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './components/layout';
import {
  CalculatorPage,
  FAQPage,
  AuthPage,
  AccountPage,
  CatalogPage,
  ScanReceiptPage,
  DriftPage,
} from './pages';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ToastProvider } from './components/shared';

function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppLayout>
          <Routes>
            <Route path="/" element={<CalculatorPage />} />
            <Route path="/faq" element={<FAQPage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route
              path="/account"
              element={
                <ProtectedRoute>
                  <AccountPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/catalog"
              element={
                <ProtectedRoute>
                  <CatalogPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/scan-receipt"
              element={
                <ProtectedRoute>
                  <ScanReceiptPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/drift"
              element={
                <ProtectedRoute>
                  <DriftPage />
                </ProtectedRoute>
              }
            />
          </Routes>
        </AppLayout>
      </ToastProvider>
    </AuthProvider>
  );
}

export default App;
