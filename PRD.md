**Cursor PRD: AmanDate**
**1. Project Overview**
AmanDate is an internal, LAN-hosted networking and matchmaking application for organization members. Users can create profiles, view other members based on preferences, and swipe to express interest. When a mutual opt-in (match) occurs, the system generates a direct link to the organization's internal chat service (e.g., Slack) for seamless communication.

This document defines the **MVP** scope:

- Internal-only deployment on the organization's LAN; no public sign-up or external accounts.
- Slack is the primary supported chat platform for deep links in the MVP. Support for additional platforms (e.g., Microsoft Teams, Matrix) is explicitly out of scope for the first release.

Out of scope for the MVP (but potential future work):

- Native mobile applications.
- In-app real-time chat or messaging; all conversations happen in the external chat platform.
- Push or email notifications, or calendar integrations.
- Advanced matching algorithms beyond simple mutual likes.

**2. Tech Stack Definitions**
- Frontend: React (Vite), TypeScript, Tailwind CSS. Target Node.js 20+ and modern evergreen browsers.
- UI Library: shadcn/ui (for rapid, accessible, and clean component generation), Lucide React (icons), Framer Motion (for swipe animations).
- Backend: FastAPI (Python), Pydantic (data validation), SQLAlchemy (ORM), Alembic (database migrations).
- Database: PostgreSQL 15+.
- Infrastructure: Docker & Docker Compose (for easy packaging and deploying on the organization's local LAN/servers).
- Testing: `pytest` (backend), `httpx` or equivalent for API tests, and `vitest` + `@testing-library/react` (frontend).

**3. Core User Flows**

High level: a user authenticates via a trusted internal mechanism, creates or updates their profile, discovers other active members, swipes on them, and receives matches with deep links to the chat platform.

- **Authentication & Session**
  - For the MVP, assume a simple LAN/SSO-backed auth layer or mock login; the app receives a stable internal user identifier and (optionally) a Slack user ID.
  - On first login, if no profile exists for the authenticated user, the system prompts them to create one.
  - Authentication implementation details (SSO provider, reverse proxy, etc.) are considered infrastructure concerns and are out of scope for this PRD.

- **Onboarding & Profile Management**
  - User creates a profile with: name, bio, profile picture URL, department (optional), and `chat_id` (required for deep links).
  - User can later update profile fields (edit name, bio, photo_url, department). `chat_id` can be updated if their chat handle changes.
  - Soft deletion/deactivation may be supported via an `is_active` flag; deactivated users do not appear in discovery and cannot be swiped on.

- **Discovery (The Stack)**
  - User sees a stack/list of candidate profiles filtered to:
    - Exclude themselves.
    - Exclude users they have already swiped on.
    - Exclude inactive users (if `is_active = false`).
  - The API returns results in pages/batches (e.g., up to 20 profiles at a time).
  - Empty state: when no more candidates are available, the UI shows a friendly message (e.g., "You're all caught up") and may suggest checking back later.
  - Simple rate-limiting (e.g., max swipes per minute) can be enforced at the API or gateway level; exact limits can be tuned per deployment.

- **Swiping & Matching**
  - For each candidate, the user can swipe right (Like) or left (Pass) via gesture or explicit buttons.
  - A swipe record is stored for every action.
  - When a right-swipe is recorded, the system checks whether the other user has already right-swiped back:
    - If not, only the swipe is stored.
    - If yes, a Match is created for the pair if one does not already exist.
  - Matching logic must avoid duplicate matches for the same user pair.

- **Match Resolution & Notifications**
  - When a new match is created as the result of a swipe, the API returns `matched: true` along with minimal details about the match and the other user, including their `chat_id` so the client can construct the deep link.
  - The frontend displays an "It's a Match!" modal with the chat deep link.
  - Users can view an aggregated list of all their matches at any time via the Matches view/sidebar.
  - No out-of-app notifications (email, push, etc.) are sent in the MVP.

- **Error & Edge Cases**
  - User cannot swipe on themselves.
  - Users cannot swipe on profiles that are deactivated or missing a valid `chat_id`.
  - Concurrent swipes should still result in at most one match record per unique pair.
  - API should return clear errors for invalid input (e.g., unknown user IDs, invalid swipe direction).

**4. Database Schema (PostgreSQL)**
Cursor should use SQLAlchemy to implement these models, with Alembic managing migrations.

users table:

- id (UUID, primary key)
- name (String, required)
- bio (Text)
- photo_url (String)
- chat_id (String - e.g., Slack user ID, required for the deep link, **unique**)
- department (String, optional)
- is_active (Boolean, default `true`; controls whether the user appears in discovery and can be swiped on)
- last_active_at (Timestamp, nullable; updated when the user interacts with the app)
- created_at (Timestamp, default to current timestamp)

Indexes / constraints:

- Unique constraint on `chat_id`.
- Index on `department` for simple filtering/grouping.
- Index on `created_at` and/or `last_active_at` for ordering and housekeeping.

swipes table:

- id (UUID, primary key)
- swiper_id (UUID, foreign key -> users.id)
- swiped_id (UUID, foreign key -> users.id)
- direction (Enum: 'right', 'left')
- created_at (Timestamp)

Indexes / constraints:

- Unique constraint on `(swiper_id, swiped_id)` to prevent duplicate swipes in the same direction set.
- Index on `(swiper_id, created_at)` to efficiently query recent swipes for a user.

matches table:

- id (UUID, primary key)
- user1_id (UUID, foreign key -> users.id)
- user2_id (UUID, foreign key -> users.id)
- created_at (Timestamp)
- chat_thread_url or chat_thread_id (String, optional; reserved for potential future integration that auto-creates a dedicated chat or thread).

Indexes / constraints:

- Enforce a canonical ordering (e.g., always store the lower UUID in `user1_id` and the higher in `user2_id`).
- Unique constraint on `(user1_id, user2_id)` so there is at most one match record per pair.

High-level relationships:

- A user can have many swipes (as swiper and as swiped).
- A user can belong to many matches; each match links exactly two users.

**5. Backend API Endpoints (FastAPI)**

All endpoints are JSON-based and are expected to be called from a trusted internal frontend. Authentication/authorization is handled by infrastructure (e.g., reverse proxy, SSO) and expressed to the app as a trusted `user_id` and/or token; detailed auth flows are out of scope for this PRD.

- `POST /api/users`
  - **Description**: Create a new user profile.
  - **Request body** (Pydantic `UserCreate`):
    - `name`, `bio`, `photo_url`, `department` (optional), `chat_id` (required).
  - **Responses**:
    - `201 Created` with the created `User` object.
    - `400 Bad Request` for validation errors (e.g., missing `chat_id`).
    - `409 Conflict` if a profile already exists for the authenticated user or `chat_id` is not unique.

- `GET /api/users/{user_id}`
  - **Description**: Fetch a single user profile by ID.
  - **Responses**:
    - `200 OK` with `User` object.
    - `404 Not Found` if the user does not exist.

- `PUT /api/users/{user_id}`
  - **Description**: Update an existing user profile.
  - **Request body** (Pydantic `UserUpdate`): partial updates for `name`, `bio`, `photo_url`, `department`, `chat_id`.
  - **Responses**:
    - `200 OK` with updated `User` object.
    - `400 Bad Request` for invalid fields.
    - `404 Not Found` if the user does not exist.
    - `409 Conflict` if updating `chat_id` violates uniqueness.

- `POST /api/users/{user_id}/deactivate` (optional for MVP)
  - **Description**: Soft-deactivate a user (set `is_active = false`); deactivated users are hidden from discovery and cannot be swiped on.
  - **Responses**:
    - `200 OK` with updated `User` object.
    - `404 Not Found` if the user does not exist.

- `GET /api/discovery/{user_id}`
  - **Description**: Fetch a list of candidate users the current user has not yet swiped on.
  - **Query params**:
    - `limit` (int, optional; default 20, max 50).
    - `offset` (int, optional) or a simple cursor token (implementation detail).
  - **Behavior**:
    - Exclude the requesting user.
    - Exclude users already swiped on by the requester.
    - Exclude users with `is_active = false` or missing `chat_id`.
  - **Responses**:
    - `200 OK` with a list of lightweight user cards (id, name, department, photo_url).
    - `200 OK` with an empty list when there are no more candidates.

- `POST /api/swipe`
  - **Description**: Record a swipe and optionally create a match.
  - **Request body** (Pydantic `SwipeRequest`):
    - `swiper_id`, `swiped_id`, `direction` (`'right'` or `'left'`).
  - **Behavior**:
    - Persist a swipe record.
    - If `direction == 'right'`, check for an existing right-swipe in the opposite direction.
    - If a mutual right-swipe exists and no match record exists yet, create a new match.
  - **Responses** (Pydantic `SwipeResult`):
    - `200 OK` with:
      - `matched: false` if no mutual match yet.
      - `matched: true` plus `match` object and minimal data about the other user (name, photo_url, `chat_id`) if a new or existing match is present.
    - `400 Bad Request` for invalid direction or invalid IDs.
    - `404 Not Found` if either user does not exist.

- `GET /api/matches/{user_id}`
  - **Description**: Return all matches for a user.
  - **Behavior**:
    - Return a list of matches sorted by `created_at` descending.
    - For each match, include the other user's minimal profile (id, name, department, photo_url, `chat_id`) to construct deep links.
  - **Responses**:
    - `200 OK` with a list of match records (possibly empty).
    - `404 Not Found` only if the user does not exist.

**6. Frontend UX & Components (React / shadcn/ui)**
Cursor should utilize the `npx shadcn-ui@latest add [component]` command to generate base components, then compose them into pages and layouts.

- **Onboarding / Profile page**
  - Layout: centered `Card` containing a form for `name`, `bio`, `photo_url`, `department`, and `chat_id`.
  - Components: `Card`, `CardHeader`, `CardContent`, `Input`, `Textarea`, `Select` (for department), `Button`, `Avatar` preview.
  - Behavior: client-side validation, inline error messages, disabled state while submitting, success `Toast` on save.

- **Swipe page (Discovery)**
  - Layout: main `Card` stack in the center with explicit Pass/Like buttons beneath; optional sidebar showing condensed matches list on desktop.
  - Components: `Card`, `CardContent`, `Button` (X / Heart icons via Lucide), Framer Motion for drag gestures (`drag`, `dragConstraints`, `dragElastic`, `onDragEnd`).
  - States:
    - Loading state: skeleton or spinner while fetching discovery candidates.
    - Empty state: illustration/text when there are no more profiles to swipe.
    - Error state: inline error with retry button and/or `Toast`.

- **Matches page / sidebar**
  - Layout: list of matches with `Avatar`, name, department, and a primary "Open chat" action for each match.
  - Components: `Avatar`, `Button` or `Link`, list components.
  - Behavior: clicking "Open chat" opens the Slack (or configured chat) deep link in a new tab/window or external app.

- **Match modal**
  - Components: `Dialog` / `Modal` triggered when `matched: true` is returned from the swipe API.
  - Content: both users' avatars and names, short confirmation copy, and a prominent "Message on Slack" button using the deep link.

- **Global UI considerations**
  - Use `Toast` for subtle notifications (e.g., "Profile updated", "Error saving swipe").
  - Ensure layouts are mobile-first; on smaller screens, collapse sidebars into navigable views and make the swipe card full-width within safe margins.
  - Basic theming (light/dark) can be provided via Tailwind and shadcn/ui tokens; detailed brand theming is out of scope.

**7. Implementation Phases (For Cursor Prompts)**
Phase 1: Backend & DB scaffolding

- Initialize FastAPI and PostgreSQL via Docker Compose.
- Configure Alembic and create an initial migration that sets up the `users`, `swipes`, and `matches` tables.
- Implement a simple `/health` endpoint that verifies DB connectivity.
- **Acceptance criteria**: `docker compose up` starts the API and database; `/health` returns `200 OK` and confirms the database is reachable.

Phase 2: Core API logic

- Implement SQLAlchemy models and Pydantic schemas for users, swipes, and matches.
- Implement `POST /api/users`, `GET /api/users/{user_id}`, `PUT /api/users/{user_id}`, optional `POST /api/users/{user_id}/deactivate`.
- Implement `GET /api/discovery/{user_id}` with basic pagination and filtering rules.
- Implement `POST /api/swipe` and `GET /api/matches/{user_id}` with correct matching behavior.
- Add backend tests (e.g., with `pytest` and `httpx`) covering the main flows: profile creation, discovery, swipe, mutual match, and match listing.
- **Acceptance criteria**: automated tests pass; manual API calls support creating a user, discovering candidates, swiping, and seeing matches.

Phase 3: Frontend scaffolding & API integration

- Initialize Vite React app and install Tailwind CSS + shadcn/ui.
- Set up routing (e.g., `react-router`) for Profile, Swipe, and Matches views.
- Implement an API client layer (e.g., using `fetch` or Axios) with typed response models.
- Build the user profile creation/edit form and wire it to the `/api/users` endpoints.
- **Acceptance criteria**: A user can load the app, create/update their profile via the UI, and see persisted changes after refresh.

Phase 4: Swipe UI

- Implement the card deck UI using shadcn `Card` components and Framer Motion drag gestures.
- Integrate the deck with `GET /api/discovery/{user_id}` and `POST /api/swipe`.
- Handle loading, empty, and error states.
- **Acceptance criteria**: A user can swipe through available profiles, and swipes are persisted and reflected in subsequent discovery results.

Phase 5: Match resolution & matches view

- Implement the "It's a Match!" modal triggered on `matched: true`.
- Implement the matches list/sidebar view backed by `GET /api/matches/{user_id}`.
- Implement deep link generation to Slack (or configured chat platform) using `chat_id` and environment-specific parameters.
- **Acceptance criteria**: When a mutual like occurs, both the modal and the matches list reflect the match, and the deep link opens the configured chat app.

Phase 6 (optional): Admin / debug tools

- Implement a simple, environment-protected admin/debug view listing users, swipes, and matches.
- Allow basic read-only inspection to help diagnose issues in early deployments.
- **Acceptance criteria**: Admin view is only accessible when explicitly enabled via environment configuration.

**8. Non-Functional Requirements**

- **Performance**
  - Designed for small to medium-sized organizations (tens to low hundreds of concurrent users on LAN).
  - Typical response times for core endpoints (`discovery`, `swipe`, `matches`) should be under 200–300 ms under normal load.

- **Security & privacy**
  - Application is intended for internal LAN/VPN access only; no public internet exposure.
  - Store only minimal profile data necessary for matching and deep linking; do not store any chat content.
  - Log sensitive identifiers (like `chat_id`) sparingly and avoid logging raw request bodies in production.
  - Support basic role separation for any admin/debug views.

- **Deployment**
  - Primary deployment target is Docker Compose on a single host (API + DB + reverse proxy if desired).
  - Configuration via environment variables: database URL, Slack team ID, base URL, allowed origins, feature flags (e.g., admin view, mock auth).
  - Provide sample `.env.example` for local development.

- **Observability**
  - Basic structured logging for requests, errors, and key domain events (e.g., match creations).
  - Healthcheck endpoint for uptime monitoring.
  - Optional simple metrics (e.g., count of users, matches) exposed to logs or a minimal metrics endpoint.

**9. Future Work / Nice-to-Haves**

- More advanced matching algorithms (e.g., based on shared interests, departments, or custom tags).
- Tagging/interest system on user profiles and filters in discovery.
- Richer analytics or admin dashboard (e.g., usage statistics, match rates).
- SSO integration with the organization's identity provider for tighter auth.
- Support for multiple chat platforms beyond Slack (e.g., Microsoft Teams, Matrix).
- Native mobile apps or a more polished mobile-first experience.
- Push or email notifications and calendar integrations for follow-up reminders.