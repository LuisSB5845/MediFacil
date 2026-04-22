import React from 'react';
import { motion } from 'motion/react';
import { 
  CheckCircle2, 
  Sparkles, 
  ShieldCheck, 
  Zap, 
  User, 
  Users, 
  BriefcaseMedical,
  BadgeCheck,
  CreditCard,
  MessageCircle,
  Clock
} from 'lucide-react';
import { cn } from '../lib/utils';

interface PlanProps {
  name: string;
  price: string;
  interval: string;
  description: string;
  features: string[];
  buttonText: string;
  isPopular?: boolean;
  onSubscribe: () => void;
  icon: React.ElementType;
  gradient: string;
}

const PlanCard = ({ 
  name, 
  price, 
  interval, 
  description, 
  features, 
  buttonText, 
  isPopular, 
  onSubscribe,
  icon: Icon,
  gradient
}: PlanProps) => {
  return (
    <motion.div 
      whileHover={{ y: -8, scale: 1.02 }}
      className={cn(
        "relative flex flex-col p-8 rounded-3xl transition-all duration-300",
        "bg-white/80 backdrop-blur-xl border border-white/20 shadow-2xl overflow-hidden",
        isPopular ? "ring-2 ring-primary ring-offset-4 ring-offset-transparent shadow-primary/20" : "shadow-slate-200/50"
      )}
    >
      {isPopular && (
        <div className="absolute top-0 right-0 px-4 py-1.5 bg-primary text-white text-[10px] font-black uppercase tracking-[0.25em] rounded-bl-xl rounded-tr-xl flex items-center gap-1.5">
          <Sparkles className="w-3 h-3 fill-white" />
          Más Recomendado
        </div>
      )}

      <div className={cn("inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-6 bg-gradient-to-br", gradient)}>
        <Icon className="w-7 h-7 text-white" />
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-black text-[#191970] mb-2">{name}</h3>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">{description}</p>
      </div>

      <div className="flex items-baseline gap-1 mb-8">
        <span className="text-4xl font-black text-[#191970] tracking-tight">{price}</span>
        <span className="text-slate-400 font-bold tracking-tighter">{interval}</span>
      </div>

      <div className="space-y-4 mb-10 flex-grow">
        {features.map((feature, idx) => (
          <div key={idx} className="flex items-center gap-3 group">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/5 flex items-center justify-center">
              <CheckCircle2 className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-sm font-semibold text-slate-600 tracking-tight">{feature}</span>
          </div>
        ))}
      </div>

      <div className="mt-auto space-y-4">
        <div className="p-4 rounded-2xl bg-amber-50/50 border border-amber-200/50 backdrop-blur-sm">
          <div className="flex gap-3 items-start">
            <Clock className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-[11px] font-bold text-amber-900 leading-relaxed uppercase tracking-tight">
              Los planes de pago estarán disponibles muy pronto. Si deseas acceso completo ahora mismo, contáctanos directamente.
            </p>
          </div>
        </div>

        <a
          href="https://wa.me/18298146363"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(
            "w-full h-14 rounded-2xl flex items-center justify-center gap-3 font-black text-xs uppercase tracking-widest transition-all active:scale-95 group",
            "bg-[#25D366] text-white shadow-lg shadow-green-500/20 hover:shadow-green-500/40 hover:scale-[1.02]"
          )}
        >
          <MessageCircle className="w-5 h-5 transition-transform group-hover:scale-110" />
          <span>Contáctanos por WhatsApp</span>
        </a>
      </div>
    </motion.div>
  );
};

