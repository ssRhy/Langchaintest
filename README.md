# 3D Scene Generator

A web application that uses AI-powered multi-agent system to generate interactive 3D scenes from natural language descriptions. This project combines the power of LangChain for AI processing and Three.js for 3D rendering.

## Features

- Generate 3D scenes directly from natural language descriptions
- Real-time interactive 3D rendering in the browser
- Multi-agent AI system for complex scene understanding and generation
- WebSocket-based communication for responsive updates
- Code display and export functionality

## Technology Stack

- **Backend**: Python with FastAPI
- **AI Framework**: LangChain with GPT-4
- **Frontend**: HTML/CSS/JavaScript
- **3D Rendering**: Three.js
- **Communications**: WebSockets and REST API

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- Node.js and npm (for development)
- OpenAI API key

### Installation

1. Clone the repository:

   ```
   git clone https://github.com/yourusername/3d-scene-generator.git
   cd 3d-scene-generator
   ```

2. Create and activate a virtual environment:

   ```
   python -m venv venv
   source venv/bin/activate  # On Windows, use: venv\Scripts\activate
   ```

3. Install dependencies:

   ```
   pip install -r requirements.txt
   ```

4. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Add your OpenAI API key to the `.env` file

### Running the Application

1. Start the backend server:

   ```
   python main.py
   ```

2. Open a web browser and navigate to:
   ```
   http://localhost:8000/static/index.html
   ```

## Usage

1. Enter a natural language description of the 3D scene you want to create in the input field.

   - Example: "Create a red cube rotating on a blue plane with a point light above it"

2. Click "Generate Scene" and wait for the AI to process your request.

3. The generated 3D scene will appear in the visualization section.

4. You can modify the scene by entering new instructions in the modification field.

5. The Three.js code for the scene is displayed at the bottom of the page and can be copied for use in other projects.

## How It Works

The application uses a multi-agent system built with LangChain:

1. A planning agent breaks down complex scene descriptions into components
2. A code generation agent converts these components into Three.js code
3. A review agent checks the code for errors and optimizes it
4. The generated code is executed in the browser to render the 3D scene

## License

MIT

## Acknowledgements

- LangChain for the AI framework
- Three.js for the 3D rendering capabilities

以下是结合 Python 多 Agent 智能体 和 Three.js 的完整技术方案，通过前后端协作实现自然语言生成到 3D 渲染的完整流程：

注意下载不冲突的依赖：

核心技术栈选择**
| **模块** | **推荐方案**  
|------------------|-------------------------------------
| **前端框架** | React + TypeScript  
| **通信协议** | WebSocket + GraphQL  
| **AI 模型** | GPT-4 +  
| **代码执行** | IFrame 沙盒 + WebAssembly  
| **3D 引擎** | Three.js r158  
| **后端服务\*\* | FastAPI (Python)

---

### **一、系统架构设计**

    A[用户界面] --> B(自然语言输入)
    B --> C{AI python agent代码生成模块}
    C --> D[Three.js 代码]
    D --> E(代码安全沙盒)
    E --> F[WebGL 渲染引擎]
    F --> G[实时3D预览]

````



### **二、技术实现步骤**

#### **1. Python Agent 开发（后端）**
```python
# 自然语言转Three.js代码的Agent
from langchain.chains import LLMChain
from langchain.prompts import PromptTemplate

threejs_template = """
你是一个Three.js专家，请根据用户描述生成完整代码：
1. 必须包含scene、camera、renderer基础结构
2. 使用WebGLRenderer
3. 包含动画循环(animate)
4. 物体位置范围：[-10,10]

用户输入：{user_input}
"""

def generate_threejs_code(user_input: str) -> str:
    prompt = PromptTemplate(
        template=threejs_template,
        input_variables=["user_input"]
    )

    chain = LLMChain(
        llm=ChatOpenAI(model="gpt-4", temperature=0.3),
        prompt=prompt
    )

    # 示例输出
    return chain.run(user_input)
````

#### **2. 前后端通信接口**

```python
# FastAPI 后端
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/generate")
async def generate_scene(request: dict):
    user_input = request.get("prompt")
    raw_code = generate_threejs_code(user_input)
    sanitized_code = code_sanitizer(raw_code)  # 安全过滤函数
    return {"code": sanitized_code}
