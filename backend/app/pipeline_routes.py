"""
pipeline_routes.py - Endpoint qui execute le pipeline complet
(Modules 1 a 5) et retourne le fichier Excel genere.
"""

import os
import re
import tempfile
import uuid
import unicodedata

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel

from app.auth import get_current_user
from app.database import SessionLocal
from app.models import Report, User

from app.modules.author_identification import extract_scopus_author_id, build_scopus_profile_link, AuthorIdentificationError
from app.modules.publications_fetch import get_author_publications, PublicationsFetchError
from app.modules.first_author import is_first_author
from app.modules.scimago_quartile import lookup_quartile_data
from app.modules.excel_generator import generate_excel_report

router = APIRouter()
JOBS = {}
PIPELINE_TOTAL = 5


class GenerateRequest(BaseModel):
    scopus_link_or_id: str
    author_name: str


def _safe_filename_part(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    cleaned = re.sub(r"[^A-Za-z0-9]+", "_", normalized).strip("_")
    return cleaned or "auteur"


def _set_job(job_id, **updates):
    JOBS[job_id].update(updates)


def _record_report(user_id, author_name, scopus_author_id, filename, file_path, publication_count):
    db = SessionLocal()
    try:
        db.add(
            Report(
                user_id=user_id,
                author_name=author_name,
                scopus_author_id=scopus_author_id,
                filename=filename,
                file_path=file_path,
                publication_count=publication_count,
            )
        )
        db.commit()
    finally:
        db.close()


def _job_file_response(job):
    if job["status"] != "done":
        raise HTTPException(status_code=409, detail="Le rapport n'est pas encore disponible")

    if not job.get("file_path") or not os.path.exists(job["file_path"]):
        raise HTTPException(status_code=404, detail="Le fichier du rapport est introuvable")

    return FileResponse(
        path=job["file_path"],
        filename=job["filename"],
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )


def run_pipeline_job(job_id, scopus_link_or_id, author_name):
    try:
        _set_job(job_id, step="identification", current=1, message="Identification de l'auteur")
        try:
            scopus_author_id = extract_scopus_author_id(scopus_link_or_id)
        except AuthorIdentificationError as error:
            raise ValueError(str(error)) from error

        scopus_link = build_scopus_profile_link(scopus_author_id)
        _set_job(job_id, step="fetching_publications", current=2, message="Récupération des publications")
        try:
            result = get_author_publications(scopus_author_id, author_name=author_name)
        except PublicationsFetchError as error:
            raise ValueError(str(error)) from error

        target_openalex_id = result["author"]["openalex_id"]
        publications_raw = result["publications"]
        publication_count = len(publications_raw)
        _set_job(
            job_id,
            step="processing_authors",
            current=3,
            message=f"{publication_count} publications trouvées",
            sub_progress=0,
        )

        for index, pub in enumerate(publications_raw, start=1):
            pub["first_author"] = is_first_author(pub, target_openalex_id)
            issn = pub.get("issn")
            year = pub.get("publication_year")

            if issn and year:
                quartile_result, category_result = lookup_quartile_data(issn, year)
                pub["quartile"] = quartile_result.get("quartile") or ""
                categories = category_result.get("categories", [])
                pub["scimago_category"] = (
                    "; ".join(f"{category['category']} ({category['quartile']})" for category in categories)
                    if categories
                    else ""
                )
            else:
                pub["quartile"] = ""
                pub["scimago_category"] = ""

            _set_job(
                job_id,
                step="scimago_enrichment",
                current=3,
                message=f"{index}/{publication_count} publications traitées",
                sub_progress=index / publication_count if publication_count else 1,
            )

        _set_job(job_id, step="generating_excel", current=4, message="Génération du fichier Excel")
        excel_data = []
        for pub in publications_raw:
            authors_str = ", ".join(author.get("name", "") for author in pub.get("authors", []))
            excel_data.append(
                {
                    "title": pub.get("title", ""),
                    "authors": authors_str,
                    "year": pub.get("publication_year", ""),
                    "first_author": pub.get("first_author", ""),
                    "journal": pub.get("venue", ""),
                    "issn": pub.get("issn", ""),
                    "doi": pub.get("doi", ""),
                    "quartile": pub.get("quartile", ""),
                    "scimago_category": pub.get("scimago_category", ""),
                    "scopus_link": scopus_link,
                }
            )

        author_filename = _safe_filename_part(author_name)
        output_filename = f"rapport_{author_filename}_{scopus_author_id}.xlsx"
        output_path = os.path.join(tempfile.gettempdir(), output_filename)
        generate_excel_report(excel_data, output_path)
        _record_report(
            JOBS[job_id]["user_id"],
            author_name,
            scopus_author_id,
            output_filename,
            output_path,
            len(excel_data),
        )
        _set_job(
            job_id,
            status="done",
            step="generating_excel",
            current=5,
            message="Rapport prêt au téléchargement",
            sub_progress=1,
            file_path=output_path,
            filename=output_filename,
        )
    except Exception as error:
        _set_job(job_id, status="error", error=str(error), message="La génération a échoué")


def _create_job(current_user):
    job_id = str(uuid.uuid4())
    JOBS[job_id] = {
        "user_id": current_user.id,
        "status": "running",
        "step": "identification",
        "current": 0,
        "total": PIPELINE_TOTAL,
        "message": "Preparation du pipeline",
        "sub_progress": 0,
        "file_path": None,
        "filename": None,
        "error": None,
    }
    return job_id


def _get_user_job(job_id, current_user):
    job = JOBS.get(job_id)
    if not job or job["user_id"] != current_user.id:
        raise HTTPException(status_code=404, detail="Job introuvable")
    return job


@router.post("/generate-async")
def generate_report_async(
    request: GenerateRequest,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user),
):
    job_id = _create_job(current_user)
    background_tasks.add_task(run_pipeline_job, job_id, request.scopus_link_or_id, request.author_name)
    return {"job_id": job_id}


