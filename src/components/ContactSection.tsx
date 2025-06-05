
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mail, Phone, MapPin } from "lucide-react";

const ContactSection = () => {
  return (
    <section id="contact" className="py-24 bg-gradient-to-br from-gray-900 to-black text-white">
      <div className="container mx-auto px-6">
        <div className="text-center mb-16">
          <h2 className="text-5xl font-thin mb-6">
            Vamos conversar
          </h2>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            Pronto para transformar sua ideia em realidade? Entre em contato conosco.
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <div>
            <h3 className="text-3xl font-light mb-8">Entre em contato</h3>
            
            <div className="space-y-6 mb-8">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Mail className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-medium">Email</div>
                  <div className="text-gray-300">contato@techstudio.com</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-green-600 rounded-lg flex items-center justify-center">
                  <Phone className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-medium">Telefone</div>
                  <div className="text-gray-300">+55 (11) 99999-9999</div>
                </div>
              </div>
              
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-purple-600 rounded-lg flex items-center justify-center">
                  <MapPin className="w-6 h-6" />
                </div>
                <div>
                  <div className="font-medium">Localização</div>
                  <div className="text-gray-300">São Paulo, SP - Brasil</div>
                </div>
              </div>
            </div>
          </div>
          
          <Card className="bg-white/10 border-white/20 backdrop-blur-md">
            <CardHeader>
              <CardTitle className="text-white">Envie uma mensagem</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Input 
                  placeholder="Seu nome" 
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
                <Input 
                  placeholder="Seu email" 
                  type="email"
                  className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                />
              </div>
              <Input 
                placeholder="Assunto" 
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
              <Textarea 
                placeholder="Sua mensagem" 
                rows={4}
                className="bg-white/10 border-white/20 text-white placeholder:text-gray-400"
              />
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white">
                Enviar Mensagem
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
