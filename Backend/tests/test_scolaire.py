"""Tests du flux scolaire complet :

super admin -> établissement -> classes -> matières (coefficients propres
à chaque classe) -> professeurs affectés aux classes/matieres -> étudiants
inscrits -> notes saisies par les professeurs -> consultation par l'étudiant
-> demande de relevé de notes.
"""

from decimal import Decimal

from app.Config.exts import db
from app.Model.professeur_model import Professeur
from app.Model.etudiant_model import Etudiant


def creer_super_admin():
    from app.Model.super_admin_model import SuperAdmin
    admin = SuperAdmin(matricule='ADM01', mot_de_passe='admin123')
    db.session.add(admin)
    db.session.commit()
    return admin


def jeton_super_admin(app):
    from flask_jwt_extended import create_access_token
    with app.app_context():
        admin = creer_super_admin()
        return create_access_token(identity=str(admin.id),
                                   additional_claims={'role': 'super_admin'})


def test_flux_complet(client, app):
    entetes_admin = {'Authorization': f'Bearer {jeton_super_admin(app)}'}

    # 1. Création de l'établissement
    r = client.post('/etablissements/', json={'nom': 'Lycée Démo'},
                    headers=entetes_admin)
    assert r.status_code == 201, r.get_json()
    id_etab = r.get_json()['id_etablissement']

    # 2. Création de deux classes dans cet établissement
    r = client.post('/classes/', json={'nom_classe': '2nde A',
                                       'id_etablissement': id_etab,
                                       'niveau': '2nde'},
                    headers=entetes_admin)
    assert r.status_code == 201, r.get_json()
    id_classe_a = r.get_json()['id_classe']

    r = client.post('/classes/', json={'nom_classe': '1ere S',
                                       'id_etablissement': id_etab},
                    headers=entetes_admin)
    assert r.status_code == 201
    id_classe_b = r.get_json()['id_classe']

    # 3. Matières par classe, avec des coefficients spécifiques
    r = client.post('/matieres/', json={'nom_matiere': 'Mathématiques',
                                        'coefficient': 4,
                                        'id_classe': id_classe_a},
                    headers=entetes_admin)
    assert r.status_code == 201, r.get_json()
    id_maths_a = r.get_json()['id_matiere']

    r = client.post('/matieres/', json={'nom_matiere': 'Histoire',
                                        'coefficient': 2,
                                        'id_classe': id_classe_a},
                    headers=entetes_admin)
    assert r.status_code == 201

    # Même matière dans une autre classe, coefficient différent
    r = client.post('/matieres/', json={'nom_matiere': 'Mathématiques',
                                        'coefficient': 5,
                                        'id_classe': id_classe_b},
                    headers=entetes_admin)
    assert r.status_code == 201
    assert r.get_json()['coefficient'] == 5

    # Coefficient invalide refusé
    r = client.post('/matieres/', json={'nom_matiere': 'Sport',
                                        'coefficient': 0,
                                        'id_classe': id_classe_a},
                    headers=entetes_admin)
    assert r.status_code == 400

    # 4. Professeur avec identifiant + mot de passe
    r = client.post('/professeurs/', json={'matricule': 'PROF01',
                                           'nom': 'Dupont',
                                           'prenom': 'Jean',
                                           'mot_de_passe': 'prof123'},
                    headers=entetes_admin)
    assert r.status_code == 201, r.get_json()

    # Login professeur
    r = client.post('/professeurs/login', json={'matricule': 'PROF01',
                                                'mot_de_passe': 'prof123'})
    assert r.status_code == 200
    jeton_prof = r.get_json()['access_token']
    entetes_prof = {'Authorization': f'Bearer {jeton_prof}'}

    # 5. Affectation du professeur à la classe A sur Mathématiques
    r = client.post('/affectations/', json={'id_professeur': 1,
                                            'id_classe': id_classe_a,
                                            'id_matiere': id_maths_a},
                    headers=entetes_admin)
    assert r.status_code == 201, r.get_json()

    # 6. Inscription d'un étudiant dans la classe A
    r = client.post('/etudiants/', json={'matricule': 'ETU001',
                                         'nom': 'Martin',
                                         'prenom': 'Alice',
                                         'id_classe': id_classe_a,
                                         'mot_de_passe': 'etu123'},
                    headers=entetes_admin)
    assert r.status_code == 201, r.get_json()
    id_etudiant = r.get_json()['id_etudiant']

    # 7. Le professeur saisit une note pour son étudiant
    r = client.post('/notes/', json={'note': 15.5,
                                     'id_etudiant': id_etudiant,
                                     'id_matiere': id_maths_a,
                                     'semestre': 'S1'},
                    headers=entetes_prof)
    assert r.status_code == 201, r.get_json()

    # Un appel sans jeton ne peut pas saisir de note
    r = client.post('/notes/', json={'note': 12,
                                     'id_etudiant': id_etudiant,
                                     'id_matiere': id_maths_a,
                                     'semestre': 'S1'})
    assert r.status_code == 401

    # Note hors bornes refusée
    r = client.post('/notes/', json={'note': 25,
                                     'id_etudiant': id_etudiant,
                                     'id_matiere': id_maths_a},
                    headers=entetes_prof)
    assert r.status_code == 400

    # 8. L'étudiant consulte ses notes
    r = client.get(f'/notes/?id_etudiant={id_etudiant}')
    assert r.status_code == 200
    assert len(r.get_json()) == 1
    assert r.get_json()[0]['note'] == 15.5

    # 9. Bulletin avec moyenne pondérée par les coefficients
    r = client.post('/etudiants/login', json={'matricule': 'ETU001',
                                              'mot_de_passe': 'etu123'})
    assert r.status_code == 200
    jeton_etu = r.get_json()['access_token']
    entetes_etu = {'Authorization': f'Bearer {jeton_etu}'}

    r = client.get(f'/notes/bulletin/{id_etudiant}?semestre=S1')
    assert r.status_code == 200
    bulletin = r.get_json()
    assert bulletin['moyenne_generale'] == 15.5

    # 10. Demande de relevé de notes par l'étudiant
    r = client.post('/demandes-releve/', json={'motif': 'Dossier de bourse'},
                    headers=entetes_etu)
    assert r.status_code == 201, r.get_json()
    id_demande = r.get_json()['id_demande']

    # L'étudiant voit ses demandes
    r = client.get('/demandes-releve/', headers=entetes_etu)
    assert r.status_code == 200
    assert len(r.get_json()) == 1

    # Le super admin traite la demande
    r = client.put(f'/demandes-releve/{id_demande}/traiter',
                   json={'statut': 'traitee'}, headers=entetes_admin)
    assert r.status_code == 200
    assert r.get_json()['statut'] == 'traitee'


