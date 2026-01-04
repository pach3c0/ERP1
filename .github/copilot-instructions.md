# ERP Agent MVP - Copilot Instructions

## Architecture Overview

**Stack:** FastAPI (Python) backend + React/Vite (TypeScript) frontend + PostgreSQL in Docker Compose.

**Key Pattern:** Modular router architecture (`backend/routers/`) where each domain (auth, users, customers, feed, websockets) is isolated with its own file. All models use SQLModel (Pydantic + SQLAlchemy hybrid).

**Critical Data Flow:**
1. Frontend sends requests to `/api/*` endpoints
2. Auth via JWT tokens (issued by `/auth/login`, decoded in `dependencies.py`)
3. RBAC enforced via `get_current_user()` dependency + role-based permissions stored as JSON in `Role.permissions`
4. Real-time updates via WebSocket at `/ws` with token validation
5. Auditlog captures all critical changes (`AuditLog` model in database)

---

## Essential Setup & Commands

**Docker startup** (rebuilds if dependencies changed):
```bash
docker-compose up --build
```

**Database reset** (clears everything, recreates seed data):
```bash
python3 reset_erp.py
```

**Access points:**
- Frontend: `http://localhost:5173`
- Backend API docs: `http://localhost:8000/docs`

**Default credentials** (from `reset_erp.py`):
- Admin: `pacheco@rhynoproject.com.br` / `123`
- Manager: `gerente@erp.com` / `123`

---

## Critical Code Patterns

### Auth & Permissions
- **Token generation:** `security.create_access_token({"sub": email, "role": slug})`
- **User retrieval:** Always use `dependencies.get_current_user()` as a route dependency - it includes eager loading of role relationship via `selectinload(User.role)`
- **Role check:** Access `current_user.role.permissions` (dict) to check flags like `"customer_require_approval"`, `"can_edit_own_customers"`, etc.
- **Important gotcha:** Imports inside dependency functions (like `from models import Role` in `get_user_role_slug()`) are intentional - prevents circular import issues

### Database Models
- All models inherit from `BaseModel` which adds `id`, `created_at`, `updated_at` 
- Use `Field(default={}, sa_column=Column(JSON))` for JSON permission dicts
- Relationships use `Relationship()` with explicit `link_model` for many-to-many (see `User.supervisors`/`User.monitoring`)
- **Foreign keys:** Always use string format `foreign_key="table.column"` (e.g., `foreign_key="role.id"`)

### WebSocket Real-Time
- All WebSocket connections validated via JWT token in query param: `/ws?token={token}`
- Connection manager in `connection_manager.py` maintains active connections per user_id
- Broadcast notifications via `manager.broadcast()` - triggers `'erp-notification'` custom events in React components
- Frontend Layout.tsx establishes global WebSocket connection once per session
- **Heartbeat/reconnection:** Implemented in Layout.tsx - automatically reconnects on disconnect

### Audit Logging
- `AuditLog` model captures: `table_name`, `action` (create/update/delete), `user_id`, `changes` (JSON dict of before/after), `created_at`
- Always log critical operations in route handlers using `create_audit_log()` utility (see customers.py pattern)
- Visibility: Admin + managers can view audit trail via `/audit/` routes

### Customer Workflow
- Customers can be created as `"ativo"` (active) or `"pendente"` (pending approval) based on role permissions
- Vendedor (sales) role has `"customer_require_approval": true` - new customers default to pending
- Gerente/Admin can change status without approval
- Timeline: `CustomerNote` model stores messages + tasks with types ('message', 'task') and task_status ('open', 'completed', etc.)

---

## Development Workflow

1. **Adding a new router:**
   - Create file in `backend/routers/new_domain.py`
   - Define routes with `APIRouter(prefix="/new_domain", tags=["domain"])`
   - Import and include in `backend/main.py` in the app initialization
   - Use `get_current_user` dependency to enforce auth
   
2. **Adding models:**
   - Define in `backend/models.py` inheriting from `BaseModel`
   - Create Pydantic schemas in `backend/schemas.py` for request/response validation
   - Use `@field_validator` for custom validation (e.g., CPF/CNPJ validation via `validate_docbr`)

3. **Frontend components:**
   - Auth state stored in localStorage: `token`, `role`, `user_name`, `user_email`
   - Use `api.ts` (axios instance) for all HTTP calls - it auto-adds Authorization header
   - Subscribe to `'erp-notification'` event in components that need real-time updates (see Layout.tsx pattern)

4. **Testing locally:**
   - After backend changes, endpoint docs auto-refresh at `/docs`
   - Use FastAPI's built-in test client or curl for manual testing
   - For database issues, run `reset_erp.py` to start fresh

---

## Phase 2 Focus: Products & Services (Current Roadmap)

When implementing the products module:
1. Add `Product` and `Service` models with fields: name, description, price_base, cost, category, status
2. Create `backend/routers/products.py` following existing patterns (CRUD endpoints, auth via `get_current_user`)
3. Ensure all create/update operations log to `AuditLog`
4. Frontend: Create list view + form component, trigger notifications on product changes via WebSocket
5. Broadcast product updates to all connected clients: `manager.broadcast({"type": "product_updated", "product_id": id})`

---

## Common Gotchas & Avoid Patterns

- **Circular imports:** Use lazy imports inside functions when needed (see `dependencies.py`)
- **Session management:** Always use `Depends(get_session)` as route parameter - don't create sessions manually
- **WebSocket auth:** Token MUST be in query param, not header (WebSocket API limitation)
- **Docker dependencies:** Backend waits for Postgres healthcheck via `depends_on.db.condition: service_healthy`
- **Inactivity logout:** Frontend monitors 10-minute inactivity and logs out automatically (see App.tsx)

---

## File Navigation Quick Reference

- **Auth flow:** `security.py` (hash/verify) → `auth.py` (login endpoint) → `dependencies.py` (token validation)
- **User hierarchy:** `models.User` with many-to-many `supervisors`/`monitoring`
- **Real-time:** `connection_manager.py` (manager class) ↔ `websockets.py` (endpoint) ↔ `Layout.tsx` (client)
- **Audit trail:** `models.AuditLog` ← logged by routers → viewed via `audit.py`
