"""Tests de conformité globale du backend scolaire.

Vérifie les invariants transverses :
  * aucun hash de mot de passe ne fuit dans les réponses API ;
  * chaque rôle accède uniquement à ce qui lui est permis ;
  * le flux complet super admin -> directeur -> professeur -> étudiant.
"""

import pytest
from flask_jwt_extended import create_access_token

from app.Config.exts import db
from app.Model.directeur_model import Directeur
from app.Model.etablissement_model import Etablissement
from app.Model.professeur_model import Professeur


# ══════════════════════════════════════════════
# Outils
# ══════════════════════════════════════════════

def admin_connecte(client):
    """Crée et connecte un super admin via les endpoints HTTP réels."""
    client.post('/super_admin/creer_admin', json={
        'matricule': 'SA-T', 'mot_de_passe': 'admin123'})
    r = client.post('/super_admin/login', json={
        'matricule': 'SA-T', 'mot_de_passe': 'admin123'})
    return {'Authorization': f"Bearer {r.get_json()['access_token']}"}


def jeton_pour(role, identite, **claims):
    extra = {'role': role, **claims}
    return {'Authorization': f'Bearer {create_access_token(identity=str(identite), additional_claims=extra)}'}


@pytest.fixture()
def etab(app):
    e = Etablissement(nom='Lycée Conformité')
    db.session.add(e)
    db.session.commit()
    return e


# ══════════════════════════════════════════════
# Sécurité : aucun hash de mot de passe ne doit fuir
# ══════════════════════════════════════════════

HASH_MARQUEUR = 'scrypt:'  # préfixe de generate_password_hash


def _assert_pas_de_hash(corps):
    texte = str(corps)
    assert HASH_MARQUEUR not in texte, f"Hash de mot de passe exposé : {texte[:200]}"


def test_aucun_hash_dans_le_super_admin(client, super_admin_http):
    r = client.get('/super_admin/', headers=super_admin_http['entetes'])
    for admin in r.get_json():
        _assert_pas_de_hash(admin)


def test_aucun_hash_dans_les_directeurs(client, super_admin_http, etab):
    entetes = super_admin_http['entetes']
    r = client.post('/directeurs/', json={
        'matricule': 'DIR-H1', 'nom': 'Dia', 'id_etablissement': etab.id_etablissement,
        'mot_de_passe': 'dir123'}, headers=entetes)
    assert r.status_code == 201
    _assert_pas_de_hash(r.get_json())

    r = client.get('/directeurs/')
    _assert_pas_de_hash(r.get_json())


def test_aucun_hash_dans_les_professeurs(client, super_admin_http):
    entetes = super_admin_http['entetes']
    client.post('/professeurs/', json={
        'matricule': 'PROF-H1', 'nom': 'Dupont', 'mot_de_passe': 'prof123'},
        headers=entetes)
    r = client.get('/professeurs/')
    _assert_pas_de_hash(r.get_json())


def test_aucun_hash_dans_les_etudiants(client, super_admin_http, etab):
    entetes = super_admin_http['entetes']
    id_classe = client.post('/classes/', json={
        'nom_classe': '1ere T', 'id_etablissement': etab.id_etablissement},
        headers=entetes).get_json()['id_classe']
    r = client.post('/etudiants/', json={
        'matricule': 'ETU-H1', 'nom': 'Martin', 'id_classe': id_classe,
        'mot_de_passe': 'etu123'}, headers=entetes)
    assert r.status_code == 201, r.get_json()
    _assert_pas_de_hash(r.get_json())

    r = client.get('/etudiants/')
    _assert_pas_de_hash(r.get_json())


# ══════════════════════════════════════════════
# Rôles : qui peut faire quoi
# ══════════════════════════════════════════════

def test_etudiant_ne_peut_rien_creer(client, super_admin_http, etab):
    entetes_etu = jeton_pour('etudiant', 1)
    for chemin, payload in [
        ('/etablissements/', {'nom': 'X'}),
        ('/classes/', {'nom_classe': 'X', 'id_etablissement': etab.id_etablissement}),
        ('/professeurs/', {'matricule': 'P', 'nom': 'X', 'mot_de_passe': 'p'}),
        ('/etudiants/', {'matricule': 'E', 'nom': 'X', 'id_classe': 1, 'mot_de_passe': 'p'}),
        ('/directeurs/', {'matricule': 'D', 'nom': 'X', 'mot_de_passe': 'p',
                          'id_etablissement': etab.id_etablissement}),
    ]:
        r = client.post(chemin, json=payload, headers=entetes_etu)
        assert r.status_code == 403, f"{chemin} devrait être interdit à un étudiant"


def test_professeur_ne_peut_pas_creer_de_comptes(client, super_admin_http, etab):
    prof = Professeur(matricule='PROF-R1', nom='Prof', mot_de_passe='p')
    db.session.add(prof)
    db.session.commit()
    entetes_prof = jeton_pour('professeur', prof.id_professeur)

    r = client.post('/directeurs/', json={
        'matricule': 'DIR-X', 'nom': 'X', 'mot_de_passe': 'p',
        'id_etablissement': etab.id_etablissement}, headers=entetes_prof)
    assert r.status_code == 403


