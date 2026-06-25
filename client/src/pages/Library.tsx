import { useEffect } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Play, FileText, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LibraryItem {
  id: string;
  title: string;
  description: string;
  type: "video" | "pdf";
  icon: React.ReactNode;
}

const libraryItems: LibraryItem[] = [
  {
    id: "documentario",
    title: "O Documentário Secreto",
    description: "A história nunca contada sobre as frequências sagradas e como elas foram ocultadas da humanidade.",
    type: "video",
    icon: <Play className="w-6 h-6" />,
  },
  {
    id: "guia-frequencias",
    title: "Guia das Frequências",
    description: "Manual completo com todas as frequências e seus efeitos no corpo e mente.",
    type: "pdf",
    icon: <FileText className="w-6 h-6" />,
  },
  {
    id: "protocolo-cura",
    title: "Protocolo de Cura",
    description: "Passo a passo para maximizar os resultados das sessões de frequência.",
    type: "pdf",
    icon: <FileText className="w-6 h-6" />,
  },
  {
    id: "ciencia-som",
    title: "A Ciência do Som",
    description: "Estudos científicos que comprovam o poder das frequências sonoras.",
    type: "pdf",
    icon: <FileText className="w-6 h-6" />,
  },
];

export default function Library() {
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedEmail = localStorage.getItem("userEmail");
    if (!storedEmail) {
      setLocation("/");
    }
  }, [setLocation]);

  return (
    <div className="min-h-screen bg-[#050505] px-4 py-8">
      {/* Background effect */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-[300px] h-[300px] bg-[#C5A059]/5 rounded-full blur-[100px]" />
      </div>

      <div className="relative z-10 max-w-4xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => setLocation("/dashboard")}
          className="text-[#EAEAEA]/40 hover:text-[#C5A059] hover:bg-transparent mb-8"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar ao Painel
        </Button>

        {/* Title */}
        <div className="text-center mb-12">
          <h1 className="text-2xl md:text-3xl text-[#EAEAEA] tracking-[0.15em] mb-2">
            BIBLIOTECA SECRETA
          </h1>
          <p className="text-[#EAEAEA]/40 text-sm">
            Documentário e materiais exclusivos
          </p>
          <div className="w-24 h-[1px] bg-gradient-to-r from-transparent via-[#C5A059] to-transparent mx-auto mt-4" />
        </div>

        {/* Library Items */}
        <div className="space-y-4">
          {libraryItems.map((item) => (
            <button
              key={item.id}
              className="w-full group bg-[#0a0a0a] border border-[#C5A059]/20 rounded-lg p-6 flex items-center gap-6 transition-all duration-300 hover:border-[#C5A059]/50 hover:bg-[#0a0a0a]/80 text-left"
            >
              {/* Icon */}
              <div className="w-14 h-14 bg-[#C5A059]/10 rounded-lg flex items-center justify-center text-[#C5A059] group-hover:bg-[#C5A059]/20 transition-all flex-shrink-0">
                {item.icon}
              </div>

              {/* Content */}
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="text-[#EAEAEA] text-lg font-medium">
                    {item.title}
                  </h3>
                  <span className="text-[#C5A059]/60 text-xs uppercase tracking-wider">
                    {item.type === "video" ? "Vídeo" : "PDF"}
                  </span>
                </div>
                <p className="text-[#EAEAEA]/50 text-sm">
                  {item.description}
                </p>
              </div>

              {/* Action */}
              <div className="text-[#C5A059]/40 group-hover:text-[#C5A059] transition-all flex-shrink-0">
                {item.type === "video" ? (
                  <Play className="w-5 h-5" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
              </div>
            </button>
          ))}
        </div>

        {/* Footer Note */}
        <div className="mt-12 text-center">
          <p className="text-[#EAEAEA]/20 text-xs">
            Conteúdo exclusivo para membros autorizados
          </p>
        </div>
      </div>
    </div>
  );
}
