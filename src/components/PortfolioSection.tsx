
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const projects = [
  {
    title: "Chat Ai",
    description: "Plataforma completa de AI generativa.",
    image: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=800&h=600&fit=crop",
    tags: ["LLM", "RAG", "Agents"],
    gradient: "from-blue-600 to-purple-700"
  },
  {
    title: "Atende AI",
    description: "Atende AI Vendedor inteligente para E-commerce.",
    image: "https://images.unsplash.com/photo-1483058712412-4245e9b90334?w=800&h=600&fit=crop",
    tags: ["Whatsapp", "EvoApi", "N8N"],
    gradient: "from-green-600 to-blue-700"
  },
  {
    title: "Cursos",
    description: "Cursos interativos para aprender a usar nossos serviços.",
    image: "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800&h=600&fit=crop",
    tags: ["LLM", "RAG", "N8N" ],
    gradient: "from-purple-600 to-pink-700"
  },
  {
    title: "VPS para AI",
    description: "Servidores privados para seus sistemas de AI. Servidores focados em GPU.",
    image: "https://images.unsplash.com/photo-1434494878577-86c23bcb06b9?w=800&h=600&fit=crop",
    tags: ["Vue.js", "Python", "PostgreSQL"],
    gradient: "from-purple-600 to-pink-700"
  }
];

const PortfolioSection = () => {
  const navigate = useNavigate();

  const projectRoutes: { [key: string]: string } = {
    "Chat Ai": "/chatai",
    "Atende AI": "/atendeai",
    "Cursos": "/cursos",
    "VPS para AI": "/vps",
  };
  return (
    <section id="portfolio" className="py-24 bg-gradient-to-br from-gray-50 to-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-thin text-gray-900 mb-6">
            Portfolio
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Alguns dos nossos projetos mais recentes que demonstram nossa expertise técnica.
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {projects.map((project, index) => (
            <Card 
              key={index} 
              className="hover-lift border-0 shadow-xl overflow-hidden bg-white group cursor-pointer"
              onClick={() => {
                const path = projectRoutes[project.title];
                if (path) {
                  navigate(path);
                }
              }}
            >
              <div className="relative overflow-hidden">
                <img 
                  src={project.image} 
                  alt={project.title}
                  className="w-full h-48 object-cover group-hover:scale-110 transition-transform duration-500"
                />
                <div className={`absolute inset-0 bg-gradient-to-r ${project.gradient} opacity-0 group-hover:opacity-80 transition-opacity duration-300`} />
              </div>
              
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {project.title}
                </h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {project.description}
                </p>
                <div className="flex flex-wrap gap-2">
                  {project.tags.map((tag, tagIndex) => (
                    <Badge 
                      key={tagIndex} 
                      variant="secondary" 
                      className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PortfolioSection;
