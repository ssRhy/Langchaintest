from langchain_core.prompts import PromptTemplate
from langchain_openai import ChatOpenAI
from langchain_core.chains import LLMChain

from langchain_community.agents import Tool, AgentExecutor, create_react_agent
from langchain_core.output_parsers import RegexParser
import os
from typing import Dict, List, Any

class ThreeJsCodeGenerator:
    def __init__(self):
        # Initialize the LLM
        self.llm = ChatOpenAI(
            model="gpt-4-turbo",
            temperature=0.2,
        )
        
        # Create base prompt template for generating Three.js code
        self.code_gen_template = PromptTemplate(
            input_variables=["user_input"],
            template="""
You are a Three.js expert. Generate complete and functional Three.js code based on the following description:

{user_input}

The code must:
1. Include proper scene, camera, and renderer setup
2. Use WebGLRenderer
3. Include animation loop (animate function)
4. Keep objects within a reasonable coordinate range [-10, 10]
5. Include proper lighting
6. Include any necessary imports or script tags
7. Be ready to run as standalone code

Format your response as clean, production-ready JavaScript code that can be directly executed.
Do not include any explanations, just the code.
            """
        )
        
        # Create template for modifying existing code
        self.code_modify_template = PromptTemplate(
            input_variables=["user_input", "original_code"],
            template="""
You are a Three.js expert. Modify the existing Three.js code according to the following request:

User request: {user_input}

Existing code:
```javascript
{original_code}
```

Make only the necessary changes to fulfill the request while preserving the overall structure and functionality of the code.
Return the complete modified code ready to run.
Do not include any explanations, just the code.
            """
        )
        
        # Create template for reviewing and fixing code
        self.code_review_template = PromptTemplate(
            input_variables=["code"],
            template="""
You are a Three.js expert. Review the following code for errors, performance issues, or best practices:

```javascript
{code}
```

Identify and fix any issues, then return the improved code.
Do not include any explanations, just the improved code.
            """
        )
        
        # Create chains
        self.code_gen_chain = LLMChain(
            llm=self.llm,
            prompt=self.code_gen_template
        )
        
        self.code_modify_chain = LLMChain(
            llm=self.llm,
            prompt=self.code_modify_template
        )
        
        self.code_review_chain = LLMChain(
            llm=self.llm,
            prompt=self.code_review_template
        )
    
    def generate_code(self, user_input: str) -> str:
        """Generate Three.js code from user description"""
        return self.code_gen_chain.run(user_input=user_input)
    
    def modify_code(self, user_input: str, original_code: str) -> str:
        """Modify existing Three.js code based on user description"""
        return self.code_modify_chain.run(user_input=user_input, original_code=original_code)
    
    def review_code(self, code: str) -> str:
        """Review and improve Three.js code"""
        return self.code_review_chain.run(code=code)

def generate_threejs_code(user_input: str) -> str:
    """Main function to generate Three.js code using LangChain"""
    generator = ThreeJsCodeGenerator()
    
    # Generate initial code
    generated_code = generator.generate_code(user_input)
    
    # Review and improve the code
    improved_code = generator.review_code(generated_code)
    
    return improved_code

# Define a multi-agent system with specialized agents
class Scene3DMultiAgentSystem:
    def __init__(self):
        self.llm = ChatOpenAI(model="gpt-4-turbo", temperature=0.2)
        
        # Initialize specialized agents
        self.planner_agent = self._create_planner_agent()
        self.code_generator = ThreeJsCodeGenerator()
    
    def _create_planner_agent(self):
        """Create a planner agent that breaks down complex scene requests"""
        planner_template = PromptTemplate(
            input_variables=["user_input"],
            template="""
You are a scene planning expert. Break down the following 3D scene request into clear, actionable steps:

{user_input}

For each component or object mentioned, provide:
1. What Three.js objects are needed
2. What properties (size, color, position, etc.) should be set
3. What animations or interactions should be implemented

Format your response as a JSON structure with each component and its details.
            """
        )
        
        planner_chain = LLMChain(
            llm=self.llm,
            prompt=planner_template
        )
        
        return planner_chain
    
    async def process_request(self, user_input: str) -> Dict[str, Any]:
        """Process a full 3D scene request through the multi-agent system"""
        # Step 1: Plan the scene components
        plan = self.planner_agent.run(user_input=user_input)
        
        # Step 2: Generate code based on the plan
        threejs_code = self.code_generator.generate_code(user_input)
        
        # Step 3: Review and improve the code
        final_code = self.code_generator.review_code(threejs_code)
        
        return {
            "plan": plan,
            "code": final_code
        }
