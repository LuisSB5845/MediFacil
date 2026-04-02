import React from 'react';
import { 
  FileText, 
  Sparkles, 
  ShieldCheck, 
  Printer, 
  Download, 
  History 
} from 'lucide-react';
import { motion } from 'motion/react';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../types';

export const DocumentGenerator = ({ user, profile }: { user: FirebaseUser | null, profile: UserProfile | null }) => {
  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex items-center justify-center">
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-atelier p-16 text-center space-y-8 max-w-2xl bg-white border-2 border-dashed border-primary/20 shadow-2xl relative overflow-hidden group"
      >
        {/* Background Decorative Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-secondary/5 rounded-full -ml-12 -mb-12 transition-transform group-hover:scale-110" />

        <div className="relative">
          <div className="w-24 h-24 bg-primary/5 rounded-3xl flex items-center justify-center mx-auto mb-8 text-primary group-hover:scale-110 transition-transform shadow-sm">
            <FileText className="w-12 h-12" />
          </div>
          
          <h2 className="title-atelier text-3xl text-primary mb-4 tracking-tight">Generación de Documentos Clínicos</h2>
          <p className="body-atelier text-high-contrast/60 text-lg max-w-md mx-auto leading-relaxed">
            Estamos trabajando en una potente herramienta para generar recetas, certificados y reportes clínicos de forma automática y profesional.
          </p>
        </div>

        <div className="py-2">
          <div className="relative inline-flex items-center gap-3 px-10 py-5 bg-[#191970] text-white rounded-2xl text-xl font-bold shadow-2xl shadow-[#191970]/40 group overflow-hidden cursor-wait transition-all hover:scale-105 active:scale-95">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
            <Sparkles className="w-6 h-6 text-emerald-400 animate-pulse" />
            Próximamente disponible
          </div>
        </div>

        <div className="grid grid-cols-3 gap-8 pt-10 border-t border-surface-container-high relative">
          {/* Progress Indicator Overlays */}
          <div className="absolute -top-[1px] left-0 w-3/4 h-[2px] bg-gradient-to-r from-primary to-secondary" />
          
          <div className="flex flex-col items-center gap-3 group/item">
            <div className="p-4 bg-primary/5 rounded-2xl text-primary transition-colors group-hover/item:bg-primary group-hover/item:text-white">
              <Printer className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-primary/40 group-hover/item:text-primary">Impresión Inteligente</p>
          </div>
          <div className="flex flex-col items-center gap-3 group/item">
            <div className="p-4 bg-secondary/5 rounded-2xl text-secondary transition-colors group-hover/item:bg-secondary group-hover/item:text-white">
              <Download className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-secondary/40 group-hover/item:text-secondary">Exportación PDF</p>
          </div>
          <div className="flex flex-col items-center gap-3 group/item">
            <div className="p-4 bg-surface-low rounded-2xl text-high-contrast/20 transition-colors group-hover/item:bg-emerald-500 group-hover/item:text-white">
              <History className="w-6 h-6" />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-high-contrast/20 group-hover/item:text-emerald-600">Historial Digital</p>
          </div>
        </div>

        <div className="flex items-center justify-center gap-3 text-xs font-bold text-high-contrast/20 uppercase tracking-widest">
          <ShieldCheck className="w-4 h-4" />
          Encriptación de Grado Médico
        </div>
      </motion.div>
    </div>
  );
};
