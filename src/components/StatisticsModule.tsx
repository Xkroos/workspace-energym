import { useState, useEffect, useMemo, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    TrendingUp, DollarSign, ShoppingBag, Calendar, X, 
    ChevronLeft, ChevronRight, UserX, MessageCircle
} from 'lucide-react'; 
import { format, startOfDay, isBefore } from 'date-fns';
import { es } from 'date-fns/locale'; 

// ====================================================================
// INTERFACES (Actualizada con 'phone')
// ====================================================================

interface Membership {
    id: string;
    customer_name: string;
    phone?: string; // Nombre de columna corregido a 'phone'
    plan_name: string;
    price: number;
    start_date: string;
    end_date: string;
    status: string;
    user_id: string;
}

interface Payment {
    id: string;
    membership_id: string;
    amount: number;
}

interface CalendarEvent {
    date: Date;
    customer_name: string;
    phone?: string; // Nombre de columna corregido a 'phone'
    type: string;
    membership_id: string;
    amount_due: number;
    is_overdue: boolean;
    original_start_date: Date; 
}

interface DailyInfo {
    date: Date;
    events: CalendarEvent[];
    totalDueToday: number;
}

// ====================================================================
// MODAL DE DETALLES DEL DÍA
// ====================================================================

const DayDetailsModal: React.FC<{ dailyInfo: DailyInfo; onClose: () => void }> = ({ dailyInfo, onClose }) => {
    
    const handleWhatsApp = (event: CalendarEvent) => {
        if (!event.phone || event.phone.trim() === "") {
            alert(`No hay un número de teléfono registrado para ${event.customer_name}.`);
            return;
        }

        // Limpiar el número para que solo queden dígitos
        let cleanPhone = event.phone.replace(/\D/g, '');
        
        // Formato para Venezuela (si el número empieza con 0, cambiar por 58)
        if (cleanPhone.startsWith('0')) {
            cleanPhone = '58' + cleanPhone.substring(1);
        } else if (cleanPhone.length === 10 && !cleanPhone.startsWith('58')) {
            cleanPhone = '58' + cleanPhone;
        }

        const message = encodeURIComponent(
            `Hola ${event.customer_name}, te saludamos de la administración. 🏋️‍♂️\n\nTe recordamos que tu plan ${event.type} vence hoy. El monto pendiente es de $${event.amount_due.toFixed(2)}. ¡Te esperamos!`
        );

        window.open(`https://api.whatsapp.com/send?phone=${cleanPhone}&text=${message}`, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl max-w-sm w-full max-h-[90vh] overflow-hidden flex flex-col border border-slate-200 dark:border-slate-700">
                <div className="px-6 py-5 border-b dark:border-slate-700 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/40">
                    <div>
                        <h3 className="font-black text-slate-800 dark:text-white uppercase tracking-tighter text-sm">Cobros Pendientes</h3>
                        <p className="text-[10px] font-bold text-orange-500 uppercase tracking-widest">{format(dailyInfo.date, "EEEE, d 'de' MMMM", { locale: es })}</p>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 hover:text-red-500 rounded-xl transition-all"><X size={20}/></button>
                </div>
                
                <div className="p-6 overflow-y-auto space-y-4">
                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 rounded-2xl border border-yellow-100 dark:border-yellow-900/20 text-center">
                        <p className="text-[9px] font-black text-yellow-600 uppercase tracking-widest">Total del día</p>
                        <p className="text-3xl font-black text-yellow-700">${dailyInfo.totalDueToday.toFixed(2)}</p>
                    </div>

                    <div className="space-y-3">
                        {dailyInfo.events.map((event, i) => (
                            <div key={i} className={`p-4 border-2 rounded-2xl transition-all ${event.is_overdue ? 'border-red-100 bg-red-50/30' : 'border-slate-100 bg-slate-50 dark:bg-slate-900/30 dark:border-slate-700'}`}>
                                <div className="flex justify-between items-start mb-2">
                                    <span className="font-black text-slate-800 dark:text-slate-100 text-xs uppercase truncate max-w-[140px]">{event.customer_name}</span>
                                    <span className="text-[8px] bg-orange-100 text-orange-600 dark:bg-orange-900/30 px-2 py-0.5 rounded-full font-black uppercase">{event.type}</span>
                                </div>
                                
                                <div className="flex items-center justify-between">
                                    <p className="text-sm font-black text-green-600">${event.amount_due.toFixed(2)}</p>
                                    <button 
                                        onClick={() => handleWhatsApp(event)}
                                        className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-2 rounded-xl text-[9px] font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20"
                                    >
                                        <MessageCircle size={12}/> Notificar
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

// ====================================================================
// VISTA DE CALENDARIO
// ====================================================================

const PaymentCalendar: React.FC<{ memberships: Membership[]; onClose: () => void }> = ({ memberships, onClose }) => {
    const [currentDate, setCurrentDate] = useState(new Date()); 
    const [selectedDayInfo, setSelectedDayInfo] = useState<DailyInfo | null>(null);
    
    const calendarDays = useMemo(() => {
        const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
        const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);
        const days = [];
        const startIdx = start.getDay() === 0 ? 6 : start.getDay() - 1;
        for (let i = startIdx; i > 0; i--) days.push({ date: new Date(start.getFullYear(), start.getMonth(), 1 - i), isCurrent: false });
        for (let i = 1; i <= end.getDate(); i++) days.push({ date: new Date(start.getFullYear(), start.getMonth(), i), isCurrent: true });
        while (days.length < 42) days.push({ date: new Date(end.getFullYear(), end.getMonth(), days.length - (end.getDate() + startIdx) + 1), isCurrent: false });
        return days;
    }, [currentDate]);

    const groupedEvents = useMemo(() => {
        const acc: Record<string, DailyInfo> = {};
        const now = startOfDay(new Date());

        memberships.forEach(m => {
            const dueDate = new Date(m.end_date + 'T12:00:00');
            const key = format(dueDate, 'yyyy-MM-dd');
            if (!acc[key]) acc[key] = { date: dueDate, events: [], totalDueToday: 0 };

            acc[key].events.push({
                date: dueDate,
                customer_name: m.customer_name,
                phone: m.phone, // Mapeado correctamente desde 'phone'
                type: m.plan_name,
                membership_id: m.id,
                amount_due: m.price,
                is_overdue: isBefore(dueDate, now) && m.status !== 'pagado',
                original_start_date: new Date(m.start_date + 'T12:00:00'),
            });
            acc[key].totalDueToday += Number(m.price);
        });
        return acc;
    }, [memberships]);

    return (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-2 z-50 animate-in fade-in">
            <div className="bg-white dark:bg-slate-800 rounded-[2.5rem] shadow-2xl w-full max-w-5xl max-h-[95vh] flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700">
                <div className="p-6 bg-slate-900 text-white flex justify-between items-center">
                    <h2 className="text-xl font-black flex items-center gap-2 uppercase tracking-tighter"><Calendar className="w-6 h-6 text-orange-400"/> Notificación de Pagos</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-800 rounded-xl transition-all"><X/></button>
                </div>
                <div className="p-4 flex justify-between items-center border-b dark:border-slate-700">
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))} className="p-2 hover:bg-slate-100 rounded-full transition-all"><ChevronLeft/></button>
                    <span className="font-black uppercase text-slate-700 dark:text-slate-200 tracking-widest text-sm">{format(currentDate, 'MMMM yyyy', { locale: es })}</span>
                    <button onClick={() => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))} className="p-2 hover:bg-slate-100 rounded-full transition-all"><ChevronRight/></button>
                </div>
                <div className="flex-1 overflow-auto p-4 bg-slate-50 dark:bg-slate-900/50">
                    <div className="grid grid-cols-7 gap-1 bg-slate-200 dark:bg-slate-700 p-1 rounded-2xl">
                        {['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'].map(d => (
                            <div key={d} className="p-3 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">{d}</div>
                        ))}
                        {calendarDays.map((day, i) => {
                            const key = format(day.date, 'yyyy-MM-dd');
                            const data = groupedEvents[key];
                            return (
                                <div key={i} 
                                    onClick={() => data && setSelectedDayInfo(data)}
                                    className={`h-24 md:h-32 p-2 cursor-pointer transition-all relative rounded-xl border ${day.isCurrent ? 'bg-white dark:bg-slate-800 hover:scale-[1.02]' : 'opacity-30'} ${data ? 'border-orange-200 bg-orange-50/50' : 'border-transparent'}`}>
                                    <div className="text-right text-[10px] font-black">{day.date.getDate()}</div>
                                    {data && (
                                        <div className="mt-2 text-[8px] bg-orange-600 text-white p-1.5 rounded-lg font-black uppercase text-center shadow-md">
                                            {data.events.length} {data.events.length === 1 ? 'Miembro' : 'Miembros'}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
            {selectedDayInfo && <DayDetailsModal dailyInfo={selectedDayInfo} onClose={() => setSelectedDayInfo(null)} />}
        </div>
    );
};

// ====================================================================
// COMPONENTE PRINCIPAL
// ====================================================================

export function StatisticsModule() {
    const { user } = useAuth();
    const [memberships, setMemberships] = useState<Membership[]>([]);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [isCalendarOpen, setIsCalendarOpen] = useState(false); 
    

    const loadData = useCallback(async () => {
        if (!user) return;
        // Cargamos todas las columnas, incluyendo 'phone'
        const { data: mems } = await supabase.from('memberships').select('*').eq('user_id', user.id);
        const { data: pays } = await supabase.from('payments').select('*');
        setMemberships(mems || []);
        setPayments(pays || []);
    }, [user]);

    useEffect(() => { loadData(); }, [loadData]);

    const stats = useMemo(() => {
        const today = startOfDay(new Date());
        return memberships.reduce((acc, m) => {
            const price = Number(m.price) || 0;
            const paidForThis = payments.filter(p => p.membership_id === m.id).reduce((s, p) => s + Number(p.amount), 0);
            const isInactive = isBefore(new Date(m.end_date + 'T12:00:00'), today);
            const debt = price > paidForThis ? (price - paidForThis) : 0;
            return {
                count: acc.count + 1,
                paid: acc.paid + paidForThis, 
                pending: acc.pending + debt,   
                inactive: isInactive ? acc.inactive + 1 : acc.inactive
            };
        }, { count: 0, paid: 0, pending: 0, inactive: 0 });
    }, [memberships, payments]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Estadísticas</h2>
                <button 
                    onClick={() => setIsCalendarOpen(true)} 
                    className="bg-orange-600 hover:bg-orange-700 text-white px-6 py-3 rounded-[1.2rem] flex items-center gap-2 text-xs font-black uppercase shadow-xl shadow-blue-500/20 transition-all active:scale-95"
                >
                    <Calendar className="w-5 h-5"/> Notificación de Pagos
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard icon={<ShoppingBag/>} color="orange" label="Miembros Inscritos" value={stats.count} />
                <StatCard icon={<UserX/>} color="red" label="Inactivos" value={stats.inactive} subtext="Vencidos" />
                <StatCard icon={<TrendingUp/>} color="green" label="Caja" value={`$${stats.paid.toFixed(2)}`}  />
                <StatCard icon={<DollarSign/>} color="yellow" label="Pendiente" value={`$${stats.pending.toFixed(2)}`} />
            </div>

            {isCalendarOpen && <PaymentCalendar memberships={memberships} onClose={() => setIsCalendarOpen(false)} />}
        </div>
    );
}

function StatCard({ icon, color, label, value, bs }: any) {
    const colors: any = { 
        orange: 'bg-orange-50 text-orange-600 border-orange-500', 
        red: 'bg-red-50 text-red-600 border-red-500', 
        green: 'bg-green-50 text-green-600 border-green-500', 
        yellow: 'bg-yellow-50 text-yellow-600 border-yellow-500' 
    };

    return (
        <div className={`bg-white dark:bg-slate-800 border rounded-3xl p-6 shadow-sm border-b-4 ${colors[color].split(' ')[2]}`}>
            <div className="flex items-center gap-4">
                <div className={`p-4 rounded-2xl ${colors[color].split(' ')[0]} ${colors[color].split(' ')[1]}`}>
                    {icon}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">{label}</p>
                    <p className="text-2xl font-black text-slate-800 dark:text-white truncate tracking-tighter">{value}</p>
                    {bs !== null && bs !== undefined && (
                        <p className="text-[10px] text-slate-400 mt-1 font-bold">Bs. {bs.toLocaleString('es-VE', { minimumFractionDigits: 2 })}</p>
                    )}
                </div>
            </div>
        </div>
    );
}