import React, { useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { usePresets } from '../hooks/use-presets';
import { Input, Button } from '../components/shared';
import { AlertCircle, CheckCircle2, ArrowRight, Save } from 'lucide-react';

type AuthMode = 'login' | 'signup' | 'forgot-password';

export const AuthPage: React.FC = () => {
  const { signIn, signUp, resetPasswordForEmail, user } = useAuth();
  const { presets } = usePresets();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [mode, setMode] = useState<AuthMode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (user) {
    return <Navigate to={from} replace />;
  }

  const guestPresetsCount = presets.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await signIn(email, password);
        if (error) throw error;
      } else if (mode === 'signup') {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters');
        }
        const { error } = await signUp(email, password);
        if (error) throw error;
        setSuccessMessage(
          'Account created. Check your email to confirm and finish signing in.'
        );
      } else if (mode === 'forgot-password') {
        const { error } = await resetPasswordForEmail(email);
        if (error) throw error;
        setSuccessMessage('Reset link sent. Check your inbox.');
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = (newMode: AuthMode) => {
    setMode(newMode);
    setError(null);
    setSuccessMessage(null);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-7rem)] py-10 px-4">
      <div className="w-full max-w-sm">
        {guestPresetsCount > 0 && (
          <div className="mb-6 p-3 bg-moss-50 border border-moss-100 rounded-lg flex items-start gap-3">
            <Save className="w-4 h-4 text-moss-700 mt-0.5 shrink-0" />
            <div className="flex-1 text-sm">
              <p className="text-ink-900 font-medium">
                {guestPresetsCount} unsaved recipe
                {guestPresetsCount !== 1 ? 's' : ''} on this device
              </p>
              <p className="text-ink-500 mt-0.5 leading-relaxed">
                {mode === 'signup'
                  ? "We'll sync them to your account on sign-up."
                  : 'Sign in to sync them across devices.'}
              </p>
            </div>
          </div>
        )}

        <div className="text-center mb-6">
          <h1 className="text-2xl text-ink-900 mb-1 font-serif">
            {mode === 'login' && 'Welcome back'}
            {mode === 'signup' && 'Create your account'}
            {mode === 'forgot-password' && 'Reset your password'}
          </h1>
          <p className="text-sm text-ink-500 max-w-xs mx-auto">
            {mode === 'login' &&
              'Sign in to sync your recipes, catalog, and sales.'}
            {mode === 'signup' &&
              'Save your work to the cloud and access it from any device.'}
            {mode === 'forgot-password' &&
              "We'll send you a secure link to reset your password."}
          </p>
        </div>

        <div className="card p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-rust-50 border border-rust-100 rounded-md flex items-start gap-2 animate-shake">
                <AlertCircle className="w-4 h-4 text-rust-700 shrink-0 mt-0.5" />
                <p className="text-sm text-rust-700">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-moss-50 border border-moss-100 rounded-md flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-moss-700 shrink-0 mt-0.5" />
                <p className="text-sm text-moss-700">{successMessage}</p>
              </div>
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoComplete="email"
            />

            {mode !== 'forgot-password' && (
              <Input
                label="Password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete={
                  mode === 'login' ? 'current-password' : 'new-password'
                }
              />
            )}

            {mode === 'signup' && (
              <Input
                label="Confirm password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                autoComplete="new-password"
              />
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              isLoading={loading}
              className="w-full"
            >
              {mode === 'login' && 'Sign in'}
              {mode === 'signup' && 'Create account'}
              {mode === 'forgot-password' && 'Send reset link'}
              {!loading && <ArrowRight className="w-4 h-4" aria-hidden="true" />}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t border-border-subtle flex flex-col gap-3 text-center text-sm">
            {mode === 'login' && (
              <>
                <p className="text-ink-500">
                  Don&apos;t have an account?{' '}
                  <button
                    onClick={() => toggleMode('signup')}
                    className="text-clay font-medium hover:text-clay-600 transition-colors focus:outline-none focus:underline"
                  >
                    Sign up
                  </button>
                </p>
                <button
                  onClick={() => toggleMode('forgot-password')}
                  className="text-xs text-ink-500 hover:text-ink-700 transition-colors focus:outline-none focus:underline"
                >
                  Forgot your password?
                </button>
              </>
            )}

            {mode === 'signup' && (
              <p className="text-ink-500">
                Already have an account?{' '}
                <button
                  onClick={() => toggleMode('login')}
                  className="text-clay font-medium hover:text-clay-600 transition-colors focus:outline-none focus:underline"
                >
                  Sign in
                </button>
              </p>
            )}

            {mode === 'forgot-password' && (
              <button
                onClick={() => toggleMode('login')}
                className="text-clay font-medium hover:text-clay-600 transition-colors focus:outline-none focus:underline"
              >
                Back to sign in
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
