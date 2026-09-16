"""Tests du rôle Directeur :

Le super admin crée l'établissement puis le directeur. Le directeur gère
SON établissement (classes, matières, professeurs, étudiants, demandes).
Un directeur ne peut pas agir sur un autre établissement.
"""


def creer_admin_et_etablissement(client, app):
    """Crée un super admin + un établissement ; renvoie (entêtes admin, id_etab)."""
    from app.Config.exts import db
    from app.Model.super_admin_model import SuperAdmin
    from flask_jwt_extended import create_access_token

    with app.app_context():
        admin = SuperAdmin(matricule='ADM01', mot_de_passe='admin123')
        db.session.add(admin)
        db.session.commit()
        jeton = create_access_token(identity=str(admin.id),
                                    additional_claims={'role': 'super_admin'})
    entetes_admin = {'Authorization': f'Bearer {jeton}'}

    r = client.post('/etablissements/', json={'nom': 'Lycée A'},
                    headers=entetes_admin)
    id_etab = r.get_json()['id_etablissement']
    return entetes_admin, id_etab


def creer_directeur(client, entetes_admin, id_etab, matricule='DIR01'):
    r = client.post('/directeurs/', json={
        'matricule': matricule, 'nom': 'Dia', 'prenom': 'Aminata',
        'mot_de_passe': 'dir123', 'id_etablissement': id_etab,
    }, headers=entetes_admin)
    assert r.status_code == 201, r.get_json()
    return r.get_json()


def jetons_directeur(client, matricule='DIR01'):
    r = client.post('/directeurs/login', json={'matricule': matricule,
                                               'mot_de_passe': 'dir123'})
    assert r.status_code == 200, r.get_json()
    return {'Authorization': f"Bearer {r.get_json()['access_token']}"}


# ══════════════════════════════════════════════
# Création et connexion
# ══════════════════════════════════════════════

def test_seul_le_super_admin_cree_un_directeur(client, app):
    entetes_admin, id_etab = creer_admin_et_etablissement(client, app)

    # Sans jeton -> refusé (401) ; avec un jeton professeur -> 403
    r = client.post('/directeurs/', json={'matricule': 'DIR99', 'nom': 'X',
                                          'mot_de_passe': 'p', 'id_etablissement': id_etab})
    assert r.status_code == 401

    from flask_jwt_extended import create_access_token
    from app.Config.exts import db
    from app.Model.professeur_model import Professeur
    prof = Professeur(matricule='PROFUX', nom='Nimporte', mot_de_passe='p')
    db.session.add(prof)
    db.session.commit()
    jeton_prof = create_access_token(identity=str(prof.id_professeur),
                                     additional_claims={'role': 'professeur'})
    r = client.post('/directeurs/', json={'matricule': 'DIR99', 'nom': 'X',
                                          'mot_de_passe': 'p', 'id_etablissement': id_etab},
                    headers={'Authorization': f'Bearer {jeton_prof}'})
    assert r.status_code == 403

    createur = creer_directeur(client, entetes_admin, id_etab)
    assert createur['matricule'] == 'DIR01'


def test_matricule_directeur_en_double_refuse(client, app):
    entetes_admin, id_etab = creer_admin_et_etablissement(client, app)
    creer_directeur(client, entetes_admin, id_etab)

    r = client.post('/directeurs/', json={
        'matricule': 'DIR01', 'nom': 'Autre', 'mot_de_passe': 'p',
        'id_etablissement': id_etab,
    }, headers=entetes_admin)
    assert r.status_code == 409


def test_connexion_directeur(client, app):
    entetes_admin, id_etab = creer_admin_et_etablissement(client, app)
    creer_directeur(client, entetes_admin, id_etab)

    r = client.post('/directeurs/login', json={'matricule': 'DIR01',
                                               'mot_de_passe': 'dir123'})
    assert r.status_code == 200
    corps = r.get_json()
    assert corps['access_token']
    assert corps['directeur']['id_etablissement'] == id_etab

    r = client.post('/directeurs/login', json={'matricule': 'DIR01',
                                               'mot_de_passe': 'faux'})
    assert r.status_code == 401


# ══════════════════════════════════════════════
# Le directeur gère son établissement
# ══════════════════════════════════════════════

