# 我的收藏夹

A personal bookmark / learning-resource collection site built with Next.js.

- **Admin** (single email): create / edit / delete bookmarks
- **Logged-in users**: favorite bookmarks
- **OAuth**: GitHub + Google (NextAuth v5)
- **Storage**: SQLite + Prisma

## Setup

```bash
# 1. Install deps
pnpm install

# 2. Copy env template and fill in
cp .env.example .env
# Edit .env:
#   AUTH_SECRET      — `openssl rand -base64 32`
#   ADMIN_EMAIL      — your OAuth account email; only this user can CRUD
#   AUTH_GITHUB_ID   — from https://github.com/settings/developers
#   AUTH_GITHUB_SECRET
#   AUTH_GOOGLE_ID   — from https://console.cloud.google.com/apis/credentials
#   AUTH_GOOGLE_SECRET

# 3. Create the database
pnpm db:push

# 4. Run dev
pnpm dev
```

The first user you log in as gets a row in the User table; if their email
matches `ADMIN_EMAIL`, they will see the **管理** nav link and can use
`/admin/new` to add bookmarks.

### OAuth callback URLs

When registering your OAuth apps, set the callback URLs to:

- GitHub:  `http://localhost:3000/api/auth/callback/github`
- Google:  `http://localhost:3000/api/auth/callback/google`

For production, swap `http://localhost:3000` for your domain.

## Routes

- `/`                — public list of all bookmarks (with search + category filter)
- `/login`           — OAuth login
- `/favorites`       — current user's favorites
- `/admin`           — admin dashboard (admin only)
- `/admin/new`       — create bookmark
- `/admin/[id]/edit` — edit bookmark

## Schema

- `User` / `Account` / `Session` — NextAuth standard tables
- `Bookmark`  — `title, url, description, category, tags, createdBy`
- `Favorite`  — join table (`userId`, `bookmarkId`) with unique index
