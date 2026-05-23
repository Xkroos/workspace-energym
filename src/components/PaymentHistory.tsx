import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { 
    Calendar, 
    Clock, 
    ImageIcon, 
    Tag, 
    ArrowUpRight,
    Loader2
    
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PaymentHistoryProps {
    membershipId: string;
}

export function PaymentHistory({ membershipId }: PaymentHistoryProps) {
    const [history, setHistory] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (membershipId) {
            fetchHistory();
        }
    }, [membershipId]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('payments')
                .select('*')
                .eq('membership_id', membershipId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setHistory(data || []);
        } catch (err) {
            console.error("Error al cargar historial:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-10 gap-3">
                <Loader2 className="animate-spin text-orange-500" size={30} />
                <span className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">Cargando transacciones...</span>
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="text-center py-10 bg-zinc-900 rounded-[2rem] border-2 border-dashed border-zinc-800">
                <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">No hay pagos registrados</p>
            </div>
        );
    }

    return (
        <div className="relative pl-8 space-y-6 before:content-[''] before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-zinc-800">
            {history.map((payment) => (
                <div key={payment.id} className="relative group animate-in fade-in slide-in-from-bottom-1">
                    {/* Punto del Timeline */}
                    <div className="absolute -left-[35px] top-1 w-5 h-5 rounded-full border-4 border-zinc-900 bg-orange-500 shadow-lg shadow-orange-500/20 z-10 group-hover:scale-110 transition-transform" />

                    {/* Tarjeta de Pago */}
                    <div className="bg-zinc-900 border border-zinc-800/80 p-5 rounded-[2rem] transition-all hover:border-zinc-700">
                        <div className="flex flex-col md:flex-row justify-between gap-4">
                            
                            {/* Detalles Izquierda */}
                            <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black text-zinc-100 uppercase tracking-tight">
                                        {payment.description || 'Abono de Membresía'}
                                    </span>
                                    <span className="px-2 py-0.5 bg-black border border-zinc-800 text-orange-500 rounded-lg text-[8px] font-black uppercase tracking-wider">
                                        {payment.payment_method}
                                    </span>
                                </div>
                                
                                <div className="flex items-center gap-3 text-zinc-500">
                                    <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider">
                                        <Calendar size={12} className="text-zinc-600" />
                                        {format(new Date(payment.created_at), "dd MMM, yyyy", { locale: es })}
                                    </div>
                                    <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider">
                                        <Clock size={12} className="text-zinc-600" />
                                        {format(new Date(payment.created_at), "p")}
                                    </div>
                                </div>
                            </div>

                            {/* Monto y Comprobante Derecha */}
                            <div className="flex items-center justify-between md:justify-end gap-5">
                                <div className="text-right">
                                    <p className="text-[8px] font-black text-zinc-500 uppercase tracking-widest mb-0.5">Monto</p>
                                    <p className="text-lg font-black text-emerald-400 tracking-tighter">
                                        ${Number(payment.amount).toFixed(2)}
                                    </p>
                                </div>

                                {payment.payment_image_url && (
                                    <a 
                                        href={payment.payment_image_url} 
                                        target="_blank" 
                                        rel="noreferrer"
                                        className="p-3 bg-black border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-2xl transition-all"
                                    >
                                        <ImageIcon size={18} />
                                    </a>
                                )}
                            </div>
                        </div>

                        {/* Pie de la card con Referencia */}
                        {payment.reference_number && (
                            <div className="mt-4 pt-4 border-t border-zinc-800/60 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Tag size={12} className="text-zinc-600" />
                                    <span className="text-[10px] font-mono font-bold text-zinc-500 tracking-tighter uppercase">
                                        Ref: {payment.reference_number}
                                    </span>
                                </div>
                                <ArrowUpRight size={12} className="text-zinc-700 group-hover:text-zinc-400 transition-colors" />
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}