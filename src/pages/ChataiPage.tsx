import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { Mic, Send, PlusCircle, MessageSquare, Image as ImageIcon, Edit3 } from 'lucide-react';

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
  const { user } = useAuth();
  const [inputMessage, setInputMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>('PetrosStav/gemma3-tools:4b');
  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number>(0);
  const [isSendingDisabled, setIsSendingDisabled] = useState<boolean>(false);
  const cooldownTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

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
        //   setSelectedModel(parsedConversations[0].model || 'PetrosStav/gemma3-tools:4b');
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

  const handleSendMessage = async () => {
    if (!user) {
      setMessages(prev => [...prev, { id: 'auth-err', text: 'Você precisa estar logado para enviar mensagens.', sender: 'bot', timestamp: Date.now() }]);
      return;
    }

    if (inputMessage.trim() === '') return;

    const now = Date.now();
    if (isSendingDisabled || (now - lastMessageTimestamp < 10000)) {
      const timeLeft = Math.ceil((10000 - (now - lastMessageTimestamp)) / 1000);
      const cooldownMessage: Message = { id: 'cooldown-msg', text: `Por favor, aguarde ${timeLeft > 0 ? timeLeft : 10}s para enviar outra mensagem.`, sender: 'bot', timestamp: Date.now() };
      // Avoid adding multiple cooldown messages if one is already there or if already disabled
      if (!messages.find(m => m.id === 'cooldown-msg')){
        setMessages(prev => [...prev, cooldownMessage]);
      }
      setTimeout(() => {
        setMessages(prevMsgs => prevMsgs.filter(msg => msg.id !== 'cooldown-msg'));
      }, 3000);
      return;
    }

    setIsSendingDisabled(true);
    setLastMessageTimestamp(now);

    const newUserMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      sender: 'user',
      timestamp: now
    };
    // Add user message to local state immediately
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setInputMessage('');

    // Prepare messages for API (OpenAI format) - send current messages + new user message
    const apiMessages = updatedMessages.map(m => ({ role: m.sender, content: m.text }));

    try {
      const response = await fetch(`${API_BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: apiMessages,
          stream: false, 
        }),
      });

      if (!response.ok) {
        let errorData = { detail: `Erro HTTP: ${response.status}` };
        try {
          errorData = await response.json();
        } catch (e) { /* Ignore if response is not JSON */ }
        throw new Error(errorData.detail || `Erro HTTP: ${response.status}`);
      }

      const data = await response.json();

      if (data.choices && data.choices.length > 0 && data.choices[0].message) {
        const botResponseText = data.choices[0].message.content;
        const newBotMessage: Message = {
          id: data.id || (Date.now() + 1).toString(),
          text: botResponseText,
          sender: 'bot',
          timestamp: Date.now()
        };
        setMessages(prevMessages => [...prevMessages, newBotMessage]); // Add bot message

        let currentConversationId = activeConversationId;
        const finalMessagesForStorage = [...updatedMessages, newBotMessage]; // User + Bot message

        if (!currentConversationId) {
          const newConvoId = Date.now().toString();
          const newConversation: Conversation = {
            id: newConvoId,
            name: newUserMessage.text.substring(0, 30) + (newUserMessage.text.length > 30 ? '...' : ''),
            messages: finalMessagesForStorage,
            createdAt: now,
            lastModified: now,
            model: selectedModel
          };
          setAllConversations(prevConvos => [newConversation, ...prevConvos.filter(c => c.id !== newConvoId)].sort((a,b) => b.lastModified - a.lastModified));
          setActiveConversationId(newConvoId);
        } else {
          setAllConversations(prevConvos =>
            prevConvos.map(convo =>
              convo.id === currentConversationId
                ? { ...convo, messages: finalMessagesForStorage, lastModified: now, model: selectedModel }
                : convo
            ).sort((a,b) => b.lastModified - a.lastModified)
          );
        }
      } else {
        throw new Error('Resposta da API em formato inesperado.');
      }
    } catch (error: any) {
      console.error('Erro ao enviar mensagem:', error);
      const errorBotMessage: Message = { id: (Date.now() + 1).toString(), text: `Erro: ${error.message}`, sender: 'bot', timestamp: Date.now() };
      setMessages(prevMessages => [...prevMessages, errorBotMessage]);
    }

    if (cooldownTimeoutRef.current) clearTimeout(cooldownTimeoutRef.current);
    cooldownTimeoutRef.current = setTimeout(() => {
      setIsSendingDisabled(false);
    }, 10000);
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
      setSelectedModel(conversation.model || 'PetrosStav/gemma3-tools:4b');
    }
  };
  
  const handleFileUpload = (fileType: 'audio' | 'image') => {
    if (!user || isSendingDisabled) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = fileType === 'audio' ? 'audio/*' : 'image/*';
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement;
      if (target.files && target.files.length > 0) {
        const file = target.files[0];
        console.log(`Arquivo ${fileType} selecionado:`, file.name);
        const simulatedMessage: Message = {
          id: Date.now().toString(),
          text: `Arquivo ${fileType} "${file.name}" selecionado. (Upload pendente)`,
          sender: 'user',
          timestamp: Date.now()
        };
        setMessages(prev => [...prev, simulatedMessage]);
      }
    };
    input.click();
  };

  const sortedConversations = [...allConversations]; // Already sorted when set

  return (
    <div className="flex bg-gray-100 dark:bg-gray-800">
      <aside className="w-64 md:w-72 lg:w-80 p-4 border-r border-gray-200 dark:border-gray-700 flex flex-col bg-white dark:bg-gray-900">
        <Button onClick={handleNewConversation} disabled={!user} className="mb-4 w-full bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50">
          <PlusCircle className="w-4 h-4 mr-2" /> Nova Conversa
        </Button>
        <h3 className="text-sm font-semibold mb-2 text-gray-600 dark:text-gray-400">Conversas Antigas</h3>
        <div className="flex-grow overflow-y-auto space-y-2 pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600 scrollbar-track-transparent">
          {user && sortedConversations.map((convo) => (
            <div
              key={convo.id}
              onClick={() => handleSelectConversation(convo.id)}
              className={`p-2.5 rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors duration-150 flex items-center ${activeConversationId === convo.id ? 'bg-gray-200 dark:bg-gray-700 font-semibold' : 'bg-transparent'}`}
            >
              <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0 text-gray-600 dark:text-gray-400" />
              <span className="truncate text-sm text-gray-700 dark:text-gray-300">{convo.name}</span>
            </div>
          ))}
          {!user && (
             <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">Faça login para ver suas conversas.</p>
          )}
          {user && sortedConversations.length === 0 && (
             <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">Nenhuma conversa ainda. Comece uma nova!</p>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-800">
        {!user && (
          <div className="p-4 text-center bg-yellow-100 dark:bg-yellow-800 border-b border-yellow-300 dark:border-yellow-700 text-yellow-700 dark:text-yellow-200">
            Por favor, <a href="/login" className="underline font-semibold">faça login</a> para usar o chat e salvar suas conversas.
          </div>
        )}
        <header className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center bg-white dark:bg-gray-900">
          <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Chat</h2>
          <Select value={selectedModel} onValueChange={setSelectedModel} disabled={!user}>
            <SelectTrigger className="w-[220px] bg-white dark:bg-gray-800 disabled:opacity-50">
              <SelectValue placeholder="Selecione um modelo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="PetrosStav/gemma3-tools:4b">Gemma3 Tools 4B</SelectItem>
              <SelectItem value="ollama-llama3">Ollama Llama3</SelectItem>
              <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (API)</SelectItem>
            </SelectContent>
          </Select>
        </header>

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
