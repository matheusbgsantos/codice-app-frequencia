import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { LogOut, User, BookOpen, Video, FileText, Download } from "lucide-react";

export default function Content() {
  const [, setLocation] = useLocation();
  const [userName, setUserName] = useState<string>("");
  const [productName, setProductName] = useState<string>("");
  const [authorizedEmail, setAuthorizedEmail] = useState<string>("");

  useEffect(() => {
    // Verificar se o usuário está autorizado
    const email = sessionStorage.getItem("authorizedEmail");
    if (!email) {
      setLocation("/");
      return;
    }
    setAuthorizedEmail(email);
    setUserName(sessionStorage.getItem("userName") || "");
    setProductName(sessionStorage.getItem("productName") || "Conteúdo Exclusivo");
  }, [setLocation]);

  const handleLogout = () => {
    sessionStorage.removeItem("authorizedEmail");
    sessionStorage.removeItem("userName");
    sessionStorage.removeItem("productName");
    setLocation("/");
  };

  // Exemplo de conteúdo - substitua pelo seu conteúdo real
  const modules = [
    {
      id: 1,
      title: "Módulo 1 - Introdução",
      description: "Bem-vindo ao curso! Neste módulo você aprenderá os fundamentos.",
      icon: BookOpen,
      lessons: 5,
    },
    {
      id: 2,
      title: "Módulo 2 - Conceitos Avançados",
      description: "Aprofunde seus conhecimentos com técnicas avançadas.",
      icon: Video,
      lessons: 8,
    },
    {
      id: 3,
      title: "Módulo 3 - Prática",
      description: "Coloque em prática tudo que aprendeu com exercícios.",
      icon: FileText,
      lessons: 6,
    },
    {
      id: 4,
      title: "Material de Apoio",
      description: "Downloads, PDFs e recursos extras para complementar seu estudo.",
      icon: Download,
      lessons: 3,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/80 backdrop-blur border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-medium">
                {userName || authorizedEmail}
              </p>
              <p className="text-sm text-slate-400">{authorizedEmail}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sair
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            {productName}
          </h1>
          <p className="text-slate-400">
            Bem-vindo à sua área exclusiva! Aqui você encontra todo o conteúdo do seu curso.
          </p>
        </div>

        {/* Modules Grid */}
        <div className="grid md:grid-cols-2 gap-6">
          {modules.map((module) => (
            <Card 
              key={module.id} 
              className="bg-slate-800/50 border-slate-700 hover:border-blue-500/50 transition-colors cursor-pointer group"
            >
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-blue-600/20 rounded-lg flex items-center justify-center group-hover:bg-blue-600/30 transition-colors">
                    <module.icon className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-white text-lg">{module.title}</CardTitle>
                    <CardDescription className="text-slate-400 mt-1">
                      {module.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-500">
                    {module.lessons} aulas
                  </span>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className="text-blue-400 hover:text-blue-300 hover:bg-blue-600/10"
                  >
                    Acessar →
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Info Section */}
        <div className="mt-12 p-6 bg-slate-800/30 rounded-lg border border-slate-700">
          <h2 className="text-xl font-semibold text-white mb-4">
            Sobre esta área
          </h2>
          <p className="text-slate-400 leading-relaxed">
            Este é um exemplo de área de conteúdo protegido. Você pode personalizar 
            esta página com seus próprios módulos, vídeos, PDFs e qualquer outro 
            conteúdo que deseja disponibilizar para seus alunos.
          </p>
          <p className="text-slate-400 leading-relaxed mt-4">
            O acesso é controlado automaticamente através da integração com a Kirvano. 
            Quando uma compra é aprovada, o email do comprador é automaticamente 
            liberado para acessar este conteúdo.
          </p>
        </div>
      </main>
    </div>
  );
}
