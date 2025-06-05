
import { Button } from "@/components/ui/button";
import { Apple } from "lucide-react";
import { useNavigate, Link, useLocation } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext"; // Importar useAuth

const Header = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, loading } = useAuth(); // Usar o hook useAuth
  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass-effect">
      <div className="container mx-auto px-6 py-4">
        <nav className="flex items-center justify-between">
          <Link 
            to="/" 
            className="flex items-center space-x-2" 
            onClick={() => {
              if (location.pathname === '/') {
                window.scrollTo(0, 0);
              }
            }}
          >
            <Apple className="w-8 h-8 text-gray-900" />
            <span className="text-xl font-semibold text-gray-900">TechStudio</span>
          </Link>
          
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/#services" className="text-gray-700 hover:text-gray-900 transition-colors">
              Serviços
            </Link>
            <Link to="/#portfolio" className="text-gray-700 hover:text-gray-900 transition-colors">
              Portfolio
            </Link>
            <Link to="/#about" className="text-gray-700 hover:text-gray-900 transition-colors">
              Sobre
            </Link>
            <Link to="/#contact" className="text-gray-700 hover:text-gray-900 transition-colors">
              Contato
            </Link>
          </div>

          <div className="flex items-center">
            {loading ? (
              <span className="text-sm text-gray-700">Carregando...</span>
            ) : user ? (
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-700 hidden sm:inline">
                  {user.email?.split('@')[0]} {/* Mostrar parte do email */}
                </span>
                <Link to="/vps" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">VPS</Link>
                <Link to="/chatai" className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Chatai</Link>
                <Button 
                  variant="outline"
                  className="border-gray-700 text-gray-700 hover:bg-gray-200 hover:text-gray-900 px-4 py-2 text-sm"
                  onClick={async () => {
                    await logout();
                    navigate('/'); // Opcional: redirecionar para home após logout
                  }}
                >
                  Logout
                </Button>
              </div>
            ) : (
              <Button 
                className="bg-gray-900 hover:bg-gray-800 text-white px-6"
                onClick={() => navigate('/login')}
              >
                Login
              </Button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};

export default Header;