```

#### **3. 前端渲染引擎（JavaScript）**

```javascript
// Three.js动态渲染组件
class DynamicRenderer {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      this.container.clientWidth / this.container.clientHeight,
      0.1,
      1000
    );
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.animateId = null;
  }

  init() {
    this.renderer.setSize(
      this.container.clientWidth,
      this.container.clientHeight
    );
    this.container.appendChild(this.renderer.domElement);
  }

  executeCode(code) {
    // 安全执行生成的代码
    const safeEval = new Function("scene", "camera", "renderer", code);

    // 清理旧场景
    while (this.scene.children.length > 0) {
      this.scene.remove(this.scene.children[0]);
    }

    // 执行新代码
    try {
      if (this.animateId) cancelAnimationFrame(this.animateId);
      safeEval(this.scene, this.camera, this.renderer);
    } catch (e) {
      console.error("执行错误:", e);
    }
  }
}
```

#### **4. 安全执行方案**

```javascript
// 安全沙盒实现
function createSafeSandbox() {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  document.body.appendChild(iframe);

  return {
    run: (code) => {
      return new Promise((resolve, reject) => {
        const blob = new Blob(
          [
            `
          <html>
            <scrip></scrip></script>
            <script>
              try {
                ${code}
                parent.postMessage({ status: 'success' }, '*');
              } catch(e) {
                parent.postMessage({ error: e.toString() }, '*');
              }
            </scrip>
          </html>
        `,
          ],
          { type: "text/html" }
        );

        iframe.src = URL.createObjectURL(blob);

        window.addEventListener("message", (e) => {
          if (e.data.error) reject(e.data.error);
          if (e.data.status === "success") resolve();
        });
      });
    },
  };
}
```

---

### **三、完整工作流程**

1. **用户输入**：通过网页表单提交自然语言描述
2. **后端处理**：
   ```python
   # 示例输入处理
   {
     "prompt": "创建两个旋转的立方体，红色和蓝色，添加点光源"
   }
   ```
3. **代码生成**：

   ```javascript
   // 生成的Three.js代码
   const scene = new THREE.Scene();
   const camera = new THREE.PerspectiveCamera(...);
   const renderer = new THREE.WebGLRenderer(...);

   // 创建立方体
   const cube1 = new THREE.Mesh(
     new THREE.BoxGeometry(1,1,1),
     new THREE.MeshStandardMaterial({ color: 0xff0000 })
   );

   // 添加光源
   const light = new THREE.PointLight(0xffffff, 1, 100);
   scene.add(light);

   // 动画循环
   function animate() {
     cube1.rotation.x += 0.01;
     renderer.render(scene, camera);
     requestAnimationFrame(animate);
   }
   animate();
   ```

4. **前端渲染**：

   ```javascript
   // 调用渲染组件
   const renderer = new DynamicRenderer("canvasContainer");
   renderer.init();

   fetch("/generate", {
     method: "POST",
     headers: { "Content-Type": "application/json" },
     body: JSON.stringify({ prompt: userInput }),
   })
     .then((res) => res.json())
     .then((data) => {
       renderer.executeCode(data.code);
     });
   ```

---

该方案实现了：

1. **自然语言驱动**：用户用日常语言描述即可在线生成 3D 场景网页
2. **动态交互**：支持生成后调整物体参数
3. **跨平台**：前后端分离架构适应各种设备

通过组合 Python 的 AI 能力和 JavaScript 的图形渲染优势，构建出完整的智能 3D 创作系统。

LangChain 和 WebGLRenderer 是两个不同领域的关键技术组件，它们在构建 AI 驱动的 3D 在线渲染系统时分别承担重要角色。以下是它们的核心功能和协作方式的详细解释：

### **一、LangChain 的核心功能**

**定位**：面向 AI 应用的开发框架  
**主要作用**：构建和协调语言模型（LLM）的工作流程

#### **1. 核心能力**

| **功能模块**   | **作用描述**         | **在 3D 渲染场景的应用示例**                     |
| -------------- | -------------------- | ------------------------------------------------ |
| **提示工程**   | 结构化自然语言指令   | 设计生成 Three.js 代码的专用模板                 |
| **模型编排**   | 协调多个 AI 模型协作 | 先用 GPT-4 理解用户意图，再用 CodeLlama 生成代码 |
| **记忆管理**   | 维护对话历史上下文   | 记住用户之前创建的物体参数                       |
| **工具集成**   | 连接外部 API 和函数  | 调用 Three.js 文档检索 API                       |
| **工作流控制** | 构建处理流水线       | 代码生成 → 安全审查 → 执行验证的链式流程         |
