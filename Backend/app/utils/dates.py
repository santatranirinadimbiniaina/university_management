"""Conversion des dates recues en JSON.

Les clients envoient les dates au format 'AAAA-MM-JJ'. MySQL accepte cette
chaine telle quelle, mais pas les autres moteurs : convertir explicitement
rend les controleurs independants de la base et testables hors MySQL, sans
changer le resultat cote production.
"""

from datetime import date as _date, datetime as _datetime


def parse_date(valeur):
    """Renvoie un objet `date`, ou None si la valeur est vide ou illisible.

    Une valeur deja typee est renvoyee inchangee. Les horodatages complets
    ('2026-08-12T10:30:00') sont acceptes : seule la partie date est retenue.
    """
    if valeur is None or valeur == '':
        return None
    if isinstance(valeur, _datetime):
        return valeur.date()
    if isinstance(valeur, _date):
        return valeur
    try:
        return _datetime.strptime(str(valeur)[:10], '%Y-%m-%d').date()
    except (ValueError, TypeError):
        return None
