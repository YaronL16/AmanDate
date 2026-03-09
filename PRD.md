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
  - In on-prem production, users authenticate via the organization's IDP/SSO layer, and trusted identity attributes are injected into the app context (`user_id`, `name`, `department`, `gender`, `chat_id` / Slack link).
  - In MVP testing mode, use a frontend-only mock login: choose/enter `user_id` from a predefined dataset in code and create a local test session.
  - Include explicit logout in MVP so testers can switch users quickly.
  - Authentication implementation details (SSO provider, reverse proxy, etc.) remain infrastructure concerns and are out of scope for this PRD.
- **Onboarding & Profile Management**
  - User identity fields (`name`, `department`, `gender`, `chat_id`) come from IDP in production, and from the MVP dataset in testing mode.
  - In MVP, profile editing is limited to non-identity fields (`bio`, `photo_url`); identity fields are shown as read-only.
  - Users must explicitly enable their account from profile before they can swipe or appear in discovery.
  - Enablement is controlled by `is_active` and must require both a checkbox and user confirmation in profile UX.
  - When not enabled (`is_active = false`), the user cannot swipe and is hidden from discovery.
- **Discovery (The Stack)**
  - User sees a stack/list of candidate profiles filtered to:
    - Exclude themselves.
    - Exclude users they have already swiped on.
    - Exclude users who are not enabled (`is_active = false`).
  - The API returns results in pages/batches (e.g., up to 20 profiles at a time).
  - Empty state: when no more candidates are available, the UI shows a friendly message (e.g., "You're all caught up") and may suggest checking back later.
  - Simple rate-limiting (e.g., max swipes per minute) can be enforced at the API or gateway level; exact limits can be tuned per deployment.
- **Swiping & Matching**
  - For each candidate, the user can swipe right (Like) or left (Pass) via gesture or explicit buttons.
  - The current user must have enabled their account (`is_active = true`) before swiping is allowed.
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
- gender (Enum/String, one of `male` or `female`; immutable identity field sourced from IDP/dataset in MVP)
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
    - `name`, `bio`, `photo_url`, `department` (optional), `gender` (optional but expected from trusted identity source), `chat_id` (required).
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
  - **Request body** (Pydantic `UserUpdate`): partial updates for `name`, `bio`, `photo_url`, `department`, `gender`, `chat_id`.
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
    - Exclude users with `is_active = false` (not enabled) or missing `chat_id`.
  - **Responses**:
    - `200 OK` with a list of lightweight user cards (id, name, department, photo_url).
    - `200 OK` with an empty list when there are no more candidates.
- `POST /api/swipe`
  - **Description**: Record a swipe and optionally create a match.
  - **Request body** (Pydantic `SwipeRequest`):
    - `swiper_id`, `swiped_id`, `direction` (`'right'` or `'left'`).
  - **Behavior**:
    - Reject swipe attempts if `swiper_id` user is not enabled (`is_active = false`).
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
  - Layout: centered `Card` containing a form for identity fields (`name`, `department`, `gender`, `chat_id`) plus editable profile fields.
  - Components: `Card`, `CardHeader`, `CardContent`, `Input`, `Textarea`, `Select` (for department), `Button`, `Avatar` preview.
  - Behavior: client-side validation, inline error messages, disabled state while submitting, success `Toast` on save.
  - Include an account enablement checkbox with explicit confirmation; only enabled users may swipe and be discoverable.
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
- Add MVP mock auth flow with a predefined user dataset, login by `user_id`, and logout.
- Build the user profile form and wire it to the `/api/users` endpoints, with read-only identity fields (`name`, `department`, `chat_id`) and editable non-identity fields (`bio`, `photo_url`).
- **Acceptance criteria**: A tester can login/logout by `user_id`, load the app as that user, update allowed profile fields via the UI, and see persisted changes after refresh.

Phase 4: Swipe UI

- Implement the card deck UI using shadcn `Card` components and Framer Motion drag gestures.
- Integrate the deck with `GET /api/discovery/{user_id}` and `POST /api/swipe`.
- Handle loading, empty, and error states.
- Populate the Database with a several users so the User can browse and view the feature in action
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

**10. Frontend Design & UI/UX Direction**

The MVP frontend should feel modern, polished, and calm. The visual style should use a subtle turquoise-forward palette that feels fresh and approachable without being overly saturated or harsh.

- **Visual style goals**
  - Clean, minimal surfaces with clear spacing and strong hierarchy.
  - Soft depth (light shadows, subtle borders, gentle gradients) instead of heavy contrast.
  - Rounded corners and smooth transitions for a contemporary "slick" feel.
  - Avoid visual clutter; prioritize focus on profile cards and primary actions.
- **Color direction (subtle turquoise theme)**
  - Base background: very light cool neutrals (off-white with slight blue/teal tint).
  - dPrimary accent: muted turquoise for primary CTAs, active states, and highlights.
  - Secondary accent: deeper teal for hover/focus states and important emphasis.
  - Text colors: high-contrast slate/charcoal for readability; avoid pure black where possible.
  - Use color sparingly so the interface remains easy on the eyes in long sessions.
- **Component-level guidance**
  - Buttons: primary button uses turquoise accent; secondary buttons remain neutral with clear outlines.
  - Cards: white or near-white cards with subtle border and soft shadow.
  - Inputs: neutral field backgrounds with turquoise focus ring and clear invalid/error styling.
  - Badges/labels: low-saturation turquoise or teal tints for metadata (e.g., department tags).
  - Modal/dialog: slight backdrop blur and centered emphasis without dramatic effects.
- **Motion and interaction**
  - Use short, smooth transitions (150-250ms) for hover/focus/open states.
  - Swipe interactions should feel responsive and fluid, with clear visual feedback on Like/Pass intent.
  - Avoid excessive animations; motion should guide attention, not distract.
- **Typography and spacing**
  - Use a modern sans-serif stack with strong readability.
  - Keep line lengths moderate; ensure generous padding and vertical rhythm.
  - Emphasize content hierarchy: page title > section title > body/meta text.
- **Accessibility and comfort**
  - Maintain WCAG-friendly contrast for text and controls.
  - Ensure visible keyboard focus states for all interactive elements.
  - Do not rely only on color to communicate status (pair with labels/icons).
  - Ensure responsive layouts and tap targets are comfortable on smaller screens.
- **Implementation notes**
  - Implement theme tokens via Tailwind/shadcn variables (e.g., primary, accent, muted) so palette tuning is centralized.
  - Include dark mode in MVP with a user-accessible toggle and persisted preference (e.g., local storage).
  - Dark mode should preserve the same calm turquoise identity with reduced saturation and sufficient contrast.
  - Default theme may follow system preference on first visit, then prefer explicit user choice.
  - Validate design consistency across Profile, Swipe, Matches, and Match Modal before Phase 5 completion.

