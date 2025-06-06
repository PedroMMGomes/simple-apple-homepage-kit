import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Mic, Send, PlusCircle, MessageSquare, Image as ImageIcon, Edit3, Menu, X } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8008';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp?: number;
}

interface Conversation {
  id: string;
  name: string;
  messages: Message[];
  createdAt: number;
  lastModified: number;
  model?: string;
}


const ChataiPage: React.FC = () => {
  const { user, session } = useAuth();
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('gemma3:4b');
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number>(0);
  const [isSendingDisabled, setIsSendingDisabled] = useState<boolean>(false);
  const cooldownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImagePreview, setSelectedImagePreview] = useState<string | null>(null);
  const conversationListRef = useRef<HTMLDivElement | null>(null);
  const [isConversationsPanelOpen, setIsConversationsPanelOpen] = useState(() => window.innerWidth >= 768); // Aberto em desktop, fechado em mobile por padrão
  const [isMobileView, setIsMobileView] = useState(() => window.innerWidth < 768);
  const prevIsMobileViewRef = useRef(isMobileView);

  const getStorageKey = useCallback(() => {
    if (!user) return null;
    return `chatConversations_${user.id}`;
  }, [user]);

  // Load conversations from localStorage
  useEffect(() => {
    if (!user) {
      setAllConversations([]);
      setMessages([]);
      setActiveConversationId(null);
      return;
    }

    const storageKey = getStorageKey();
    if (!storageKey) return;

    try {
      const storedConversations = localStorage.getItem(storageKey);
      if (storedConversations) {
        const parsedConversations: Conversation[] = JSON.parse(storedConversations);
        // Sort by lastModified descending before setting
        parsedConversations.sort((a, b) => b.lastModified - a.lastModified);
        setAllConversations(parsedConversations);
        // Optionally, load the most recent conversation if none is active
        // This part is commented out to prevent auto-loading a conversation on page load
        // if (parsedConversations.length > 0 && !activeConversationId) {
        //   setActiveConversationId(parsedConversations[0].id);
        //   setMessages(parsedConversations[0].messages);
        //   setSelectedModel(parsedConversations[0].model || 'gemma3:4b');
        // }
      }
    } catch (error) {
      console.error("Erro ao carregar conversas do localStorage:", error);
      localStorage.removeItem(storageKey); // Clear if corrupted
    }
  }, [user, getStorageKey]);

  // Save conversations to localStorage
  useEffect(() => {
    if (!user) return;
    const storageKey = getStorageKey();
    if (!storageKey) return;

    if (allConversations.length > 0 || localStorage.getItem(storageKey)) {
        localStorage.setItem(storageKey, JSON.stringify(allConversations));
    }
  }, [allConversations, user, getStorageKey]);

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const handleResize = () => {
      const currentIsMobile = window.innerWidth < 768;
      setIsMobileView(currentIsMobile);

      if (prevIsMobileViewRef.current !== currentIsMobile) { // Breakpoint crossed
        setIsConversationsPanelOpen(!currentIsMobile); // Abre no desktop, fecha no mobile
        prevIsMobileViewRef.current = currentIsMobile;
      }
    };

    window.addEventListener('resize', handleResize);
    // Defina o estado inicial com base no tamanho da janela ao montar
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, []); // Sem dependências, executa uma vez para anexar o listener e definir o estado inicial

  const toggleConversationsPanel = () => {
    setIsConversationsPanelOpen(!isConversationsPanelOpen);
  };

  const handleSendMessage = async () => {
    if (!user) {
      setMessages(prev => [...prev, { id: 'auth-err', text: 'Você precisa estar logado para enviar mensagens.', sender: 'bot', timestamp: Date.now() }]);
      return;
    }

    if (inputMessage.trim() === '' && !selectedImageFile) return; // Não envia se não houver texto nem imagem

    const now = Date.now();
    if (isSendingDisabled || (now - lastMessageTimestamp < 10000 && !activeConversationId?.startsWith('temp-'))) {
      const timeLeft = Math.ceil((10000 - (now - lastMessageTimestamp)) / 1000);
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, text: `Por favor, aguarde ${timeLeft} segundos para enviar uma nova mensagem.`, sender: 'bot', timestamp: Date.now() }]);
      return;
    }

    setIsSendingDisabled(true);
    const userMessageText = inputMessage.trim();
    const userMessageId = `user-${Date.now()}`;
    const botMessageId = `bot-${Date.now() + 1}`;

    const newUserMessage: Message = {
      id: userMessageId,
      text: userMessageText,
      sender: 'user',
      timestamp: now,
    };
    // Adiciona a mensagem do usuário à UI imediatamente
    setMessages(prevMessages => [...prevMessages, newUserMessage]);
    if (selectedImagePreview) {
      // Opcional: Adicionar uma representação da imagem na UI, se desejado
      // Ex: setMessages(prev => [...prev, { id: `img-${userMessageId}`, text: `[Imagem: ${selectedImageFile?.name}]`, sender: 'user', timestamp: now }]);
    }

    setInputMessage(''); // Limpa o input de texto
    // A imagem será limpa após a resposta do bot ou em caso de erro

    let currentConversationId = activeConversationId;
    let currentAllConversations = allConversations;

    // Criar nova conversa se não houver uma ativa
    if (!currentConversationId) {
      const newConversation: Conversation = {
        id: `temp-${Date.now()}`,
        name: userMessageText.substring(0, 30) || (selectedImageFile ? `Imagem ${new Date(now).toLocaleTimeString()}` : "Nova Conversa"),
        messages: [newUserMessage],
        createdAt: now,
        lastModified: now,
        model: selectedModel,
      };
      currentAllConversations = [newConversation, ...allConversations];
      setAllConversations(currentAllConversations);
      setActiveConversationId(newConversation.id);
      currentConversationId = newConversation.id;
    } else {
      // Atualizar conversa existente
      currentAllConversations = allConversations.map(conv =>
        conv.id === currentConversationId
          ? { ...conv, messages: [...conv.messages, newUserMessage], lastModified: now, model: selectedModel }
          : conv
      );
      // Reordenar para trazer a conversa ativa para o topo
      currentAllConversations.sort((a, b) => {
        if (a.id === currentConversationId) return -1;
        if (b.id === currentConversationId) return 1;
        return b.lastModified - a.lastModified;
      });
      setAllConversations(currentAllConversations);
    }

    // Preparar dados para a API
    const requestBody: any = {
      model: selectedModel,
      messages: [{ role: 'user', content: userMessageText }],
      stream: true,
      // temperature: 0.7, // Você pode adicionar isso se quiser controlar a temperatura
      // max_tokens: 1000, // E o máximo de tokens para a resposta
    };

    let apiEndpoint = `${API_BASE_URL}/api/chat`;
    let fetchOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`,
      },
      body: JSON.stringify(requestBody),
    };

    if (selectedImageFile) {
      const formData = new FormData();
      formData.append('model', selectedModel);
      formData.append('prompt', userMessageText);
      formData.append('stream', 'true');
      formData.append('conversation_id', currentConversationId!);
      formData.append('user_id', user.id);
      formData.append('image', selectedImageFile);
      
      apiEndpoint = `${API_BASE_URL}/api/chat_image_stream`; // Endpoint diferente para imagem ou adaptar o existente
      fetchOptions = {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          // 'Content-Type' será definido automaticamente pelo browser para FormData
        },
        body: formData,
      };
    }

    try {
      const response = await fetch(apiEndpoint, fetchOptions);
      // Limpa a imagem selecionada após a tentativa de envio bem-sucedida (antes de processar a resposta)
      // Se o envio falhar antes disso, a imagem permanece para nova tentativa.
      if (selectedImageFile) {
        handleClearImage();
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: response.statusText }));
        let detailMessage = errorData.detail;
        if (typeof detailMessage === 'object') {
          detailMessage = JSON.stringify(detailMessage);
        }
        throw new Error(detailMessage || `HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('Failed to get response reader.');

      let accumulatedBotMessage = '';
      setMessages(prev => [...prev, { id: botMessageId, text: '', sender: 'bot', timestamp: Date.now() }]);

      const processStream = async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = new TextDecoder().decode(value);
          try {
            const lines = chunk.split('\n').filter(line => line.trim() !== '');
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const jsonDataString = line.substring(6);
                    if (jsonDataString.trim() === '[DONE]') {
                        console.log("Stream finished by [DONE] marker");
                        return; // Stream explicitamente finalizado pelo backend
                    }
                    const jsonData = JSON.parse(jsonDataString);
                    if (jsonData.response) {
                        accumulatedBotMessage += jsonData.response;
                        setMessages(prev => prev.map(msg => 
                            msg.id === botMessageId ? { ...msg, text: accumulatedBotMessage } : msg
                        ));
                    } else if (jsonData.conversation_id && currentConversationId?.startsWith('temp-')) {
                        // Atualiza o ID da conversa temporária com o ID real do backend
                        const realConversationId = jsonData.conversation_id;
                        setAllConversations(prevConvos => prevConvos.map(c => 
                            c.id === currentConversationId ? { ...c, id: realConversationId } : c
                        ));
                        setActiveConversationId(realConversationId);
                        currentConversationId = realConversationId; // Atualiza para o ID real
                    }
                }
            }
          } catch (e) {
            console.error('Error processing stream chunk:', chunk, e);
            // Continuar tentando ler o restante do stream
          }
        }
      };

      await processStream();
      
      // Atualiza a mensagem final do bot e a conversa
      const finalBotMessage: Message = { id: botMessageId, text: accumulatedBotMessage, sender: 'bot', timestamp: Date.now() };
      setAllConversations(prevConvos => prevConvos.map(conv =>
        conv.id === currentConversationId
          ? { ...conv, messages: [...conv.messages.filter(m => m.id !== botMessageId), finalBotMessage], lastModified: Date.now() }
          : conv
      ));

    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage = `Erro: ${error.message || 'Não foi possível conectar ao servidor.'}`;
      setMessages(prev => [...prev, { id: `err-${Date.now()}`, text: errorMessage, sender: 'bot', timestamp: Date.now() }]);
      // Não limpa a imagem aqui para que o usuário possa tentar novamente com a mesma imagem
    } finally {
      setIsSendingDisabled(false);
      setLastMessageTimestamp(Date.now());
      if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
      cooldownTimeoutRef.current = setTimeout(() => {
        setIsSendingDisabled(false);
      }, 10000);
    }
  };



  const handleNewConversation = () => {
    if (!user) return;
    setActiveConversationId(null);
    setMessages([]);
  };

  const handleSelectConversation = (conversationId: string) => {
    if (!user) return;
    const conversation = allConversations.find(c => c.id === conversationId);
    if (conversation) {
      setActiveConversationId(conversation.id);
      setMessages(conversation.messages);
      setSelectedModel(conversation.model || 'gemma3:4b');
    }
  };
  
  const handleClearImage = () => {
    setSelectedImageFile(null);
    if (selectedImagePreview) {
      URL.revokeObjectURL(selectedImagePreview);
    }
    setSelectedImagePreview(null);
  };

  const handleFileUpload = async (fileType: 'audio' | 'image') => {
    if (!user || isSendingDisabled) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = fileType === 'audio' ? 'audio/*' : 'image/*';

    input.onchange = async (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        console.log(`Arquivo ${fileType} selecionado:`, file.name);

        const placeholderMessage: Message = {
          id: `upload-${Date.now()}`,
          text: `Enviando ${fileType} "${file.name}"...`,
          sender: 'user',
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, placeholderMessage]);

        const formData = new FormData();
        formData.append('file', file);
        if (fileType === 'audio') {
          formData.append('selected_model', selectedModel);
        }

        const endpoint = fileType === 'audio' ? `${API_BASE_URL}/api/transcribe_and_chat` : `${API_BASE_URL}/api/image_chat`;
        const uploadTimestamp = Date.now();
        setIsSendingDisabled(true);

        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            body: formData,
            // headers: { 'Authorization': `Bearer ${session?.access_token}` }, // Example if auth is needed
          });

          let updatedConversationMessages: Message[] = [];

          if (!response.ok) {
            let errorData = { detail: `Erro HTTP: ${response.status} ao enviar ${fileType}` };
            try {
              errorData = await response.json();
            } catch (parseError) { /* Ignore */ }
            throw new Error(errorData.detail || `Erro HTTP: ${response.status}`);
          }

          const data = await response.json();

          if (data.choices && data.choices.length > 0 && data.choices[0].message) {
            const botResponseText = data.choices[0].message.content;
            
            const userFileMessage: Message = {
                id: `user-file-${uploadTimestamp}`,
                text: `${fileType === 'audio' ? 'Áudio' : 'Imagem'} "${file.name}" enviado.`,
                sender: 'user',
                timestamp: uploadTimestamp
            };

            const newBotMessage: Message = {
                id: data.id || `response-${Date.now()}`,
                text: botResponseText,
                sender: 'bot',
                timestamp: Date.now()
            };

            setMessages(prevMsgs => {
                const filteredMsgs = prevMsgs.filter(m => m.id !== placeholderMessage.id);
                updatedConversationMessages = [...filteredMsgs, userFileMessage, newBotMessage];
                return updatedConversationMessages;
            });

            let currentConversationId = activeConversationId;
            if (!currentConversationId) {
              const newConvoId = Date.now().toString();
              const newConversation: Conversation = {
                id: newConvoId,
                name: (fileType === 'audio' ? 'Transcrição: ' : 'Imagem: ') + file.name.substring(0, 20) + '...)',
                messages: updatedConversationMessages,
                createdAt: uploadTimestamp,
                lastModified: Date.now(),
                model: selectedModel
              };
              setAllConversations(prevConvos => [newConversation, ...prevConvos.filter(c => c.id !== newConvoId)].sort((a,b) => b.lastModified - a.lastModified));
              setActiveConversationId(newConvoId);
            } else {
              setAllConversations(prevConvos =>
                prevConvos.map(convo =>
                  convo.id === currentConversationId
                    ? { ...convo, messages: updatedConversationMessages, lastModified: Date.now(), model: selectedModel }
                    : convo
                ).sort((a,b) => b.lastModified - a.lastModified)
              );
            }
          } else {
            throw new Error('Resposta da API para upload em formato inesperado.');
          }
        } catch (error: any) {
          console.error(`Erro ao enviar ${fileType}:`, error);
          setMessages(prev => prev.filter(m => m.id !== placeholderMessage.id)); 
          const errorBotMessage: Message = { id: `err-${Date.now()}`, text: `Erro ao processar ${fileType}: ${error.message}`, sender: 'bot', timestamp: Date.now() };
          setMessages(prevMessages => [...prevMessages, errorBotMessage]);
        } finally {
          setLastMessageTimestamp(Date.now());
          if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
          cooldownTimeoutRef.current = setTimeout(() => {
            setIsSendingDisabled(false);
          }, 10000);
        }
      }
    };
    input.click();
  };

  const sortedConversations = [...allConversations]; // Already sorted when set

  return (
    <div className="flex h-screen bg-gray-100 dark:bg-gray-900 overflow-hidden">
      {/* Sidebar para Conversas */}
      <aside
        className={`
          transition-all duration-300 ease-in-out
          bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700
          flex flex-col overflow-hidden /* Base styles */
          ${isMobileView ? 
            (isConversationsPanelOpen ? 'fixed inset-0 w-full sm:w-4/5 max-w-xs z-20' : 'hidden w-0') : // Mobile: full overlay or hidden
            (isConversationsPanelOpen ? 'w-72 lg:w-80' : 'w-0') // Desktop: specific width or w-0
          }
        `}
      >
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Conversas</h2>
          {isMobileView && isConversationsPanelOpen && (
            <Button variant="ghost" size="icon" onClick={toggleConversationsPanel}>
              <X className="w-6 h-6 text-gray-500 dark:text-gray-400" />
            </Button>
          )}
        </div>

        <div className="p-4">
          <Button onClick={handleNewConversation} disabled={!user} className="w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
            <PlusCircle className="w-4 h-4 mr-2" /> Nova Conversa
          </Button>
        </div>

        <div
          ref={conversationListRef}
          className="flex-grow p-2 space-y-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent"
        >
          {user && sortedConversations.length > 0 && (
            <h3 className="px-2 pt-2 pb-1 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Recentes
            </h3>
          )}
          {user && sortedConversations.map((convo) => (
            <div
              key={convo.id}
              onClick={() => {
                handleSelectConversation(convo.id);
                if (isMobileView) {
                  setIsConversationsPanelOpen(false);
                }
              }}
              className={`p-2.5 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center ${activeConversationId === convo.id ? 'bg-gray-200 dark:bg-gray-700 font-semibold' : 'bg-transparent'}`}
            >
              <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0 text-gray-600 dark:text-gray-400" />
              <span className="truncate text-sm text-gray-700 dark:text-gray-300">{convo.name}</span>
            </div>
          ))}
          {!user && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4 px-2">Faça login para ver e salvar suas conversas.</p>
          )}
          {user && sortedConversations.length === 0 && (
            <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4 px-2">Nenhuma conversa ainda. Comece uma nova!</p>
          )}
        </div>
      </aside>

      {/* Overlay for mobile when sidebar is open */}
      {isMobileView && isConversationsPanelOpen && (
        <div
          onClick={toggleConversationsPanel}
          className="fixed inset-0 bg-black/50 z-10 md:hidden"
        ></div>
      )}

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {!user && (
          <div className="p-4 text-center bg-yellow-100 dark:bg-yellow-800 border-b border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-200">
            Por favor, <a href="/login" className="underline font-semibold">faça login</a> para usar o chat e salvar suas conversas.
          </div>
        )}
        {/* Chat Header */}
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 flex items-center justify-between relative z-0">
          <div className="flex items-center">
            {isMobileView && (
                <Button variant="ghost" size="icon" onClick={toggleConversationsPanel} className="mr-2">
                    <Menu className="w-6 h-6 text-gray-500 dark:text-gray-400" />
                </Button>
            )}
            <h1 className="text-xl font-semibold text-gray-800 dark:text-white truncate max-w-xs sm:max-w-sm md:max-w-md">
              {activeConversationId && allConversations.find(c => c.id === activeConversationId)
                ? allConversations.find(c => c.id === activeConversationId)?.name
                : "ChatAI"}
            </h1>
          </div>
          <Select value={selectedModel} onValueChange={setSelectedModel} disabled={!user}>
            <SelectTrigger className="w-auto min-w-[180px] sm:w-[220px] bg-transparent dark:bg-gray-800 disabled:opacity-50">
              <SelectValue placeholder="Selecione um modelo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gemma3:4b">Gemma3:4B</SelectItem>
              <SelectItem value="ollama-llama3">Ollama Llama3</SelectItem>
              <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (API)</SelectItem>
            </SelectContent>
          </Select>
        </header>

        {/* Messages Area */}
        <div className="flex-grow p-4 space-y-4 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-md lg:max-w-lg xl:max-w-2xl px-4 py-2.5 rounded-xl shadow-sm ${ 
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                }`}
              >
                <p className="whitespace-pre-wrap">{msg.text}</p>
                {msg.timestamp && (
                  <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-blue-200' : 'text-gray-500 dark:text-gray-400'} text-right`}>
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Image Preview Area */}
        {selectedImagePreview && (
          <div className="p-2 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="relative inline-block">
              <img src={selectedImagePreview} alt="Preview" className="max-h-24 max-w-full rounded" />
              <Button 
                variant="destructive" 
                size="icon" 
                className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0.5"
                onClick={handleClearImage}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Input Footer */}
        <footer className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
          <div className="relative flex items-center">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 pl-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full group" disabled={!user || isSendingDisabled}>
                    <PlusCircle className="w-6 h-6 text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="start">
                  <DropdownMenuItem onClick={() => handleFileUpload('audio')} disabled={!user || isSendingDisabled}>
                    <Mic className="mr-2 h-4 w-4" />
                    <span>Enviar Áudio</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleFileUpload('image')} disabled={!user || isSendingDisabled}>
                    <ImageIcon className="mr-2 h-4 w-4" />
                    <span>Enviar Imagem</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            
            <Input
              type="text"
              placeholder={!user ? "Faça login para conversar" : isSendingDisabled ? "Aguarde para enviar..." : "Digite sua mensagem..."}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !isSendingDisabled && user && handleSendMessage()}
              className="w-full pr-16 pl-12 py-3 rounded-full bg-gray-100 dark:bg-gray-800 border-gray-300 dark:border-gray-700 focus:ring-blue-500 dark:focus:ring-blue-400 text-gray-900 dark:text-gray-100 disabled:opacity-60"
              disabled={!user || isSendingDisabled}
            />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 pr-2">
                <Button onClick={handleSendMessage} size="icon" className="rounded-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50" disabled={!user || isSendingDisabled || inputMessage.trim() === ''}>
                    <Send className="w-5 h-5" />
                </Button>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default ChataiPage;
