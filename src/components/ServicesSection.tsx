
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Code, Smartphone, Globe, Zap } from "lucide-react";

const services = [
  {
    icon: Code,
    title: "Desenvolvimento Web",
    description: "Aplicações web modernas e responsivas usando as tecnologias mais avançadas do mercado.",
    gradient: "from-blue-500 to-purple-600"
  },
  {
    icon: Smartphone,
    title: "Apps Mobile",
    description: "Aplicativos nativos e híbridos para iOS e Android com performance excepcional.",
    gradient: "from-purple-500 to-pink-600"
  },
  {
    icon: Globe,
    title: "Soluções Cloud",
    description: "Arquiteturas escaláveis na nuvem para suportar o crescimento do seu negócio.",
    gradient: "from-green-500 to-blue-600"
  },
  {
    icon: Zap,
    title: "Automação",
    description: "Processos automatizados que aumentam a eficiência e reduzem custos operacionais.",
    gradient: "from-orange-500 to-red-600"
  }
];

const ServicesSection = () => {
  return (
    <section id="services" className="py-24 bg-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-thin text-gray-900 mb-6">
            Nossos Serviços
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Oferecemos soluções completas para transformar sua visão em realidade digital.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {services.map((service, index) => (
            <Card 
              key={index} 
              className="hover-lift border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 group"
            >
              <CardHeader className="text-center pb-4">
                <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-r ${service.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <service.icon className="w-8 h-8 text-white" />
                </div>
                <CardTitle className="text-xl font-medium text-gray-900">
                  {service.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-gray-600 text-center leading-relaxed">
                  {service.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ServicesSection;
