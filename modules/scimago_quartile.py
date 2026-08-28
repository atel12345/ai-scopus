import csv
import re 
from pathlib import Path

SCIMAGO_BASE_URL = "https://www.scimagojr.com/journalrank.php"

class ScimagoDataError(Exception):
    pass

def load_scimago_expert(csv_path: str)-> list[dict]:
    """
    Charge un export SCImago (CSV, delimiteur ';') pour une annee donnee.

    Args:
        csv_path: chemin vers le fichier CSV telecharge
                  (ex: data/scimago/2022.csv)

    Returns:
        Liste de dicts, un par journal, avec les champs bruts du CSV.

    Raises:
        ScimagoDataError si le fichier est introuvable ou vide.
    """
    path = Path(csv_path)
    if not path.exists():
        raise ScimagoDataError(f"Fichier Scimago introuvable : {csv_path}")

    with open(path, encoding="utf-8") as f:
        reader = csv.DictReader(f, delimiter=";")
        rows = list(reader)

    if not rows:
        raise ScimagoDataError(f"Fichier SCImago vide : {csv_path}")

    return rows

def parse_issn_field(issn_field: str) -> list[str]:
    """
    Extrait les ISSN individuels d'un champ SCImago, qui peut contenir
    plusieurs ISSN separes par une virgule (ex: "15424863, 00079235").

    Args:
        issn_field: valeur brute du champ Issn du CSV

    Returns:
        Liste d'ISSN nettoyes (sans espaces), normalises pour comparaison.
    """
    if not issn_field or not issn_field.strip():
        return []

    raw_parts = issn_field.split(",")
    cleaned = [part.strip().upper() for part in raw_parts if part.strip()]
    return cleaned

def build_issn_index(rows: list[dict]) -> dict[str, dict]:
    """
    Construit un index permettant de retrouver rapidement un journal
    a partir de n'importe lequel de ses ISSN (print ou electronique).

    Args:
        rows: liste de dicts obtenue via load_scimago_export()

    Returns:
        Dict {ISSN: ligne_journal_complete}. Un meme journal peut
        apparaitre sous plusieurs cles (une par ISSN qu'il possede).
    """
    index = {}
    for row in rows:
        issn_field = row.get("Issn","")
        issns = parse_issn_field(issn_field)
        for issn in issns:
            index[issn] = row

    return index

def find_quartile(issn: str, year: int, data_dir: str = "data/scimago") -> dict :
    """
    Cherche le quartile principal (Mode A) d'un journal pour une annee donnee.

    Args:
        issn: ISSN du journal (print ou electronique)
        year: annee de publication de l'article
        data_dir: dossier contenant les exports CSV annuels
                  (ex: data/scimago/2022.csv)

    Returns:
        Dict avec les cles: quartile, journal_title, sjr, category_field
        (ex: {"quartile": "Q1", "journal_title": "Cell", ...})
        Si non trouve: {"quartile": None, "journal_title": None, ...}
        avec un champ "note" expliquant pourquoi.
    """
    csv_path = Path(data_dir) / f"{year}.csv"

    if not csv_path.exists():
        return {
            "quartile" : None,
            "journal_title": None,
            "sjr": None,
            "category_field": None,
            "note": f"Export SCImago {year} introuvable ({csv_path})",
        }

    rows = load_scimago_expert(str(csv_path))
    index = build_issn_index(rows)

    issn_clean = issn.strip().replace("-", "")
    match = index.get(issn_clean)

    if not match:
        return {
            "quartile" : None,
            "journal_title": None,
            "sjr": None,
            "category_field": None,
            "note": f"ISSN '{issn}' introuvable dans SCImago {year}",
        }

    return {
        "quartile" : match.get("SJR Best Quartile"),
        "journal_title": match.get("Title"),
        "sjr": match.get("SJR"),
        "category_field": match.get("Categories"),
        "note": None,
    }

def parse_categories_field(categories_field: str) -> list[dict]:
    """
    Extrait le detail par categorie (Mode B) depuis le champ SCImago Categories.

    Exemple d'entree: "Hematology (Q1); Oncology (Q1)"
    Exemple de sortie: [{"category": "Hematology", "quartile": "Q1"},
                         {"category": "Oncology", "quartile": "Q1"}]

    Args:
        categories_field: valeur brute du champ Categories du CSV

    Returns:
        Liste de dicts {category, quartile}. Liste vide si champ vide
        ou aucune categorie n'a pu etre parsee.
    """
    if not categories_field or not categories_field.strip():
        return []

    parts = categories_field.split(";")
    results = []
    for part in parts:
        part = part.strip()
        if not part:
            continue

        match = re.match(r"^(.+?)\s*\((Q[1-4]|-)\)$", part)
        if match:
            category_name = match.group(1).strip()
            quartile = match.group(2)
            results.append({
                "category": category_name,
                "quartile": quartile
            })

    return results

def find_quartile_by_category(issn: str, year: int, data_dir: str = "data/scimago") -> dict:
    """
    Cherche le detail des quartiles par categorie (Mode B) d'un journal
    pour une annee donnee.

    Returns:
        Dict avec: journal_title, categories (liste de {category, quartile}), note.
        Si non trouve: categories vide, note explicative.
    """
    csv_path = Path(data_dir) / f"{year}.csv"

    if not csv_path.exists():
        return {
            "joural_title": None,
            "category": [],
            "note": f"Export SCImago {year} introuvable ({csv_path})",
        }

    rows = load_scimago_expert(str(csv_path))
    index = build_issn_index(rows)

    issn_clean = issn.strip().upper().replace("-", "")
    match = index.get(issn_clean)

    if not match:
        return {
            "journal_title": None,
            "categories": [],
            "note": f"ISSN '{issn}' introuvable dans SCImago {year}",
        }

    categories = parse_categories_field(match.get("Categories", ""))

    return {
        "journal_title": match.get("Title"),
        "categories": categories,
        "note": None,
    }