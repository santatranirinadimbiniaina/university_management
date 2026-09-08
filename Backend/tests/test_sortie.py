"""Tests des mouvements de stock : envois, consommations, validation, rejet
et accuse de reception.

Regle metier verifiee ici : c'est la VALIDATION qui affecte le stock, jamais
la creation ni la reception. Et le signataire d'une reception vient du compte
authentifie, plus d'un champ de saisie libre.
"""

from datetime import date

from app.Model.sortie_model import Sortie


def _dernier_mouvement(db):
    return db.session.query(Sortie).order_by(Sortie.id.desc()).first()


# ══════════════════════════════════════════════
# Creation
# ══════════════════════════════════════════════

def test_creation_mouvement(client, db, payload_sortie):
    reponse = client.post('/Sortie/', json=payload_sortie())
    assert reponse.status_code == 201

    mouvement = _dernier_mouvement(db)
    assert mouvement.quantite_envoye == 30
    assert mouvement.statut == 'en_attente'
    assert mouvement.createur == 'Alice'


def test_creation_type_transfert_par_defaut(client, db, payload_sortie):
    client.post('/Sortie/', json=payload_sortie())
    assert _dernier_mouvement(db).type_mouvement == 'transfert'


def test_creation_consommation(client, db, payload_sortie):
    """Une consommation n'a pas de depot recepteur : seul le signataire compte."""
    client.post('/Sortie/', json=payload_sortie(
        type_mouvement='consommation', motif='Cantine du personnel', depot_entree=None))

    mouvement = _dernier_mouvement(db)
    assert mouvement.type_mouvement == 'consommation'
    assert mouvement.motif == 'Cantine du personnel'
    assert mouvement.depot_entree is None


def test_creation_convertit_la_date_recue_en_json(client, db, payload_sortie):
    """La date arrive en chaine 'AAAA-MM-JJ' et doit devenir un objet date."""
    client.post('/Sortie/', json=payload_sortie(date='2026-08-12'))
    assert _dernier_mouvement(db).date == date(2026, 8, 12)


def test_creation_n_affecte_pas_le_stock(client, payload_sortie, referentiel, quantite_article):
    client.post('/Sortie/', json=payload_sortie())
    assert quantite_article(referentiel['article']) == 100


# ══════════════════════════════════════════════
# Validation
# ══════════════════════════════════════════════

def test_validation_sans_jeton_est_refusee(client, db, payload_sortie):
    client.post('/Sortie/', json=payload_sortie())
    identifiant = _dernier_mouvement(db).id

    reponse = client.post(f'/Sortie/{identifiant}/valider', json={})
    assert reponse.status_code == 403


def test_validation_sans_permission_est_refusee(client, db, payload_sortie, sans_droit):
    client.post('/Sortie/', json=payload_sortie())
    identifiant = _dernier_mouvement(db).id

    reponse = client.post(f'/Sortie/{identifiant}/valider', json={}, headers=sans_droit)
    assert reponse.status_code == 403
    assert 'refus' in reponse.get_json()['message'].lower()


def test_validation_diminue_le_stock(client, db, payload_sortie, validateur,
                                     referentiel, quantite_article):
    client.post('/Sortie/', json=payload_sortie(quantite_envoye=30))
    identifiant = _dernier_mouvement(db).id

    reponse = client.post(f'/Sortie/{identifiant}/valider',
                          json={'valide_par': 'Bob', 'matricule_validateur': 'V001'},
                          headers=validateur)

    assert reponse.status_code == 200
    assert quantite_article(referentiel['article']) == 70
    mouvement = _dernier_mouvement(db)
    assert mouvement.statut == 'approuve'
    assert mouvement.valide_par == 'Bob'
    assert mouvement.date_validation is not None


def test_un_admin_peut_valider_sans_permission_listee(client, db, payload_sortie, admin,
                                                      referentiel, quantite_article):
    client.post('/Sortie/', json=payload_sortie(quantite_envoye=10))
    identifiant = _dernier_mouvement(db).id

    reponse = client.post(f'/Sortie/{identifiant}/valider',
                          json={'valide_par': 'Root'}, headers=admin)
    assert reponse.status_code == 200
    assert quantite_article(referentiel['article']) == 90


