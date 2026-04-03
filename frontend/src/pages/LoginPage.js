import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Shield, Lock, Mail } from 'lucide-react';

export function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login(email, password);
    
    if (result.success) {
      navigate('/');
    } else {
      setError(result.error);
    }
    
    setIsLoading(false);
  };

  return (
    <div 
      className="min-h-screen bg-zinc-950 flex items-center justify-center p-4"
      style={{
        backgroundImage: 'url(https://static.prod-images.emergentagent.com/jobs/55e7a3f8-51c4-4947-ad9f-521e5730ebf2/images/5de27d329c58409b622ddebaeb23dc1e6d4efccf783f4507bc2381cdf948e83b.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'overlay'
      }}
    >
      <div className="absolute inset-0 bg-zinc-950/90" />
      
      <div className="relative w-full max-w-md" data-testid="login-form">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-zinc-900 border border-zinc-800 rounded-sm mb-4">
            <img 
              src="https://static.prod-images.emergentagent.com/jobs/55e7a3f8-51c4-4947-ad9f-521e5730ebf2/images/3981a70c4aa550c060c50b85595daba21b0780f677279179893c93e0deaf2e87.png"
              alt="DOC Logo"
              className="w-14 h-14 object-contain"
            />
          </div>
          <h1 className="text-2xl font-bold text-zinc-50 tracking-tight">System Department</h1>
          <p className="text-yellow-400 text-sm tracking-[0.3em] font-medium">OF CORRECTIONS</p>
        </div>

        {/* Login Form */}
        <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm">
          <div className="flex items-center gap-2 mb-6 pb-4 border-b border-zinc-800">
            <Shield className="w-5 h-5 text-yellow-400" />
            <h2 className="text-lg font-semibold text-zinc-100">Logowanie do systemu</h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-zinc-400 text-xs uppercase tracking-wider">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@doc.gov"
                  required
                  data-testid="login-email-input"
                  className="pl-10 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-zinc-400 text-xs uppercase tracking-wider">
                Hasło
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  data-testid="login-password-input"
                  className="pl-10 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus:ring-1 focus:ring-yellow-400 focus:border-yellow-400"
                />
              </div>
            </div>

            {error && (
              <div 
                className="bg-red-500/10 border border-red-500/20 text-red-400 px-4 py-3 rounded-sm text-sm"
                data-testid="login-error"
              >
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              data-testid="login-submit-button"
              className="w-full bg-yellow-400 text-zinc-950 hover:bg-yellow-500 font-bold rounded-sm transition-colors"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Logowanie...
                </span>
              ) : (
                'Zaloguj się'
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-zinc-600 text-xs mt-4">
          Dostęp tylko dla autoryzowanego personelu
        </p>
      </div>
    </div>
  );
}

export default LoginPage;
