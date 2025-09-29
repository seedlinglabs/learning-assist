### API Endpoints Overview

This document lists all API endpoints used by the app (frontend services and tests), grouped by backend domain and external services. Use this as a reference when building the PWA.

### Backend (API Gateway pre-prod)
Base URL: `https://xvq11x0421.execute-api.us-west-2.amazonaws.com/pre-prod`

- Topics
  - `GET /topics`
    - Returns: list of topics
  - `GET /topics?subject_id={subjectId}`
    - Query params: `subject_id` (string)
    - Returns: list of topics for a subject
  - `GET /topics/{id}`
    - Path params: `id` (topic ID)
    - Returns: a topic
  - `POST /topics`
    - Body JSON: `{ name: string; description?: string; documentLinks?: {name?: string; url: string}[]; aiContent?: object; subject_id: string; school_id: string; class_id: string }`
    - Returns: created topic
  - `PUT /topics/{id}`
    - Path params: `id`
    - Body JSON (partial): `{ name?, description?, documentLinks?, aiContent? }`
    - Returns: updated topic
  - `DELETE /topics/{id}`
    - Path params: `id`
    - Returns: `{ message: string }`

- Auth
  - `POST /auth/register`
    - Body JSON: `{ email, password, name, user_type, class_access?, school_id? }`
    - Returns: `{ user, token, message }`
  - `POST /auth/login`
    - Body JSON:
      - Email/password: `{ email, password }`
      - Phone login (parent): `{ phone_number, name?, class_access?, school_id? }`
    - Returns: `{ user, token, message }`
  - `GET /auth/verify`
    - Headers: `Authorization: Bearer <token>`
    - Returns: `{ valid: boolean, user? }`
  - `PUT /auth/user/{user_id}`
    - Path params: `user_id`
    - Body JSON: partial user fields
    - Returns: updated user

- Gemini proxy
  - Base: `/gemini`
  - `POST /gemini/generate-content`
    - Body JSON: Gemini-compatible `{ contents: [...], generationConfig: {...}, model?: string }`
    - Returns: Gemini API response shape
  - `POST /gemini/discover-documents`
    - Body JSON: same envelope as above; used for document discovery
  - `POST /gemini/enhance-section`
    - Body JSON: same envelope; returns enhanced section text
  - `POST /gemini/analyze-chapter`
    - Body JSON: same envelope; used by chapter planner service

Notes:
- CORS preflight (`OPTIONS`) is handled for all endpoints.
- Auth endpoints and gemini proxy accept `Authorization` header when available.

### External Services

- YouTube Data API v3
  - Base: `https://www.googleapis.com/youtube/v3`
  - `GET /search` with query params: `part=snippet`, `q`, `key`, `type=video`, `maxResults`, etc.
  - `GET /videos` with query params: `part=contentDetails,snippet`, `id`, `key`
  - Used in: `src/services/youtubeService.ts`

- Unsplash API
  - Base: `https://api.unsplash.com`
  - `GET /search/photos` with query params: `query`, `per_page`, `orientation`, `content_filter`
  - Headers: `Authorization: Client-ID <REACT_APP_UNSPLASH_ACCESS_KEY>` (handled internally)
  - Used in: `src/services/imageSearchService.ts`

- Pexels API
  - Base: `https://api.pexels.com/v1`
  - `GET /search` with query params: `query`, `per_page`, `orientation`
  - Headers: `Authorization: <REACT_APP_PEXELS_API_KEY>`
  - Used in: `src/services/imageSearchService.ts`

- Direct Gemini (frontend legacy)
  - Base: `https://generativelanguage.googleapis.com/v1beta/models`
  - `POST /gemini-1.5-flash:generateContent?key=<REACT_APP_GEMINI_API_KEY>`
  - Used in: `src/services/geminiService.ts` (prefer proxy via `/gemini` in production)

### Source References

- Frontend
  - `src/services/api.ts` (topics CRUD)
  - `src/services/authService.ts` (auth)
  - `src/services/secureGeminiService.ts` (gemini proxy)
  - `src/services/youtubeService.ts` (YouTube)
  - `src/services/imageSearchService.ts` (Unsplash, Pexels)
  - `src/services/chapterPlannerService.ts` (gemini proxy URL)

- Backend
  - `backend/lambda_function.py` (topics)
  - `backend/auth_lambda_function.py` (auth)
  - `backend/gemini_lambda_function.py` (gemini proxy)

### Environment Variables

- `REACT_APP_YOUTUBE_API_KEY`
- `REACT_APP_UNSPLASH_ACCESS_KEY`
- `REACT_APP_PEXELS_API_KEY`
- `REACT_APP_GEMINI_API_KEY` (legacy direct calls; not required when using proxy)


