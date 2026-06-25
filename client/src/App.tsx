import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { PlayerProvider } from "./context/PlayerContext";
import { MiniPlayer } from "./components/MiniPlayer";
import { TabBar } from "./components/TabBar";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Player from "./pages/Player";
import Jornadas from "./pages/Jornadas";
import Trilha from "./pages/Trilha";

function Router() {
  return (
    <Switch>
      {/* Tela 1: O Portão (Login) */}
      <Route path="/" component={Home} />

      {/* Aba Jornada: lista das 5 trilhas */}
      <Route path="/jornada" component={Jornadas} />
      {/* Trilha ativa (anel de progresso, streak, linha do tempo) */}
      <Route path="/jornada/:id" component={Trilha} />

      {/* Aba Biblioteca (estilo Spotify). /dashboard mantido como alias. */}
      <Route path="/biblioteca" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />

      {/* Tela 3: Câmara de Ressonância (Player) */}
      <Route path="/player/:id" component={Player} />

      {/* 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          {/* PlayerProvider segura o <audio> global — o som persiste entre telas */}
          <PlayerProvider>
            <Toaster />
            <Router />
            {/* Navegação em 2 abas (acima do mini-player) */}
            <TabBar />
            {/* Mini-player fixo na base (estilo Spotify) */}
            <MiniPlayer />
          </PlayerProvider>
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