def test_le_directeur_gere_son_etablissement(client, app):
    entetes_admin, id_etab = creer_admin_et_etablissement(client, app)
    creer_directeur(client, entetes_admin, id_etab)
    entetes_dir = jetons_directeur(client)

    # Classe
    r = client.post('/classes/', json={'nom_classe': '3eme A',
                                       'id_etablissement': id_etab},
                    headers=entetes_dir)
    assert r.status_code == 201, r.get_json()
    id_classe = r.get_json()['id_classe']

    # Matière avec coefficient
    r = client.post('/matieres/', json={'nom_matiere': 'Maths', 'coefficient': 3,
                                        'id_classe': id_classe},
                    headers=entetes_dir)
    assert r.status_code == 201

    # Professeur + affectation
    r = client.post('/professeurs/', json={'matricule': 'PROF01', 'nom': 'Dupont',
                                           'mot_de_passe': 'prof123'},
                    headers=entetes_dir)
    assert r.status_code == 201, r.get_json()
    id_matiere = client.get(f'/matieres/?id_classe={id_classe}').get_json()[0]['id_matiere']
    r = client.post('/affectations/', json={'id_professeur': 1,
                                            'id_classe': id_classe,
                                            'id_matiere': id_matiere},
                    headers=entetes_dir)
    assert r.status_code == 201, r.get_json()

    # Étudiant
    r = client.post('/etudiants/', json={'matricule': 'ETU001', 'nom': 'Martin',
                                         'id_classe': id_classe,
                                         'mot_de_passe': 'etu123'},
                    headers=entetes_dir)
    assert r.status_code == 201, r.get_json()


def test_le_directeur_ne_peut_pas_agir_sur_un_autre_etablissement(client, app):
    entetes_admin, id_etab_a = creer_admin_et_etablissement(client, app)
    creer_directeur(client, entetes_admin, id_etab_a)
    entetes_dir = jetons_directeur(client)

    # Deuxième établissement, sans directeur
    r = client.post('/etablissements/', json={'nom': 'Lycée B'},
                    headers=entetes_admin)
    id_etab_b = r.get_json()['id_etablissement']

    # Classe refusée dans l'établissement B
    r = client.post('/classes/', json={'nom_classe': '6eme', 'id_etablissement': id_etab_b},
                    headers=entetes_dir)
    assert r.status_code == 403

    # Classe autorisée dans le sien
    r = client.post('/classes/', json={'nom_classe': '6eme', 'id_etablissement': id_etab_a},
                    headers=entetes_dir)
    assert r.status_code == 201


def test_directeur_traite_les_demandes_de_son_etablissement(client, app):
    entetes_admin, id_etab = creer_admin_et_etablissement(client, app)
    creer_directeur(client, entetes_admin, id_etab)
    entetes_dir = jetons_directeur(client)

    id_classe = client.post('/classes/', json={'nom_classe': '2nde',
                                               'id_etablissement': id_etab},
                            headers=entetes_dir).get_json()['id_classe']
    id_etudiant = client.post('/etudiants/', json={'matricule': 'ETU55', 'nom': 'Bah',
                                                   'id_classe': id_classe,
                                                   'mot_de_passe': 'etu123'},
                              headers=entetes_dir).get_json()['id_etudiant']

    # L'étudiant fait une demande
    r = client.post('/etudiants/login', json={'matricule': 'ETU55',
                                              'mot_de_passe': 'etu123'})
    jeton_etu = r.get_json()['access_token']
    r = client.post('/demandes-releve/', json={'motif': 'Bourse'},
                    headers={'Authorization': f'Bearer {jeton_etu}'})
    assert r.status_code == 201

    # Le directeur la voit et la traite
    r = client.get('/demandes-releve/', headers=entetes_dir)
    assert r.status_code == 200
    assert len(r.get_json()) == 1
    id_demande = r.get_json()[0]['id_demande']

    r = client.put(f'/demandes-releve/{id_demande}/traiter',
                   json={'statut': 'traitee'}, headers=entetes_dir)
    assert r.status_code == 200
    assert r.get_json()['statut'] == 'traitee'


def test_le_super_admin_ne_cree_pas_de_classe_a_la_place_du_directeur(client, app):
    """Le super admin garde techniquement le droit (rôle souverain) mais le
    flux nominal est : le directeur crée les classes de son établissement."""
    entetes_admin, id_etab = creer_admin_et_etablissement(client, app)

    r = client.post('/classes/', json={'nom_classe': 'Terminale',
                                       'id_etablissement': id_etab},
                    headers=entetes_admin)
    assert r.status_code == 201