const PaymentPlans = ({ user }: { user: any }) => {
  const API_URL = (import.meta as any).env.VITE_API_URL || "/api";
  const PRICE_IDS = {
    monthly: (import.meta as any).env.VITE_STRIPE_MONTHLY_PRICE_ID,
    yearly: (import.meta as any).env.VITE_STRIPE_YEARLY_PRICE_ID
  };

  const handleSubscribe = async (priceId: string) => {
    if (!user) {
      alert("Por favor inicia sesión para suscribirte.");
      return;
    }

    if (!priceId) {
      alert("Error: Price ID no configurado.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/stripe/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId,
          userId: user.uid,
          userEmail: user.email
        }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "No se pudo obtener la URL de pago");
      }
    } catch (error: any) {
      console.error("Error iniciando pago:", error);
      alert("Error al conectar con Stripe: " + error.message);
    }
  };

  const handleManageBilling = async () => {
    if (!user?.stripeCustomerId) {
      alert("No se encontró información de facturación activa.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/stripe/create-portal-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customerId: user.stripeCustomerId }),
      });

      const data = await response.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error(data.error || "No se pudo obtener la URL del portal");
      }
    } catch (error: any) {
      console.error("Error abriendo portal de facturación:", error);
      alert("Error al abrir gestión de facturación: " + error.message);
    }
  };

  const plans = [
    {
      name: "MediFácil Gratis",
      price: "$0",
      interval: "/siempre",
      description: "Esencial para médicos que inician su digitalización clínica básica.",
      features: [
        "Hasta 20 registros de pacientes",
        "Generador de documentos (Básico)",
        "Seguridad de datos estándar",
        "Panel de dashboard clínico"
      ],
      buttonText: (!user?.plan || user?.plan === 'free') ? "Plan Actual" : "Plan Básico",
      isPopular: false,
      onSubscribe: () => alert('Ya estás en el plan gratuito o tienes uno superior.'),
      icon: User,
      gradient: "from-slate-400 to-slate-600"
    },
    {
      name: "Plan Médico",
      price: "$12",
      interval: "/mes",
      description: "Potencia tu práctica con el asistente de IA avanzado y registros ilimitados.",
      features: [
        "Pacientes ilimitados",
        "Asistente de IA Pro (Gemini)",
        "Análisis de imágenes médicas",
        "Personalización de recetas",
        "Soporte prioritario"
      ],
      buttonText: user?.plan === 'pro' ? "Plan Actual" : "Suscribirse Ahora",
      isPopular: true,
      onSubscribe: () => user?.plan === 'pro' ? alert('Ya tienes este plan activo.') : handleSubscribe(PRICE_IDS.monthly),
      icon: BriefcaseMedical,
      gradient: "from-[#191970] to-[#2a2a9a]"
    },
    {
      name: "Plan Anual Médico",
      price: "$99",
      interval: "/año",
      description: "Digitaliza tu clínica completa con ahorros significativos y máxima potencia.",
      features: [
        "Todo lo del Plan Mensual",
        "Ahorro del 17% anual",
        "Acceso multi-dispositivo",
        "Analítica avanzada de la clínica",
        "Sello de Verificación MediFácil"
      ],
      buttonText: user?.plan === 'pro' ? "Plan Actual" : "Elegir Plan Anual",
      isPopular: false,
      onSubscribe: () => user?.plan === 'pro' ? alert('Plan Pro activo. Para cambios a facturación anual contáctanos.') : handleSubscribe(PRICE_IDS.yearly),
      icon: Sparkles,
      gradient: "from-[#083825] to-[#125c3d]"
    }
  ];

  return (
    <div className="p-10 max-w-7xl mx-auto">
      <header className="mb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full mb-4">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">Pagos Seguros vía Stripe</span>
        </div>
        <h2 className="text-5xl font-black text-[#191970] tracking-tight mb-4">
          Elige el Pulso de tu <span className="text-primary italic">Atelier Clínico</span>
        </h2>
        {user?.plan && (
          <div className="mb-8 inline-flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-2xl shadow-sm text-green-700 font-black text-sm uppercase tracking-widest animate-in fade-in slide-in-from-top-2 duration-500">
            <BadgeCheck className="w-4 h-4" />
            Plan Actual: <span className="text-emerald-800">{user.plan === 'pro' ? 'PROFESIONAL' : 'GRATUITO'}</span>
          </div>
        )}
        <p className="max-w-2xl mx-auto text-lg text-slate-500 font-medium leading-relaxed">
          Nuestros planes están diseñados para adaptarse al crecimiento de tu práctica médica, desde el inicio individual hasta la gestión clínica completa.
        </p>
        
        {user?.plan === 'pro' && user?.stripeCustomerId && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <button 
              onClick={handleManageBilling}
              className="px-8 py-3 rounded-xl bg-slate-900 text-white text-xs font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl flex items-center gap-2 mx-auto"
            >
              <CreditCard className="w-4 h-4" />
              Gestionar Facturación y Plan
            </button>
          </motion.div>
        )}
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
        {plans.map((plan, idx) => (
          <PlanCard 
            key={idx} 
            name={plan.name}
            price={plan.price}
            interval={plan.interval}
            description={plan.description}
            features={plan.features}
            buttonText={plan.buttonText}
            isPopular={plan.isPopular}
            onSubscribe={plan.onSubscribe}
            icon={plan.icon}
            gradient={plan.gradient}
          />
        ))}
      </div>

      <footer className="relative h-48 bg-gradient-to-br from-[#191970] to-[#083825] rounded-[2.5rem] overflow-hidden flex items-center justify-center text-center px-8 shadow-2xl">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_white_1px,_transparent_1px)] bg-[size:20px_20px]"></div>
        <div className="relative z-10">
          <h4 className="text-2xl font-black text-white mb-2 italic flex items-center justify-center gap-3">
             <Zap className="w-8 h-8 fill-secondary text-secondary animate-pulse" />
             ¿Necesitas una implementación personalizada?
          </h4>
          <p className="text-white/60 font-semibold tracking-wide uppercase text-sm">Contáctanos para soluciones hospitalarias integrales</p>
        </div>
      </footer>
    </div>
  );
};

export default PaymentPlans;
