"""
run_pipeline.py - Orchestration complete de l'agent IA Scopus.

Enchaine : Module 1 (identification auteur) -> Module 2 (publications
OpenAlex) -> Module 3 (premier auteur) -> Module 4 (quartile SCImago)
-> Module 5 (generateur Excel).
"""

from modules.author_identification import extract_scopus_author_id, build_scopus_profile_link
from modules.publications_fetch import get_author_publications, PublicationsFetchError
from modules.first_author import is_first_author
from modules.scimago_quartile import find_quartile, find_quartile_by_category
from modules.excel_generator import generate_excel_report


def run_pipeline(scopus_link_or_id: str, author_name: str, output_path: str = "rapport_bibliometrique.xlsx"):
    """
    Execute le pipeline complet pour un auteur donne.

    Args:
        scopus_link_or_id: lien ou ID Scopus de l'auteur
        author_name: nom de l'auteur (secours pour la recherche OpenAlex,
        necessaire tant que le Scopus ID direct ne matche pas)
        output_path: chemin du fichier Excel a generer
    """
    print("Etape 1/5 - Identification de l'auteur...")
    scopus_author_id = extract_scopus_author_id(scopus_link_or_id)
    scopus_link = build_scopus_profile_link(scopus_author_id)
    print(f"  Scopus Author ID: {scopus_author_id}\n")

    print("Etape 2/5 - Recuperation des publications (OpenAlex)...")
    result = get_author_publications(scopus_author_id, author_name=author_name)
    target_openalex_id = result["author"]["openalex_id"]
    publications_raw = result["publications"]
    print(f"  {len(publications_raw)} publications trouvees pour {result['author']['display_name']}\n")

    print("Etape 3/5 - Determination du premier auteur...")
    for pub in publications_raw:
        pub["first_author"] = is_first_author(pub, target_openalex_id)
    print("  Termine.\n")

    print("Etape 4/5 - Enrichissement SCImago (quartile)...")
    for pub in publications_raw:
        issn = pub.get("issn")
        year = pub.get("publication_year")

        if not issn or not year:
            pub["quartile"] = ""
            pub["scimago_category"] = ""
            continue

        quartile_result = find_quartile(issn, year)
        category_result = find_quartile_by_category(issn, year)

        pub["quartile"] = quartile_result.get("quartile") or ""

        categories = category_result.get("categories", [])
        if categories:
            cat_str = "; ".join(f"{c['category']} ({c['quartile']})" for c in categories)
        else:
            cat_str = ""
        pub["scimago_category"] = cat_str
    print("  Termine.\n")

    print("Etape 5/5 - Generation du fichier Excel...")
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

    generate_excel_report(excel_data, output_path)
    print(f"  Fichier genere : {output_path}\n")

    print(f"Pipeline termine avec succes. {len(excel_data)} publications traitees.")


if __name__ == "__main__":
    run_pipeline(
        scopus_link_or_id="https://www.scopus.com/authid/detail.uri?authorId=57204883509",
        author_name="Allae Erraissi",
        output_path="rapport_bibliometrique.xlsx",
    )