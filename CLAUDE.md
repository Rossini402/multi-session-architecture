# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Nature

This repo contains **design documentation only** — there is no source code, no `package.json`, and no build/test/lint commands. It specifies an architecture for orchestrating multiple parallel Claude Code sessions and is intended to be implemented inside a *target* project (the docs use a blog-platform monorepo as the worked example).

Do not invent build/run commands. If a task involves implementation, ask whether to scaffold inside this repo or treat it as design-only.

## Document Map

The five docs are layered, not parallel. Read them in this order when you need full context:

1. `docs/multi-session-architecture.md` — v1.0 baseline. Defines the **Coordinator → independent sessions → file-system state store** model, the `agent-states/` directory layout (`contracts/`, `outputs/`, `signals/`, `locks/`, `logs/`, …), and the pull/push/hybrid sync strategies. The hybrid model (state file + signal file) is the recommended one.
2. `docs/multi-session-architecture-enhanced.md` — v2.0, **the current design**. Adds the **Checkpoint protocol** (`checkpoint:human-verify` ~90% / `checkpoint:decision` ~9% / `checkpoint:human-action` ~1%) and a "deviation handling" + TDD flow inspired by GSD. **Golden rule: if Claude can automate it, it must automate it — checkpoints are for verification/decision, never for manual work.** Prefer v2 over v1 when they conflict.
3. `docs/agent-protocol.md` — Wire format for inter-agent JSON output (`agent`, `phase`, `outputs`, `dependencies`, `provides`, `status`, `blockers`). Agents declare dependencies explicitly; conflicts on shared files escalate to the main agent for three-way merge or to the user.
4. `docs/blog-platform-multi-session-architecture.md` — Applied case study: how the architecture is used to ship the blog platform end-to-end across `domain-modeler`, `api-designer`, `backend-developer`, `frontend-developer` agents.
5. `docs/api-contract.md` — Concrete API contract for the blog-platform example (JWT auth, unified `{success, data|error}` envelope, paginated list shape). Useful as a reference shape for any contract artifact an agent produces; not normative for the architecture itself.

## Core Architectural Invariants

When editing the design docs (or producing artifacts the design expects), preserve these invariants:

- **State store is file-system based** under `agent-states/`. Sessions communicate by writing `outputs/{session-id}.json` and touching `signals/{session-id}.done`; the coordinator polls signals and reads outputs. Do not propose Redis/SQLite/HTTP as the *primary* channel — they're listed as alternatives but the recommended scheme is pure FS.
- **Session output schema** is normative and fully specified in `multi-session-architecture.md` §"会话输出格式" and Appendix A (JSON Schema). Any new field must be added there, including allowed enum values (`status`, `agent_type`, `self_check`).
- **Dependency graph drives execution batches.** Agents without dependencies run in parallel; downstream agents only start once all `requires` are satisfied. The coordinator config in `coordinator-config.json` is the source of truth for this graph.
- **Conflicts have typed resolutions.** `type_mismatch` → update domain model; `file_conflict` → manual merge; priority order is `backend > frontend > contract` per the config.
- **Checkpoint, not handoff.** A checkpoint is a structured pause emitting a signal file; it must not be used to delegate work Claude could have done.

## SESSION.md Convention

`SESSION.md` is itself an artifact *produced by* the methodology — it's the session-handoff log the architecture prescribes (current status, modified-but-uncommitted files, open issues, next steps, decision records). Treat it as a living document: when you complete meaningful work in a session that uses this methodology, update it rather than appending narrative elsewhere.

Note: the workspace path inside `SESSION.md` (`/Users/yichen/Desktop/yichen-Toys/my`) refers to the *target project* the methodology was applied to, **not this repository**. Don't try to `cd` into it.

## Naming Conventions (from SESSION.md, normative for example artifacts)

- Entity types: bare nouns — `User`, `Post`
- Input types: `XxxInput` — `CreatePostInput`
- Response DTOs: `XxxResponse` — `PostResponse`
- Zod request/response schemas: `xxxRequestSchema` / `xxxApiResponseSchema`; types inferred from schemas use `XxxRequest` / `XxxApiResponse` (the `Api` infix disambiguates from the entity-side `XxxResponse`)

## Editing Guidance

- The docs are in Mandarin Chinese; match the existing language and tone when editing. Mermaid-style ASCII diagrams are used throughout — keep box widths aligned.
- When v1 and v2 disagree, update v2 (`-enhanced.md`) and call out the divergence; don't silently mutate v1.
- The `agent-states/` tree, `scripts/` tree, and `packages/` tree shown in the docs are *prescriptions for the target project*, not files that should exist here. Don't create them in this repo unless explicitly asked.
