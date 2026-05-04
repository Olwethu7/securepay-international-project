import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { Shield, Lock, Mail, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

export const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      if (res.ok) {
        login(data.user, data.token);
        navigate('/');
      } else {
        let errorMsg = data.error || 'Invalid credentials';
        if (data.errors && Array.isArray(data.errors)) {
          errorMsg = `Security Shield: ${data.errors.map((e: any) => e.msg).join(', ')}`;
        }
        setError(errorMsg);
      }
    } catch (e) {
      setError('Connection failed: relay node unreachable');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex flex-col items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#050505] border border-white/10 rounded-lg p-12 shadow-2xl"
      >
        <div className="mb-12 text-center">
          <div className="text-[10px] tracking-[0.3em] uppercase opacity-40 font-semibold mb-2">Sentinel</div>
          <div className="text-4xl font-bold tracking-tighter italic">PAYPORTAL</div>
        </div>
        
        <h1 className="text-xl font-bold tracking-tighter text-center text-white mb-2 uppercase">Authentication Required</h1>
        <p className="text-zinc-500 text-[11px] text-center mb-10 uppercase tracking-widest">Encrypted session gateway</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-md flex items-center gap-2 mb-8 text-[10px] uppercase font-bold tracking-wider italic">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Email Interface</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
              <input
                type="email"
                required
                className="w-full bg-white/5 border border-white/10 rounded-md py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-white/40 transition-all"
                placeholder="you@domain.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Cryptographic Key</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
              <input
                type="password"
                required
                className="w-full bg-white/5 border border-white/10 rounded-md py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-white/40 transition-all"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-bold py-5 rounded-md transition-colors text-[10px] uppercase tracking-[0.2em] hover:bg-gray-200 disabled:opacity-50"
          >
            {loading ? 'Verifying...' : 'Establish Session'}
          </button>
        </form>

        <p className="mt-10 text-center text-[10px] uppercase tracking-widest text-zinc-600">
          Unregistered?{' '}
          <Link to="/register" className="text-white hover:underline transition-all">
            Initialize Account
          </Link>
        </p>
      </motion.div>
    </div>
  );
};
