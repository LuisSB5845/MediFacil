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
  Activity,
  Loader2,
  Plus,
  History,
  MoreVertical,
  Search,
  Settings,
  Info,
  ChevronLeft,
  Stethoscope,
  Pill,
  Apple
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { User as FirebaseUser } from 'firebase/auth';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  serverTimestamp,
  doc,
  updateDoc,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile, Chat, Message } from '../types';
import { cn } from '../lib/utils';
import { createChat } from '../lib/ai';
import { canUseAI, incrementAIUsage } from '../lib/usageLimits';

export const AIAssistant = ({ user, profile }: { user: FirebaseUser | null, profile: UserProfile | null }) => {
  // State for Chats
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  
  // UI State
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chats on mount
  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'chats'),
      where('doctorId', '==', user.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const chatList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
      setChats(chatList);
      
      // If no active chat and there are chats, pick the first one
      if (!activeChatId && chatList.length > 0) {
        setActiveChatId(chatList[0].id);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Load messages when active chat changes
  useEffect(() => {
    if (!activeChatId) {
      setMessages([]);
      return;
    }

    const q = query(
      collection(db, 'chats', activeChatId, 'messages'),
      orderBy('createdAt', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgList = snapshot.docs.map(doc => doc.data() as Message);
      setMessages(msgList);
    });

    return () => unsubscribe();
  }, [activeChatId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const createNewChat = async (initialTitle: string = "Nueva conversación") => {
    if (!user) return;
    
    const newChatRef = await addDoc(collection(db, 'chats'), {
      title: initialTitle,
      doctorId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      lastMessage: ""
    });

    setActiveChatId(newChatRef.id);
    return newChatRef.id;
  };

  const handleSend = async (overrideInput?: string) => {
    const textToSend = overrideInput || input;
    if (!textToSend.trim() || isLoading || !user) return;

    if (profile && !canUseAI(profile as any).allowed) {
      alert("Has alcanzado el límite de mensajes de IA de tu plan. Actualiza a Pro para seguir conversando.");
      return;
    }

    setIsLoading(true);
    if (!overrideInput) setInput('');

    try {
      let chatId = activeChatId;
      if (!chatId) {
        chatId = await createNewChat(textToSend.substring(0, 30) + "...");
      }

      if (!chatId) return;

      // 1. Add User Message to Firestore
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        role: 'user',
        content: textToSend,
        createdAt: serverTimestamp()
      });

      // 2. Update Chat metadata
      await updateDoc(doc(db, 'chats', chatId), {
        updatedAt: serverTimestamp(),
        lastMessage: textToSend
      });

      // 3. Call AI with History Context
      const historyWithCurrent = [
        ...messages,
        { role: 'user', content: textToSend }
      ];
      const chat = createChat(historyWithCurrent);
      const result = await chat.sendMessage(textToSend);
      const aiResponse = await result.response.then(r => r.text());

      // 4. Add AI Message to Firestore
      await addDoc(collection(db, 'chats', chatId, 'messages'), {
        role: 'assistant',
        content: aiResponse,
        createdAt: serverTimestamp()
      });

      // 5. Update Chat metadata with AI response
      await updateDoc(doc(db, 'chats', chatId), {
        updatedAt: serverTimestamp(),
        lastMessage: aiResponse
      });

      if (profile) {
        await incrementAIUsage(user.uid, profile.aiMessagesThisMonth || 0);
      }
    } catch (error: any) {
      console.error(error);
      // Optional: Show error in UI
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions = [
    { icon: <Stethoscope className="w-5 h-5 text-indigo-500" />, label: "Información sobre síntomas", prompt: "Necesito información sobre síntomas de..." },
    { icon: <Pill className="w-5 h-5 text-blue-500" />, label: "Dudas sobre medicamentos", prompt: "¿Cuáles son las contraindicaciones de...?" },
    { icon: <Apple className="w-5 h-5 text-emerald-500" />, label: "Consejos para una vida saludable", prompt: "Dame consejos de salud para un paciente con..." },
  ];

  return (
    <div className="flex h-[calc(100vh-120px)] bg-[#F8FAFC] overflow-hidden rounded-3xl border border-surface-container-high shadow-ambient mx-auto max-w-[1600px]">
      
      {/* Sidebar - Historial */}
      <AnimatePresence mode="wait">
        {isSidebarOpen && (
          <motion.div 
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-surface-container-high bg-white flex flex-col shrink-0"
          >
            <div className="p-6 space-y-4">
              <button 
                onClick={() => createNewChat()}
                className="w-full h-12 bg-primary text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary-container transition-all shadow-lg shadow-primary/20"
              >
                <Plus className="w-5 h-5" />
                Nueva conversación
              </button>

              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-high-contrast/30" />
                <input 
                  type="text" 
                  placeholder="Buscar conversaciones..." 
                  className="w-full bg-surface-low border border-surface-container-high rounded-xl py-2 pl-10 pr-4 text-xs focus:outline-none focus:border-primary transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-4 space-y-2">
              <p className="px-2 text-[10px] font-black text-high-contrast/30 uppercase tracking-widest mb-2">Historial</p>
              {chats.map((chat) => (
                <button
                  key={chat.id}
                  onClick={() => setActiveChatId(chat.id)}
                  className={cn(
                    "w-full p-4 rounded-2xl flex items-center justify-between text-left transition-all group",
                    activeChatId === chat.id 
                      ? "bg-primary/5 border border-primary/10 shadow-sm" 
                      : "hover:bg-surface-low border border-transparent"
                  )}
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                      activeChatId === chat.id ? "bg-white text-primary shadow-sm" : "bg-surface-low text-high-contrast/40"
                    )}>
                      <MessageSquare className="w-5 h-5" />
                    </div>
                    <div className="overflow-hidden">
                      <p className={cn(
                        "text-sm font-bold truncate",
                        activeChatId === chat.id ? "text-primary" : "text-high-contrast/80"
                      )}>{chat.title}</p>
                      <p className="text-[10px] text-high-contrast/40 font-medium">
                        {chat.updatedAt?.toDate?.()?.toLocaleDateString() || 'Ahora'}
                      </p>
                    </div>
                  </div>
                  <MoreVertical className="w-4 h-4 text-high-contrast/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>

            <div className="p-6 border-t border-surface-container-high">
              <div className="bg-surface-low rounded-2xl p-4 border border-surface-container-high">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-primary shadow-sm">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-primary">Asistente Clínico</p>
                    <div className="flex items-center gap-1">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                      <p className="text-[9px] font-bold text-emerald-600 uppercase">En línea</p>
                    </div>
                  </div>
                </div>
                <p className="text-[9px] text-high-contrast/40 leading-relaxed">
                  Modelo de lenguaje especializado en el área de la salud.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white relative">
        
        {/* Header */}
        <div className="h-20 border-b border-surface-container-high flex items-center justify-between px-8 bg-white/80 backdrop-blur-md z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-surface-low rounded-lg transition-colors text-high-contrast/40"
            >
              <ChevronLeft className={cn("w-5 h-5 transition-transform", !isSidebarOpen && "rotate-180")} />
            </button>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary/5 rounded-xl flex items-center justify-center text-primary">
                <Bot className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-primary">Asistente Clínico Inteligente</h3>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">En línea</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="px-3 py-1.5 bg-surface-container-low rounded-lg border border-surface-container-high flex items-center gap-2">
              <p className="text-[10px] font-black text-high-contrast/30 uppercase tracking-widest">Modelo de lenguaje especializado</p>
              <Info className="w-3.5 h-3.5 text-high-contrast/20" />
            </div>
            <button className="p-2 hover:bg-surface-low rounded-lg transition-colors text-high-contrast/40">
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages / Welcome Screen */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8 no-scrollbar scroll-smooth">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-2xl mx-auto space-y-8">
              <div className="w-20 h-20 bg-primary/5 rounded-3xl flex items-center justify-center text-primary shadow-ambient">
                <Bot className="w-10 h-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-primary">Hola, soy tu asistente médico IA</h2>
                <p className="text-high-contrast/50 font-medium">
                  Estoy aquí para ayudarte con información médica confiable.<br />¿En qué puedo ayudarte hoy?
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full pt-4">
                {quickActions.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => handleSend(action.prompt)}
                    className="p-6 bg-white border border-surface-container-high rounded-2xl text-left hover:border-primary hover:shadow-ambient transition-all space-y-3 group"
                  >
                    <div className="w-10 h-10 bg-surface-low rounded-xl flex items-center justify-center group-hover:bg-primary/5 transition-colors">
                      {action.icon}
                    </div>
                    <p className="text-xs font-bold text-high-contrast/70 group-hover:text-primary transition-colors">
                      {action.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
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
                  "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-sm border",
                  m.role === 'user' ? "bg-primary border-primary text-white" : "bg-white border-surface-container-high text-primary"
                )}>
                  {m.role === 'user' ? <MessageSquare className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
                </div>
                <div className={cn(
                  "p-5 rounded-3xl text-sm leading-relaxed shadow-ambient",
                  m.role === 'user' 
                    ? "bg-primary text-white rounded-tr-none" 
                    : "bg-white border border-surface-container-high text-high-contrast rounded-tl-none"
                )}>
                  <div className="prose prose-sm max-w-none prose-p:leading-relaxed text-inherit font-medium">
                    <ReactMarkdown>{m.content}</ReactMarkdown>
                  </div>
                </div>
              </motion.div>
            ))
          )}
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-start gap-4 max-w-[85%]"
            >
              <div className="w-10 h-10 rounded-2xl bg-white border border-surface-container-high flex items-center justify-center shrink-0 shadow-sm text-primary">
                <Bot className="w-5 h-5" />
              </div>
              <div className="p-5 rounded-3xl text-sm leading-relaxed bg-white border border-surface-container-high text-high-contrast rounded-tl-none shadow-ambient flex items-center gap-3">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                </div>
                <span className="text-xs font-bold text-high-contrast/40 uppercase tracking-widest">Procesando</span>
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-8 bg-white border-t border-surface-container-high">
          <div className="max-w-4xl mx-auto relative group">
            <div className="absolute inset-0 bg-primary/5 blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity -z-10" />
            <div className="flex gap-4 p-2 bg-surface-low rounded-[2rem] border border-surface-container-high focus-within:border-primary focus-within:bg-white transition-all shadow-sm focus-within:shadow-ambient">
              <div className="flex items-center gap-1 pl-2">
                <button className="p-3 text-high-contrast/30 hover:text-primary transition-colors">
                  <Mic className="w-5 h-5" />
                </button>
                <button className="p-3 text-high-contrast/30 hover:text-primary transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>
              </div>
              <input 
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                placeholder="Escribe tu consulta médica aquí..."
                className="flex-1 bg-transparent h-14 px-2 outline-none text-sm font-medium"
              />
              <button 
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="w-14 h-14 bg-primary rounded-2xl flex items-center justify-center text-white hover:bg-primary-container disabled:opacity-50 transition-all shadow-lg shadow-primary/20 shrink-0"
              >
                {isLoading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Send className="w-6 h-6" />}
              </button>
            </div>
            <div className="mt-4 flex items-center justify-center gap-2 text-high-contrast/30">
              <Info className="w-3 h-3" />
              <p className="text-[10px] font-medium">La información proporcionada no reemplaza la consulta médica profesional.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
