import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck, Send, AlertCircle, Info, CheckCircle2, ArrowRight, User } from 'lucide-react';
import { SECURITY_PATTERNS, SUPPORTED_CURRENCIES } from '../lib/constants';
import { isValidIBAN, extractIBAN } from 'ibantools';
import { cn } from '../lib/utils';
import { useAuth } from './AuthContext';

export const PaymentPage = () => {
  const { authFetch } = useAuth();
  const [form, setForm] = useState({
    recipientName: '',
    iban: '',
    swiftBic: '',
    amount: '',
    currency: 'ZAR',
    reason: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success, setSuccess] = useState(false);
  const [csrfToken, setCsrfToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchCsrfToken = async () => {
      try {
        const res = await authFetch('/api/csrf-token');
        const data = await res.json();
        setCsrfToken(data.csrfToken);
      } catch (e) {
        setErrors(prev => ({ ...prev, csrf: 'Security token acquisition failed' }));
      }
    };
    fetchCsrfToken();
  }, []);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!SECURITY_PATTERNS.RECIPIENT_NAME.test(form.recipientName)) newErrors.recipientName = 'Invalid name (A-Z, space, hyphen only)';
    
    // Global Relay Validation: Identify non-IBAN countries for structural fallback
    const ibanValue = form.iban.replace(/\s/g, '');
    const countryCode = ibanValue.substring(0, 2);
    const extraction = extractIBAN(ibanValue);
    const isKnownNonIBAN = ['US', 'ZA', 'JP', 'CA', 'AU', 'NZ'].includes(countryCode);

    if (!isValidIBAN(ibanValue)) {
      if (isKnownNonIBAN) {
        // Fallback to structural regex for non-IBAN global sectors
        if (!SECURITY_PATTERNS.IBAN.test(ibanValue)) {
          newErrors.iban = `Invalid structural format for ${countryCode} sector`;
        }
      } else {
        // Strict enforcement for IBAN-compliant sectors
        if (!/^[A-Z]{2}$/.test(countryCode)) {
          newErrors.iban = 'Invalid or missing country code';
        } else if (!extraction.valid) {
          newErrors.iban = `Structural Sync Failure: ${countryCode} not recognized`;
        } else {
          newErrors.iban = `Checksum mismatch for ${countryCode}`;
        }
      }
    }

    if (!SECURITY_PATTERNS.SWIFT_BIC.test(form.swiftBic)) newErrors.swiftBic = 'Invalid SWIFT/BIC code';
    if (!SECURITY_PATTERNS.AMOUNT.test(form.amount) || parseFloat(form.amount) <= 0) newErrors.amount = 'Invalid amount';
    if (!SECURITY_PATTERNS.REASON.test(form.reason)) newErrors.reason = 'Reason contains invalid characters';
    
    if (!csrfToken) newErrors.csrf = 'Security session not fully established';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInitialSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validate()) {
      setShowConfirm(true);
    }
  };

  const processPayment = async () => {
    if (!csrfToken) return;
    setIsSubmitting(true);
    try {
      const res = await authFetch('/api/pay', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken
        },
        body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }),
      });
      
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setShowConfirm(false);
      } else {
        let errorMsg = 'Payment rejected by system security';
        if (data.error) {
          errorMsg = data.error;
        } else if (data.errors && Array.isArray(data.errors)) {
          errorMsg = `Validation Error: ${data.errors.map((e: any) => e.msg || e.path).join(', ')}`;
        }
        
        setErrors({ server: errorMsg });
        setShowConfirm(false);
      }
    } catch (e) {
      setErrors({ server: 'Relay connection lost: please check your network status.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-10 bg-[#050505]">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto shadow-[0_0_40px_rgba(34,197,94,0.2)]">
            <CheckCircle2 className="w-10 h-10 text-black" />
          </div>
          <h2 className="text-5xl font-bold tracking-tighter">SUCCESS</h2>
          <p className="text-sm opacity-40 uppercase tracking-widest">Transaction Dispatch Confirmed</p>
          <button 
            onClick={() => window.location.href = '/'}
            className="px-10 py-4 bg-white text-black font-bold uppercase tracking-widest text-sm rounded-md hover:bg-gray-200 transition-colors"
          >
            Dashboard
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden bg-[#050505]">
      <header className="h-auto lg:h-24 border-b border-white/10 flex flex-col lg:flex-row lg:items-center justify-between p-6 lg:px-10 flex-shrink-0 gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] opacity-40 font-black">Settlement Engine</span>
          <div className="text-3xl lg:text-4xl font-light tracking-tight">Active Node <span className="opacity-40">#001</span></div>
        </div>
        <div className="flex items-center justify-between lg:justify-end gap-4 w-full lg:w-auto">
          <div className="flex flex-col items-end">
            <div className="text-[10px] uppercase font-bold text-green-500 italic">Network Stable</div>
            <div className="text-[8px] opacity-40">LATENCY: 0.002s</div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-green-500/10 border border-green-500/20 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-green-500" />
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 lg:p-10 grid grid-cols-12 gap-8 lg:gap-10 overflow-y-auto overflow-x-hidden">
        <section className="col-span-12 xl:col-span-8 space-y-8 lg:space-y-10">
          <header className="max-w-xl">
            <h1 className="text-5xl lg:text-7xl font-bold tracking-tighter mb-4 italic leading-none">Global<br />Disbursement</h1>
            <p className="text-sm opacity-40 leading-relaxed uppercase tracking-tight">
              Initiate high-frequency settlements across the international banking relay. 
              Cryptographic integrity is maintained via real-time validation.
            </p>
          </header>

          <form onSubmit={handleInitialSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6 relative p-6 lg:p-8 bg-white/[0.02] border border-white/10 rounded-3xl backdrop-blur-3xl">
            {/* ... (csrf loading and error states remain the same - they refer to rounded-3xl which fits) */}
            {!csrfToken && !errors.csrf && (
              <div className="absolute inset-0 bg-[#050505]/80 backdrop-blur-sm z-20 flex items-center justify-center rounded-3xl border border-white/5">
                <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span className="text-[10px] uppercase tracking-[0.4em] font-black opacity-60 text-center">Initializing Cryptography...</span>
                </div>
              </div>
            )}
            
            {errors.csrf && (
              <div className="absolute inset-0 bg-[#050505]/95 backdrop-blur-xl z-30 flex flex-col items-center justify-center p-6 lg:p-8 text-center rounded-3xl border border-red-500/20">
                <AlertCircle className="w-10 h-10 lg:w-12 lg:h-12 text-red-500 mb-6 drop-shadow-[0_0_15px_rgba(239,68,68,0.4)]" />
                <h3 className="text-2xl lg:text-3xl font-bold tracking-tighter mb-2 italic uppercase">Access Revoked</h3>
                <p className="text-[11px] opacity-60 uppercase tracking-[0.2em] max-w-xs mb-8 leading-relaxed">{errors.csrf}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="w-full lg:w-auto px-12 py-4 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-lg hover:scale-105 transition-transform"
                >
                  Hard Reboot
                </button>
              </div>
            )}

            <input type="hidden" name="_csrf" value={csrfToken || ''} />

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-black">Recipient Entity</label>
              <div className="relative group">
                <input
                  type="text"
                  required
                  className={cn(
                    "w-full bg-white/5 border border-white/10 rounded-xl p-4 lg:p-5 text-sm font-bold uppercase tracking-tight focus:border-white/40 transition-all outline-none",
                    errors.recipientName && "border-red-500/50 bg-red-500/[0.02]"
                  )}
                  placeholder="LEGAL ENTITY NAME"
                  value={form.recipientName}
                  onChange={(e) => setForm({ ...form, recipientName: e.target.value })}
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-100 transition-opacity">
                  <User className="w-4 h-4" />
                </div>
              </div>
              {errors.recipientName && <p className="text-[9px] text-red-500 uppercase font-black tracking-widest italic">{errors.recipientName}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-black">Target IBAN</label>
              <div className="relative group">
                <input
                  type="text"
                  required
                  className={cn(
                    "w-full bg-white/5 border border-white/10 rounded-xl p-4 lg:p-5 pr-14 text-sm font-mono tracking-wider focus:border-white/40 transition-all outline-none",
                    errors.iban ? "border-red-500/50 bg-red-500/[0.02]" : (form.iban && (isValidIBAN(form.iban.replace(/\s/g, '')) || SECURITY_PATTERNS.IBAN.test(form.iban.replace(/\s/g, ''))) ? "border-green-500/50 bg-green-500/[0.02]" : "")
                  )}
                  placeholder="ES00 0000 0000..."
                  value={form.iban}
                  onChange={(e) => setForm({ ...form, iban: e.target.value.toUpperCase() })}
                />
                <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center">
                  {form.iban.length > 4 && (
                    (isValidIBAN(form.iban.replace(/\s/g, '')) || (['US', 'ZA', 'JP', 'CA', 'AU', 'NZ'].includes(form.iban.replace(/\s/g, '').substring(0,2)) && SECURITY_PATTERNS.IBAN.test(form.iban.replace(/\s/g, '')))) ? (
                      <CheckCircle2 className="w-5 h-5 text-green-500 drop-shadow-[0_0_8px_rgba(34,197,94,0.4)]" />
                    ) : (
                      <AlertCircle className="w-5 h-5 text-red-500 opacity-40" />
                    )
                  )}
                </div>
              </div>
              <div className="flex justify-between items-center px-1">
                <span className={cn(
                  "text-[8px] uppercase tracking-widest font-black italic",
                  (isValidIBAN(form.iban.replace(/\s/g, '')) || (['US', 'ZA', 'JP', 'CA', 'AU', 'NZ'].includes(form.iban.replace(/\s/g, '').substring(0,2)) && SECURITY_PATTERNS.IBAN.test(form.iban.replace(/\s/g, '')))) ? "text-emerald-500" : "text-white/20"
                )}>
                  {form.iban && (
                    (isValidIBAN(form.iban.replace(/\s/g, ''))) 
                      ? "CHECKSUM: VALID" 
                      : (['US', 'ZA', 'JP', 'CA', 'AU', 'NZ'].includes(form.iban.replace(/\s/g, '').substring(0,2)) && SECURITY_PATTERNS.IBAN.test(form.iban.replace(/\s/g, '')))
                        ? "GLOBAL RELAY: ALIGNED"
                        : (form.iban.length < 15 ? "SCANNING..." : "SYNC FAILED")
                  )}
                </span>
                {errors.iban && <p className="text-[9px] text-red-500 uppercase font-black tracking-widest italic">{errors.iban}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <label className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-black">SWIFT / BIC</label>
                <div className="group/tooltip relative inline-flex">
                  <Info className="w-2.5 h-2.5 opacity-20 hover:opacity-100 transition-opacity cursor-help" />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-black border border-white/10 rounded-lg shadow-2xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-all z-50 text-[9px] leading-relaxed text-white/60 tracking-tight normal-case">
                    <span className="text-white block font-black mb-1 italic">Proactive Routing</span>
                    The SWIFT/BIC code identifies the specific bank branch globally. It is required for all cross-border settlements to ensure accuracy.
                  </div>
                </div>
              </div>
              <div className="relative group">
                <input
                  type="text"
                  required
                  className={cn(
                    "w-full bg-white/5 border border-white/10 rounded-xl p-4 lg:p-5 text-sm font-mono tracking-widest focus:border-white/40 transition-all outline-none uppercase",
                    errors.swiftBic && "border-red-500/50 bg-red-500/[0.02]"
                  )}
                  placeholder="BANKSEC33XXX"
                  value={form.swiftBic}
                  onChange={(e) => setForm({ ...form, swiftBic: e.target.value.toUpperCase() })}
                />
              </div>
              {errors.swiftBic && <p className="text-[9px] text-red-500 uppercase font-black tracking-widest italic">{errors.swiftBic}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-black">Amount</label>
              <div className="relative group">
                <div className="absolute left-5 top-1/2 -translate-y-1/2 text-sm font-black opacity-20 group-hover:opacity-60 transition-opacity">
                  {form.currency}
                </div>
                <input
                  type="number"
                  step="0.01"
                  required
                  className={cn(
                    "w-full bg-white/5 border border-white/10 rounded-xl p-4 lg:p-5 pl-14 text-sm font-bold tracking-tighter focus:border-white/40 transition-all outline-none",
                    errors.amount && "border-red-500/50 bg-red-500/[0.02]"
                  )}
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              {errors.amount && <p className="text-[9px] text-red-500 uppercase font-black tracking-widest italic">{errors.amount}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-black">Currency</label>
              <div className="relative group">
                <select
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-4 lg:p-5 text-xs font-bold font-mono tracking-widest outline-none appearance-none cursor-pointer focus:border-white/40 hover:bg-white/10 transition-all"
                  value={form.currency}
                  onChange={(e) => setForm({ ...form, currency: e.target.value })}
                >
                  {SUPPORTED_CURRENCIES.map(c => <option key={c} value={c} className="bg-[#050505]">{c}</option>)}
                </select>
                <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none opacity-20">
                   <ArrowRight className="w-3 h-3 rotate-90" />
                </div>
              </div>
            </div>

            <div className="md:col-span-2 space-y-2">
              <label className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-black">Settlement Reason</label>
              <textarea
                required
                rows={3}
                className={cn(
                  "w-full bg-white/5 border border-white/10 rounded-xl p-4 lg:p-5 text-sm focus:border-white/40 transition-all outline-none resize-none font-medium tracking-tight",
                  errors.reason && "border-red-500/50 bg-red-500/[0.02]"
                )}
                placeholder="Disbursement details..."
                value={form.reason}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
              {errors.reason && <p className="text-[9px] text-red-500 uppercase font-black tracking-widest italic">{errors.reason}</p>}
            </div>

            {errors.server && (
              <div className="md:col-span-2 bg-red-500/10 border border-red-500/20 p-4 lg:p-6 rounded-2xl text-red-500 text-[11px] font-black uppercase tracking-[0.2em] italic flex items-center gap-4">
                 <AlertCircle className="w-5 h-5 flex-shrink-0" />
                 <span>ERROR: {errors.server}</span>
              </div>
            )}

            <button
              type="submit"
              className="md:col-span-2 mt-4 lg:mt-6 bg-white text-black font-black py-5 lg:py-6 rounded-2xl text-xs uppercase tracking-[0.4em] hover:bg-gray-200 hover:scale-[1.02] active:scale-95 transition-all shadow-xl"
            >
              Authorize
            </button>
          </form>
        </section>

        <section className="col-span-12 xl:col-span-4 space-y-8 h-fit">
          <div className="bg-white/[0.03] border border-white/10 rounded-3xl p-6 lg:p-8 flex flex-col backdrop-blur-xl shadow-2xl">
            <h3 className="text-[10px] uppercase tracking-[0.3em] font-black opacity-40 mb-8 lg:mb-12 text-center lg:text-left">Security Telemetry</h3>
            
            <div className="space-y-8 lg:space-y-10">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] uppercase font-black opacity-30 tracking-[0.2em]">AES BUFFER</span>
                  <span className="text-[9px] font-black text-green-500 uppercase italic">ACTIVE</span>
                </div>
                <div className="flex gap-1 h-1.5">
                   {[1,2,3,4,5,6].map(i => (
                     <motion.div 
                        key={i}
                        initial={{ opacity: 0.2 }}
                        animate={{ opacity: [0.2, 1, 0.2] }}
                        transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                        className="flex-1 bg-green-500 rounded-full" 
                     />
                   ))}
                </div>
              </div>

              <div className="bg-white/5 p-6 lg:p-8 border border-white/10 rounded-2xl space-y-4 lg:space-y-6 relative overflow-hidden group">
                <div className="absolute top-0 left-0 w-0.5 lg:w-1 h-full bg-blue-500 opacity-20" />
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-xl border border-white/10 flex-shrink-0">
                    <Info className="w-4 h-4 text-blue-400" />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.2em] font-black">Relay Protocol</span>
                </div>
                <p className="text-[10px] lg:text-[11px] opacity-40 leading-relaxed italic font-medium">
                  "Settlements are cryptographically signed. Outbound packets are inspected for anomalies."
                </p>
              </div>

              <div className="p-6 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl flex items-center justify-between">
                 <div>
                   <div className="text-[8px] uppercase font-bold text-emerald-500 mb-1 italic">V4.2 FIRMWARE</div>
                   <div className="text-[10px] font-black opacity-60 uppercase">CSURF SECURE</div>
                 </div>
                 <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center font-black text-[10px] text-emerald-500">
                    OK
                 </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-3xl p-6 flex items-center justify-center lg:justify-start gap-6 group hover:bg-white/10 transition-colors">
            <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center border border-white/10">
              <ShieldCheck className="w-6 h-6 opacity-40 group-hover:text-green-500 group-hover:opacity-100 transition-all" />
            </div>
            <div>
              <div className="text-[10px] uppercase font-black tracking-widest mb-1 italic">Validated Exit</div>
              <div className="text-[9px] opacity-40 uppercase tracking-tighter">Verified by Payment Protocol</div>
            </div>
          </div>
        </section>
      </div>

      {/* Confirmation Overlay */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center p-0 lg:p-4">
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setShowConfirm(false)}
              className="absolute inset-0 bg-black/95 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="relative w-full max-w-lg bg-[#050505] border-t lg:border border-white/10 p-8 lg:p-12 rounded-t-[2.5rem] lg:rounded-3xl shadow-2xl shadow-black pb-12 lg:pb-12"
            >
               <div className="w-12 h-1.5 bg-white/10 rounded-full mx-auto mb-8 lg:hidden" />
               <h3 className="text-3xl lg:text-4xl font-bold tracking-tighter mb-8 italic uppercase">Review</h3>
               <div className="space-y-6 text-sm mb-12">
                  <div className="flex flex-col lg:flex-row lg:justify-between border-b border-white/5 pb-4 gap-1">
                    <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Recipient Entity</span>
                    <span className="font-bold uppercase tracking-tight truncate">{form.recipientName}</span>
                  </div>
                  <div className="flex flex-col lg:flex-row lg:justify-between border-b border-white/5 pb-4 gap-1">
                    <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold">IBAN Target</span>
                    <span className="font-mono text-[11px] lg:text-[12px] opacity-60 tracking-wider truncate">{form.iban}</span>
                  </div>
                  <div className="flex flex-col lg:flex-row lg:justify-between border-b border-white/5 pb-4 gap-1">
                    <span className="text-[10px] uppercase tracking-widest opacity-40 font-bold">Settle Amount</span>
                    <span className="text-2xl font-bold tracking-tighter">{form.currency} {parseFloat(form.amount).toFixed(2)}</span>
                  </div>
               </div>
               <div className="flex gap-4">
                  <button onClick={() => setShowConfirm(false)} className="flex-1 py-4 lg:py-5 border border-white/10 text-[10px] uppercase tracking-widest font-black hover:bg-white/5 transition-colors rounded-xl">Abort</button>
                  <button onClick={processPayment} disabled={isSubmitting} className="flex-1 bg-white text-black font-black text-[10px] uppercase tracking-widest py-4 lg:py-5 hover:bg-gray-200 transition-colors disabled:opacity-50 rounded-xl">
                    {isSubmitting ? 'Verifying...' : 'Authorize'}
                  </button>
               </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
