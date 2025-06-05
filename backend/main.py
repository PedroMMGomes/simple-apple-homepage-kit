import os
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
import httpx
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Optional, Dict, Any

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

app = FastAPI()

# Configuração de CORS
# Permite requisições do frontend Vite (e futuramente do aratutec.org)
origins = [
    "http://localhost:8080",  # Endereço padrão do Vite dev server
    "http://127.0.0.1:8080",
    "https://aratutec.org", # Seu domínio de produção
    # Adicione outros origens se necessário
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

# --- Modelos Pydantic para validação de request/response (estilo OpenAI) ---
class Message(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[Message]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    stream: Optional[bool] = False # Ollama suporta streaming, podemos implementar depois

class ChatCompletionChoice(BaseModel):
    index: int
    message: Message
    finish_reason: Optional[str] = "stop"

class ChatCompletionResponse(BaseModel):
    id: str # Pode ser um UUID gerado
    object: str = "chat.completion"
    created: int # Timestamp
    model: str
    choices: List[ChatCompletionChoice]
    # usage: Optional[Dict[str, int]] # Ollama não fornece usage da mesma forma

# --- Endpoints da API ---

@app.get("/health")
async def health_check():
    """Verifica a saúde da API."""
    return {"status": "ok", "ollama_base_url": OLLAMA_BASE_URL}

@app.get("/api/models")
async def list_ollama_models():
    """Lista os modelos disponíveis no Ollama (equivalente a /api/tags do Ollama)."""
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            response.raise_for_status()
            ollama_models_data = response.json()
            
            # Formatar para um estilo similar ao da OpenAI API /v1/models
            formatted_models = []
            for model_info in ollama_models_data.get("models", []):
                formatted_models.append({
                    "id": model_info.get("name"),
                    "object": "model",
                    "created": 0, # Ollama não fornece timestamp de criação por tag
                    "owned_by": "ollama", # Placeholder
                })
            return {"object": "list", "data": formatted_models}
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Erro ao conectar com Ollama: {e}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro interno ao listar modelos: {e}")

@app.post("/api/chat", response_model=ChatCompletionResponse)
async def chat_with_ollama(request_body: ChatCompletionRequest):
    """Endpoint de chat compatível com OpenAI, que interage com /api/chat do Ollama."""
    ollama_payload = {
        "model": request_body.model,
        "messages": [{"role": msg.role, "content": msg.content} for msg in request_body.messages],
        "stream": request_body.stream,
        "options": {
            "temperature": request_body.temperature,
            # "num_predict": request_body.max_tokens, # Ollama usa num_predict
        }
    }
    if request_body.max_tokens is not None:
        ollama_payload["options"]["num_predict"] = request_body.max_tokens

    async with httpx.AsyncClient(timeout=None) as client: # Timeout None para long polling/streaming
        try:
            response = await client.post(f"{OLLAMA_BASE_URL}/api/chat", json=ollama_payload)
            response.raise_for_status() # Levanta exceção para respostas 4xx/5xx
            
            ollama_response_data = response.json()
            
            # Construir a resposta no formato OpenAI
            # Ollama /api/chat retorna a mensagem do assistente diretamente em 'message'
            assistant_message = ollama_response_data.get("message", {})
            
            import time
            import uuid

            chat_response = ChatCompletionResponse(
                id=str(uuid.uuid4()),
                created=int(time.time()),
                model=ollama_response_data.get("model", request_body.model),
                choices=[
                    ChatCompletionChoice(
                        index=0,
                        message=Message(
                            role=assistant_message.get("role", "assistant"),
                            content=assistant_message.get("content", "")
                        )
                        # finish_reason pode ser inferido se Ollama fornecer
                    )
                ]
                # usage: Ollama fornece 'eval_count', 'eval_duration', etc.
                # que podem ser mapeados se necessário, mas não diretamente para 'prompt_tokens', 'completion_tokens'.
            )
            return chat_response
            
        except httpx.HTTPStatusError as e:
            # Tentar obter mais detalhes do erro da resposta do Ollama, se possível
            error_detail = f"Erro do Ollama: {e.response.status_code}"
            try:
                ollama_error = e.response.json()
                error_detail += f" - {ollama_error.get('error', e.response.text)}"
            except Exception:
                error_detail += f" - {e.response.text}"
            raise HTTPException(status_code=e.response.status_code, detail=error_detail)
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Erro de conexão com Ollama: {e}")
        except Exception as e:
            # Logar o erro real para depuração no servidor
            print(f"Erro interno não esperado: {e}")
            # Retornar um erro genérico para o cliente
            raise HTTPException(status_code=500, detail=f"Erro interno ao processar o chat: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    # Para rodar localmente: uvicorn main:app --reload --port 8000
    # OLLAMA_BASE_URL pode ser configurado via .env ou como variável de ambiente
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8008)))
