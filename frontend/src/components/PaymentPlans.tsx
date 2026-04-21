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
  ArrowRight,
  BadgeCheck
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

      <button
        onClick={onSubscribe}
        className={cn(
          "w-full h-14 rounded-2xl flex items-center justify-center gap-2 font-black text-sm uppercase tracking-widest transition-all active:scale-95 group",
          isPopular 
            ? "bg-[#191970] text-white shadow-lg hover:shadow-primary/30" 
            : "bg-slate-100 text-[#191970] hover:bg-slate-200"
        )}
      >
        <span>{buttonText}</span>
        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
      </button>
    </motion.div>
  );
};

const PaymentPlans = ({ user }: { user: any }) => {
  const stripeLinks = {
    monthly: 'https://buy.stripe.com/test_28E3cxfmlb6Ha5b6zz6kg04',
    yearly: 'https://buy.stripe.com/test_14A28tded4Ija5b3nn6kg05'
  };

  const currentUrl = window.location.origin;

  const handleSubscribe = (baseUrl: string) => {
    if (!user) {
      alert("Por favor inicia sesión para suscribirte.");
      return;
    }
    const checkoutUrl = new URL(baseUrl);
    checkoutUrl.searchParams.append('prefilled_email', user.email);
    checkoutUrl.searchParams.append('client_reference_id', user.uid);
    // Note: Checkout Session success_url can't be set via query param on a static link, 
    // but we can detect the return if the Stripe link is configured to redirect back.
    // Assuming the Stripe Payment Link is configured to redirect to: currentUrl + "?payment_success=true"
    window.open(checkoutUrl.toString(), '_blank');
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
      onSubscribe: () => user?.plan === 'pro' ? alert('Ya tienes este plan activo.') : handleSubscribe(stripeLinks.monthly),
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
      onSubscribe: () => user?.plan === 'pro' ? alert('Plan Pro activo. Para cambios a facturación anual contáctanos.') : handleSubscribe(stripeLinks.yearly),
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
