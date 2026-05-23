import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { 
    Settings, Plus, Trash2, Edit2, Save, X, 
    Clock, DollarSign
} from 'lucide-react';

interface MembershipType {
    id: string;
    name: string;
    price: number;
    duration_days: number;
}

export default function Ajustes() {
    const { user } = useAuth();
    const [plans, setPlans] = useState<MembershipType[]>([]);
    const [isEditing, setIsEditing] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Estado para nuevo plan / edición
    const [formData, setFormData] = useState({
        name: '',
        price: '',
        duration_days: '30'
    });

    useEffect(() => {
        if (user) fetchPlans();
    }, [user]);

   async function fetchPlans() {
    setLoading(true);
    const { data, error } = await supabase
        .from('membership_types')
        .select('*')
        .eq('user_id', user?.id)
        .order('duration_days', { ascending: true });

    if (error) {
        console.error("Error cargando membresías:", error.message);
    }

    if (data) setPlans(data);
    setLoading(false);
}

    async function handleSave() {
        if (!formData.name || !formData.price) return;

        const payload = {
            name: formData.name,
            price: parseFloat(formData.price),
            duration_days: parseInt(formData.duration_days),
            user_id: user?.id
        };

        if (isEditing) {
            await supabase.from('membership_types').update(payload).eq('id', isEditing);
        } else {
            await supabase.from('membership_types').insert([payload]);
        }

        setFormData({ name: '', price: '', duration_days: '30' });
        setIsEditing(null);
        fetchPlans();
    }

    async function deletePlan(id: string) {
        if (confirm('¿Estás seguro de eliminar este plan?')) {
            await supabase.from('membership_types').delete().eq('id', id);
            fetchPlans();
        }
    }

    const startEdit = (plan: MembershipType) => {
        setIsEditing(plan.id);
        setFormData({
            name: plan.name,
            price: plan.price.toString(),
            duration_days: plan.duration_days.toString()
        });
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6 p-4 text-white">
            
            {/* TÍTULO DE SECCIÓN */}
            <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-zinc-900 rounded-xl text-orange-500 border border-zinc-800 shadow-md">
                    <Settings className="w-6 h-6" />
                </div>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic">Configuración de Membresías</h2>
            </div>

            {/* FORMULARIO DE CREACIÓN / EDICIÓN */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-[2rem] shadow-xl overflow-hidden">
                <div className="bg-black px-6 py-4 border-b border-zinc-800">
                    <h3 className="font-black text-zinc-300 uppercase tracking-wider text-xs flex items-center gap-2">
                        {isEditing ? <Edit2 className="w-4 h-4 text-orange-500" /> : <Plus className="w-4 h-4 text-orange-500" />}
                        {isEditing ? 'Editar Plan Seleccionado' : 'Crear Nueva Membresía'}
                    </h3>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                    <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Nombre del Plan</label>
                        <input 
                            type="text" 
                            placeholder="Ej: Mensualidad VIP"
                            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl focus:border-orange-500 focus:outline-none transition-colors text-zinc-200 text-sm font-medium"
                            value={formData.name}
                            onChange={e => setFormData({...formData, name: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Precio ($)</label>
                        <input 
                            type="number" 
                            placeholder="0.00"
                            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl focus:border-orange-500 focus:outline-none transition-colors text-zinc-200 text-sm font-medium"
                            value={formData.price}
                            onChange={e => setFormData({...formData, price: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1.5">Duración (Días)</label>
                        <select 
                            className="w-full px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-xl focus:border-orange-500 focus:outline-none transition-colors text-zinc-200 text-sm font-medium"
                            value={formData.duration_days}
                            onChange={e => setFormData({...formData, duration_days: e.target.value})}
                        >
                            <option value="1">Pase Diario (1 día)</option>
                            <option value="7">Semanal (7 días)</option>
                            <option value="15">Quincenal (15 días)</option>
                            <option value="30">Mensual (30 días)</option>
                            <option value="90">Trimestral (90 días)</option>
                            <option value="365">Anual (365 días)</option>
                        </select>
                    </div>
                    <div className="md:col-span-3 flex justify-end gap-2 mt-2">
                        {isEditing && (
                            <button 
                                onClick={() => { setIsEditing(null); setFormData({name:'', price:'', duration_days:'30'}); }}
                                className="px-4 py-2 text-zinc-400 font-bold uppercase tracking-wider text-[11px] hover:bg-zinc-800 rounded-xl flex items-center gap-2 transition-colors"
                            >
                                <X className="w-4 h-4" /> Cancelar
                            </button>
                        )}
                        <button 
                            onClick={handleSave}
                            className="bg-gradient-to-r from-orange-600 to-orange-500 text-white px-6 py-2.5 rounded-xl font-black uppercase tracking-wider text-[11px] hover:from-orange-500 hover:to-orange-400 transition-all flex items-center gap-2 shadow-lg shadow-orange-600/10 border-b-2 border-orange-700"
                        >
                            <Save className="w-4 h-4" /> {isEditing ? 'Actualizar Plan' : 'Guardar Plan'}
                        </button>
                    </div>
                </div>
            </div>

            {/* LISTA DE PLANES EXISTENTES */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {plans.map(plan => (
                    <div key={plan.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 flex justify-between items-center hover:border-zinc-700 transition-all">
                        <div className="flex items-center gap-4">
                            <div className="bg-zinc-800 p-3 rounded-xl text-orange-500 border border-zinc-700">
                                <Clock className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-black text-sm uppercase tracking-tight text-white italic">{plan.name}</h4>
                                <div className="flex gap-3 mt-1.5">
                                    <span className="text-xs text-orange-500 font-black flex items-center gap-0.5 bg-orange-950/30 px-2 py-0.5 rounded-md border border-orange-900/30">
                                        <DollarSign className="w-3 h-3" /> {plan.price}
                                    </span>
                                    <span className="text-xs text-zinc-400 font-medium flex items-center gap-1 bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700">
                                        <Clock className="w-3 h-3 text-zinc-500" /> {plan.duration_days} días
                                    </span>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-1">
                            <button 
                                onClick={() => startEdit(plan)}
                                className="p-2 text-zinc-500 hover:text-orange-500 hover:bg-zinc-800 rounded-xl transition-colors"
                            >
                                <Edit2 className="w-5 h-5" />
                            </button>
                            <button 
                                onClick={() => deletePlan(plan.id)}
                                className="p-2 text-zinc-500 hover:text-red-500 hover:bg-zinc-800 rounded-xl transition-colors"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* ESTADO VACÍO */}
            {plans.length === 0 && !loading && (
                <div className="text-center py-12 bg-zinc-950 rounded-2xl border-2 border-dashed border-zinc-800">
                    <p className="text-zinc-500 text-sm font-bold uppercase tracking-wide">No has configurado ningún plan todavía.</p>
                </div>
            )}
        </div>
    );
}