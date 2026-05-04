import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Shield, Lock, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import { motion } from 'motion/react';
import { SECURITY_PATTERNS } from '../lib/constants';
import { cn } from '../lib/utils';

export const RegisterPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const validate = () => {
    if (!SECURITY_PATTERNS.EMAIL.test(email)) return 'Invalid email format';
    if (!SECURITY_PATTERNS.PASSWORD.test(password)) return 'Password must be at least 8 chars, 1 upper, 1 lower, 1 digit';
    if (password !== confirmPassword) return 'Passwords do not match';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(data.error || 'Registration failed');
      }
    } catch (e) {
      setError('Connection failed');
    } finally {
      setLoading(false);
    }
  };

  const getPasswordStrength = (pass: string) => {
    let score = 0;
    if (pass.length >= 8) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    return score;
  };

  const strength = getPasswordStrength(password);
  const strengthColors = ['bg-red-500', 'bg-orange-500', 'bg-yellow-500', 'bg-emerald-500'];

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
        
        <h1 className="text-xl font-bold tracking-tighter text-center text-white mb-2 uppercase">Account Initialization</h1>
        <p className="text-zinc-500 text-[11px] text-center mb-10 uppercase tracking-widest">Enroll in secure payments network</p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/50 text-red-500 p-4 rounded-md flex items-center gap-2 mb-8 text-[10px] uppercase font-bold tracking-wider italic">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="bg-emerald-500/10 border border-emerald-500/50 text-emerald-500 p-4 rounded-md flex items-center gap-2 mb-8 text-[10px] uppercase font-bold tracking-wider italic">
            <CheckCircle2 className="w-4 h-4" />
            Registry updated. Redirecting...
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Primary Identity (Email)</label>
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
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Security Key Phrase</label>
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
            {password.length > 0 && (
              <div className="space-y-2">
                <div className="flex gap-1 h-1">
                  {[1, 2, 3, 4].map((i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "flex-1 rounded-full transition-all duration-500",
                        strength >= i ? strengthColors[strength - 1] : "bg-white/5"
                      )}
                    />
                  ))}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[8px] uppercase tracking-widest opacity-40 font-bold">Entropy Analysis</span>
                  <span className={cn(
                    "text-[8px] uppercase tracking-widest font-bold italic",
                    strength === 4 ? "text-emerald-500" : "text-white/40"
                  )}>
                    {strength === 0 && "Insecure"}
                    {strength === 1 && "Weak"}
                    {strength === 2 && "Moderate"}
                    {strength === 3 && "Strong"}
                    {strength === 4 && "Cryptographic Grade"}
                  </span>
                </div>
              </div>
            )}
            <p className="text-[9px] text-zinc-600 uppercase tracking-tighter pt-1">Min 8 chars, 1 uppercase, 1 lowercase, 1 number</p>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] uppercase tracking-widest opacity-50 font-bold">Key Confirmation</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
              <input
                type="password"
                required
                className="w-full bg-white/5 border border-white/10 rounded-md py-4 pl-12 pr-4 text-sm text-white focus:outline-none focus:border-white/40 transition-all"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || success}
            className="w-full bg-white text-black font-bold py-5 rounded-md transition-colors text-[10px] uppercase tracking-[0.2em] hover:bg-gray-200 disabled:opacity-50"
          >
            {loading ? 'Processing...' : 'Authorize Enrollment'}
          </button>
        </form>

        <p className="mt-10 text-center text-[10px] uppercase tracking-widest text-zinc-600">
          Registered?{' '}
          <Link to="/login" className="text-white hover:underline transition-all">
            Access Terminal
          </Link>
        </p>
      </motion.div>
    </div>
  );
};
