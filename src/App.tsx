import React, { useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import LoginPage from "./pages/Login";
import AtendeAiPage from "./pages/AtendeAi";
import CursosPage from "./pages/Cursos";
import VPSPage from "./pages/VPS";
import ChataiPage from "./pages/ChataiPage"; // Corrigido: Usar a importação correta
import Header from "./components/Header";
import { AuthProvider } from "./contexts/AuthContext.tsx"; // Garanta que este caminho esteja correto e o arquivo exista

const queryClient = new QueryClient();

const AppContent: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    // Scroll para âncora (hash) se presente
    if (location.hash) {
      const id = location.hash.substring(1); // Remove o '#'
      setTimeout(() => { // setTimeout para dar tempo ao DOM para renderizar
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100); // Um pequeno delay pode ser necessário
    } else {
      // Se não houver hash, rolar para o topo da página ao navegar
      // Exceto se estivermos explicitamente navegando para um hash em outra página
      // (o que o bloco if acima já cuidaria se a navegação fosse para a mesma página)
      window.scrollTo(0, 0);
    }
  }, [location]); // Re-executar o efeito quando a location mudar

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <Header />
          <main className="pt-20"> {/* Padding para o header fixo */}
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/chatai" element={<ChataiPage />} />
              <Route path="/atendeai" element={<AtendeAiPage />} />
              <Route path="/cursos" element={<CursosPage />} />
              <Route path="/vps" element={<VPSPage />} />
              {/* Rota para ChataiPage já estava aqui, removendo a duplicada abaixo que foi adicionada incorretamente */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
        </TooltipProvider>
      </QueryClientProvider>
    </AuthProvider>
  );
};

const App: React.FC = () => (
  <BrowserRouter>
    <AppContent />
  </BrowserRouter>
);

export default App;