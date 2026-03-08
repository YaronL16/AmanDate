**Cursor PRD: AmanDate**
**1. Project Overview**
AmanDate is a LAN-based internal networking and matchmaking application for organization members. Users can create profiles, view other members based on preferences, and swipe to express interest. When a mutual opt-in (match) occurs, the system generates a direct link to the organization's internal chat service (e.g., Slack) for seamless communication.

**2. Tech Stack Definitions**
Frontend: React (Vite), TypeScript, Tailwind CSS.

UI Library: shadcn/ui (for rapid, accessible, and clean component generation), Lucide React (icons), Framer Motion (for swipe animations).

Backend: FastAPI (Python), Pydantic (data validation), SQLAlchemy (ORM).

Database: PostgreSQL.

Infrastructure: Docker & Docker Compose (for easy packaging and deploying on the organization's local LAN/servers).

**3. Core User Flows**
Onboarding: User logs in (assume simple LAN auth or mock auth for MVP), creates a profile with basic details, a bio, and a profile picture URL.

Discovery (The Stack): User sees a stack of profile cards.

Action: User swipes right (Like) or left (Pass).

Matching: If User A likes User B, and User B likes User A, a Match is recorded.

Resolution: Both users receive a notification (UI alert) and a generated deep-link to message each other on the company chat platform (e.g., slack://user?team={TEAM_ID}&id={SLACK_ID}).

**4. Database Schema (PostgreSQL)**
Cursor should use SQLAlchemy to implement these models.

users table:

id (UUID, primary key)

name (String)

bio (Text)

photo_url (String)

chat_id (String - e.g., Slack user ID, required for the deep link)

department (String, optional)

created_at (Timestamp)

swipes table:

id (UUID, primary key)

swiper_id (UUID, foreign key -> users.id)

swiped_id (UUID, foreign key -> users.id)

direction (Enum: 'right', 'left')

created_at (Timestamp)

(Constraint: Unique combination of swiper_id and swiped_id)

matches table:

id (UUID, primary key)

user1_id (UUID, foreign key -> users.id)

user2_id (UUID, foreign key -> users.id)

created_at (Timestamp)

**5. Backend API Endpoints (FastAPI)**
POST /api/users: Create a new user profile.

GET /api/users/{user_id}: Fetch user profile.

GET /api/discovery/{user_id}: Fetch a list of users the current user has not yet swiped on.

POST /api/swipe:

Payload: { swiper_id, swiped_id, direction }

Logic: Record the swipe. If direction is 'right', check if the inverse right-swipe exists. If yes, create a record in matches and return { matched: true, match_data: ... }.

GET /api/matches/{user_id}: Return all matches for a user, including the other person's chat_id to generate the message link.

**6. Frontend Components (React / shadcn/ui)**
Cursor should utilize the npx shadcn-ui@latest add [component] command to generate these.

Card / CardContent: The core container for the swiping interface.

Button: For explicit X (Pass) and Heart (Like) buttons below the card.

Dialog / Modal: The "It's a Match!" pop-up screen that displays the link to the chat service.

Avatar: For displaying matches in the user's "Match Queue" sidebar.

Toast: For subtle notifications (e.g., "Profile updated").

**7. Implementation Phases (For Cursor Prompts)**
Phase 1: Backend & DB Setup

Initialize FastAPI and PostgreSQL via Docker Compose.

Create SQLAlchemy models and run database migrations (Alembic).

Phase 2: API Logic

Build the CRUD routes for Users.

Build the Discovery engine (SQL query to exclude already-swiped users).

Build the Swiping and Matching logic.

Phase 3: Frontend Scaffolding & API Integration

Initialize Vite React and install Tailwind + shadcn/ui.

Set up Axios or fetch logic to connect to the FastAPI backend.

Build the user profile creation form.

Phase 4: The Swipe UI (The tricky part)

Implement the deck of cards. Use framer-motion to handle drag gestures (drag, dragConstraints, dragElastic, onDragEnd).

Phase 5: Match Resolution

Build the Match Modal with the dynamic Slack/chat deep link.