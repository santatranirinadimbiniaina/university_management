"""Helpers JWT partagés par les contrôleurs du flux scolaire.

Les identités numériques se chevauchent entre tables (le super admin #1 et le
professeur #1 coexistent) : chaque helper vérifie donc le claim `role` du JWT
AVANT de résoudre le compte, sinon un compte d'une autre table pourrait être
renvoyé par erreur.
"""
from flask_jwt_extended import get_jwt, get_jwt_identity, verify_jwt_in_request
from app.Model.professeur_model import Professeur
from app.Model.etudiant_model import Etudiant
from app.Model.super_admin_model import SuperAdmin
from app.Model.directeur_model import Directeur

ROLE_VERS_MODELE = {
    'super_admin': SuperAdmin,
    'directeur': Directeur,
    'professeur': Professeur,
    'etudiant': Etudiant,
}


def _compte_du_role(role_attendu):
    """Renvoie le compte du rôle attendu identifié par le JWT, ou None."""
    verify_jwt_in_request()
    claims = get_jwt()
    if not isinstance(claims, dict) or claims.get('role') != role_attendu:
        return None
    modele = ROLE_VERS_MODELE.get(role_attendu)
    return modele.query.get(get_jwt_identity())


def super_admin_courant():
    """Renvoie le SuperAdmin identifié par le JWT de la requête, ou None."""
    return _compte_du_role('super_admin')


def directeur_courant():
    """Renvoie le Directeur identifié par le JWT de la requête, ou None."""
    return _compte_du_role('directeur')


def prof_courant():
    """Renvoie le Professeur identifié par le JWT de la requête, ou None."""
    return _compte_du_role('professeur')


def etudiant_courant():
    """Renvoie l'Etudiant identifié par le JWT de la requête, ou None."""
    return _compte_du_role('etudiant')


def role_courant():
    """Renvoie ('super_admin'|'directeur'|'professeur'|'etudiant', objet) selon
    le claim `role` du JWT, ou (None, None)."""
    verify_jwt_in_request()
    claims = get_jwt()
    role = claims.get('role') if isinstance(claims, dict) else None
    if role not in ROLE_VERS_MODELE:
        return None, None
    compte = ROLE_VERS_MODELE[role].query.get(get_jwt_identity())
    if not compte:
        return None, None
    return role, compte
