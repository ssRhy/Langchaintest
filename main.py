from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import json
import os
from dotenv import load_dotenv
from tools import generate_threejs_code, ThreeJsCodeGenerator, Scene3DMultiAgentSystem

# Load environment variables
load_dotenv()

app = FastAPI()

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize code generator and multi-agent system
code_generator = ThreeJsCodeGenerator()
agent_system = Scene3DMultiAgentSystem()

# Mount static files
app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    return {"message": "3D Scene Generator API"}

@app.post("/generate")
async def generate_scene(request: Request):
    data = await request.json()
    user_input = data.get("prompt", "")
    
    if not user_input:
        return JSONResponse(
            status_code=400,
            content={"error": "No prompt provided"}
        )
    
    try:
        # Generate Three.js code using LangChain agent
        threejs_code = generate_threejs_code(user_input)
        
        return {
            "code": threejs_code,
            "status": "success"
        }
    except Exception as e:
        return JSONResponse(
            status_code=500,
            content={"error": str(e)}
        )

@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    
    try:
        # 不在建立连接时发送消息，避免解析问题
        while True:
            data = await websocket.receive_text()
            data = json.loads(data)
            
            command = data.get("command")
            if command == "generate":
                prompt = data.get("prompt", "")
                # Use the multi-agent system for complex scene generation
                result = await agent_system.process_request(prompt)
                await websocket.send_json({
                    "type": "code",
                    "code": result["code"],
                    "plan": result["plan"]
                })
            elif command == "modify":
                prompt = data.get("prompt", "")
                original_code = data.get("originalCode", "")
                modified_code = code_generator.modify_code(prompt, original_code)
                await websocket.send_json({
                    "type": "code",
                    "code": modified_code
                })
    except WebSocketDisconnect:
        print("Client disconnected")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