def test_professeur_ne_peut_pas_noter_hors_de_son_cours(client, app):
    entetes_admin = {'Authorization': f'Bearer {jeton_super_admin(app)}'}

    id_etab = client.post('/etablissements/', json={'nom': 'Ecole'},
                          headers=entetes_admin).get_json()['id_etablissement']
    id_classe = client.post('/classes/', json={'nom_classe': '6eme B',
                                               'id_etablissement': id_etab},
                            headers=entetes_admin).get_json()['id_classe']
    id_maths = client.post('/matieres/', json={'nom_matiere': 'Maths',
                                               'coefficient': 3,
                                               'id_classe': id_classe},
                           headers=entetes_admin).get_json()['id_matiere']
    id_histoire = client.post('/matieres/', json={'nom_matiere': 'Histoire',
                                                  'coefficient': 2,
                                                  'id_classe': id_classe},
                              headers=entetes_admin).get_json()['id_matiere']
    client.post('/professeurs/', json={'matricule': 'PROF09', 'nom': 'Nice',
                                       'mot_de_passe': 'prof123'},
                headers=entetes_admin)
    client.post('/affectations/', json={'id_professeur': 1, 'id_classe': id_classe,
                                        'id_matiere': id_maths},
                headers=entetes_admin)
    id_etudiant = client.post('/etudiants/', json={'matricule': 'ETU777',
                                                   'nom': 'Bernard', 'prenom': 'Marc',
                                                   'id_classe': id_classe,
                                                   'mot_de_passe': 'etu123'},
                              headers=entetes_admin).get_json()['id_etudiant']

    r = client.post('/professeurs/login', json={'matricule': 'PROF09',
                                                'mot_de_passe': 'prof123'})
    jeton_prof = r.get_json()['access_token']
    entetes_prof = {'Authorization': f'Bearer {jeton_prof}'}

    # Note refusée sur une matière qu'il n'occupe pas
    r = client.post('/notes/', json={'note': 10, 'id_etudiant': id_etudiant,
                                     'id_matiere': id_histoire},
                    headers=entetes_prof)
    assert r.status_code == 403

    # Note acceptée sur sa matière
    r = client.post('/notes/', json={'note': 10, 'id_etudiant': id_etudiant,
                                     'id_matiere': id_maths},
                    headers=entetes_prof)
    assert r.status_code == 201
