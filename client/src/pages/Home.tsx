import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";

export default function Home() {
  const [, setLocation] = useLocation();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Removido: verificação de email não é mais necessária

  // Verificar se já existe sessão ao carregar a página
  useEffect(() => {
    const savedEmail = localStorage.getItem("userEmail");
    if (savedEmail) {
      // Usuário já entrou antes, redirecionar direto para o dashboard
      setLocation("/dashboard");
    } else {
      setIsCheckingSession(false);
    }
  }, [setLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Por favor, insira um email válido");
      setIsLoading(false);
      return;
    }

    // Aceitar qualquer email e salvar no localStorage
    localStorage.setItem("userEmail", email.toLowerCase());
    localStorage.setItem("userName", "Iniciado");
    
    // Pequeno delay para dar feedback visual
    setTimeout(() => {
      setIsLoading(false);
      setLocation("/dashboard");
    }, 500);
  };

  // Mostrar tela de carregamento enquanto verifica sessão
  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-2 border-[#C5A059]/30 border-t-[#C5A059] rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#EAEAEA]/40 text-sm tracking-wider">Verificando sessão...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center px-4">
      {/* Background subtle effect */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#C5A059]/3 rounded-full blur-[150px]" />
      </div>

      <div className="relative z-10 w-full max-w-md text-center">
        {/* Logo - Olho/Pirâmide com efeito de respiração */}
        <div className="mb-12 flex justify-center">
          <div className="relative">
            {/* Glow effect */}
            <div className="absolute inset-0 animate-pulse-slow">
              <div className="w-32 h-32 bg-[#C5A059]/20 rounded-full blur-xl" />
            </div>
            
            {/* Logo SVG - Olho dentro de pirâmide */}
            <svg 
              viewBox="0 0 100 100" 
              className="w-32 h-32 animate-breathe"
              fill="none"
            >
              {/* Pirâmide */}
              <path 
                d="M50 10 L90 85 L10 85 Z" 
                stroke="#C5A059" 
                strokeWidth="2" 
                fill="none"
                className="drop-shadow-[0_0_10px_rgba(197,160,89,0.5)]"
              />
              
              {/* Olho */}
              <ellipse 
                cx="50" 
                cy="55" 
                rx="20" 
                ry="12" 
                stroke="#C5A059" 
                strokeWidth="2" 
                fill="none"
              />
              
              {/* Pupila */}
              <circle 
                cx="50" 
                cy="55" 
                r="6" 
                fill="#C5A059"
                className="animate-pulse"
              />
              
              {/* Raios do olho */}
              <line x1="50" y1="38" x2="50" y2="43" stroke="#C5A059" strokeWidth="1.5" />
              <line x1="50" y1="67" x2="50" y2="72" stroke="#C5A059" strokeWidth="1.5" />
              <line x1="25" y1="55" x2="25" y2="55" stroke="#C5A059" strokeWidth="1.5" />
              <line x1="70" y1="55" x2="75" y2="55" stroke="#C5A059" strokeWidth="1.5" />
            </svg>
          </div>
        </div>

        {/* Título — App de Frequências (produto próprio, R$27,90) */}
        <h1 className="text-2xl md:text-3xl text-[#EAEAEA] mb-2 tracking-wider font-light">
          APP DE FREQUÊNCIAS
        </h1>
        <p className="text-[#C5A059]/70 text-sm mb-2 tracking-widest uppercase">
          Sua Câmara de Ressonância
        </p>
        <p className="text-[#EAEAEA]/40 text-xs md:text-sm mb-8 leading-relaxed max-w-xs mx-auto">
          Frequências sagradas para reprogramar corpo e mente. Entre com o
          email da sua compra e inicie sua evolução.
        </p>

        {/* Formulário de Login */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-left">
            <Input
              type="email"
              placeholder="Digite seu email de acesso"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#0a0a0a] border-[#C5A059]/30 text-[#EAEAEA] placeholder:text-[#EAEAEA]/30 focus:border-[#C5A059] py-6 text-center tracking-wider"
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-sm p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading || !email}
            className="w-full bg-[#C5A059]/90 hover:bg-[#C5A059] text-[#050505] font-semibold py-6 text-sm tracking-[0.2em] uppercase transition-all duration-300 rounded-sm hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? "ENTRANDO..." : "ENTRAR NO APP"}
          </Button>
        </form>

        {/* Footer discreto */}
        <p className="mt-16 text-[#EAEAEA]/20 text-xs tracking-wider">
          Acesso vitalício • Use o email da compra
        </p>
      </div>

      {/* CSS para animações customizadas */}
      <style>{`
        @keyframes breathe {
          0%, 100% {
            transform: scale(1);
            opacity: 0.9;
          }
          50% {
            transform: scale(1.05);
            opacity: 1;
          }
        }
        
        .animate-breathe {
          animation: breathe 4s ease-in-out infinite;
        }
        
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          50% {
            opacity: 0.6;
            transform: scale(1.1);
          }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
