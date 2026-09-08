"""Tests de l'authentification et de la chaine jeton -> permission.

Ces tests gardent une regression precise : flask-jwt-extended >= 4.7 refuse un
`sub` non textuel. Le login emettait `identity=utilisateur.id` (un entier), ce
qui rendait TOUS les jetons indecodables et faisait repondre 403 a tous les
endpoints proteges. Les tests ci-dessous echouent si cette erreur revient.
"""

from app.Model.utilisateur_model import Utilisateur


def _creer_compte(db, matricule='0001', nom='Alice', role='operateur',
                  permission='validateur', mot_de_passe='secret'):
    utilisateur = Utilisateur(matricule=matricule, nom=nom, role=role,
                              permission=permission, mot_de_passe=mot_de_passe)
    db.session.add(utilisateur)
    db.session.commit()
    return utilisateur


# ══════════════════════════════════════════════
# Connexion
# ══════════════════════════════════════════════

def test_connexion_reussie(client, db):
    _creer_compte(db)

    reponse = client.post('/utilisateurs/login',
                          json={'matricule': '0001', 'mot_de_passe': 'secret'})

    assert reponse.status_code == 200
    corps = reponse.get_json()
    assert corps['access_token']
    assert corps['user']['nom'] == 'Alice'
    assert corps['user']['role'] == 'operateur'
    assert corps['user']['permission'] == 'validateur'


def test_connexion_mot_de_passe_invalide(client, db):
    _creer_compte(db)
    reponse = client.post('/utilisateurs/login',
                          json={'matricule': '0001', 'mot_de_passe': 'faux'})
    assert reponse.status_code == 401


def test_connexion_compte_inconnu(client, db):
    reponse = client.post('/utilisateurs/login',
                          json={'matricule': 'inconnu', 'mot_de_passe': 'secret'})
    assert reponse.status_code == 401


def test_connexion_champs_manquants(client, db):
    reponse = client.post('/utilisateurs/login', json={'matricule': '0001'})
    assert reponse.status_code == 400


def test_le_mot_de_passe_est_hache(client, db):
    utilisateur = _creer_compte(db, mot_de_passe='secret')
    assert utilisateur.mot_de_passe != 'secret'
    assert utilisateur.check_password('secret') is True
    assert utilisateur.check_password('faux') is False


# ══════════════════════════════════════════════
# Le jeton emis doit reellement ouvrir les acces
# ══════════════════════════════════════════════

def test_le_jeton_du_login_est_accepte_par_un_endpoint_protege(client, db, payload_sortie):
    """Regression : un `sub` entier rendait le jeton indecodable et tout
    endpoint protege repondait 403, meme avec la bonne permission."""
    _creer_compte(db, permission='validateur')
    jeton = client.post('/utilisateurs/login',
                        json={'matricule': '0001', 'mot_de_passe': 'secret'}
                        ).get_json()['access_token']

    client.post('/Sortie/', json=payload_sortie(quantite_envoye=10))
    from app.Model.sortie_model import Sortie
    identifiant = db.session.query(Sortie).order_by(Sortie.id.desc()).first().id

    reponse = client.post(f'/Sortie/{identifiant}/valider',
                          json={'valide_par': 'Alice'},
                          headers={'Authorization': f'Bearer {jeton}'})

    assert reponse.status_code == 200, (
        'le jeton issu du login doit ouvrir les endpoints proteges')


def test_le_jeton_d_un_compte_sans_permission_est_refuse(client, db, payload_sortie):
    _creer_compte(db, permission='expedition')
    jeton = client.post('/utilisateurs/login',
                        json={'matricule': '0001', 'mot_de_passe': 'secret'}
                        ).get_json()['access_token']

    client.post('/Sortie/', json=payload_sortie())
    from app.Model.sortie_model import Sortie
    identifiant = db.session.query(Sortie).order_by(Sortie.id.desc()).first().id

    reponse = client.post(f'/Sortie/{identifiant}/valider', json={},
                          headers={'Authorization': f'Bearer {jeton}'})
    assert reponse.status_code == 403


def test_un_compte_au_vocabulaire_herite_reste_fonctionnel(client, db, payload_sortie):
    """Un compte cree avant le renommage doit continuer a passer sans migration."""
    _creer_compte(db, role='envoyeur', permission='envoyeur, recepteur, validateur')
    jeton = client.post('/utilisateurs/login',
                        json={'matricule': '0001', 'mot_de_passe': 'secret'}
                        ).get_json()['access_token']

    client.post('/Sortie/', json=payload_sortie(quantite_envoye=10))
    from app.Model.sortie_model import Sortie
    identifiant = db.session.query(Sortie).order_by(Sortie.id.desc()).first().id

    reponse = client.post(f'/Sortie/{identifiant}/valider',
                          json={'valide_par': 'Alice'},
                          headers={'Authorization': f'Bearer {jeton}'})
    assert reponse.status_code == 200


def test_un_jeton_invalide_est_refuse(client, db, payload_sortie):
    client.post('/Sortie/', json=payload_sortie())
    from app.Model.sortie_model import Sortie
    identifiant = db.session.query(Sortie).order_by(Sortie.id.desc()).first().id

    reponse = client.post(f'/Sortie/{identifiant}/valider', json={},
                          headers={'Authorization': 'Bearer nimporte.quoi.ici'})
    assert reponse.status_code == 403


# ══════════════════════════════════════════════
# Comptes
# ══════════════════════════════════════════════

def test_creation_de_compte(client, db):
    reponse = client.post('/utilisateurs/creer_utilisateur', json={
        'matricule': '0009', 'nom': 'Ines', 'role': 'magasinier',
        'permission': 'inventaire', 'mot_de_passe': 'secret',
    })

    assert reponse.status_code == 201
    cree = db.session.query(Utilisateur).filter_by(matricule='0009').first()
    assert cree.role == 'magasinier'
    assert cree.permission == 'inventaire'


def test_matricule_en_double_est_refuse(client, db):
    _creer_compte(db, matricule='0001')

    reponse = client.post('/utilisateurs/creer_utilisateur', json={
        'matricule': '0001', 'nom': 'Autre', 'role': 'operateur',
        'permission': 'expedition', 'mot_de_passe': 'secret',
    })
    assert reponse.status_code == 409


def test_modification_des_permissions(client, db):
    utilisateur = _creer_compte(db, permission='expedition')

    reponse = client.put(f'/utilisateurs/{utilisateur.id}',
                         json={'permission': 'expedition, validateur'})

    assert reponse.status_code == 200
    db.session.refresh(utilisateur)
    assert utilisateur.permission == 'expedition, validateur'


def test_suppression_de_compte(client, db):
    utilisateur = _creer_compte(db)
    identifiant = utilisateur.id

    assert client.delete(f'/utilisateurs/delete/{identifiant}').status_code == 200
    assert db.session.get(Utilisateur, identifiant) is None
