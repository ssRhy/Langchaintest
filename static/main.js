document.addEventListener("DOMContentLoaded", () => {
  // DOM elements
  const sceneForm = document.getElementById("scene-form");
  const promptInput = document.getElementById("prompt-input");
  const generateBtn = document.getElementById("generate-btn");
  const modificationSection = document.getElementById("modification-section");
  const modificationInput = document.getElementById("modification-input");
  const modifyBtn = document.getElementById("modify-btn");
  const canvasContainer = document.getElementById("canvas-container");
  const loadingIndicator = document.getElementById("loading-indicator");
  const codeDisplay = document.getElementById("code-display");
  const copyBtn = document.getElementById("copy-btn");

  // Keep track of current code
  let currentCode = "";
  let sceneAlreadyCreated = false;
  let renderer, scene, camera, controls;
  let animationId = null;

  // Global WebSocket connection
  let ws = null;

  // Initialize WebSocket connection
  function initWebSocket() {
    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.host; // 包含主机名和端口
    const wsUrl = `${wsProtocol}//${wsHost}/ws`;

    console.log("Connecting to WebSocket at:", wsUrl);

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log("WebSocket connection established");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "code") {
        hideLoading();
        setCodeDisplay(data.code);
        executeThreeJsCode(data.code);

        // Show modification section after initial generation
        modificationSection.style.display = "block";
      }
    };

    ws.onclose = () => {
      console.log("WebSocket connection closed");
      // Try to reconnect after 2 seconds
      setTimeout(initWebSocket, 2000);
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
      console.log("Will use REST API fallback for requests");
    };
  }

  // Initialize the system
  function initialize() {
    // Connect to backend via WebSocket for real-time updates
    initWebSocket();

    // Set up event listeners
    sceneForm.addEventListener("submit", handleGenerateScene);
    modifyBtn.addEventListener("click", handleModifyScene);
    copyBtn.addEventListener("click", handleCopyCode);

    // Adjust canvas size on window resize
    window.addEventListener("resize", handleResize);
  }

  // Handle scene generation form submission
  function handleGenerateScene(e) {
    e.preventDefault();

    const prompt = promptInput.value.trim();
    if (!prompt) {
      alert("Please enter a description of the 3D scene you want to create.");
      return;
    }

    showLoading();

    // If WebSocket is ready, use it
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          command: "generate",
          prompt: prompt,
        })
      );
    } else {
      // Fallback to REST API
      fetch("/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ prompt }),
      })
        .then((response) => response.json())
        .then((data) => {
          hideLoading();

          if (data.error) {
            alert(`Error: ${data.error}`);
            return;
          }

          setCodeDisplay(data.code);
          executeThreeJsCode(data.code);

          // Show modification section after initial generation
          modificationSection.style.display = "block";
        })
        .catch((error) => {
          hideLoading();
          console.error("Error:", error);
          alert(
            "An error occurred while generating the scene. Please try again."
          );
        });
    }
  }

  // Handle scene modification
  function handleModifyScene() {
    const modPrompt = modificationInput.value.trim();
    if (!modPrompt) {
      alert("Please enter a description of how you want to modify the scene.");
      return;
    }

    showLoading();

    // Send modification request via WebSocket
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(
        JSON.stringify({
          command: "modify",
          prompt: modPrompt,
          originalCode: currentCode,
        })
      );
    } else {
      // Fallback to REST API
      fetch("/modify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: modPrompt,
          originalCode: currentCode,
        }),
      })
        .then((response) => response.json())
        .then((data) => {
          hideLoading();

          if (data.error) {
            alert(`Error: ${data.error}`);
            return;
          }

          setCodeDisplay(data.code);
          executeThreeJsCode(data.code);
        })
        .catch((error) => {
          hideLoading();
          console.error("Error:", error);
          alert("An error occurred. Please try again.");
        });
    }
  }

  // Execute Three.js code in the canvas
  function executeThreeJsCode(code) {
    // Clean up previous scene if it exists
    if (sceneAlreadyCreated && animationId !== null) {
      cancelAnimationFrame(animationId);
      if (renderer) {
        renderer.dispose();
        canvasContainer.removeChild(renderer.domElement);
      }
    }

    // Store the current code
    currentCode = code;

    try {
      // Create a safe execution environment
      const executeEnv = new Function(
        "container",
        `
                // Standard Three.js variables
                let scene, camera, renderer, controls;
                let animationId = null;
                
                // Setup container
                const width = container.clientWidth;
                const height = container.clientHeight;
                
                // Execute the generated code
                ${code}
                
                // Return any animation ID for cleanup
                return { animationId };
            `
      );

      // Execute the code
      const result = executeEnv(canvasContainer);

      // Keep track of animation for cleanup
      animationId = result.animationId;
      sceneAlreadyCreated = true;
    } catch (error) {
      console.error("Error executing Three.js code:", error);
      alert(`Error rendering the scene: ${error.message}`);
    }
  }

  // Handle window resize events
  function handleResize() {
    if (sceneAlreadyCreated && renderer && camera) {
      const width = canvasContainer.clientWidth;
      const height = canvasContainer.clientHeight;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    }
  }

  // Copy generated code to clipboard
  function handleCopyCode() {
    if (!currentCode) {
      alert("No code to copy yet.");
      return;
    }

    navigator.clipboard
      .writeText(currentCode)
      .then(() => {
        // Show temporary success message
        const originalText = copyBtn.textContent;
        copyBtn.textContent = "Copied!";
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      })
      .catch((err) => {
        console.error("Error copying code:", err);
        alert("Failed to copy code to clipboard.");
      });
  }

  // Show loading indicator
  function showLoading() {
    loadingIndicator.style.display = "flex";
    generateBtn.disabled = true;
    if (modifyBtn) modifyBtn.disabled = true;
  }

  // Hide loading indicator
  function hideLoading() {
    loadingIndicator.style.display = "none";
    generateBtn.disabled = false;
    if (modifyBtn) modifyBtn.disabled = false;
  }

  // Set code display
  function setCodeDisplay(code) {
    codeDisplay.textContent = code;
  }

  // Initialize the application
  initialize();
});
