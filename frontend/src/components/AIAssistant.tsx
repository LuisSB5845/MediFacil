import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Sparkles, 
  Mic, 
  MicOff, 
  Paperclip, 
  Camera, 
  MessageSquare,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { User as FirebaseUser } from 'firebase/auth';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';

export const AIAssistant = ({ user, profile }: { user: FirebaseUser | null, profile: UserProfile | null }) => {
  const [messages, setMessages] = useState<{role: 'user' | 'assistant', content: string}[]>([
    { role: 'assistant', content: 'Hola, soy tu asistente médico IA. ¿En qué puedo ayudarte hoy?' }
  ]);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-4xl mx-auto bg-white rounded-3xl shadow-ambient overflow-hidden border border-surface-container-high">
      {/* Header */}
      <div className="p-6 border-b border-surface-container-high bg-white flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-primary/5 rounded-2xl flex items-center justify-center text-primary">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-primary">Asistente Clínico Inteligente</h3>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-xs font-bold text-emerald-600 uppercase tracking-widest">En línea</p>
            </div>
          </div>
        </div>
        <div className="px-4 py-2 bg-surface-container-low rounded-xl border border-surface-container-high">
          <p className="text-[10px] font-black text-high-contrast/30 uppercase tracking-widest">Modelo de Lenguaje Especializado</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar bg-surface-low/30">
        {messages.map((m, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex items-start gap-4 max-w-[85%]",
              m.role === 'user' ? "ml-auto flex-row-reverse" : ""
            )}
          >
            <div className={cn(
              "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm",
              m.role === 'user' ? "bg-primary text-white" : "bg-white border border-surface-container-high text-primary"
            )}>
              {m.role === 'user' ? <MessageSquare className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
            </div>
            <div className={cn(
              "p-5 rounded-3xl text-sm leading-relaxed",
              m.role === 'user' 
                ? "bg-primary text-white rounded-tr-none shadow-lg shadow-primary/10" 
                : "bg-white border border-surface-container-high text-high-contrast rounded-tl-none shadow-ambient"
            )}>
              <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-surface-low prose-pre:border prose-pre:border-surface-container-high text-inherit font-medium">
                <ReactMarkdown>
                  {m.content}
                </ReactMarkdown>
              </div>
            </div>
          </motion.div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input - Premium "Coming Soon" Interface */}
      <div className="relative p-10 bg-white border-t border-surface-container-high overflow-hidden">
        {/* Animated Background Blur */}
        <div className="absolute inset-0 bg-white/40 backdrop-blur-md z-10 flex flex-col items-center justify-center p-8 text-center space-y-6">
          <motion.div 
            animate={{ 
              scale: [1, 1.05, 1],
              opacity: [0.8, 1, 0.8] 
            }}
            transition={{ duration: 4, repeat: Infinity }}
            className="w-20 h-20 bg-[#191970]/5 rounded-3xl flex items-center justify-center text-[#191970] shadow-inner"
          >
            <Sparkles className="w-10 h-10 fill-current text-emerald-400" />
          </motion.div>
          
          <div className="space-y-3 relative z-20">
            <h4 className="text-2xl font-black text-primary tracking-tight">Evolución en Progreso</h4>
            <p className="text-high-contrast/60 font-medium max-w-sm mx-auto leading-relaxed">
              Estamos integrando redes neuronales de grado médico para transformar tus protocolos clínicos en diagnósticos precisos.
            </p>
          </div>

          <div className="flex gap-4 relative z-20">
            <span className="px-6 py-3 bg-[#191970] text-white rounded-xl font-bold text-sm shadow-xl shadow-[#191970]/20 flex items-center gap-2 cursor-wait group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000" />
              Notificarme Lanzamiento
            </span>
            <div className="px-6 py-3 bg-surface-low border border-surface-container-high text-primary rounded-xl font-bold text-sm flex items-center gap-2">
              <Activity className="w-4 h-4 animate-pulse" />
              Beta Privada: 85%
            </div>
          </div>
        </div>

        {/* Dummy Input (Blurred Background) */}
        <div className="flex gap-4 opacity-10 grayscale blur-[2px]">
          <div className="flex-1 bg-surface-low rounded-2xl h-14 border border-surface-container-high px-6 flex items-center gap-4">
            <Paperclip className="w-5 h-5 text-high-contrast/30" />
            <div className="flex-1 h-4 bg-high-contrast/10 rounded-full w-1/2" />
          </div>
          <div className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white">
            <Send className="w-6 h-6" />
          </div>
        </div>
      </div>
    </div>
  );
};
