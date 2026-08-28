# Agent IA Scopus

Agent IA Scopus is a web application for producing bibliometric Excel reports from a Scopus author profile or Scopus Author ID.

The application:

1. Extracts and validates the Scopus Author ID.
2. Resolves the researcher and retrieves publications through OpenAlex.
3. Determines whether the researcher is the first author of each publication.
4. Enriches journals with SCImago quartile and category information.
5. Generates a structured `.xlsx` workbook with publication and statistics sheets.
6. Stores completed report metadata so each authenticated user can revisit their report history.

## Important data-source note

The project uses OpenAlex rather than the official Scopus API for author and publication retrieval. Institutional Scopus API access was unavailable during development, so this alternative was reviewed and validated with the project supervisor.

SCImago exports are used locally for journal ranking enrichment. They are not committed because the files are large and can be downloaded again when needed.

## Project architecture

```text
Agent IA Scopus/
├── backend/
│   ├── app/
│   │   ├── auth.py                  JWT and password authentication
│   │   ├── database.py              SQLAlchemy database setup
│   │   ├── main.py                  FastAPI application entry point
│   │   ├── models.py                User and Report models
│   │   ├── pipeline_routes.py       Pipeline, job, history, and download routes
│   │   └── modules/
│   │       ├── author_identification.py
│   │       ├── publications_fetch.py OpenAlex integration
│   │       ├── first_author.py
│   │       ├── scimago_quartile.py  Cached SCImago indexes
│   │       └── excel_generator.py
│   ├── data/scimago/                Annual SCImago CSV files
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── public/                      Static metadata and application logo
│   └── src/
│       ├── components/AccountMenu/   Account, history, and logout menu
│       ├── layouts/                  Authentication, generation, and history pages
│       ├── routes.js
│       ├── services/api.js           API client and JWT session helpers
│       └── App.js
├── modules/                         Original standalone Python modules
├── data/scimago/                    Standalone-mode data placeholder
├── run_pipeline.py                  Original command-line orchestration
├── .gitignore
└── README.md
```

## Requirements

- Python 3.10 or newer
- Node.js and npm
- A local or hosted SQL database supported by SQLAlchemy
- SCImago annual exports for the publication years you want to enrich

## Local installation

### 1. Configure the backend

From the repository root, create and activate the virtual environment:

```cmd
python -m venv .venv
.venv\Scripts\activate.bat
```

Install backend dependencies:

```cmd
cd backend
pip install -r requirements.txt
cd ..
```

Create `backend/.env` from the example:

```cmd
copy backend\.env.example backend\.env
```

For local development, the application defaults to SQLite at `backend/local_dev.db`. For another database, set `DATABASE_URL` in `backend/.env`. Always set a strong private `JWT_SECRET_KEY` outside local development.

Start FastAPI from the `backend/` directory. The working directory matters because the application imports the `app` package:

```cmd
cd backend
..\.venv\Scripts\activate.bat
uvicorn app.main:app --reload
cd ..
```

The backend is available at `http://127.0.0.1:8000`. Interactive API documentation is available at `http://127.0.0.1:8000/docs`.

### 2. Start the frontend

In a second terminal:

```cmd
cd frontend
npm install
npm start
cd ..
```

The React application is available at `http://localhost:3000` and uses `http://127.0.0.1:8000` as its default backend URL.

To use another backend URL, define `frontend/.env.local`:

```text
REACT_APP_API_URL=https://your-api.example.com
```

Do not commit `.env.local` or any file containing real credentials.

## Authentication flow

- Registration uses `POST /auth/register` with a JSON body containing `email` and `password`.
- Login uses `POST /auth/login` with URL-encoded OAuth2 form fields named `username` and `password`.
- The backend returns a JWT whose `sub` claim contains the user email.
- The frontend stores the token in `sessionStorage` under `scopus_agent_token`.
- Protected requests send `Authorization: Bearer <token>`.
- The account menu can display the email, open report history, and log out.

Passwords are hashed with bcrypt. The JWT secret must be supplied through `JWT_SECRET_KEY` in a real deployment.