def test_double_validation_est_refusee(client, db, payload_sortie, validateur,
                                       referentiel, quantite_article):
    client.post('/Sortie/', json=payload_sortie(quantite_envoye=30))
    identifiant = _dernier_mouvement(db).id
    client.post(f'/Sortie/{identifiant}/valider', json={'valide_par': 'Bob'}, headers=validateur)

    reponse = client.post(f'/Sortie/{identifiant}/valider',
                          json={'valide_par': 'Bob'}, headers=validateur)

    assert reponse.status_code == 409
    # Le stock ne doit surtout pas etre decremente deux fois.
    assert quantite_article(referentiel['article']) == 70


def test_validation_refusee_si_stock_insuffisant(client, db, payload_sortie, validateur,
                                                 referentiel, quantite_article):
    client.post('/Sortie/', json=payload_sortie(quantite_envoye=500))
    identifiant = _dernier_mouvement(db).id

    reponse = client.post(f'/Sortie/{identifiant}/valider',
                          json={'valide_par': 'Bob'}, headers=validateur)

    assert reponse.status_code == 409
    assert 'insuffisant' in reponse.get_json()['message'].lower()
    assert quantite_article(referentiel['article']) == 100
    assert _dernier_mouvement(db).statut == 'en_attente'


def test_validation_article_inexistant(client, db, payload_sortie, validateur):
    client.post('/Sortie/', json=payload_sortie(id_article=9999))
    identifiant = _dernier_mouvement(db).id

    reponse = client.post(f'/Sortie/{identifiant}/valider',
                          json={'valide_par': 'Bob'}, headers=validateur)
    assert reponse.status_code == 404


def test_validation_mouvement_inexistant(client, validateur):
    reponse = client.post('/Sortie/999999/valider', json={'valide_par': 'Bob'},
                          headers=validateur)
    assert reponse.status_code == 404


# ══════════════════════════════════════════════
# Rejet
# ══════════════════════════════════════════════

def test_rejet_conserve_la_ligne_et_le_stock(client, db, payload_sortie, validateur,
                                             referentiel, quantite_article):
    client.post('/Sortie/', json=payload_sortie(motif='Cantine'))
    identifiant = _dernier_mouvement(db).id

    reponse = client.post(f'/Sortie/{identifiant}/rejeter',
                          json={'valide_par': 'Bob', 'matricule_validateur': 'V001',
                                'motif': 'Justificatif manquant'},
                          headers=validateur)

    assert reponse.status_code == 200
    mouvement = _dernier_mouvement(db)
    assert mouvement is not None, "le rejet ne doit pas supprimer l'enregistrement"
    assert mouvement.statut == 'rejete'
    assert quantite_article(referentiel['article']) == 100


def test_rejet_n_ecrase_pas_le_motif_declare(client, db, payload_sortie, validateur):
    """Le motif de l'auteur et celui du validateur sont deux informations
    distinctes : le refus ne doit pas effacer la raison de la demande."""
    client.post('/Sortie/', json=payload_sortie(motif='Cantine du personnel'))
    identifiant = _dernier_mouvement(db).id

    client.post(f'/Sortie/{identifiant}/rejeter',
                json={'valide_par': 'Bob', 'motif': 'Justificatif manquant'},
                headers=validateur)

    mouvement = _dernier_mouvement(db)
    assert mouvement.motif == 'Cantine du personnel'
    assert mouvement.motif_rejet == 'Justificatif manquant'


def test_double_rejet_est_refuse(client, db, payload_sortie, validateur):
    client.post('/Sortie/', json=payload_sortie())
    identifiant = _dernier_mouvement(db).id
    client.post(f'/Sortie/{identifiant}/rejeter',
                json={'valide_par': 'Bob', 'motif': 'x'}, headers=validateur)

    reponse = client.post(f'/Sortie/{identifiant}/rejeter',
                          json={'valide_par': 'Bob', 'motif': 'y'}, headers=validateur)
    assert reponse.status_code == 409


def test_rejet_sans_permission_est_refuse(client, db, payload_sortie, sans_droit):
    client.post('/Sortie/', json=payload_sortie())
    identifiant = _dernier_mouvement(db).id

    reponse = client.post(f'/Sortie/{identifiant}/rejeter',
                          json={'motif': 'x'}, headers=sans_droit)
    assert reponse.status_code == 403


# ══════════════════════════════════════════════
# Accuse de reception
# ══════════════════════════════════════════════

