
import { Button } from "@/components/ui/button";
import { Apple } from "lucide-react";

const Header = () => {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-effect">
      <div className="container mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Apple className="w-8 h-8 text-gray-900" />
            <span className="text-xl font-semibold text-gray-900">TechStudio</span>
          </div>
          
          <div className="hidden md:flex items-center space-x-8">
            <a href="#services" className="text-gray-700 hover:text-gray-900 transition-colors">
              Serviços
            </a>
            <a href="#portfolio" className="text-gray-700 hover:text-gray-900 transition-colors">
              Portfolio
            </a>
            <a href="#about" className="text-gray-700 hover:text-gray-900 transition-colors">
              Sobre
            </a>
            <a href="#contact" className="text-gray-700 hover:text-gray-900 transition-colors">
              Contato
            </a>
          </div>

          <Button className="bg-gray-900 hover:bg-gray-800 text-white px-6">
            Começar Projeto
          </Button>
        </nav>
      </div>
    </header>
  );
};

export default Header;
