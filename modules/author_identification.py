"""
Module 1 - Identification de l'auteur

Objectif (cahier des charges, section 3-5) :
- Accepter en entree soit un lien de profil Scopus, soit un Author ID direct.
- En extraire de maniere fiable le Scopus Author ID.

Le Scopus Author ID reste la reference conceptuelle du projet (utilise pour
tracer le lien Scopus dans le rapport final), meme si la recuperation des
publications (Module 2) passe par une source alternative (OpenAlex).
"""

import re


class AuthorIdentificationError(Exception):
    """Levee quand aucun Author ID valide n'a pu etre extrait de l'entree."""
    pass


def extract_scopus_author_id(user_input: str) -> str:
    """
    Extrait le Scopus Author ID a partir d'une entree utilisateur.

    Accepte :
    - un lien complet, ex:
      https://www.scopus.com/authid/detail.uri?authorId=57204883509
    - un Author ID direct, ex: "57204883509"

    Args:
        user_input: chaine fournie par l'utilisateur (lien ou ID)

    Returns:
        L'Author ID Scopus sous forme de chaine de chiffres.

    Raises:
        AuthorIdentificationError si aucun ID valide n'est trouve.
    """
    if not user_input or not user_input.strip():
        raise AuthorIdentificationError("Entree vide : aucun lien ou ID fourni.")

    cleaned = user_input.strip()

    # Cas 1 : entree deja un ID numerique pur (ex: "57204883509")
    if re.fullmatch(r"\d{6,}", cleaned):
        return cleaned

    # Cas 2 : lien Scopus contenant authorId=XXXX dans la query string
    match = re.search(r"authorId=(\d{6,})", cleaned)
    if match:
        return match.group(1)

    # Cas 3 : robustesse supplementaire si l'ID apparait ailleurs dans l'URL
    match = re.search(r"(\d{9,12})", cleaned)
    if match:
        return match.group(1)

    raise AuthorIdentificationError(
        f"Impossible d'extraire un Scopus Author ID valide depuis : '{user_input}'"
    )


def build_scopus_profile_link(author_id: str) -> str:
    """
    Reconstruit le lien de profil Scopus a partir d'un Author ID,
    utilise pour la colonne 'Scopus Link' du fichier Excel final.
    """
    return f"https://www.scopus.com/authid/detail.uri?authorId={author_id}"


if __name__ == "__main__":
    examples = [
        "https://www.scopus.com/authid/detail.uri?authorId=57204883509",
        "57204883509",
        "https://www.scopus.com/authid/detail.uri?authorId=57204883509&origin=inward",
    ]
    for ex in examples:
        aid = extract_scopus_author_id(ex)
        print(f"Entree: {ex}\n  -> Author ID: {aid}\n  -> Lien reconstruit: {build_scopus_profile_link(aid)}\n")