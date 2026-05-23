import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { DollarSign, TrendingUp, Zap, Clock, Loader2, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Interfaces para tipado de datos con propiedades temporales de Supabase incluidas
interface MembershipWithPayments {
    id: string;
    customer_name: string;
    price: number; 
    status: string;
    user_id: string;
    created_at: string; // Agregado para el filtro temporal
    payments: any[];
}

export function FinancialOperationsModule() {
    const { user } = useAuth();
    const [memberships, setMemberships] = useState<MembershipWithPayments[]>([]);
    const [transactions, setTransactions] = useState<any[]>([]);
    const [investedAmount, setInvestedAmount] = useState(0);
    const [withdrawn, setWithdrawn] = useState(0);
    const [loading, setLoading] = useState(true);

    // Estados para formularios rápidos
    const [tempWithdrawn, setTempWithdrawn] = useState('');
    const [tempInvestedAmount, setTempInvestedAmount] = useState('');
    const [investDescription, setInvestDescription] = useState('');
    const [withdrawDescription, setWithdrawDescription] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);

    const loadFinancialData = useCallback(async () => {
        if (!user) return;
        setLoading(true);

        try {
            // 1. Cargar Transacciones, Membresías y Pagos en paralelo
            const [transRes, memRes, payRes] = await Promise.all([
                supabase
                    .from('financial_transactions')
                    .select('*')
                    .eq('user_id', user.id)
                    .order('transaction_date', { ascending: false }),
                supabase
                    .from('memberships')
                    .select('*')
                    .eq('user_id', user.id),
                supabase
                    .from('payments')
                    .select('*')
                    .eq('user_id', user.id)
            ]);

            // 2. Procesar Membresías y unir con sus pagos
            if (memRes.data) {
                const processed = memRes.data.map((m: any) => {
                    const relatedPayments = payRes.data 
                        ? payRes.data.filter(p => p.membership_id === m.id) 
                        : [];
                    
                    return {
                        ...m,
                        price: Number(m.price) || 0,
                        payments: relatedPayments
                    };
                });
                setMemberships(processed);
            }

            // 3. Procesar Transacciones (Gastos y Retiros)
            if (transRes.data) {
                setTransactions(transRes.data);
                let totalInv = 0;
                let totalWith = 0;
                transRes.data.forEach(t => {
                    const amt = Number(t.amount) || 0;
                    if (t.type === 'inversion') totalInv += amt;
                    if (t.type === 'retiro') totalWith += amt;
                });
                setInvestedAmount(totalInv);
                setWithdrawn(totalWith);
            }

        } catch (err) {
            console.error("Error crítico en carga financiera:", err);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        loadFinancialData();
    }, [loadFinancialData]);

    // Cálculos de estadísticas dinámicas
    const stats = useMemo(() => {
        return memberships.reduce((acc, mem) => {
            const paid = mem.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            const salePrice = Number(mem.price) || 0;
            const balance = salePrice - paid;

            return {
                totalPaid: acc.totalPaid + paid,
                totalPending: acc.totalPending + (balance > 0 ? balance : 0),
            };
        }, { totalPaid: 0, totalPending: 0 });
    }, [memberships]);

    // FLUJO DE CAJA: Dinero real recibido - Gastos - Retiros
    const netCashFlow = stats.totalPaid - investedAmount - withdrawn;

    // --- GENERACIÓN DE PDF CON FILTRADO DE LOGICA TEMPORAL ---
    const generatePDF = (period: 'Diario' | 'Semanal' | 'Mensual' | 'Anual') => {
        const doc = new jsPDF();
        const now = new Date();
        const dateStr = now.toLocaleDateString();

        // Determinar fecha límite según el período solicitado
        let targetDate = new Date();
        if (period === 'Diario') {
            targetDate.setHours(0, 0, 0, 0); // Desde el inicio del día de hoy
        } else if (period === 'Semanal') {
            targetDate.setDate(now.getDate() - 7); // Últimos 7 días
        } else if (period === 'Mensual') {
            targetDate.setMonth(now.getMonth() - 1); // Último mes
        } else if (period === 'Anual') {
            targetDate.setFullYear(now.getFullYear() - 1); // Último año
        }

        // 1. Filtrar transacciones del período seleccionado
        const filteredTransactions = transactions.filter(t => {
            const tDate = new Date(t.transaction_date);
            return tDate >= targetDate;
        });

        // 2. Calcular métricas exclusivas del período seleccionado
        let periodInvested = 0;
        let periodWithdrawn = 0;
        filteredTransactions.forEach(t => {
            const amt = Number(t.amount) || 0;
            if (t.type === 'inversion') periodInvested += amt;
            if (t.type === 'retiro') periodWithdrawn += amt;
        });

        // 3. Calcular ingresos cobrados y por cobrar dentro del período seleccionado
        let periodPaid = 0;
        let periodPending = 0;

        memberships.forEach(mem => {
            const paidInPeriod = mem.payments
                .filter(p => new Date(p.created_at || p.payment_date || now) >= targetDate)
                .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
            
            periodPaid += paidInPeriod;

            // Al estar declarada en la interfaz, el compilador procesará 'created_at' sin errores
            const memDate = new Date(mem.created_at || now); 
            if (memDate >= targetDate) {
                const totalMemPaid = mem.payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
                const balance = Number(mem.price) - totalMemPaid;
                if (balance > 0) periodPending += balance;
            }
        });

        const periodNetCashFlow = periodPaid - periodInvested - periodWithdrawn;

        // Título y Estilo del Reporte
        doc.setFontSize(20);
        doc.setTextColor(249, 115, 22); // Orange 500
        doc.text('ENERGYM FITNESS CENTER', 14, 20);
        
        doc.setFontSize(12);
        doc.setTextColor(30, 30, 36);
        doc.text(`REPORTE FINANCIERO ${period.toUpperCase()}`, 14, 30);
        doc.setFontSize(10);
        doc.text(`Fecha de emisión: ${dateStr}`, 14, 37);

        // Tabla 1: Resumen General del Período
        autoTable(doc, {
            startY: 45,
            head: [[`Indicador (${period})`, 'Monto (USD)']],
            body: [
                ['Ingresos en Período (Cobrados)', `$${periodPaid.toLocaleString()}`],
                ['Cuentas por Cobrar del Período', `$${periodPending.toLocaleString()}`],
                ['Inversiones en Período', `$${periodInvested.toLocaleString()}`],
                ['Gastos/Retiros en Período', `$${periodWithdrawn.toLocaleString()}`],
                ['SALDO NETO EN PERÍODO', `$${periodNetCashFlow.toLocaleString()}`],
            ],
            theme: 'grid',
            headStyles: { fillColor: [249, 115, 22], halign: 'center' }, 
            styles: { fontSize: 10, cellPadding: 5 },
            columnStyles: { 1: { halign: 'right', fontStyle: 'bold' } }
        });

        // Tabla 2: Detalle de Movimientos del Período
        doc.setFontSize(12);
        const currentY = (doc as any).lastAutoTable.finalY + 15;
        doc.text(`MOVIMIENTOS DEL PERÍODO (${filteredTransactions.length})`, 14, currentY);

        const detailRows = filteredTransactions.map(t => [
            new Date(t.transaction_date).toLocaleDateString(),
            t.description,
            t.type.toUpperCase(),
            `$${Number(t.amount).toLocaleString()}`
        ]);

        autoTable(doc, {
            startY: currentY + 5,
            head: [['Fecha', 'Descripción', 'Categoría', 'Monto']],
            body: detailRows,
            theme: 'striped',
            headStyles: { fillColor: [39, 39, 42] }, 
            styles: { fontSize: 9 },
            columnStyles: { 3: { halign: 'right' } }
        });

        doc.save(`Reporte_${period}_Energym_${dateStr}.pdf`);
    };

    const handleTransaction = async (type: 'inversion' | 'retiro') => {
        if (!user || isProcessing) return;
        const amount = parseFloat(type === 'inversion' ? tempInvestedAmount : tempWithdrawn);
        const desc = type === 'inversion' ? investDescription : withdrawDescription;

        if (isNaN(amount) || amount <= 0 || !desc.trim()) return;

        setIsProcessing(true);
        try {
            await supabase.from('financial_transactions').insert({
                user_id: user.id,
                amount,
                type,
                description: desc.trim(),
                transaction_date: new Date().toISOString()
            });

            if (type === 'inversion') {
                setTempInvestedAmount('');
                setInvestDescription('');
            } else {
                setTempWithdrawn('');
                setWithdrawDescription('');
            }
            
            await loadFinancialData();
        } catch (error) {
            console.error("Error al registrar transacción:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    // Ajuste de colores para la gráfica de Energym
    const chartData = [
        { label: 'Caja Real', value: netCashFlow > 0 ? netCashFlow : 0, color: '#10b981' }, 
        { label: 'Inversión', value: investedAmount, color: '#f97316' },                  
        { label: 'Retiros', value: withdrawn, color: '#ef4444' },                         
        { label: 'Por Cobrar', value: stats.totalPending, color: '#a1a1aa' }              
    ].filter(d => d.value > 0);

    const totalVal = chartData.reduce((s, i) => s + i.value, 0) || 1;

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 className="animate-spin text-orange-500" size={40} />
            <p className="text-zinc-500 text-[10px] uppercase font-black tracking-widest animate-pulse">Sincronizando finanzas...</p>
        </div>
    );

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500 text-white">
            
            {/* CABECERA DE REPORTES */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-zinc-900 p-6 rounded-[2.5rem] border border-zinc-800 shadow-2xl">
                <div>
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Panel Financiero</h2>
                    <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">Exporta tus estados de cuenta en PDF</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={() => generatePDF('Diario')} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-zinc-700 transition-all border border-zinc-700/50">
                        <Download size={14} /> Diario
                    </button>
                    <button onClick={() => generatePDF('Semanal')} className="flex items-center gap-2 px-4 py-2 bg-zinc-800 text-zinc-300 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-zinc-700 transition-all border border-zinc-700/50">
                        <Download size={14} /> Semanal
                    </button>
                    <button onClick={() => generatePDF('Mensual')} className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-orange-700 shadow-lg shadow-orange-600/20 transition-all border-b-2 border-orange-700">
                        <Download size={14} /> Mensual
                    </button>
                    <button onClick={() => generatePDF('Anual')} className="flex items-center gap-2 px-4 py-2 bg-black text-white rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-zinc-950 transition-all border border-zinc-800">
                        <Download size={14} /> Anual
                    </button>
                </div>
            </div>

            {/* EFECTIVO NETO */}
            <div className={`bg-zinc-900 border-l-8 rounded-[2.5rem] p-8 shadow-2xl border border-zinc-800 ${netCashFlow >= 0 ? 'border-l-emerald-500' : 'border-l-red-500'}`}>
                <div className="flex items-center gap-4">
                    <div className={`p-4 rounded-2xl ${netCashFlow >= 0 ? 'bg-emerald-950/40 text-emerald-400' : 'bg-red-950/40 text-red-400'}`}>
                        <Zap className="w-8 h-8" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-zinc-500 uppercase tracking-[0.2em]">Efectivo Real en Caja</p>
                        <p className="text-4xl font-black tracking-tighter italic text-white">${netCashFlow.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 border-b-4 border-b-emerald-500 shadow-xl">
                    <div className="flex items-center gap-2 mb-1">
                        <DollarSign className="w-4 h-4 text-emerald-500" /> 
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Ingresos (Pagos)</span>
                    </div>
                    <p className="text-2xl font-black tracking-tight text-white">${stats.totalPaid.toLocaleString()}</p>
                </div>
                
                <div className="bg-zinc-900 p-5 rounded-3xl border border-zinc-800 border-b-4 border-b-orange-500 shadow-xl">
                    <div className="flex items-center gap-2 mb-1">
                        <TrendingUp className="w-4 h-4 text-orange-500" /> 
                        <span className="text-[10px] font-black text-zinc-400 uppercase tracking-wider">Cuentas por Cobrar</span>
                    </div>
                    <p className="text-2xl font-black tracking-tight text-white">${stats.totalPending.toLocaleString()}</p>
                </div>

                {/* FORMULARIOS RÁPIDOS */}
                <div className="bg-zinc-950 p-4 rounded-3xl border border-zinc-800 space-y-2 shadow-inner">
                    <input type="number" value={tempInvestedAmount} onChange={e => setTempInvestedAmount(e.target.value)} placeholder="Monto Inversión" className="w-full text-xs p-2.5 bg-zinc-900 text-white border border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold placeholder-zinc-600" />
                    <input type="text" value={investDescription} onChange={e => setInvestDescription(e.target.value)} placeholder="Descripción" className="w-full text-xs p-2.5 bg-zinc-900 text-white border border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-orange-500 font-bold placeholder-zinc-600" />
                    <button onClick={() => handleTransaction('inversion')} className="w-full bg-orange-600 text-white py-2 rounded-xl text-[10px] font-black uppercase tracking-wider shadow-md shadow-orange-600/10 active:scale-95 transition-transform border-b-2 border-orange-700">Registrar Inversión</button>
                </div>
                
                <div className="bg-zinc-950 p-4 rounded-3xl border border-zinc-800 space-y-2 shadow-inner">
                    <input type="number" value={tempWithdrawn} onChange={e => setTempWithdrawn(e.target.value)} placeholder="Monto Gasto" className="w-full text-xs p-2.5 bg-zinc-900 text-white border border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-zinc-700 font-bold placeholder-zinc-600" />
                    <input type="text" value={withdrawDescription} onChange={e => setWithdrawDescription(e.target.value)} placeholder="Descripción" className="w-full text-xs p-2.5 bg-zinc-900 text-white border border-zinc-800 rounded-xl outline-none focus:ring-2 focus:ring-zinc-700 font-bold placeholder-zinc-600" />
                    <button onClick={() => handleTransaction('retiro')} className="w-full bg-zinc-800 text-zinc-200 py-2 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-zinc-700 active:scale-95 transition-transform border border-zinc-700/50">Registrar Gasto</button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl overflow-hidden">
                    <div className="p-5 bg-black border-b border-zinc-800">
                        <h3 className="font-black text-white text-xs uppercase tracking-widest flex items-center gap-2 italic">
                            <Clock className="w-4 h-4 text-orange-500" /> Historial de Movimientos
                        </h3>
                    </div>
                    <div className="overflow-x-auto max-h-[350px]">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-zinc-950 text-zinc-500 border-b border-zinc-800 sticky top-0 z-0">
                                <tr className="text-[10px] font-black uppercase tracking-wider">
                                    <th className="p-4 pl-8">Concepto</th>
                                    <th className="p-4 text-right">Monto</th>
                                    <th className="p-4 pr-8 text-center">Fecha</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800/60">
                                {transactions.map(t => (
                                    <tr key={t.id} className="hover:bg-zinc-950/40 transition-colors">
                                        <td className="p-4 pl-8">
                                            <p className="font-bold text-zinc-200">{t.description}</p>
                                            <span className={`text-[8px] px-2 py-0.5 rounded font-black uppercase tracking-wide border ${t.type === 'inversion' ? 'bg-orange-950/40 text-orange-400 border-orange-900/30' : 'bg-zinc-800 text-zinc-400 border-zinc-700'}`}>
                                                {t.type}
                                            </span>
                                        </td>
                                        <td className={`p-4 text-right font-black text-base ${t.type === 'inversion' ? 'text-orange-500' : 'text-zinc-400'}`}>
                                            ${Number(t.amount).toLocaleString()}
                                        </td>
                                        <td className="p-4 pr-8 text-center text-zinc-500 text-[10px] font-bold">
                                            {new Date(t.transaction_date).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* GRÁFICO CIRCULAR */}
                <div className="bg-zinc-900 border border-zinc-800 rounded-[2.5rem] shadow-2xl p-6 flex flex-col items-center justify-center">
                    <h3 className="font-black text-white text-xs uppercase tracking-widest mb-8 w-full text-left italic">Distribución</h3>
                    <div className="relative w-44 h-44 mb-8" style={{ 
                        background: `conic-gradient(${chartData.map((d, i) => {
                            const start = chartData.slice(0, i).reduce((sum, curr) => sum + (curr.value / totalVal) * 100, 0);
                            const end = start + (d.value / totalVal) * 100;
                            return `${d.color} ${start}% ${end}%`;
                        }).join(', ')})`,
                        borderRadius: '50%'
                    }}>
                        <div className="absolute inset-6 bg-zinc-900 rounded-full flex flex-col items-center justify-center border border-zinc-800/80 shadow-2xl">
                            <span className="text-[9px] text-zinc-500 font-black uppercase tracking-wider">Caja</span>
                            <span className="text-lg font-black text-white tracking-tight">${netCashFlow.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                        </div>
                    </div>
                    <div className="w-full space-y-2">
                        {chartData.map(item => (
                            <div key={item.label} className="flex justify-between items-center text-[10px] p-3 bg-black rounded-xl border border-zinc-800/80">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                    <span className="font-black text-zinc-400 uppercase tracking-wide">{item.label}</span>
                                </div>
                                <span className="font-black text-white">${item.value.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}