# AmanDate

## Phase 4 Demo Seeding

To test the swipe UI with realistic data, seed several demo users into the database.

1. Start the stack:

```bash
docker compose up -d db api frontend
```

2. Run migrations (if needed):

```bash
docker compose exec api alembic upgrade head
```

3. Seed demo users:

```bash
docker compose exec api python scripts/seed_demo_users.py
```

The script is idempotent for `chat_id`; re-running it will skip users that already exist.