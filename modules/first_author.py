class FirstAuthorError(Exception):
    pass

def is_first_author(publication: dict, target_author_openalex_id: str) -> str:
    """
    Determine si l'auteur cible est le premier auteur d'une publication,
    en comparant les IDs OpenAlex (pas les noms, pour eviter les erreurs
    de variantes orthographiques - section 7 du cahier des charges).

    Args:
        publication: dict de publication formate (contient "authors",
                      liste de {name, openalex_id, position})
        target_author_openalex_id: ID OpenAlex de l'auteur recherche
                                    (ex: "https://openalex.org/A5074061726")

    Returns:
        "OUI" si l'auteur cible est en position "first", sinon "NON".
    """
    authors = publication.get("authors", [])

    for author in authors:
        if author.get("openalex_id") == target_author_openalex_id:
            if author.get("position") == "first":
                return "OUI"
            else:
                return "NON"

    return "NON"

