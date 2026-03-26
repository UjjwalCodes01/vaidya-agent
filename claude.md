Vaidya-Agent Instruction Manual

@AGENTS.md

🏥 Project Vision
Vaidya-Agent is an autonomous healthcare triage and coordination system designed for the Northern India corridor. It bridges the accessibility gap between rural populations and urban medical hubs (Noida/Lucknow) by integrating Gemini 2.5 Pro reasoning with India's ABDM (Ayushman Bharat Digital Mission) and UHI (Unified Health Interface) protocols.

🛠 Tech Stack
Frontend: Next.js 16 (App Router), deployed on Vercel.

Reasoning Engine: Gemini 2.5 Pro (via Vertex AI) for complex diagnostic thinking.

Agent Orchestration: Vertex AI Agent Builder (Coordinator Pattern).

Backend/Tools: GCP Cloud Functions (Python), Node.js Tool-calling.

Database: Firestore for session memory and patient context.

Protocols: ABDM Milestone M1 (Registration), M2 (HIP), M3 (Consent), and UHI (Discovery/Booking).

📋 Hackathon Sprint Phases (24 Hours)
Phase 1: Foundation (Hours 0-4)
Initialize Next.js 16 with create-next-app@canary.

Setup GCP project and enable Vertex AI / ABDM Sandbox APIs.

Configure Vercel Environment Variables (Base64 Service Account Keys).

Phase 2: Knowledge & Triage (Hours 4-10)
Build RAG pipeline in Vertex AI using Indian Clinical Guidelines (Dengue, TB, Maternal Health).

Implement Web Audio API in Next.js for voice-first dialect interaction.

Phase 3: The "Action" Loop (Hours 10-18)
Implement Tool-calling for ABDM M1/M2 (Patient/Facility discovery).

Integrate UHI booking logic via Cloud Functions.

Develop the Milestone M3 Consent Manager flow.

Phase 4: Refinement & Demo (Hours 18-24)
Enable Next.js MCP Server for real-time debugging.

Generate reasoning logs for judge walkthroughs.

Final Vercel Deployment & Security Audit via SCC.

💻 Critical Commands
Dev Server: npm run dev (Connects to Next-DevTools-MCP)

Build/Test: npm run build && npm run typecheck

GCP Tool Deploy: gcloud functions deploy [name] --runtime python311

Vercel Deploy: vercel --prod

Agent Eval: python scripts/evaluate_triage.py

📐 Architectural Decisions
Modularity: Use the Coordinator Pattern. One agent handles UI/Dialog; sub-agents handle ABDM Registry and UHI Fulfillment.

Data Sovereignty: All health data transfer MUST use FHIR-based exchange and require ABHA-linked OTP verification (Milestone M3).

Grounding: Use Grounding with Google Maps in Vertex AI to physically locate the nearest Primary Health Center (PHC).

Thinking: Use Gemini 2.5 Pro's native <thinking> tags to provide a transparent reasoning trace for doctors.

🎨 Code Style Rules
Modules: Use ES Modules and named exports.

Next.js 16: Prefer use cache components and connection() for dynamic data.

Safety: Never hardcode Client IDs; use process.env.

Validation: Use zod for all tool input schemas.

🚨 Security Guardrails
SCC: Enable Agent Engine Threat Detection in GCP.

PII: All patient data must be encrypted at rest in Firestore.

Safety: If the agent identifies a high-severity symptom (e.g., severe hemorrhage), it MUST immediately trigger an emergency "Red Alert" tool to bypass triage.

Key Features Included:
@AGENTS.md Import: Tells Claude Code to read the version-matched Next.js documentation bundled in your project.

MCP Integration: Commands and notes for the Next.js MCP Server, which allows the AI to see your running application state during the hackathon.

ABDM Compliance: Explicit instructions for Milestones M1, M2, and M3 to ensure you score points for regulatory alignment.

Thinking Model: Optimized for Gemini 2.5 Pro, emphasizing its unique adaptive thinking and reasoning capabilities.