## Report generation flow

The web interface uses the asynchronous job endpoints so long-running authors do not block the browser page:

1. `POST /pipeline/generate-async` creates a job and returns a `job_id` immediately.
2. The frontend polls `GET /pipeline/status/{job_id}` approximately once per second.
3. The backend updates the job as it identifies the author, fetches OpenAlex publications, enriches SCImago data, and creates the workbook.
4. When the job is complete, the frontend calls `GET /pipeline/download/{job_id}`.
5. The completed report is recorded for the authenticated user and appears under `Historique des rapports`.

The original `POST /pipeline/generate` endpoint remains available as a synchronous fallback.

Job statuses include:

- `running`: the pipeline is still processing.
- `done`: the workbook is available for download.
- `error`: processing failed and the `error` field explains why.

Progress fields include `step`, `current`, `total`, `message`, and `sub_progress`. The frontend uses these values for the progress bar and pipeline indicators.

## Report history

Completed reports are stored in the `reports` database table with:

- Authenticated user ID
- Author name and Scopus Author ID
- Generated filename
- Publication count
- Creation timestamp
- Temporary file path used for downloads

History routes are protected and only return reports belonging to the current user:

- `GET /pipeline/history`
- `GET /pipeline/history/{report_id}/download`

The temporary Excel files are stored in the operating system temporary directory. A production deployment should add a retention and cleanup policy for old files and stale history records.

## SCImago data setup

The quartile enrichment expects annual files named exactly like `2019.csv`, `2020.csv`, or `2024.csv` in:

```text
backend/data/scimago/
```

Download each year manually from:

`https://www.scimagojr.com/journalrank.php?year=ANNEE&out=xls`

SCImago can apply anti-bot protection, so download the exports one at a time through a browser. Convert or save each export as CSV with the expected semicolon-separated format and place it in `backend/data/scimago/`.

The SCImago module builds an ISSN index and caches it in process memory once per year. This avoids repeatedly reading and parsing the same 11–13 MB file while processing an author. The cache is intentionally cleared when the backend process restarts.

The root and backend SCImago directories contain `.gitkeep` files so the expected folders remain visible in a fresh clone, while the large CSV files remain ignored by Git.

## Excel output

Each generated workbook contains:

- `Publications`: title, authors, year, first-author status, journal, ISSN, DOI, quartile, SCImago categories, and Scopus link.
- `Statistiques`: formulas for total publications, quartile distribution, and first-author/co-author counts.

Filenames include the requested author name and Scopus Author ID, for example:

```text
rapport_Auteur_Exemple_57204883509.xlsx
```

Names are normalized for filesystem compatibility by removing accents and replacing unsupported characters with underscores.

## Standalone pipeline

The original command-line modules remain available for experimentation outside the web application. From the repository root, activate the virtual environment and run:

```cmd
python run_pipeline.py
```

The standalone script and the web backend have separate orchestration paths. The web application is the recommended entry point for authentication, progress reporting, downloads, and report history.

## Development checks

Build the frontend:

```cmd
cd frontend
npm run build
cd ..
```

Compile the backend modules:

```cmd
cd backend
python -m compileall app
cd ..
```

The frontend build may display a non-blocking source-map warning from `stylis-plugin-rtl` if its package does not include the referenced TypeScript source file.

## Troubleshooting

### `ModuleNotFoundError: No module named 'app'`

Run Uvicorn from `backend/`, not from the repository root:

```cmd
cd backend
uvicorn app.main:app --reload
cd ..
```

### Browser reports `Failed to fetch`

Check that the backend responds at `http://127.0.0.1:8000/`, that the frontend API URL is correct, and that Uvicorn has been restarted after backend changes.

### SCImago quartile is empty

Confirm that the relevant annual CSV exists in `backend/data/scimago/`, uses the expected filename, and contains the ISSN and SCImago columns.

### Existing report history is missing after a reset

Local history is stored in the configured database. Deleting `backend/local_dev.db` removes local users and report metadata.
