"""
Gestion du vocabulaire rôles / permissions de g_stock.

Distinction fondamentale (à respecter partout dans le code) :

  * **rôle**       = le poste occupé par le compte. UNE SEULE valeur.
                     Valeurs : 'admin', 'superviseur', 'magasinier', 'operateur'

  * **permission** = les capacités accordées au compte. PLUSIEURS valeurs,
                     stockées dans une chaîne séparée par des virgules.
                     Valeurs : 'expedition', 'reception', 'consommation',
                               'inventaire', 'validateur', 'administration'

Les comptes déjà présents en base utilisent l'ancien vocabulaire
('envoyeur', 'recepteur', 'administrateur', ...). Les tables LEGACY_ROLES /
LEGACY_PERMISSIONS assurent la traduction à la volée : aucune migration de
données n'est nécessaire, un ancien compte continue de fonctionner.
"""

from functools import wraps

from flask import jsonify, make_response
from flask_jwt_extended import verify_jwt_in_request, get_jwt


# ──────────────────────────────────────────────
# Vocabulaire courant
# ──────────────────────────────────────────────
ROLES = (
    'admin',
    'superviseur',
    'magasinier',
    'operateur',
)

PERMISSIONS = (
    'expedition',
    'reception',
    'consommation',
    'inventaire',
    'validateur',
    'administration',
)


# ──────────────────────────────────────────────
# Correspondances depuis l'ancien vocabulaire
# ──────────────────────────────────────────────
# Ancien rôle -> nouveau rôle
LEGACY_ROLES = {
    'envoyeur': 'operateur',
    'recepteur': 'operateur',
    'inventaire': 'magasinier',
    'administrateur': 'admin',
    # admin_controller émet le claim role='super_admin' : sans cette
    # correspondance, un super administrateur serait refusé par les
    # endpoints protégés alors qu'il est le compte le plus privilégié.
    'super_admin': 'admin',
}

# Ancienne permission -> nouvelle permission
LEGACY_PERMISSIONS = {
    'envoyeur': 'expedition',
    'recepteur': 'reception',
    'administrateur': 'administration',
    'validateur': 'validateur',
}


def normalize_role(role):
    """Traduit un rôle (ancien ou courant) vers le vocabulaire courant.

    Renvoie une chaîne en minuscules, ou '' si rien n'est exploitable.
    """
    if not role:
        return ''
    if not isinstance(role, str):
        role = str(role)
    role = role.strip().lower()
    if not role:
        return ''
    return LEGACY_ROLES.get(role, role)


def normalize_permissions(perm_str):
    """Traduit une liste de permissions vers le vocabulaire courant.

    Accepte une chaîne 'a,b,c', une liste/tuple/set, ou None.
    Renvoie toujours une liste de chaînes (éventuellement vide), sans doublon
    et en conservant l'ordre d'apparition.
    """
    if not perm_str:
        return []

    if isinstance(perm_str, (list, tuple, set)):
        brutes = list(perm_str)
    else:
        brutes = str(perm_str).split(',')

    resultat = []
    for brute in brutes:
        if brute is None:
            continue
        valeur = str(brute).strip().lower()
        if not valeur:
            continue
        valeur = LEGACY_PERMISSIONS.get(valeur, valeur)
        if valeur not in resultat:
            resultat.append(valeur)
    return resultat


def _extraire_role_et_permissions(claims_or_user):
    """Extrait (role, permissions) d'un dict de claims JWT ou d'un objet
    Utilisateur (ou de tout objet exposant .role / .permission)."""
    if claims_or_user is None:
        return '', []

    if isinstance(claims_or_user, dict):
        role = claims_or_user.get('role')
        perms = claims_or_user.get('permission')
        if perms is None:
            perms = claims_or_user.get('permissions')
    else:
        role = getattr(claims_or_user, 'role', None)
        perms = getattr(claims_or_user, 'permission', None)
        if perms is None:
            perms = getattr(claims_or_user, 'permissions', None)

    return normalize_role(role), normalize_permissions(perms)


def has_permission(claims_or_user, *permissions):
    """Vrai si le compte possède l'une des permissions demandées.

    Le rôle 'admin' a tous les droits : il passe toujours.
    Si aucune permission n'est demandée, seule l'authenticité du compte compte
    (on renvoie True dès qu'un rôle ou une permission est exploitable).
    """
    role, perms_compte = _extraire_role_et_permissions(claims_or_user)

    # L'admin a tout.
    if role == 'admin':
        return True

    demandees = normalize_permissions(list(permissions))
    if not demandees:
        return bool(role or perms_compte)

    for demandee in demandees:
        if demandee in perms_compte:
            return True
    return False


def permission_required(*permissions):
    """Décorateur : exige un JWT valide ET l'une des permissions demandées.

    Renvoie 403 {"message": "Permission refusée"} si la vérification échoue
    (JWT absent/invalide ou permission manquante).

    Usage :
        @permission_required('validateur')
        def post(self, id):
            ...
    """
    def decorateur(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            try:
                verify_jwt_in_request()
                claims = get_jwt()
            except Exception:
                return make_response(jsonify({"message": "Permission refusée"}), 403)

            if not has_permission(claims, *permissions):
                return make_response(jsonify({"message": "Permission refusée"}), 403)

            return fn(*args, **kwargs)
        return wrapper
    return decorateur
