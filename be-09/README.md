# AI Decision Flow - Visual Workflow System (BE-09)

> **Track**: Backend AI Engineering · **Assignment**: BE-09 · **Workload**: 2h · **Phase**: Build+

A full-stack, visual AI decision workflow system where each node represents an AI decision step that evaluates inputs and returns strictly **YES** or **NO**. Workflow execution runs through **Inngest** step functions, while the frontend visualizes the execution flow in real time using **React Flow** (`@xyflow/react`).

---

## 🌟 Key Features

### Phase 1: Infrastructure & Setup
- **Framework**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Workflow Engine**: Inngest SDK integration with `/api/inngest` API endpoint and `workflow/execute` step functions.
- **LLM Integration**: Official `openai` SDK with structured JSON decision output and smart zero-setup fallback evaluator.

### Phase 2: Visual Foundations
- **React Flow Canvas**: Drag-and-drop workflow canvas with custom nodes and edges.
- **AI Decision Node**: Custom node featuring dedicated **YES** (Green) and **NO** (Rose) output handles.
- **Node Inspector**: Slide-over drawer to inspect/edit prompts, system guardrails, and run isolated prompt tests.
- **Local Persistence**: State syncing with preset templates and JSON export/import.

### Phase 3: Core Workflow Execution Engine
- **Inngest Step Execution**: Each decision node maps to an Inngest `step.run` call.
- **Strict Binary Branching**: LLM is constrained to return strictly `YES` or `NO` with 1-2 sentence logical reasoning.
- **Graph Traversal**: Dynamic path traversal along matching outgoing handles based on AI output.

### Phase 4: DX & Visual Polish
- **Visual Execution Glows**: Dynamic node states (`idle`, `running`, `passed_yes`, `passed_no`, `failed`).
- **Animated Active Edges**: Flowing particle SVG path animations along the active execution route.
- **Real-Time Step Logs**: Timeline panel displaying evaluated prompts, decisions, reasoning, latencies, and history.
- **Preset Workflows**: Pre-configured templates:
  1. *Customer Support vs Sales Router*
  2. *Spam & Security Content Moderator*
  3. *Lead Qualification & Prioritization Flow*

---

## 🛠️ Getting Started

### 1. Prerequisites
- Node.js `v18.x` or higher
- npm `v9.x` or higher

### 2. Installation

Clone the repository and install dependencies:

```bash
npm install
```

### 3. Environment Setup

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Set your environment variables in `.env.local`:

```env
# Optional: Provide OpenAI API Key (or leave blank to use the smart built-in heuristic fallback engine)
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1

# Inngest Local Configuration
INNGEST_DEV=1
INNGEST_EVENT_KEY=dev
INNGEST_SIGNING_KEY=dev
```

### 4. Running Next.js App

Start the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### 5. Running Inngest Dev Server

To launch the Inngest Dev Server to inspect function steps, event bus dispatches, and step logs:

```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

Open the Inngest Dev Dashboard at [http://localhost:8288](http://localhost:8288).

---

## 📁 Project Structure

```
.
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── inngest/route.ts        # Inngest serve handler endpoint
│   │   │   └── workflow/execute/route.ts # Workflow execution trigger API
│   │   ├── globals.css                # Custom theme & glow animations
│   │   ├── layout.tsx                 # Root layout with metadata
│   │   └── page.tsx                   # Main AI Decision Flow Studio app
│   ├── components/
│   │   ├── editor/
│   │   │   ├── ExecuteModal.tsx       # Run workflow trigger & input presets
│   │   │   ├── FlowCanvas.tsx         # React Flow canvas wrapper
│   │   │   ├── HeaderToolbar.tsx      # Templates, JSON import/export, controls
│   │   │   ├── LogsPanel.tsx          # Step timeline, history & Inngest trace
│   │   │   └── NodeInspector.tsx      # Sidebar node prompt editor & test bench
│   │   ├── edges/
│   │   │   └── CustomDecisionEdge.tsx # YES/NO custom edges with particle animation
│   │   └── nodes/
│   │       ├── ActionNode.tsx         # Terminal workflow outcome node
│   │       ├── AIDecisionNode.tsx     # Custom AI node with dual YES/NO handles
│   │       └── StartNode.tsx          # Workflow payload entry node
│   ├── inngest/
│   │   ├── client.ts                  # Inngest client initialization
│   │   └── functions.ts               # Inngest workflow graph execution function
│   ├── lib/
│   │   ├── llm.ts                     # OpenAI SDK decision call & heuristic fallback
│   │   ├── templates.ts               # Preset workflow graph templates
│   │   └── utils.ts                   # Class merging & helper utilities
│   └── types/
│       └── workflow.ts                # TypeScript interfaces for nodes/edges/logs
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── README.md
```

---

## 🧪 Verification & Testing

1. **Build Verification**: Run `npm run build` to verify clean TypeScript compilation.
2. **Visual Flow Testing**: Drag and drop nodes, edit prompts in the inspector, connect YES and NO paths.
3. **Execution Test**: Click **Run Workflow**, choose a sample input (e.g. *Technical Support Bug*), and observe the node glowing borders, animated edges, and step timeline.
4. **JSON Import/Export**: Export your flow to `.json` file and re-import to test full graph state hydration.
