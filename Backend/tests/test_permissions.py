"""Tests du module de permissions.

Ce module porte la regle centrale du projet : le ROLE decrit le poste, les
PERMISSIONS decrivent les actions, et seules les permissions ouvrent l'acces
(le role `admin` etant souverain).
"""

import pytest

from app.utils.permissions import (
    LEGACY_PERMISSIONS,
    LEGACY_ROLES,
    PERMISSIONS,
    ROLES,
    has_permission,
    normalize_permissions,
    normalize_role,
)


# ──────────────────────────────────────────────
# normalize_role
# ──────────────────────────────────────────────

@pytest.mark.parametrize('entree, attendu', [
    ('admin', 'admin'),
    ('superviseur', 'superviseur'),
    ('magasinier', 'magasinier'),
    ('operateur', 'operateur'),
    # Vocabulaire herite : les comptes deja en base doivent rester valides.
    ('envoyeur', 'operateur'),
    ('recepteur', 'operateur'),
    ('inventaire', 'magasinier'),
    ('administrateur', 'admin'),
    ('super_admin', 'admin'),
    # Robustesse de saisie.
    ('  Admin  ', 'admin'),
    ('ENVOYEUR', 'operateur'),
    ('', ''),
    (None, ''),
])
def test_normalize_role(entree, attendu):
    assert normalize_role(entree) == attendu


def test_normalize_role_valeur_inconnue_est_conservee():
    """Un role inconnu n'est pas efface : il reste lisible pour diagnostic."""
    assert normalize_role('comptable') == 'comptable'


def test_tous_les_roles_legacy_pointent_vers_un_role_valide():
    for cible in LEGACY_ROLES.values():
        assert cible in ROLES


# ──────────────────────────────────────────────
# normalize_permissions
# ──────────────────────────────────────────────

def test_normalize_permissions_chaine_simple():
    assert normalize_permissions('expedition, reception') == ['expedition', 'reception']


def test_normalize_permissions_traduit_le_vocabulaire_herite():
    assert normalize_permissions('envoyeur, recepteur, administrateur') == [
        'expedition', 'reception', 'administration',
    ]


def test_normalize_permissions_supprime_les_doublons_apres_traduction():
    """« envoyeur » et « expedition » designent la meme chose : une seule entree."""
    assert normalize_permissions('envoyeur, expedition') == ['expedition']


def test_normalize_permissions_accepte_une_liste():
    assert normalize_permissions(['inventaire', 'validateur']) == ['inventaire', 'validateur']


@pytest.mark.parametrize('entree', ['', None, '   ', ',,', [], ' , , '])
def test_normalize_permissions_valeurs_vides(entree):
    assert normalize_permissions(entree) == []


def test_normalize_permissions_ignore_les_espaces_et_la_casse():
    assert normalize_permissions('  VALIDATEUR ,  Inventaire ') == ['validateur', 'inventaire']


def test_toutes_les_permissions_legacy_pointent_vers_une_permission_valide():
    for cible in LEGACY_PERMISSIONS.values():
        assert cible in PERMISSIONS


# ──────────────────────────────────────────────
# has_permission
# ──────────────────────────────────────────────

def test_admin_possede_toutes_les_permissions_meme_sans_liste():
    """Le role admin est souverain : c'est la seule exception a la regle."""
    claims = {'role': 'admin', 'permission': ''}
    for permission in PERMISSIONS:
        assert has_permission(claims, permission) is True


def test_super_admin_est_traite_comme_un_admin():
    assert has_permission({'role': 'super_admin'}, 'validateur') is True


def test_permission_accordee_quand_elle_est_presente():
    claims = {'role': 'operateur', 'permission': 'expedition, validateur'}
    assert has_permission(claims, 'validateur') is True


def test_permission_refusee_quand_elle_est_absente():
    claims = {'role': 'operateur', 'permission': 'expedition'}
    assert has_permission(claims, 'validateur') is False


def test_plusieurs_permissions_demandees_sont_un_ou_logique():
    claims = {'role': 'magasinier', 'permission': 'inventaire'}
    assert has_permission(claims, 'administration', 'inventaire') is True
    assert has_permission(claims, 'administration', 'validateur') is False


def test_permission_heritee_est_reconnue():
    """Un compte cree avant le renommage doit continuer a passer."""
    claims = {'role': 'envoyeur', 'permission': 'envoyeur, recepteur'}
    assert has_permission(claims, 'expedition') is True
    assert has_permission(claims, 'reception') is True
    assert has_permission(claims, 'validateur') is False


def test_le_role_seul_n_ouvre_aucun_droit():
    """Un poste eleve sans permission ne donne pas acces : c'est tout l'objet
    de la separation role / permission."""
    claims = {'role': 'superviseur', 'permission': ''}
    assert has_permission(claims, 'validateur') is False


def test_has_permission_accepte_un_objet_utilisateur():
    class FauxUtilisateur:
        role = 'operateur'
        permission = 'validateur'

    assert has_permission(FauxUtilisateur(), 'validateur') is True


def test_has_permission_sur_none_est_faux():
    assert has_permission(None, 'validateur') is False


def test_roles_et_permissions_sont_des_vocabulaires_disjoints():
    """Le defaut d'origine : « envoyeur » etait a la fois un role et une
    permission. Les deux listes ne doivent plus jamais se recouper."""
    assert set(ROLES).isdisjoint(set(PERMISSIONS))