def test_accuse_de_reception_enregistre_le_signataire(client, db, payload_sortie, referentiel):
    client.post('/Sortie/', json=payload_sortie(statut='approuve'))
    identifiant = _dernier_mouvement(db).id

    reponse = client.post(f'/Sortie/{identifiant}/accuser_reception', json={
        'quantite_recu': 30,
        'signataire': 'Claire',
        'matricule_signataire': 'R001',
        'depot_entree': referentiel['depot'],
        'note': '',
    })

    assert reponse.status_code == 200
    mouvement = _dernier_mouvement(db)
    assert mouvement.statut == 'recu'
    assert mouvement.signataire == 'Claire'
    assert mouvement.matricule_signataire == 'R001'
    assert mouvement.date_signature is not None
    assert mouvement.quantite_recu == 30


def test_accuse_de_reception_accepte_un_ecart_avec_note(client, db, payload_sortie):
    client.post('/Sortie/', json=payload_sortie(quantite_envoye=30, statut='approuve'))
    identifiant = _dernier_mouvement(db).id

    reponse = client.post(f'/Sortie/{identifiant}/accuser_reception', json={
        'quantite_recu': 28, 'signataire': 'Claire',
        'matricule_signataire': 'R001', 'note': 'Deux bidons perces',
    })

    assert reponse.status_code == 200
    mouvement = _dernier_mouvement(db)
    assert mouvement.quantite_recu == 28
    assert mouvement.note == 'Deux bidons perces'


def test_double_accuse_de_reception_est_refuse(client, db, payload_sortie):
    client.post('/Sortie/', json=payload_sortie(statut='approuve'))
    identifiant = _dernier_mouvement(db).id
    client.post(f'/Sortie/{identifiant}/accuser_reception',
                json={'quantite_recu': 30, 'signataire': 'Claire'})

    reponse = client.post(f'/Sortie/{identifiant}/accuser_reception',
                          json={'quantite_recu': 30, 'signataire': 'David'})

    assert reponse.status_code == 409
    # Le premier signataire fait foi : personne ne peut le remplacer apres coup.
    assert _dernier_mouvement(db).signataire == 'Claire'


def test_accuse_de_reception_mouvement_inexistant(client):
    reponse = client.post('/Sortie/999999/accuser_reception',
                          json={'quantite_recu': 1, 'signataire': 'Claire'})
    assert reponse.status_code == 404


def test_accuse_de_reception_n_affecte_pas_le_stock(client, db, payload_sortie,
                                                    referentiel, quantite_article):
    """Seule la validation touche au stock ; la reception ne fait que tracer."""
    client.post('/Sortie/', json=payload_sortie(statut='approuve'))
    identifiant = _dernier_mouvement(db).id

    client.post(f'/Sortie/{identifiant}/accuser_reception',
                json={'quantite_recu': 30, 'signataire': 'Claire'})

    assert quantite_article(referentiel['article']) == 100


# ══════════════════════════════════════════════
# Lecture
# ══════════════════════════════════════════════

def test_filtre_par_organisation_expose_les_nouvelles_colonnes(client, db, payload_sortie,
                                                               referentiel):
    client.post('/Sortie/', json=payload_sortie(type_mouvement='consommation'))

    reponse = client.get(f"/Sortie/filtre_sortie/{referentiel['org']}")
    assert reponse.status_code == 200

    lignes = reponse.get_json()
    assert len(lignes) == 1
    for colonne in ('type_mouvement', 'signataire', 'createur', 'motif', 'motif_rejet'):
        assert colonne in lignes[0], f"colonne {colonne} absente de la reponse"
    assert lignes[0]['type_mouvement'] == 'consommation'


def test_filtre_par_depot(client, payload_sortie, referentiel):
    client.post('/Sortie/', json=payload_sortie())

    reponse = client.get(
        f"/Sortie/filtre_sortie/{referentiel['org']}/{referentiel['depot']}")
    assert reponse.status_code == 200
    assert len(reponse.get_json()) == 1


def test_suppression(client, db, payload_sortie):
    client.post('/Sortie/', json=payload_sortie())
    identifiant = _dernier_mouvement(db).id

    assert client.delete(f'/Sortie/{identifiant}').status_code == 200
    assert db.session.get(Sortie, identifiant) is None
