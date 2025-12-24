# Vault UI - Local Setup Guide

## System Requirements
- Node.js 20.x or higher
- npm 10.x or higher

## Installation Steps

1. **Clone or download the project**

2. **Install Node.js dependencies:**
   ```bash
   npm install
   ```

3. **Install Playwright browsers** (required for TeraBox fetching):
   ```bash
   npx playwright install chromium
   ```

4. **Set up environment variables:**
   Create a `.env` file in the root directory:
   ```
   SESSION_SECRET=your-secret-key-here
   ```

5. **Run the application:**
   ```bash
   npm run dev
   ```

6. **Open browser at:**
   ```
   http://localhost:5000
   ```

## Key Dependencies

| Package | Purpose |
|---------|---------|
| express | Backend server |
| drizzle-orm | Database ORM |
| @libsql/client | SQLite database |
| playwright | Browser automation for TeraBox |
| react | Frontend framework |
| vite | Development server |
| tailwindcss | Styling |
| @tanstack/react-query | Data fetching |
| wouter | Client-side routing |

## Database
- Uses SQLite (via libsql) stored in `./data/vault.db`
- Database is created automatically on first run

## Notes
- The **Auth** feature requires a visible browser window for manual TeraBox login
- **Public Fetch** runs headless (no visible browser)
- All URLs must go through the queue system before containers are created
