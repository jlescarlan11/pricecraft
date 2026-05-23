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
  SettingsPage,
  BatchPlannerPage,
  SalesPage,
  PricingSheetPage,
} from './pages';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { ToastProvider } from './components/shared';
import { OnboardingTour } from './components/onboarding/OnboardingTour';

function App() {
  return (
    <AuthProvider>
      <SettingsProvider>
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
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="/planner"
                element={
                  <ProtectedRoute>
                    <BatchPlannerPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sales"
                element={
                  <ProtectedRoute>
                    <SalesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/pricing-sheet"
                element={
                  <ProtectedRoute>
                    <PricingSheetPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </AppLayout>
          <OnboardingTour />
        </ToastProvider>
      </SettingsProvider>
    </AuthProvider>
  );
}

export default App;