def test_directeur_peut_creer_dans_son_etablissement(client, super_admin_http, etab):
    d = Directeur(matricule='DIR-R1', nom='Dia', mot_de_passe='p',
                  id_etablissement=etab.id_etablissement)
    db.session.add(d)
    db.session.commit()
    entetes_dir = jeton_pour('directeur', d.id_directeur,
                             id_etablissement=etab.id_etablissement)

    r = client.post('/classes/', json={
        'nom_classe': 'Terminale C', 'id_etablissement': etab.id_etablissement},
        headers=entetes_dir)
    assert r.status_code == 201, r.get_json()


def test_directeur_bloque_hors_de_son_etablissement(client, super_admin_http, etab):
    d = Directeur(matricule='DIR-R2', nom='Sow', mot_de_passe='p',
                  id_etablissement=etab.id_etablissement)
    db.session.add(d)
    db.session.commit()
    entetes_dir = jeton_pour('directeur', d.id_directeur,
                             id_etablissement=etab.id_etablissement)

    autre = Etablissement(nom='Autre école')
    db.session.add(autre)
    db.session.commit()

    r = client.post('/classes/', json={
        'nom_classe': 'Hack', 'id_etablissement': autre.id_etablissement},
        headers=entetes_dir)
    assert r.status_code == 403


# ══════════════════════════════════════════════
# Flux complet avec les vrais endpoints HTTP
# ══════════════════════════════════════════════

def test_flux_complet_super_admin_vers_etudiant(client, super_admin_http):
    entetes = super_admin_http['entetes']

    # 1. Établissement
    etab_id = client.post('/etablissements/', json={'nom': 'Lycée Flux'},
                          headers=entetes).get_json()['id_etablissement']

    # 2. Directeur
    r = client.post('/directeurs/', json={
        'matricule': 'DIR-F1', 'nom': 'Ndiaye', 'id_etablissement': etab_id,
        'mot_de_passe': 'dir123'}, headers=entetes)
    assert r.status_code == 201, r.get_json()

    # 3. Connexion du directeur
    r = client.post('/directeurs/login', json={'matricule': 'DIR-F1',
                                               'mot_de_passe': 'dir123'})
    assert r.status_code == 200
    entetes_dir = {'Authorization': f"Bearer {r.get_json()['access_token']}"}

    # 4. Le directeur crée la structure
    id_classe = client.post('/classes/', json={
        'nom_classe': '2nde F', 'id_etablissement': etab_id},
        headers=entetes_dir).get_json()['id_classe']
    id_matiere = client.post('/matieres/', json={
        'nom_matiere': 'Physique', 'coefficient': 3, 'id_classe': id_classe},
        headers=entetes_dir).get_json()['id_matiere']
    client.post('/professeurs/', json={
        'matricule': 'PROF-F1', 'nom': 'Faye', 'mot_de_passe': 'prof123'},
        headers=entetes_dir)
    client.post('/affectations/', json={
        'id_professeur': 1, 'id_classe': id_classe, 'id_matiere': id_matiere},
        headers=entetes_dir)
    id_etudiant = client.post('/etudiants/', json={
        'matricule': 'ETU-F1', 'nom': 'Gueye', 'id_classe': id_classe,
        'mot_de_passe': 'etu123'}, headers=entetes_dir).get_json()['id_etudiant']

    # 5. Le professeur note
    r = client.post('/professeurs/login', json={'matricule': 'PROF-F1',
                                                'mot_de_passe': 'prof123'})
    entetes_prof = {'Authorization': f"Bearer {r.get_json()['access_token']}"}
    r = client.post('/notes/', json={'note': 14, 'id_etudiant': id_etudiant,
                                     'id_matiere': id_matiere},
                    headers=entetes_prof)
    assert r.status_code == 201, r.get_json()

    # 6. L'étudiant consulte et demande un relevé
    r = client.post('/etudiants/login', json={'matricule': 'ETU-F1',
                                              'mot_de_passe': 'etu123'})
    entetes_etu = {'Authorization': f"Bearer {r.get_json()['access_token']}"}
    r = client.get(f"/notes/?id_etudiant={id_etudiant}", headers=entetes_etu)
    assert r.status_code == 200 and len(r.get_json()) == 1
    r = client.post('/demandes-releve/', json={'motif': 'Test'},
                    headers=entetes_etu)
    assert r.status_code == 201, r.get_json()

    # 7. Le directeur traite
    id_demande = client.get('/demandes-releve/', headers=entetes_dir).get_json()[0]['id_demande']
    r = client.put(f'/demandes-releve/{id_demande}/traiter',
                   json={'statut': 'traitee'}, headers=entetes_dir)
    assert r.status_code == 200
