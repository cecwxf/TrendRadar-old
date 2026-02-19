# Repository Guidelines

## Project Structure & Module Organization
- `trendradar/`: Python backend package (crawlers, analysis, storage, notifications).
- `mcp_server/`: MCP server and tools for AI analysis.
- `blog-nextjs/`: Next.js frontend (blog + market dashboard).
- `config/`: Runtime configuration files (e.g., `config.yaml`, keyword filters).
- `output/`: Generated reports and stored data (HTML, snapshots, analysis).
- `docs/`, `docker/`, `setup-*.sh/.bat`: Documentation, container, and setup helpers.
- Root `test_*.py`: Standalone integration/regression scripts.

## Build, Test, and Development Commands
Python backend (from repo root):
- `pip install -e .`: Install backend in editable mode.
- `python -m trendradar`: Run the analyzer.
- `trendradar-mcp --transport http --host 0.0.0.0 --port 3333`: Start MCP server.
- `uv run python -m mcp_server.server --transport http --port 3333`: Alternate MCP startup (see `start-http.sh`).

Next.js frontend:
- `cd blog-nextjs`
- `npm install`: Install frontend dependencies.
- `npm run dev`: Local dev server on `http://localhost:3000`.
- `npm run build`: Production build.
- `npm run lint`: ESLint via Next.

## Coding Style & Naming Conventions
- Python: 4-space indentation; follow existing module layout under `trendradar/` and `mcp_server/`.
- TypeScript/React: follow Next.js conventions in `blog-nextjs/src/` (PascalCase components, `camelCase` variables).
- No repo-wide formatter is enforced; keep changes consistent with neighboring files.

## Testing Guidelines
- Tests are simple scripts at the repo root (e.g., `test_claude_analyzer.py`).
- Run individually: `python test_claude_analyzer.py` (some tests require API keys or network access).
- If you use pytest locally, the naming pattern is already compatible: `test_*.py`.

## Commit & Pull Request Guidelines
- Commit messages in history are short, imperative summaries (e.g., “Add footer links…”). Use the same style.
- PRs should include: a concise summary, affected areas (`trendradar/`, `mcp_server/`, `blog-nextjs/`), and screenshots for UI changes.

## Security & Configuration Tips
- Treat `config/config.yaml` and webhook tokens as secrets; avoid committing sensitive values.
- Frontend requires env vars in `blog-nextjs/.env.local` (e.g., `NOTION_TOKEN`, `NOTION_DATABASE_ID`, `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_GISCUS_*`).
