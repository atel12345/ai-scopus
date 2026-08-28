# Agent IA Scopus

Agent IA Scopus generates bibliometric Excel reports from a Scopus author profile or Author ID. It resolves the researcher and publications with OpenAlex, enriches journals with SCImago quartiles, and exports a structured Excel workbook.

## Repository structure

- `backend/`: FastAPI web API, authentication, asynchronous pipeline jobs, and SCImago/Excel modules.
- `frontend/`: React application for authentication, report generation, polling progress, and downloads.
- `modules/`: Original standalone Python modules retained for the command-line pipeline.
- `data/scimago/`: Local data location for standalone usage. The web backend reads `backend/data/scimago/`.
- `run_pipeline.py`: Original standalone orchestration script.

## Local setup

### Backend

From `backend/`:

```powershell
python -m venv ../.venv
..\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Copy `.env.example` to `.env` and set a real `JWT_SECRET_KEY` before using the application outside local development. Never commit `.env`.

### Frontend

From `frontend/`:

```powershell
npm install
npm start
```

The frontend uses `http://127.0.0.1:8000` by default. Set `REACT_APP_API_URL` when the backend runs at another URL.

## SCImago data

The quartile enrichment requires one SCImago export per publication year. Download each year manually from:

`https://www.scimagojr.com/journalrank.php?year=ANNEE&out=xls`

SCImago may apply anti-bot protection, so the files must be downloaded one at a time through a browser. Save them as `ANNEE.csv` in `backend/data/scimago/`, for example `backend/data/scimago/2024.csv`. These exports are intentionally ignored by Git because they are large and can be downloaded again when needed.

## OpenAlex instead of the Scopus API

The project uses OpenAlex for author and publication retrieval rather than the official Scopus API because institutional Scopus access was unavailable during development. This deviation was reviewed and validated with the project supervisor.

## Data and secrets

Generated Excel files, local SQLite databases, logs, virtual environments, frontend dependencies, environment files, and SCImago exports are excluded by the root `.gitignore`. Commit `.env.example`, never `.env`.