@router.get("/status/{job_id}")
def get_pipeline_status(job_id: str, current_user: User = Depends(get_current_user)):
    job = _get_user_job(job_id, current_user)
    return {key: value for key, value in job.items() if key != "user_id"}


@router.get("/download/{job_id}")
def download_pipeline_result(job_id: str, current_user: User = Depends(get_current_user)):
    return _job_file_response(_get_user_job(job_id, current_user))


@router.get("/history")
def get_report_history(current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        reports = (
            db.query(Report)
            .filter(Report.user_id == current_user.id)
            .order_by(Report.created_at.desc())
            .all()
        )
        return [
            {
                "id": report.id,
                "author_name": report.author_name,
                "scopus_author_id": report.scopus_author_id,
                "filename": report.filename,
                "publication_count": report.publication_count,
                "created_at": report.created_at,
            }
            for report in reports
        ]
    finally:
        db.close()


@router.get("/history/{report_id}/download")
def download_history_report(report_id: int, current_user: User = Depends(get_current_user)):
    db = SessionLocal()
    try:
        report = (
            db.query(Report)
            .filter(Report.id == report_id, Report.user_id == current_user.id)
            .first()
        )
        if not report:
            raise HTTPException(status_code=404, detail="Rapport introuvable")
        return _job_file_response(
            {"status": "done", "file_path": report.file_path, "filename": report.filename}
        )
    finally:
        db.close()


@router.post("/generate")
def generate_report(request: GenerateRequest, current_user: User = Depends(get_current_user)):
    """
    Execute le pipeline complet pour un auteur donne et retourne
    le fichier Excel genere en telechargement direct.
    """
    try:
        scopus_author_id = extract_scopus_author_id(request.scopus_link_or_id)
    except AuthorIdentificationError as e:
        raise HTTPException(status_code=400, detail=str(e))

    scopus_link = build_scopus_profile_link(scopus_author_id)

    try:
        result = get_author_publications(scopus_author_id, author_name=request.author_name)
    except PublicationsFetchError as e:
        raise HTTPException(status_code=404, detail=str(e))

    target_openalex_id = result["author"]["openalex_id"]
    publications_raw = result["publications"]

    for pub in publications_raw:
        pub["first_author"] = is_first_author(pub, target_openalex_id)

        issn = pub.get("issn")
        year = pub.get("publication_year")

        if not issn or not year:
            pub["quartile"] = ""
            pub["scimago_category"] = ""
            continue

        quartile_result, category_result = lookup_quartile_data(issn, year)

        pub["quartile"] = quartile_result.get("quartile") or ""

        categories = category_result.get("categories", [])
        if categories:
            pub["scimago_category"] = "; ".join(f"{c['category']} ({c['quartile']})" for c in categories)
        else:
            pub["scimago_category"] = ""

    excel_data = []
    for pub in publications_raw:
        authors_str = ", ".join(a.get("name", "") for a in pub.get("authors", []))
        excel_data.append({
            "title": pub.get("title", ""),
            "authors": authors_str,
            "year": pub.get("publication_year", ""),
            "first_author": pub.get("first_author", ""),
            "journal": pub.get("venue", ""),
            "issn": pub.get("issn", ""),
            "doi": pub.get("doi", ""),
            "quartile": pub.get("quartile", ""),
            "scimago_category": pub.get("scimago_category", ""),
            "scopus_link": scopus_link,
        })

    temp_dir = tempfile.gettempdir()
    author_filename = _safe_filename_part(request.author_name)
    output_filename = f"rapport_{author_filename}_{scopus_author_id}.xlsx"
    output_path = os.path.join(temp_dir, output_filename)

    generate_excel_report(excel_data, output_path)
    _record_report(
        current_user.id,
        request.author_name,
        scopus_author_id,
        output_filename,
        output_path,
        len(excel_data),
    )

    return FileResponse(
        path=output_path,
        filename=output_filename,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )