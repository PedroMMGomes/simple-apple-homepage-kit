import os
import shutil
import uuid
import time
from fastapi import FastAPI, HTTPException, Request, File, UploadFile, Form
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
import httpx
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from openai import AsyncOpenAI
import whisper
from pydub import AudioSegment
from pydub.exceptions import CouldntDecodeError
import json
from fastapi.responses import StreamingResponse
# ... other imports like FastAPI, httpx, etc.

# Carregar variáveis de ambiente do arquivo .env
load_dotenv()

app = FastAPI()

# Configuração de CORS
origins = [
    "http://localhost:8080",
    "http://127.0.0.1:8080",
    "https://aratutec.org",
    "http://localhost:8000",
    "http://localhost:8001",
    "http://localhost:8002",
    "http://127.0.0.1:59401" # Cascade Browser Preview proxy
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    print("AVISO: OPENAI_API_KEY não configurada no .env. Funcionalidades de áudio e imagem podem não funcionar.")
    # Consider raising an error or using a mock client if essential

client_openai = AsyncOpenAI(api_key=OPENAI_API_KEY)

# --- Modelos Pydantic --- (Mantidos como antes)
class Message(BaseModel):
    role: str
    content: str

class ChatCompletionRequest(BaseModel):
    model: str
    messages: List[Message]
    temperature: Optional[float] = 0.7
    max_tokens: Optional[int] = None
    stream: Optional[bool] = False

class ChatCompletionChoice(BaseModel):
    index: int
    message: Message
    finish_reason: Optional[str] = "stop"

class ChatCompletionResponse(BaseModel):
    id: str
    object: str = "chat.completion"
    created: int
    model: str
    choices: List[ChatCompletionChoice]

# --- Endpoints da API ---

@app.get("/health")
async def health_check():
    return {"status": "ok", "ollama_base_url": OLLAMA_BASE_URL, "openai_configured": bool(OPENAI_API_KEY)}

@app.get("/api/models")
async def list_ollama_models():
    async with httpx.AsyncClient() as client_http:
        try:
            response = await client_http.get(f"{OLLAMA_BASE_URL}/api/tags")
            response.raise_for_status()
            ollama_models_data = response.json()
            formatted_models = []
            for model_info in ollama_models_data.get("models", []):
                formatted_models.append({
                    "id": model_info.get("name"),
                    "object": "model",
                    "created": 0, 
                    "owned_by": "ollama",
                })
            # Potentially add OpenAI models here if needed by frontend model selector
            return {"object": "list", "data": formatted_models}
        except httpx.RequestError as e:
            raise HTTPException(status_code=503, detail=f"Erro ao conectar com Ollama: {e}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Erro interno ao listar modelos: {e}")

# Remove response_model from the decorator if it was there
@app.post("/api/chat")
async def chat_with_ollama(request_body: ChatCompletionRequest):
    ollama_payload = {
        "model": request_body.model,
        "messages": [{"role": msg.role, "content": msg.content} for msg in request_body.messages],
        "stream": request_body.stream, # This will be True based on frontend
        "options": {"temperature": request_body.temperature}
    }
    if request_body.max_tokens is not None:
        ollama_payload["options"]["num_predict"] = request_body.max_tokens

    async def stream_generator():
        async with httpx.AsyncClient(timeout=60.0) as client_http:
            try:
                async with client_http.stream("POST", f"{OLLAMA_BASE_URL}/api/chat", json=ollama_payload) as response:
                    response.raise_for_status()
                    async for line in response.aiter_lines():
                        if line:
                            try:
                                ollama_chunk = json.loads(line)
                                # Transform Ollama chunk to the format frontend expects
                                transformed_chunk = {}
                                if ollama_chunk.get("message") and "content" in ollama_chunk["message"]:
                                    transformed_chunk["response"] = ollama_chunk["message"]["content"]
                                
                                # Include 'done' and 'model' if present in Ollama's chunk
                                if "done" in ollama_chunk:
                                    transformed_chunk["done"] = ollama_chunk["done"]
                                if "model" in ollama_chunk:
                                    transformed_chunk["model"] = ollama_chunk["model"]
                                
                                # The frontend expects a "response" field for content.
                                # Only yield if there's content to send or it's a "done" message.
                                if transformed_chunk.get("response") or transformed_chunk.get("done"):
                                    yield f"data: {json.dumps(transformed_chunk)}\n\n"
                            except json.JSONDecodeError:
                                print(f"Skipping non-JSON line from Ollama stream: {line}")
                                continue
                # After the loop, or if the loop doesn't run, signal completion.
                yield f"data: {json.dumps({'response': '', 'done': True})}\n\n" # Ensure a final "done" is sent
            except httpx.HTTPStatusError as e:
                error_detail = f"Ollama API Error: {e.response.status_code}"
                try:
                    ollama_error_content = e.response.json()
                    if "error" in ollama_error_content:
                        error_detail += f" - {ollama_error_content['error']}"
                except Exception:
                    pass
                print(f"HTTPStatusError during stream: {error_detail}")
                yield f"data: {json.dumps({'error': error_detail, 'done': True})}\n\n"
            except httpx.RequestError as e:
                print(f"RequestError during stream: {e}")
                yield f"data: {json.dumps({'error': f'Connection error with Ollama: {e}', 'done': True})}\n\n"
            except Exception as e:
                print(f"Unexpected error during stream: {type(e).__name__} - {e}")
                yield f"data: {json.dumps({'error': f'Internal stream processing error: {type(e).__name__} - {e}', 'done': True})}\n\n"

    if request_body.stream:
        return StreamingResponse(stream_generator(), media_type="text/event-stream")
    else:
        # Fallback for non-streaming (though frontend currently always requests stream for this path)
        async with httpx.AsyncClient(timeout=60.0) as client_http:
            try:
                response = await client_http.post(f"{OLLAMA_BASE_URL}/api/chat", json=ollama_payload)
                response.raise_for_status()
                ollama_response_data = response.json()
                if ollama_response_data.get("message"):
                    assistant_message = Message(
                        role=ollama_response_data["message"]["role"],
                        content=ollama_response_data["message"]["content"]
                    )
                    choice = ChatCompletionChoice(index=0, message=assistant_message, finish_reason="stop")
                    return ChatCompletionResponse(
                        id=f"chatcmpl-{ollama_response_data.get('created_at', str(uuid.uuid4()))}",
                        object="chat.completion",
                        created=int(time.time()),
                        model=ollama_response_data.get("model", request_body.model),
                        choices=[choice]
                    )
                else:
                    raise HTTPException(status_code=500, detail="Unexpected response from Ollama (non-streaming): 'message' field missing.")
            except httpx.HTTPStatusError as e:
                error_detail = f"Ollama API Error (non-streaming): {e.response.status_code}"
                try:
                    ollama_error_content = e.response.json()
                    if "error" in ollama_error_content: error_detail += f" - {ollama_error_content['error']}"
                except Exception: pass
                raise HTTPException(status_code=e.response.status_code, detail=error_detail)
            except httpx.RequestError as e:
                raise HTTPException(status_code=503, detail=f"Connection error with Ollama (non-streaming): {e}")
            except Exception as e:
                print(f"Unexpected internal error (non-streaming): {e}")
                raise HTTPException(status_code=500, detail=f"Internal error processing chat (non-streaming): {type(e).__name__} - {e}")


# NEW ENDPOINT FOR IMAGE CHAT
@app.post("/api/chat_image_stream")
async def chat_image_stream_endpoint(
    image: UploadFile = File(...),
    model: str = Form(...),
    prompt: str = Form(""), 
    stream: str = Form("true"), 
    conversation_id: Optional[str] = Form(None), 
    user_id: str = Form(...)
):
    print(f"Received request for /api/chat_image_stream")
    print(f"Model: {model}")
    print(f"Prompt: {prompt}")
    print(f"Stream: {stream}")
    print(f"Conversation ID: {conversation_id}")
    print(f"User ID: {user_id}")
    if image:
        print(f"Image Filename: {image.filename}")
        print(f"Image Content Type: {image.content_type}")

    should_stream = stream.lower() == "true"

    if should_stream:
        async def fake_stream_generator():
            import json # Ensure json module is available
            image_filename_str = image.filename if image else "No image"
            
            payload = {
                "response": f"Placeholder response: Image '{image_filename_str}' received. Prompt: '{prompt}'. Streaming not yet implemented for images."
            }
            json_payload = json.dumps(payload)
            
            yield f"data: {json_payload}\n\n"
            yield f"data: [DONE]\n\n"
        
        return StreamingResponse(fake_stream_generator(), media_type="text/event-stream")
    else:
        return {
            "message": "Image received successfully (non-streamed placeholder)",
            "model": model,
            "prompt": prompt,
            "image_filename": image.filename if image else None,
            "conversation_id": conversation_id
        }


@app.post("/api/transcribe_and_chat", response_model=ChatCompletionResponse)
async def transcribe_and_chat_endpoint(file: UploadFile = File(...), selected_model: Optional[str] = Form(None)):
    # A chave OPENAI_API_KEY ainda pode ser necessária para o chat com OpenAI após transcrição
    # Se selected_model for fornecido e for um modelo Ollama, não precisaremos da chave OpenAI para o chat.
    # A transcrição em si é local e não depende da chave OpenAI.

    if not selected_model and not OPENAI_API_KEY:
        raise HTTPException(status_code=500, detail="Chave API da OpenAI não configurada e nenhum modelo Ollama selecionado para o chat pós-transcrição.")
    
    temp_dir = "temp_audio_files"
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, f"{uuid.uuid4()}_{file.filename}")

    transcribed_text = ""
    temp_wav_file_path = ""  # Initialize to ensure it's defined for finally block

    try:
        # 1. Save uploaded file
        with open(temp_file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)

        # 2. Convert to WAV using pydub
        wav_filename = f"{uuid.uuid4()}.wav"
        temp_wav_file_path = os.path.join(temp_dir, wav_filename)
        
        print(f"Attempting to convert {temp_file_path} to {temp_wav_file_path}")
        audio_segment = AudioSegment.from_file(temp_file_path) # pydub attempts to infer format
        audio_segment.export(temp_wav_file_path, format="wav")
        print(f"Successfully converted to {temp_wav_file_path}")
        
        # 3. Transcribe with local Whisper
        model_name = os.getenv("WHISPER_MODEL", "small") 
        print(f"Loading local Whisper model: {model_name}")
        whisper_model = whisper.load_model(model_name)
        print(f"Whisper model {model_name} loaded. Transcribing...")
        
        transcription_result = whisper_model.transcribe(temp_wav_file_path, language="pt")
        transcribed_text = transcription_result["text"]
        
        print(f"Texto transcrito localmente ({model_name} model): {transcribed_text}")

    except CouldntDecodeError as e:
        raise HTTPException(status_code=400, detail=f"Erro ao decodificar áudio (formato pode não ser suportado ou ffmpeg ausente/configurado incorretamente): {e}. Verifique se o ffmpeg está instalado e no PATH.")
    except FileNotFoundError as e:
        if "ffmpeg" in str(e).lower() or "avconv" in str(e).lower():
            raise HTTPException(status_code=500, detail=f"ffmpeg não encontrado. Certifique-se de que está instalado e no PATH do sistema. Erro: {e}")
        raise HTTPException(status_code=500, detail=f"Erro de arquivo não encontrado durante transcrição: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro durante a transcrição local do áudio: {type(e).__name__} - {e}")
    finally:
        # 4. Clean up temporary files
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)
        if temp_wav_file_path and os.path.exists(temp_wav_file_path):
            os.remove(temp_wav_file_path)

    # Agora, envie o texto transcrito para um modelo de chat
    try:
        if selected_model and not selected_model.lower().startswith("gpt-") and not selected_model.lower().startswith("openai/"):
            print(f"Encaminhando texto transcrito para o modelo Ollama selecionado: {selected_model}")
            # Simular uma chamada interna para /api/chat com o texto transcrito
            ollama_request_body = ChatCompletionRequest(
                model=selected_model,
                messages=[
                    Message(role="system", content="Você é um assistente prestativo. O usuário enviou um áudio que foi transcrito como segue."),
                    Message(role="user", content=transcribed_text)
                ],
                temperature=0.7, # Pode ser ajustado ou pego do frontend se necessário
                stream=False
            )
            return await chat_with_ollama(ollama_request_body)
        elif OPENAI_API_KEY:
            chat_model_to_use = os.getenv("OPENAI_CHAT_MODEL_AUDIO", "gpt-3.5-turbo")
            print(f"Enviando texto transcrito para o modelo OpenAI: {chat_model_to_use}")
            chat_completion = await client_openai.chat.completions.create(
            model=chat_model_to_use,
            messages=[
                {"role": "system", "content": "Você é um assistente prestativo."},
                {"role": "user", "content": transcribed_text}
            ]
        )
        
        if chat_completion.choices and chat_completion.choices[0].message:
            assistant_message_content = chat_completion.choices[0].message.content
            assistant_message = Message(role="assistant", content=assistant_message_content or "")
            choice = ChatCompletionChoice(index=0, message=assistant_message, finish_reason=chat_completion.choices[0].finish_reason)
            
            return ChatCompletionResponse(
                id=chat_completion.id,
                object="chat.completion",
                created=chat_completion.created,
                model=chat_completion.model,
                choices=[choice]
            )
        else:
            raise HTTPException(status_code=500, detail="Resposta inesperada do modelo de chat OpenAI após transcrição.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao obter resposta do chat OpenAI após transcrição: {e}")

@app.post("/api/image_chat", response_model=ChatCompletionResponse)
async def image_chat_endpoint(file: UploadFile = File(...)):
    # Placeholder para funcionalidade de chat com imagem
    # No futuro, isso usaria um modelo multimodal como GPT-4 Vision.
    print(f"Recebida imagem: {file.filename}, tipo: {file.content_type}")
    
    # Simular uma resposta de bot
    bot_message_content = f"Imagem '{file.filename}' recebida. A análise de imagens ainda está em desenvolvimento."
    
    assistant_message = Message(role="assistant", content=bot_message_content)
    choice = ChatCompletionChoice(index=0, message=assistant_message, finish_reason="stop")
    
    return ChatCompletionResponse(
        id=f"imgchatcmpl-{uuid.uuid4()}",
        object="chat.completion",
        created=int(time.time()),
        model="placeholder-image-model", # Modelo placeholder
        choices=[choice]
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8008)))
