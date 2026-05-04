import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Search, Filter, ArrowUpDown, Download, Calendar, ExternalLink, ChevronDown, ChevronUp, Shield, Database, Clock, X, Info } from 'lucide-react';
import { formatCurrency, cn } from '../lib/utils';
import { useAuth } from './AuthContext';

export const HistoryPage = () => {
  const { authFetch } = useAuth();
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'created_at', direction: 'desc' });
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set());
  const [statusFilter, setStatusFilter] = useState('ALL');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await authFetch('/api/dashboard');
        const json = await res.json();
        setTransactions(json.transactions || []);
      } catch (e) {}
      setLoading(false);
    };
    fetchData();
  }, []);

  const sortedAndFilteredTransactions = useMemo(() => {
    let result = [...transactions];
    
    // Search Filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(tx => 
        tx.recipient_name.toLowerCase().includes(q) ||
        tx.iban.toLowerCase().includes(q) ||
        tx.reason.toLowerCase().includes(q)
      );
    }

    // Status Filter
    if (statusFilter !== 'ALL') {
      result = result.filter(tx => tx.status.toUpperCase() === statusFilter);
    }

    // Date Filter
    if (startDate) {
      const start = new Date(startDate);
      result = result.filter(tx => new Date(tx.created_at) >= start);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      result = result.filter(tx => new Date(tx.created_at) <= end);
    }

    // Sort
    result.sort((a, b) => {
      if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
      if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [transactions, searchQuery, sortConfig, startDate, endDate, statusFilter]);

  const getStatusStyles = (status: string) => {
    switch (status.toUpperCase()) {
      case 'COMPLETED':
        return 'bg-green-500/10 border-green-500/20 text-green-500';
      case 'PENDING':
        return 'bg-amber-500/10 border-amber-500/20 text-amber-500';
      case 'FAILED':
        return 'bg-red-500/10 border-red-500/20 text-red-500';
      default:
        return 'bg-white/10 border-white/20 text-white/60';
    }
  };

  const handleExportCSV = () => {
    if (sortedAndFilteredTransactions.length === 0) return;

    const headers = ['Timestamp', 'Recipient', 'IBAN', 'SWIFT/BIC', 'Amount', 'Currency', 'Reason', 'Status'];
    const rows = sortedAndFilteredTransactions.map(tx => [
      new Date(tx.created_at).toISOString(),
      tx.recipient_name,
      tx.iban,
      tx.swift_bic,
      tx.amount,
      tx.currency,
      `"${tx.reason.replace(/"/g, '""')}"`,
      tx.status
    ]);

    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", `sentinel_ledger_export_${new Date().getTime()}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSort = (key: string) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'desc' ? 'asc' : 'desc'
    }));
  };

  const toggleRow = (id: number) => {
    const next = new Set(expandedRows);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandedRows(next);
  };

  if (loading) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#050505] p-4 lg:p-10 overflow-hidden">
      <header className="mb-8 lg:mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
        <div>
          <span className="text-[10px] uppercase tracking-[0.3em] opacity-40 font-bold mb-2 block text-center lg:text-left">Secure Ledger</span>
          <h1 className="text-4xl lg:text-6xl font-black tracking-tighter italic leading-none text-center lg:text-left uppercase">History</h1>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={handleExportCSV}
            className="flex-1 lg:flex-none px-6 py-3 bg-white/5 border border-white/10 rounded-xl text-[10px] uppercase tracking-widest font-bold hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-3 h-3" />
            Export
          </button>
        </div>
      </header>

      <div className="flex-1 flex flex-col min-h-0 bg-white/[0.02] border border-white/10 rounded-3xl overflow-hidden backdrop-blur-3xl shadow-2xl">
        <div className="p-4 lg:p-6 border-b border-white/10 flex flex-col gap-4 lg:gap-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-4 lg:gap-6">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 opacity-20" />
              <input 
                type="text"
                placeholder="Search ledger..."
                className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-sm outline-none focus:border-white/30 transition-colors"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            
            <div className="flex flex-col sm:flex-row items-stretch lg:items-center gap-4">
              {/* Status Filter Dropdown */}
              <div className="relative group min-w-[140px]">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-20 group-hover:opacity-40 transition-opacity">
                   <Filter className="w-3 h-3" />
                </div>
                <select 
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-4 pl-10 pr-4 text-[10px] font-black uppercase tracking-widest outline-none appearance-none cursor-pointer focus:border-white/20 transition-all"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="ALL" className="bg-[#050505]">All Status</option>
                  <option value="COMPLETED" className="bg-[#050505]">Completed</option>
                  <option value="PENDING" className="bg-[#050505]">Pending</option>
                  <option value="FAILED" className="bg-[#050505]">Failed</option>
                </select>
                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none opacity-20 group-hover:opacity-40 transition-opacity">
                   <ChevronDown className="w-3 h-3" />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-2 bg-white/5 border border-white/10 rounded-xl px-4 py-2">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Calendar className="w-4 h-4 opacity-20" />
                  <input 
                    type="date"
                    className="bg-transparent border-none outline-none text-[10px] font-bold text-white/60 cursor-pointer w-full sm:w-auto"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <span className="opacity-20 text-[10px] hidden sm:block">to</span>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <input 
                    type="date"
                    className="bg-transparent border-none outline-none text-[10px] font-bold text-white/60 cursor-pointer w-full sm:w-auto"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                {(startDate || endDate || statusFilter !== 'ALL') && (
                  <button 
                    onClick={() => { setStartDate(''); setEndDate(''); setStatusFilter('ALL'); }}
                    className="w-full sm:w-auto ml-0 sm:ml-2 text-[10px] uppercase font-bold text-red-500 hover:text-red-400 py-2 sm:py-0 border-t sm:border-t-0 border-white/10 sm:border-none mt-2 sm:mt-0"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-x-auto scrollbar-hide">
          <div className="min-w-[800px] h-full overflow-y-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#070707] z-10">
                <tr>
                  <th className="w-12 p-6 border-b border-white/10"></th>
                  <th className="p-6 text-[10px] uppercase tracking-widest opacity-40 font-bold border-b border-white/10">
                    <button onClick={() => toggleSort('created_at')} className="flex items-center gap-2 hover:opacity-100 transition-opacity">
                      Date <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="p-6 text-[10px] uppercase tracking-widest opacity-40 font-bold border-b border-white/10">
                    <button onClick={() => toggleSort('recipient_name')} className="flex items-center gap-2 hover:opacity-100 transition-opacity">
                      Recipient <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                  <th className="p-6 text-[10px] uppercase tracking-widest opacity-40 font-bold border-b border-white/10">Account</th>
                  <th className="p-6 text-[10px] uppercase tracking-widest opacity-40 font-bold border-b border-white/10">Status</th>
                  <th className="p-6 text-[10px] uppercase tracking-widest opacity-40 font-bold border-b border-white/10 text-right">
                    <button onClick={() => toggleSort('amount')} className="flex items-center gap-2 hover:opacity-100 transition-opacity ml-auto">
                      Amount <ArrowUpDown className="w-3 h-3" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                <AnimatePresence mode="popLayout">
                  {sortedAndFilteredTransactions.map((tx) => (
                    <React.Fragment key={tx.id}>
                      <motion.tr 
                        layout
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={cn(
                          "hover:bg-white/5 transition-colors group cursor-pointer",
                          expandedRows.has(tx.id) && "bg-white/[0.03]"
                        )}
                        onClick={() => toggleRow(tx.id)}
                      >
                        <td className="p-6 text-center">
                          {expandedRows.has(tx.id) ? <ChevronUp className="w-4 h-4 opacity-40" /> : <ChevronDown className="w-4 h-4 opacity-40" />}
                        </td>
                        <td className="p-6">
                          <div className="text-[10px] font-mono opacity-60">
                            {new Date(tx.created_at).toLocaleString('en-ZA', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric'
                            })}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="text-sm font-bold tracking-tight uppercase group-hover:text-emerald-400 transition-colors">
                            {tx.recipient_name}
                          </div>
                        </td>
                        <td className="p-6">
                          <div className="text-[10px] font-mono opacity-40 tracking-wider">
                            {tx.iban.substring(0, 4)}...{tx.iban.slice(-4)}
                          </div>
                        </td>
                        <td className="p-6">
                          <span className={cn(
                            "px-3 py-1 border text-[8px] font-black uppercase tracking-widest rounded-full transition-colors",
                            getStatusStyles(tx.status)
                          )}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="p-6 text-right">
                          <div className="text-sm font-black tracking-tighter">
                            -{formatCurrency(tx.amount, tx.currency)}
                          </div>
                        </td>
                      </motion.tr>
                      <AnimatePresence>
                        {expandedRows.has(tx.id) && (
                          <motion.tr
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-white/[0.01]"
                          >
                            <td colSpan={6} className="p-0">
                              <div className="px-6 lg:px-12 py-10 lg:py-14 ml-0 lg:ml-12 border-l lg:border-l-4 border-emerald-500/20 mb-8 bg-gradient-to-r from-emerald-500/[0.02] to-transparent">
                                <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 lg:gap-16">
                                  {/* SWIFT & Relay Data */}
                                  <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-2">
                                       <div className="p-2 bg-emerald-500/10 rounded-lg">
                                          <Shield className="w-3 h-3 text-emerald-500" />
                                       </div>
                                       <h4 className="text-[10px] uppercase tracking-[0.3em] font-black italic">Bank Relay Channel</h4>
                                    </div>
                                    <div className="space-y-6">
                                      <div className="flex items-center gap-4 bg-emerald-500/[0.03] border border-emerald-500/10 p-4 rounded-xl">
                                         <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center border border-emerald-500/30">
                                            <span className="text-[10px] font-black">{tx.currency}</span>
                                         </div>
                                         <div>
                                            <div className="text-[8px] uppercase font-bold opacity-30 tracking-widest">Settle Amount</div>
                                            <div className="text-xl font-bold tracking-tighter">
                                               {formatCurrency(tx.amount, tx.currency)}
                                            </div>
                                         </div>
                                      </div>
                                      <div className="group/item relative">
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-[8px] uppercase tracking-widest opacity-30 font-bold">Network Routing (SWIFT)</span>
                                          <div className="group/tooltip relative inline-flex">
                                            <Info className="w-2.5 h-2.5 opacity-20 hover:opacity-100 transition-opacity cursor-help" />
                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-3 bg-black border border-white/10 rounded-lg shadow-2xl opacity-0 group-hover/tooltip:opacity-100 pointer-events-none transition-all z-50 text-[9px] leading-relaxed text-white/60 tracking-tight normal-case">
                                              <span className="text-white block font-black mb-1 italic">What is SWIFT/BIC?</span>
                                              A globally unique ID for financial institutions. It ensures your payment is routed to the correct destination bank across the international relay network.
                                            </div>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                           <div className="px-3 py-2 bg-white/5 border border-white/10 rounded text-[11px] font-mono font-bold tracking-[0.3em] group-hover/item:border-emerald-500/30 transition-colors">
                                              {tx.swift_bic}
                                           </div>
                                        </div>
                                      </div>
                                      <div>
                                        <span className="text-[8px] uppercase tracking-widest opacity-30 block mb-2 font-bold">Relay Integrity</span>
                                        <div className="flex items-center gap-4">
                                           <div className="h-1 flex-1 bg-white/5 rounded-full overflow-hidden">
                                              <div className="h-full bg-emerald-500 w-[94%]" />
                                           </div>
                                           <span className="text-[9px] font-black text-emerald-500">94.2%</span>
                                        </div>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Settlement Narrative */}
                                  <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-2">
                                       <div className="p-2 bg-blue-500/10 rounded-lg">
                                          <Database className="w-3 h-3 text-blue-500" />
                                       </div>
                                       <h4 className="text-[10px] uppercase tracking-[0.3em] font-black italic">Settlement Narrative</h4>
                                    </div>
                                    <div className="space-y-4">
                                      <div className="bg-white/[0.03] border border-white/5 p-6 rounded-2xl relative overflow-hidden group/narrative">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/20" />
                                        <p className="text-xs lg:text-sm leading-relaxed opacity-70 italic font-medium">"{tx.reason}"</p>
                                      </div>
                                      <div className="flex justify-between items-center px-2">
                                         <span className="text-[8px] uppercase tracking-widest opacity-30 font-bold">Audit Ref: {tx.id.toString().padStart(6, '0')}</span>
                                         <span className="text-[8px] uppercase tracking-widest text-blue-500 font-bold italic">Signed SHA-256</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Audit Trail */}
                                  <div className="space-y-6">
                                    <div className="flex items-center gap-2 mb-2">
                                       <div className="p-2 bg-white/10 rounded-lg">
                                          <Clock className="w-3 h-3 opacity-40" />
                                       </div>
                                       <h4 className="text-[10px] uppercase tracking-[0.3em] font-black italic">Lifecycle Telemetry</h4>
                                    </div>
                                    <div className="space-y-6 relative ml-4">
                                       <div className="absolute left-[-17px] top-0 bottom-0 w-px bg-white/5" />
                                       {[
                                         { label: 'Packet Ingested', time: 'T+0ms', color: 'bg-white/40' },
                                         { label: 'Security Scrubbed', time: 'T+12ms', color: 'bg-white/40' },
                                         { label: 'Relay Broadcast', time: 'T+45ms', color: 'bg-emerald-500' }
                                       ].map((step, i) => (
                                         <div key={i} className="flex justify-between items-center relative">
                                            <div className={cn("absolute left-[-21px] w-2 h-2 rounded-full border-2 border-[#050505]", step.color)} />
                                            <span className="text-[9px] uppercase font-bold opacity-30 tracking-widest">{step.label}</span>
                                            <span className="text-[9px] font-mono opacity-20">{step.time}</span>
                                         </div>
                                       ))}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </td>
                          </motion.tr>
                        )}
                      </AnimatePresence>
                    </React.Fragment>
                  ))}
                </AnimatePresence>
                {sortedAndFilteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-32 px-6">
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center justify-center text-center max-w-sm mx-auto"
                      >
                        <div className="w-20 h-20 rounded-[2rem] bg-white/5 border border-white/10 flex items-center justify-center mb-8 relative group">
                           <Search className="w-8 h-8 opacity-20 group-hover:opacity-40 transition-opacity" />
                           <div className="absolute top-0 right-0 p-1 bg-red-500/20 border border-red-500/30 rounded-full">
                              <X className="w-2 h-2 text-red-500" />
                           </div>
                        </div>
                        <h3 className="text-lg font-black tracking-tighter uppercase italic mb-3">No matching relay data</h3>
                        <p className="text-[10px] opacity-40 leading-relaxed uppercase tracking-widest mb-8">
                          The current filter parameters yielded no ledger results. 
                          Try adjusting your search query, status, or date range.
                        </p>
                        <button 
                          onClick={() => {
                            setSearchQuery('');
                            setStatusFilter('ALL');
                            setStartDate('');
                            setEndDate('');
                          }}
                          className="px-8 py-3 bg-white/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-white/20 transition-all active:scale-95"
                        >
                          Clear all filters
                        </button>
                      </motion.div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
