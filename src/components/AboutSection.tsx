
import { Card, CardContent } from "@/components/ui/card";
import { Users, Award, Clock, Heart } from "lucide-react";

const stats = [
  { icon: Users, value: "50+", label: "Projetos Entregues" },
  { icon: Award, value: "5", label: "Anos de Experiência" },
  { icon: Clock, value: "24/7", label: "Suporte Técnico" },
  { icon: Heart, value: "100%", label: "Clientes Satisfeitos" }
];

const AboutSection = () => {
  return (
    <section id="about" className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-5xl font-thin text-gray-900 mb-8">
              Sobre nossa empresa
            </h2>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              Somos uma software house especializada em criar soluções tecnológicas inovadoras. 
              Nossa paixão é transformar ideias complexas em produtos digitais simples e elegantes.
            </p>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              Com uma equipe de desenvolvedores experientes e designers criativos, entregamos 
              projetos que não apenas atendem às necessidades técnicas, mas também proporcionam 
              experiências excepcionais aos usuários.
            </p>
            
            <div className="grid grid-cols-2 gap-6">
              {stats.map((stat, index) => (
                <Card key={index} className="border-0 bg-gradient-to-br from-gray-50 to-gray-100 hover-lift">
                  <CardContent className="p-6 text-center">
                    <stat.icon className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                    <div className="text-2xl font-bold text-gray-900 mb-1">
                      {stat.value}
                    </div>
                    <div className="text-sm text-gray-600">
                      {stat.label}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
          
          <div className="relative">
            <div className="bg-gradient-to-r from-gray-900 to-gray-700 rounded-3xl p-8 shadow-2xl">
              <div className="bg-black rounded-2xl p-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                    <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <div className="text-green-400 font-mono text-sm space-y-2">
                    <div>const mission = "Criar tecnologia que impacta";</div>
                    <div>const vision = "Ser referência em inovação";</div>
                    <div>const values = ["Qualidade", "Inovação", "Transparência"];</div>
                    <div className="text-gray-400">// Nossos princípios fundamentais</div>
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

export default AboutSection;
