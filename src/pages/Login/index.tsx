import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../supabaseClient'; // Certifique-se de que supabaseClient.ts está configurado corretamente

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [isSignUp, setIsSignUp] = useState(false); // Para alternar entre Login e Cadastro
  const [phone, setPhone] = useState(''); // Novo estado para telefone

  const handleGoogleLogin = async () => {
    setLoading(true);
    setMessage('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin, // Redireciona de volta para a app após o login
        },
      });
      if (error) throw error;
      // Supabase lida com o redirecionamento
    } catch (error: any) {
      setMessage(error.message || 'Erro ao tentar login com Google.');
      setLoading(false); // Apenas define loading como false em caso de erro
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      let error = null;
      if (isSignUp) {
        // Cadastro
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { // Adicionando metadados do usuário
              phone: phone,
            },
          },
        });
        error = signUpError;
        if (!error) {
          setMessage('Cadastro realizado com sucesso! Verifique seu email para confirmação.');
        }
      } else {
        // Login
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        error = signInError;
        if (!error) {
          setMessage('Login bem-sucedido! Redirecionando...');
          navigate('/');
        }
      }
      if (error) throw error;
    } catch (error: any) {
      setMessage(error.message || `Ocorreu um erro durante a ${isSignUp ? 'criação da conta' : 'autenticação'}.`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-8 md:px-16 lg:px-32">
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-xl w-full max-w-md space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
            {isSignUp ? 'Crie sua conta' : 'Acesse sua conta'}
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleAuth}>
          <input type="hidden" name="remember" defaultValue="true" />
          <div className="rounded-md shadow-sm">
            <div>
              <label htmlFor="email-address" className="sr-only">
                Email
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="appearance-none rounded-none rounded-t-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Endereço de email"
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="appearance-none rounded-none rounded-b-md relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                placeholder="Senha"
              />
            </div>
            {isSignUp && (
              <div className="-mt-px"> {/* Garante que as bordas se sobreponham corretamente */} 
                <label htmlFor="phone-number" className="sr-only">
                  Telefone
                </label>
                <input
                  id="phone-number"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 placeholder-gray-500 text-gray-900 dark:text-white dark:bg-gray-700 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 focus:z-10 sm:text-sm"
                  placeholder="Telefone (ex: 11999998888)"
                />
              </div>
            )}
          </div>

          {message && (
            <p className={`text-sm ${message.includes('bem-sucedido') || message.includes('Verifique seu email') ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
              {message}
            </p>
          )}

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-gray-900 hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-700 disabled:opacity-50"
            >
              {loading ? 'Processando...' : (isSignUp ? 'Cadastrar' : 'Login')}
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">
                Ou continue com
              </span>
            </div>
          </div>

          <div className="mt-6">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full inline-flex justify-center py-2 px-4 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
            >
              <svg className="w-5 h-5 mr-2 -ml-1" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512"><path fill="currentColor" d="M488 261.8C488 403.3 381.5 512 244 512 110.3 512 0 398.5 0 256S110.3 0 244 0c70.7 0 129.4 27.2 175.1 69.3l-55.2 53.4C338.6 97.2 297.2 79.4 244 79.4c-66.6 0-120.9 54.4-120.9 120.9s54.4 120.9 120.9 120.9c72.6 0 102.9-33.7 105.5-52.4H244v-69h139.5c1.4 7.6 2.2 15.4 2.2 23.4z"></path></svg>
              Entrar com Google
            </button>
          </div>
        </div>

        {/* Card do WhatsApp */}
        <div className="mt-8 p-6 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-700 rounded-lg text-center shadow-md">
          <h3 className="text-lg font-semibold text-green-800 dark:text-green-200 mb-3">
            Junte-se ao nosso Grupo VIP no WhatsApp!
          </h3>
          <div className="flex justify-center mb-4">
            {/* Substitua 'URL_DO_SEU_QR_CODE.png' pela URL da imagem do seu QR Code real */}
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=YOUR_WHATSAPP_GROUP_LINK_HERE" alt="QR Code WhatsApp" className="w-36 h-36 rounded-md border-2 border-green-300 dark:border-green-600"/>
          </div>
          <p className="text-sm text-green-700 dark:text-green-300">
            Escaneie o QR Code para ter acesso exclusivo a novidades, promoções e suporte direto.
          </p>
        </div>

        <div className="text-sm text-center">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setMessage(''); // Limpar mensagem ao alternar
            }}
            className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            {isSignUp ? 'Já tem uma conta? Faça login' : 'Não tem uma conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;