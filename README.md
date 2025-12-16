# KTV Buddy

Local-first desktop app for Chinese lyrics management and karaoke.

## Prerequisites

- Node.js 18+
- pnpm
- Rust (for Tauri)

## Setup

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Setup Database**
   This app uses SQLite.
   ```bash
   pnpm exec prisma migrate dev --name init
   ```

3. **Development**
   Run the Tauri + Next.js dev environment:
   ```bash
   pnpm tauri dev
   ```
   Or just web:
   ```bash
   pnpm dev
   ```

4. **Environment Variables**
   The app uses a local SQLite database (`dev.db`).
   OpenAI API Key is managed via the **Settings** page in the app (stored locally in DB).

## Features

- **Paste Mode**: Paste Chinese lyrics, get Pinyin/English (via OpenAI).
- **Search Mode**: Search songs via LRCLIB.
- **Library**: Manage your collection.
- **Karaoke View**: Big aligned text with navigation.
- **Editor**: Inline edit all fields.
