
import { Button } from "@/components/ui/button";
import { ChevronRight } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-white pt-20">
      <div className="container mx-auto px-6 text-center">
        <div className="animate-fade-in">
          <h1 className="text-6xl md:text-8xl font-thin text-gray-900 mb-6 leading-tight">
            Pensamos
            <br />
            <span className="text-gradient font-light">diferente</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-gray-600 mb-12 max-w-3xl mx-auto leading-relaxed">
            Criamos soluções tecnológicas inovadoras que transformam ideias em experiências digitais extraordinárias.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button 
              size="lg" 
              className="bg-gray-900 hover:bg-gray-800 text-white px-8 py-4 text-lg rounded-full transition-all duration-300 hover:scale-105"
            >
              Descobrir mais
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
            
            <Button 
              variant="outline" 
              size="lg" 
              className="border-gray-300 text-gray-700 hover:bg-gray-50 px-8 py-4 text-lg rounded-full"
            >
              Ver portfolio
            </Button>
          </div>
        </div>
        
        <div className="mt-20 animate-float">
          <div className="w-full max-w-4xl mx-auto">
            <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-3xl p-8 shadow-2xl">
              <div className="bg-black rounded-2xl p-4">
                <div className="bg-gray-900 rounded-xl h-64 flex items-center justify-center">
                  <div className="text-green-400 font-mono text-sm">
                    <div className="animate-pulse">
                      $ npm run build<br />
                      ✓ Building for production...<br />
                      ✓ Build completed successfully
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
