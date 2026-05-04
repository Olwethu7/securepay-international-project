import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, Search, Filter, X, Zap, Shield, Database } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { useAuth } from './AuthContext';

export const DashboardPage = () => {
  const { authFetch } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [livePulse, setLivePulse] = useState<any[]>([]);

  useEffect(() => {
    let retryCount = 0;
    const maxRetries = 2;
    const timeout = setTimeout(() => {
      if (loading) {
        console.warn("[DASHBOARD] Loading timeout reached - forcing state release");
        setLoading(false);
      }
    }, 8000);

    const fetchData = async () => {
      try {
        const res = await authFetch('/api/dashboard');
        if (!res.ok) {
          throw new Error(`Relay status: ${res.status}`);
        }
        const json = await res.json();
        setData(json);
        setLoading(false);
        clearTimeout(timeout);
      } catch (e) {
        console.error("[DASHBOARD] Fetch failure:", e);
        if (retryCount < maxRetries) {
          retryCount++;
          setTimeout(fetchData, 1500);
        } else {
          setLoading(false);
          clearTimeout(timeout);
        }
      }
    };
    fetchData();

    // WebSocket Integration
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'SETTLEMENT_UPDATE') {
        setLivePulse(prev => [data.payload, ...prev].slice(0, 3));
      }
    };

    return () => ws.close();
  }, []);

  const filteredTransactions = useMemo(() => {
    if (!data?.transactions) return [];
    if (!searchQuery) return data.transactions;
    
    const query = searchQuery.toLowerCase();
    return data.transactions.filter((tx: any) => 
      tx.recipient_name.toLowerCase().includes(query) ||
      tx.iban.toLowerCase().includes(query) ||
      tx.reason.toLowerCase().includes(query) ||
      tx.amount.toString().includes(query)
    );
  }, [data?.transactions, searchQuery]);

  const chartData = useMemo(() => {
    if (!data?.transactions) return [];
    // Last 7 days or last 10 transactions reversed
    return [...data.transactions]
      .reverse()
      .slice(-10)
      .map((tx: any) => ({
        name: new Date(tx.created_at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' }),
        amount: tx.amount,
        timestamp: tx.created_at
      }));
  }, [data?.transactions]);

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );

  if (!data && !loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
          <Zap className="w-8 h-8 text-red-500 opacity-50" />
        </div>
        <h3 className="text-xl font-bold tracking-tighter uppercase italic mb-2">Relay Synchronisation Failed</h3>
        <p className="text-sm opacity-40 max-w-sm mb-8 uppercase tracking-tight">
          The dashboard was unable to establish a secure connection with the ledger node.
        </p>
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-3 bg-white text-black font-black text-[10px] uppercase tracking-widest rounded-xl hover:bg-gray-200 transition-all active:scale-95"
        >
          Re-establish Connection
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#050505] overflow-x-hidden">
      <header className="h-auto lg:h-24 border-b border-white/10 flex flex-col lg:flex-row lg:items-center justify-between p-6 lg:px-10 flex-shrink-0 z-20 gap-6">
        <div>
          <span className="text-[10px] uppercase tracking-[0.2em] opacity-40 font-bold">Node Balance</span>
          <div className="text-3xl lg:text-4xl font-light tracking-tight">{formatCurrency(data?.balance || 0)}</div>
        </div>
        
        <div className="flex items-center justify-between lg:justify-end gap-4 lg:gap-6 w-full lg:w-auto">
          <div className="flex items-center gap-4 border-r border-white/10 pr-6 mr-6 hidden xl:flex">
             <div className="flex flex-col items-end">
                <span className="text-[10px] uppercase font-black text-emerald-500 italic">Core Online</span>
                <span className="text-[8px] opacity-20 uppercase">Sync Speed: 1.2 GB/s</span>
             </div>
             <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>

          <div className="relative group flex-1 lg:flex-none">
            <AnimatePresence mode="wait">
              {isSearchActive ? (
                <motion.div 
                  initial={{ width: 0, opacity: 0 }}
                  animate={{ width: '100%', opacity: 1 }}
                  style={{ maxWidth: '300px' }}
                  exit={{ width: 0, opacity: 0 }}
                  className="flex items-center bg-white/5 border border-white/20 rounded-xl px-4 py-2 overflow-hidden w-full"
                >
                  <Search className="w-4 h-4 opacity-40 mr-2 flex-shrink-0" />
                  <input 
                    autoFocus
                    placeholder="Search ledger..."
                    className="bg-transparent border-none outline-none text-xs w-full text-white placeholder:opacity-20"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onBlur={() => !searchQuery && setIsSearchActive(false)}
                  />
                  <button onClick={() => { setSearchQuery(''); setIsSearchActive(false); }}>
                    <X className="w-3 h-3 opacity-40 hover:opacity-100 transition-opacity" />
                  </button>
                </motion.div>
              ) : (
                <button 
                  onClick={() => setIsSearchActive(true)}
                  className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 hover:border-white/20 transition-all active:scale-95"
                >
                  <Search className="w-4 h-4 opacity-40" />
                </button>
              )}
            </AnimatePresence>
          </div>
        </div>
      </header>

      <div className="flex-1 p-6 lg:p-10 grid grid-cols-12 gap-6 lg:gap-10 overflow-y-auto overflow-x-hidden">
        <section className="col-span-12 lg:col-span-8 space-y-8 lg:space-y-12">
          <header>
            <div className="flex items-center gap-3 mb-2">
               <span className="p-1 px-2 bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-500 rounded uppercase tracking-widest italic">Stable V4</span>
               <div className="h-px bg-white/10 flex-1" />
            </div>
            <h1 className="text-5xl lg:text-8xl font-bold tracking-tighter mb-4 italic leading-[0.85] uppercase">
              Settlement<br />Reputation
            </h1>
            <p className="text-sm opacity-40 leading-relaxed max-w-md uppercase tracking-tight font-medium">
              High-frequency international banking relay. 
              Real-time monitoring of cross-border throughput and node status.
            </p>
          </header>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 lg:gap-6">
            <div className="group relative overflow-hidden bg-white/5 border border-white/10 rounded-[2rem] p-6 lg:p-8 hover:bg-white/10 transition-colors">
              <div className="flex justify-between items-start mb-6">
                <div className="text-[10px] uppercase tracking-widest opacity-40 font-bold italic">Cumulative Vol</div>
                <Zap className="w-4 h-4 text-emerald-500 opacity-20" />
              </div>
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl lg:text-4xl font-bold tracking-tighter mb-1 select-none">
                    {formatCurrency(filteredTransactions.reduce((acc: number, tx: any) => acc + tx.amount, 0))}
                  </div>
                  <div className="text-[9px] text-emerald-500 font-bold uppercase tracking-widest italic leading-none">
                    Throughput Authorized
                  </div>
                </div>
                <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <ArrowUpRight className="w-5 h-5 lg:w-6 lg:h-6 text-emerald-500" />
                </div>
              </div>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[2rem] p-6 lg:p-8 flex flex-col justify-between min-h-[160px] relative overflow-hidden group">
               <div className="flex justify-between items-start mb-6 z-10">
                 <div className="text-[10px] uppercase tracking-widest opacity-40 font-bold italic">Node Latency</div>
                 <Database className="w-4 h-4 text-blue-500 opacity-20" />
               </div>
               
               <AnimatePresence mode="popLayout">
                 {livePulse.length > 0 ? (
                   <motion.div 
                     key={livePulse[0].timestamp}
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     exit={{ opacity: 0, y: -10 }}
                     className="space-y-4 z-10"
                   >
                     <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                           <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                           <span className="text-[10px] font-black text-blue-500 uppercase italic">{livePulse[0].status}</span>
                        </div>
                        <span className="text-[9px] font-mono opacity-20">{livePulse[0].nodeId}</span>
                     </div>
                     <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                        <motion.div 
                           initial={{ width: 0 }}
                           animate={{ width: `${livePulse[0].load}%` }}
                           className="h-full bg-blue-500"
                        />
                     </div>
                   </motion.div>
                 ) : (
                   <div className="space-y-4 z-10 opacity-30">
                      <div className="flex items-center justify-between font-mono">
                         <span className="text-[9px] font-bold opacity-30">P99 RESPONSE</span>
                         <span className="text-[10px] font-bold text-blue-500">0.02ms</span>
                       </div>
                      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                         <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: '65%' }}
                            transition={{ duration: 2, ease: "easeOut" }}
                            className="h-full bg-blue-500"
                         />
                      </div>
                   </div>
                 )}
               </AnimatePresence>
            </div>
          </div>

          {/* Activity Chart Section */}
          <div className="bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-6 lg:p-10 space-y-8 shadow-inner overflow-hidden relative group">
             <div className="absolute top-0 right-0 p-10 opacity-[0.02] pointer-events-none grayscale">
                <Shield className="w-64 h-64" />
             </div>
             <header className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold tracking-tight uppercase italic">Disbursement Distribution</h3>
                  <p className="text-[9px] opacity-40 uppercase tracking-widest">Active Relay Telemetry • Last 10 Auth Events</p>
                </div>
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <span className="text-[9px] uppercase font-black opacity-40">Settlement</span>
                   </div>
                </div>
             </header>

             <div className="h-[250px] lg:h-[300px] w-full mt-10">
                <ResponsiveContainer width="100%" height="100%">
                   <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorAmt" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
                      <XAxis 
                        dataKey="name" 
                        axisLine={false} 
                        tickLine={false} 
                        tick={{ fill: '#ffffff20', fontSize: 9 }}
                        dy={20}
                      />
                      <YAxis 
                        hide
                        domain={['dataMin - 100', 'dataMax + 100']}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#0a0a0a', 
                          border: '1px solid #ffffff10', 
                          borderRadius: '12px',
                          fontSize: '10px',
                          fontWeight: 'bold',
                          color: '#fff'
                        }}
                        itemStyle={{ color: '#10b981' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="amount" 
                        stroke="#10b981" 
                        strokeWidth={2}
                        fillOpacity={1} 
                        fill="url(#colorAmt)" 
                        animationDuration={2500}
                      />
                   </AreaChart>
                </ResponsiveContainer>
             </div>
          </div>
        </section>

        <section className="col-span-12 lg:col-span-4 flex flex-col h-full space-y-6">
          <div className="flex-1 bg-white/[0.03] border border-white/10 rounded-[2.5rem] p-6 lg:p-8 flex flex-col backdrop-blur-3xl shadow-2xl overflow-hidden min-h-[500px]">
            <div className="flex items-center justify-between mb-8 lg:mb-10">
               <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Database className="w-3 h-3 text-emerald-500" />
                  </div>
                  <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold">Ledger Engine</h3>
               </div>
              <div className="text-[8px] font-black px-2 py-1 bg-white/10 rounded uppercase tracking-widest text-white/40 italic">Sync Active</div>
            </div>
            
            <div className="space-y-3 flex-1 overflow-y-auto pr-2 scrollbar-hide">
              {filteredTransactions.length > 0 ? (
                filteredTransactions.map((tx: any, idx: number) => (
                  <motion.div 
                    key={tx.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="flex justify-between items-center p-5 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-white/20 transition-all group lg:cursor-pointer hover:bg-white/[0.05]"
                  >
                    <div className="space-y-1.5 overflow-hidden">
                      <div className="text-xs font-black tracking-tight text-white group-hover:text-emerald-400 transition-colors uppercase truncate">
                        {tx.recipient_name}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[8px] opacity-20 uppercase font-black tracking-tighter truncate">
                           {new Date(tx.created_at).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' })}
                        </span>
                        <div className="w-0.5 h-0.5 bg-white/10 rounded-full" />
                        <span className="text-[8px] text-emerald-500 font-bold uppercase tracking-widest leading-none">AUTH OK</span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                       <div className="text-sm font-black tracking-tighter text-white">
                         -{formatCurrency(tx.amount, tx.currency)}
                       </div>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center opacity-10 py-20 grayscale">
                   <Search className="w-12 h-12 mb-6 stroke-1" />
                   <p className="text-[10px] uppercase tracking-[0.4em] font-black">Ledger Empty</p>
                </div>
              )}
            </div>
            
            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-3 opacity-20 group-hover:opacity-40 transition-opacity">
                <Clock className="w-3 h-3" />
                <p className="text-[8px] uppercase tracking-[0.3em] font-black">Live Pulse Synchronized</p>
              </div>
              <div className="flex gap-1">
                 <div className="w-1 h-1 bg-emerald-500 rounded-full animate-ping" />
              </div>
            </div>
          </div>

          <div className="p-6 lg:p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-[2rem] flex items-center justify-between group hover:bg-emerald-500/10 transition-colors">
             <div className="flex flex-col gap-1">
                <span className="text-[9px] uppercase font-black text-emerald-500 italic opacity-60">System Security</span>
                <span className="text-[11px] font-bold opacity-40 uppercase tracking-tighter">Encryption: SHA-512</span>
             </div>
             <Shield className="w-6 h-6 text-emerald-500 opacity-20 group-hover:opacity-100 transition-all group-hover:drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
          </div>
        </section>
      </div>
    </div>
  );
};
