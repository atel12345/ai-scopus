import requests
import time

BASE_URL = "https://api.openalex.org"


class PublicationsFetchError(Exception):
    pass

def find_author_by_scopus_id(scopus_author_id: str) -> dict | None:
    """
    Tente de trouver l'auteur OpenAlex correspondant directement
    via son Scopus Author ID.

    Returns:
        Le dict auteur OpenAlex si trouve, sinon None.
    """
    url = f"{BASE_URL}/authors"
    params = {"filter": f"scopus:{scopus_author_id}"}

    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()

    results = data.get("results", [])
    if results:
        return results[0]
    return None

def search_authors_by_name(name: str) -> list[dict]:
    """
    Recherche des auteurs OpenAlex par nom. Retourne potentiellement
    plusieurs homonymes (comme observe avec "Yann LeCun" -> 41 resultats).
    """
    url = f"{BASE_URL}/authors"
    params = {"search": name}

    response = requests.get(url, params=params)
    response.raise_for_status()
    data = response.json()

    return data.get("results", [])


def pick_best_author_match(results: list[dict]) -> dict | None:
    """
    Parmi plusieurs auteurs homonymes, choisit le plus probable :
    celui avec le plus de publications ET de citations.
    """
    if not results:
        return None
    return max(results, key=lambda a: (a.get("works_count", 0), a.get("cited_by_count", 0)))

def resolve_author(scopus_author_id: str, author_name: str | None = None) -> dict:
    """
    Trouve l'auteur OpenAlex correspondant, en essayant d'abord
    le Scopus ID direct, puis en secours la recherche par nom.

    Args:
        scopus_author_id: le Scopus Author ID (deja extrait par le Module 1)
        author_name: nom de l'auteur, utilise en secours si la
                     correspondance par ID echoue (optionnel)

    Returns:
        Le dict auteur OpenAlex trouve.

    Raises:
        PublicationsFetchError si aucun auteur n'est trouve.
    """
    author = find_author_by_scopus_id(scopus_author_id)
    if author:
        return author

    if author_name:
        results = search_authors_by_name(author_name)
        best = pick_best_author_match(results)
        if best:
            return best

    raise PublicationsFetchError(
        f"Aucun auteur OpenAlex trouvé pour Scopus ID '{scopus_author_id}'"
        + (f" ni pour le nom '{author_name}'" if author_name else "")
    )



def fetch_author_works(openalex_author_id: str, per_page: int = 200) -> list[dict]:
    """
    Recupere toutes les publications (works) d'un auteur OpenAlex,
    en paginant automatiquement via le curseur (cursor pagination).
    """
    url = f"{BASE_URL}/works"
    works = []
    cursor = "*"

    while cursor:
        params = {
            "filter": f"author.id:{openalex_author_id}",
            "per-page": per_page,
            "cursor": cursor,
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()

        works.extend(data.get("results", []))

        cursor = data.get("meta", {}).get("next_cursor")
        if cursor:
            time.sleep(0.1)

    return works

def format_work(work: dict) -> dict:
    """
    Extrait et formate les champs utiles d'une publication OpenAlex,
    y compris les auteurs (pour Module 3) et l'ISSN (pour Module 4).

    Args:
        work: dict brut d'une publication tel que retourne par l'API OpenAlex.

    Returns:
        Un dict simplifie avec les champs cles.
    """
    primary_location = work.get("primary_location") or {}
    source = primary_location.get("source") or {}

    authorships = work.get("authorships", [])
    authors = [
        {
            "name": a.get("author", {}).get("display_name"),
            "openalex_id": a.get("author", {}).get("id"),
            "position": a.get("author_position"),
        }
        for a in authorships
    ]

    issn_list = source.get("issn") or []
    primary_issn = issn_list[0] if issn_list else source.get("issn_l")

    return {
        "title": work.get("title"),
        "publication_year": work.get("publication_year"),
        "doi": work.get("doi"),
        "cited_by_count": work.get("cited_by_count", 0),
        "venue": source.get("display_name"),
        "issn": primary_issn,
        "authors": authors,
        "type": work.get("type"),
        "open_access": work.get("open_access", {}).get("is_oa", False),
    }

def format_author_works(works: list[dict]) -> list[dict]:
    """
    Applique format_work a une liste de publications.
    """
    return [format_work(w) for w in works]

def get_author_publications(scopus_author_id: str, author_name: str | None = None) -> dict:
    """
    Pipeline complet : resout l'auteur OpenAlex a partir d'un Scopus ID
    (avec secours par nom si fourni), recupere toutes ses publications,
    et les formate.

    Args:
        scopus_author_id: le Scopus Author ID.
        author_name: nom de l'auteur, utilise en secours (optionnel).

    Returns:
        Un dict contenant les infos de l'auteur et la liste formatee
        de ses publications.

    Raises:
        PublicationsFetchError si l'auteur n'est pas trouve.
    """
    author = resolve_author(scopus_author_id, author_name)

    raw_works = fetch_author_works(author["id"])
    formatted_works = format_author_works(raw_works)

    return {
        "author": {
            "openalex_id": author.get("id"),
            "display_name": author.get("display_name"),
            "works_count": author.get("works_count"),
            "cited_by_count": author.get("cited_by_count"),
        },
        "publications": formatted_works,
        "publications_count": len(formatted_works),
    }