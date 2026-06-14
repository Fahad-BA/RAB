# Agent Roadmap

## 0) Product Definition
- **الهدف:** بناء Digital Twin شخصي يدير الشغل اليومي، البحث، الإيميلات، GitHub، وأوامر الهوم لاب
- **المبدأ:** Full-Auto داخل بيئة البيت، مع Privileged Access مضبوط وآمن
- **الواجهة الأساسية:** Telegram
- **النواة:** FastAPI Orchestrator + Tool Registry + Task Queue + Memory Layer

## 1) Foundation
- **Orchestrator Service**
  - FastAPI app كخدمة systemd
  - Config عبر .env
  - Health checks و readiness endpoints
- **Telegram Hook**
  - استقبال الرسائل
  - routing للأوامر
  - reply formatting
- **Panic Logging**
  - error alerts مباشرة إلى Telegram
  - structured logs
  - separate log levels
- **Secure Exposure**
  - Cloudflare Tunnel
  - private admin access فقط
  - no public shell exposure
- **Basic State**
  - session state
  - per-user context
  - last task tracking

## 2) Tool System
- **Tool Registry**
  - تعريف الأدوات كـ plugins
  - metadata لكل أداة
  - permission scope لكل tool
- **Function Calling Layer**
  - LLM decides tool usage
  - tool schema validation
  - retry strategy for failed calls
- **Core Tools**
  - search tool
  - filesystem inspection tool
  - GitHub operations tool
  - email tool
  - homelab control tool
- **Execution Model**
  - quick tasks sync
  - heavy tasks async عبر queue
  - idempotent operations

## 3) Environment Discovery
- **Filesystem Discovery**
  - scan folders
  - detect projects
  - read repo metadata
- **Runtime Discovery**
  - list systemd services
  - list docker containers
  - inspect ports and health
- **GitHub Awareness**
  - map local repos to remote repos
  - detect branches
  - detect open PRs/issues
- **Infrastructure Map**
  - services registry
  - dependency graph
  - environment inventory

## 4) Email Intelligence
- **Account Strategy**
  - connect 5 accounts
  - lazy loading by sender/subject first
- **Inbox Workflow**
  - classify emails by priority
  - extract action items
  - draft replies
- **Multi-Account Handling**
  - account-aware routing
  - account-specific signatures
  - explicit source selection
- **Safety Rules**
  - never send without confirmation unless explicitly allowed
  - draft first, execute later
  - log every outbound action

## 5) GitHub Ops
- **PR Review Assistant**
  - summarize changes
  - flag risks
  - suggest review comments
- **Issue Tracking**
  - detect stale issues
  - classify by priority
  - link issues to projects
- **Repo Ops**
  - branch awareness
  - release note extraction
  - changelog drafting
- **Collaboration Layer**
  - assign reviewers
  - prepare status updates
  - keep notes per repo

## 6) Memory Layer
- **Short-Term Memory**
  - recent tasks
  - current session facts
  - working assumptions
- **Long-Term Memory**
  - vector DB or ChromaDB
  - user preferences
  - recurring projects
- **Memory Policy**
  - store only useful facts
  - avoid noise
  - tag by domain
- **Retrieval**
  - semantic lookup
  - project-based recall
  - people and preference recall

## 7) Self-Healing
- **Log Monitoring**
  - watch for crashes
  - detect repeated failures
  - auto-alert
- **Restart Logic**
  - restart systemd services
  - requeue failed jobs
  - fallback to safe mode
- **Drift Detection**
  - config changes
  - broken integrations
  - stale tokens
- **Recovery Playbooks**
  - known failure patterns
  - automatic mitigation steps
  - manual override mode

## 8) UI Layer
- **Telegram First**
  - chat commands
  - task status
  - quick confirmations
- **Web Dashboard**
  - React or Next.js
  - live task monitor
  - logs and metrics
  - tool registry view
- **Admin Views**
  - connected accounts
  - integrations health
  - queue status
- **UX Goal**
  - clean
  - minimal
  - fakhama
  - no qarousha

## 9) Security
- **Secrets Management**
  - env vars for local dev
  - vault or encrypted storage for production
- **Access Control**
  - admin-only commands
  - tool-level permissions
  - audit trail
- **Network Security**
  - Cloudflare Tunnel
  - no direct exposure of sensitive services
- **Action Safety**
  - confirmation gates for destructive ops
  - dry-run support
  - rollback where possible

## 10) Deployment
- **Local Dev**
  - FastAPI app
  - Redis
  - worker process
- **Production**
  - systemd units
  - restart on failure
  - log rotation
- **Observability**
  - metrics
  - traces
  - structured logs
- **Backup**
  - config backup
  - memory backup
  - repo state backup

## 11) Phase Order
- **Phase 1:** Orchestrator, Telegram, Panic Logs, systemd, Tunnel
- **Phase 2:** Tool Registry, Function Calling, Redis Queue, Discovery Tool
- **Phase 3:** Email, GitHub Ops, Multi-account routing, Draft workflows
- **Phase 4:** Memory, Self-Healing, Monitoring, Recovery
- **Phase 5:** Web Dashboard, polish, governance, scale

## 12) MVP Definition
- Receive Telegram messages
- Route to correct tool
- Inspect homelab environment
- Read GitHub repo state
- Summarize inbox items
- Draft actions instead of executing risky ones
- Alert on failures
- Run reliably as a 24/7 service

## 13) Success Criteria
- One message in, one clear action out
- No fragmented workflows
- No manual babysitting
- Reliable under restart
- Easy to extend with new tools
- Feels like an actual personal operating system