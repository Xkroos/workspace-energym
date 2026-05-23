import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, HelpCircle } from 'lucide-react';

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { signIn } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Al quitar la creación de cuenta, va directo al inicio de sesión
        // Se aplica .trim() para limpiar espacios invisibles que provocan el error 400
        const { error } = await signIn(email.trim(), password);

        if (error) {
            // Validamos la existencia de 'status' de forma segura para evitar fallos en TypeScript
            const isValidationError = error.message.includes("Invalid login credentials") || 
                                      ('status' in error && (error as any).status === 400);

            if (isValidationError) {
                setError("Correo o contraseña incorrectos.");
            } else if (error.message.includes("Email not confirmed")) {
                setError("El correo electrónico aún no ha sido confirmado.");
            } else {
                setError(error.message);
            }
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-black text-white flex flex-col justify-between font-sans selection:bg-orange-600 selection:text-white">
            
            {/* CONTENEDOR PRINCIPAL */}
            <div className="flex-1 flex items-center justify-center w-full max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-2 items-center gap-8 p-4 sm:p-8">
                
                {/* COLUMNA IZQUIERDA: Imagen de la Atleta */}
                <div className="hidden md:flex justify-center items-center pr-4">
                    <img 
                        src="/foto" 
                        alt="Energym Athlete" 
                        className="max-h-[80vh] w-auto object-contain animate-fade-in"
                        onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1541534741688-6078c6bfb5c5?q=80&w=1000&auto=format&fit=crop";
                        }}
                    />
                </div>

                {/* COLUMNA DERECHA: Branding y Formulario */}
                <div className="w-full max-w-md mx-auto flex flex-col justify-center px-4">
                    
                    {/* LOGO DE ENERGYM */}
                    <div className="flex flex-col items-center md:items-start mb-6">
                        <div className="mb-4">
                            <img 
                                src="" 
                                alt="Energym Logo" 
                                className="h-28 w-auto object-contain" 
                            />
                        </div>
                        <h1 className="text-3xl sm:text-4xl font-black italic tracking-wide text-center md:text-left uppercase">
                            Energym Fitness Center
                        </h1>
                        <p className="text-gray-400 text-xs mt-1 font-mono tracking-widest uppercase">
                            J-504846821
                        </p>
                        <p className="text-orange-500 text-[10px] sm:text-xs font-bold uppercase tracking-widest mt-2 italic">
                            ¡Transformamos cuerpos y mentes!
                        </p>
                    </div>

                    {/* FORMULARIO */}
                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        {/* INPUT: Email / Usuario */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Mail className="text-orange-500 w-5 h-5" />
                            </div>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-zinc-700/80 text-gray-200 font-medium placeholder-gray-400 rounded-full border border-transparent focus:outline-none focus:bg-zinc-700 focus:border-orange-500 transition-all text-sm"
                                placeholder="Usuario (Email)"
                                required
                            />
                        </div>
                        
                        {/* INPUT: Contraseña */}
                        <div className="relative">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Lock className="text-orange-500 w-5 h-5" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full pl-12 pr-4 py-3.5 bg-zinc-700/80 text-gray-200 font-medium placeholder-gray-400 rounded-full border border-transparent focus:outline-none focus:bg-zinc-700 focus:border-orange-500 transition-all text-sm"
                                placeholder="Contraseña"
                                required
                            />
                        </div>
                        
                        {/* MENSAJE DE ERROR */}
                        {error && (
                            <div className="text-red-400 text-xs bg-red-950/50 border border-red-900 px-4 py-2 rounded-xl text-center">
                                {error}
                            </div>
                        )}
                        
                        {/* BOTÓN LOGIN */}
                        <div className="pt-2">
                            <button
                                type="submit"
                                disabled={loading}
                                className="w-full py-3 bg-gradient-to-r from-orange-600 to-orange-500 text-white font-black uppercase tracking-widest rounded-full hover:from-orange-500 hover:to-orange-400 active:scale-[0.99] transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-orange-600/20 text-sm border-b-4 border-orange-700"
                            >
                                {loading ? 'Procesando...' : 'Iniciar Sesion'}
                            </button>
                        </div>
                        
                    </form>
                    
                    {/* ENLACE DE AYUDA (Centrado ahora que no está el botón de crear cuenta) */}
                    <div className="mt-6 flex justify-center text-xs text-zinc-500 font-medium">
                        <a 
                            href="https://wa.me/584128847390"
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="hover:text-orange-400 transition-colors flex items-center gap-1 uppercase tracking-tight"
                        >
                            <HelpCircle size={14}/> Necesitas Ayuda?
                        </a>
                    </div>

                </div>
            </div>

            {/* BANNER DE DERECHOS RESERVADOS */}
            <div className="w-full py-4 bg-zinc-950 border-t border-zinc-900 text-center text-[11px] text-zinc-500 font-medium tracking-wide">
                © 2026 Desarrollado por <span className="text-orange-500 font-bold">Xkroos</span>. Todos los derechos reservados.
            </div>
        </div>
    );
}