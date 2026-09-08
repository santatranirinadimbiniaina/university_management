"""Tests des entrees de stock soumises a validation.

Deux flux convergent vers cette table :
  * les saisies d'inventaire ('nouvel_article', 'reappro'), faites par les
    comptes disposant de la permission `inventaire` ;
  * les retours de consommables ('retour_consommable'), declares depuis la
    rubrique Consommables.

Dans les deux cas, le stock n'est affecte qu'a la validation.
"""

from datetime import date

from app.Model.article_model import Article
from app.Model.entree_stock_model import EntreeStock


def _derniere_entree(db):
    return db.session.query(EntreeStock).order_by(EntreeStock.id.desc()).first()


# ══════════════════════════════════════════════
# Creation
# ══════════════════════════════════════════════

def test_creation_entree(client, db, payload_entree):
    reponse = client.post('/entree_stock/', json=payload_entree())
    assert reponse.status_code == 201

    entree = _derniere_entree(db)
    assert entree.type_entree == 'reappro'
    assert entree.quantite == 10
    assert entree.createur == 'Alice'
    assert entree.date_creation is not None


def test_le_statut_est_impose_par_le_serveur(client, db, payload_entree):
    """Un client malveillant ne doit pas pouvoir s'auto-valider."""
    client.post('/entree_stock/', json=payload_entree(statut='valide'))
    assert _derniere_entree(db).statut == 'en_attente'


def test_creation_conserve_le_motif_declare(client, db, payload_entree):
    client.post('/entree_stock/', json=payload_entree(motif='Reste de chantier'))
    assert _derniere_entree(db).motif == 'Reste de chantier'


def test_creation_convertit_la_date_recue_en_json(client, db, payload_entree):
    client.post('/entree_stock/', json=payload_entree(date='2026-08-12'))
    assert _derniere_entree(db).date == date(2026, 8, 12)


def test_creation_n_affecte_pas_le_stock(client, payload_entree, referentiel, quantite_article):
    client.post('/entree_stock/', json=payload_entree(quantite=50))
    assert quantite_article(referentiel['article']) == 100


# ══════════════════════════════════════════════
# Validation : reapprovisionnement
# ══════════════════════════════════════════════

def test_validation_reappro_augmente_le_stock(client, db, payload_entree, validateur,
                                              referentiel, quantite_article):
    client.post('/entree_stock/', json=payload_entree(type_entree='reappro', quantite=25))
    identifiant = _derniere_entree(db).id

    reponse = client.post(f'/entree_stock/{identifiant}/valider',
                          json={'valide_par': 'Bob', 'matricule_validateur': 'V001'},
                          headers=validateur)

    assert reponse.status_code == 200
    assert quantite_article(referentiel['article']) == 125
    entree = _derniere_entree(db)
    assert entree.statut == 'valide'
    assert entree.valide_par == 'Bob'
    assert entree.date_validation is not None


def test_validation_reappro_article_inexistant(client, db, payload_entree, validateur):
    client.post('/entree_stock/', json=payload_entree(id_article=9999))
    identifiant = _derniere_entree(db).id

    reponse = client.post(f'/entree_stock/{identifiant}/valider',
                          json={'valide_par': 'Bob'}, headers=validateur)
    assert reponse.status_code == 404


# ══════════════════════════════════════════════
# Validation : nouvel article
# ══════════════════════════════════════════════

def test_validation_nouvel_article_cree_l_article(client, db, payload_entree, validateur,
                                                  referentiel):
    client.post('/entree_stock/', json=payload_entree(
        type_entree='nouvel_article', id_article=None,
        nom_article='Sucre', quantite=50, unite='kg'))
    identifiant = _derniere_entree(db).id

    reponse = client.post(f'/entree_stock/{identifiant}/valider',
                          json={'valide_par': 'Bob'}, headers=validateur)

    assert reponse.status_code == 200
    article = db.session.query(Article).filter_by(nom_article='Sucre').first()
    assert article is not None, "la validation doit creer l'article"
    assert article.quantite == 50
    assert article.unite == 'kg'
    assert article.id_depot == referentiel['depot']
    # L'entree garde le lien vers l'article qu'elle a fait naitre.
    assert _derniere_entree(db).id_article == article.id_article


def test_validation_nouvel_article_ne_touche_pas_les_autres(client, db, payload_entree,
                                                            validateur, referentiel,
                                                            quantite_article):
    client.post('/entree_stock/', json=payload_entree(
        type_entree='nouvel_article', id_article=None, nom_article='Sucre', quantite=50))
    identifiant = _derniere_entree(db).id

    client.post(f'/entree_stock/{identifiant}/valider',
                json={'valide_par': 'Bob'}, headers=validateur)

    assert quantite_article(referentiel['article']) == 100


# ══════════════════════════════════════════════
# Validation : retour de consommable
# ══════════════════════════════════════════════

def test_validation_retour_recredite_le_depot_d_origine(client, db, payload_entree,
                                                        validateur, referentiel,
                                                        quantite_article):
    client.post('/entree_stock/', json=payload_entree(
        type_entree='retour_consommable', quantite=8,
        motif='Reste non consomme', signataire='Alice', id_sortie_origine=42))
    identifiant = _derniere_entree(db).id

    reponse = client.post(f'/entree_stock/{identifiant}/valider',
                          json={'valide_par': 'Bob'}, headers=validateur)

    assert reponse.status_code == 200
    assert quantite_article(referentiel['article']) == 108
    entree = _derniere_entree(db)
    assert entree.statut == 'valide'
    assert entree.signataire == 'Alice'
    assert entree.id_sortie_origine == 42


# ══════════════════════════════════════════════
# Droits et double traitement
# ══════════════════════════════════════════════

def test_validation_sans_jeton_est_refusee(client, db, payload_entree):
    client.post('/entree_stock/', json=payload_entree())
    identifiant = _derniere_entree(db).id

    assert client.post(f'/entree_stock/{identifiant}/valider', json={}).status_code == 403


def test_validation_sans_permission_est_refusee(client, db, payload_entree, sans_droit,
                                                referentiel, quantite_article):
    client.post('/entree_stock/', json=payload_entree())
    identifiant = _derniere_entree(db).id

    reponse = client.post(f'/entree_stock/{identifiant}/valider', json={}, headers=sans_droit)

    assert reponse.status_code == 403
    assert quantite_article(referentiel['article']) == 100


def test_un_admin_peut_valider(client, db, payload_entree, admin, referentiel, quantite_article):
    client.post('/entree_stock/', json=payload_entree(quantite=5))
    identifiant = _derniere_entree(db).id

    reponse = client.post(f'/entree_stock/{identifiant}/valider',
                          json={'valide_par': 'Root'}, headers=admin)
    assert reponse.status_code == 200
    assert quantite_article(referentiel['article']) == 105


def test_double_validation_est_refusee(client, db, payload_entree, validateur,
                                       referentiel, quantite_article):
    client.post('/entree_stock/', json=payload_entree(quantite=10))
    identifiant = _derniere_entree(db).id
    client.post(f'/entree_stock/{identifiant}/valider',
                json={'valide_par': 'Bob'}, headers=validateur)

    reponse = client.post(f'/entree_stock/{identifiant}/valider',
                          json={'valide_par': 'Bob'}, headers=validateur)

    assert reponse.status_code == 409
    # Le stock ne doit pas etre credite deux fois.
    assert quantite_article(referentiel['article']) == 110


def test_validation_apres_rejet_est_refusee(client, db, payload_entree, validateur,
                                            referentiel, quantite_article):
    client.post('/entree_stock/', json=payload_entree())
    identifiant = _derniere_entree(db).id
    client.post(f'/entree_stock/{identifiant}/rejeter',
                json={'valide_par': 'Bob', 'motif': 'x'}, headers=validateur)

    reponse = client.post(f'/entree_stock/{identifiant}/valider',
                          json={'valide_par': 'Bob'}, headers=validateur)

    assert reponse.status_code == 409
    assert quantite_article(referentiel['article']) == 100


def test_validation_entree_inexistante(client, validateur):
    reponse = client.post('/entree_stock/999999/valider',
                          json={'valide_par': 'Bob'}, headers=validateur)
    assert reponse.status_code == 404


# ══════════════════════════════════════════════
# Rejet
# ══════════════════════════════════════════════

def test_rejet_n_affecte_pas_le_stock(client, db, payload_entree, validateur,
                                      referentiel, quantite_article):
    client.post('/entree_stock/', json=payload_entree(quantite=10))
    identifiant = _derniere_entree(db).id

    reponse = client.post(f'/entree_stock/{identifiant}/rejeter',
                          json={'valide_par': 'Bob', 'matricule_validateur': 'V001',
                                'motif': 'Justificatif manquant'},
                          headers=validateur)

    assert reponse.status_code == 200
    assert quantite_article(referentiel['article']) == 100
    assert _derniere_entree(db).statut == 'rejete'


def test_rejet_n_ecrase_pas_le_motif_declare(client, db, payload_entree, validateur):
    client.post('/entree_stock/', json=payload_entree(motif='Reste non consomme'))
    identifiant = _derniere_entree(db).id

    client.post(f'/entree_stock/{identifiant}/rejeter',
                json={'valide_par': 'Bob', 'motif': 'Quantite invraisemblable'},
                headers=validateur)

    entree = _derniere_entree(db)
    assert entree.motif == 'Reste non consomme'
    assert entree.motif_rejet == 'Quantite invraisemblable'


def test_double_rejet_est_refuse(client, db, payload_entree, validateur):
    client.post('/entree_stock/', json=payload_entree())
    identifiant = _derniere_entree(db).id
    client.post(f'/entree_stock/{identifiant}/rejeter',
                json={'valide_par': 'Bob', 'motif': 'x'}, headers=validateur)

    reponse = client.post(f'/entree_stock/{identifiant}/rejeter',
                          json={'valide_par': 'Bob', 'motif': 'y'}, headers=validateur)
    assert reponse.status_code == 409


def test_rejet_sans_permission_est_refuse(client, db, payload_entree, sans_droit):
    client.post('/entree_stock/', json=payload_entree())
    identifiant = _derniere_entree(db).id

    reponse = client.post(f'/entree_stock/{identifiant}/rejeter',
                          json={'motif': 'x'}, headers=sans_droit)
    assert reponse.status_code == 403


# ══════════════════════════════════════════════
# Lecture et suppression
# ══════════════════════════════════════════════

def test_liste_triee_du_plus_recent_au_plus_ancien(client, payload_entree):
    client.post('/entree_stock/', json=payload_entree(nom_article='Premier'))
    client.post('/entree_stock/', json=payload_entree(nom_article='Second'))

    lignes = client.get('/entree_stock/').get_json()
    assert [l['nom_article'] for l in lignes] == ['Second', 'Premier']


def test_liste_expose_les_deux_motifs(client, db, payload_entree, validateur):
    client.post('/entree_stock/', json=payload_entree(motif='Reste de chantier'))
    identifiant = _derniere_entree(db).id
    client.post(f'/entree_stock/{identifiant}/rejeter',
                json={'valide_par': 'Bob', 'motif': 'Refuse'}, headers=validateur)

    ligne = client.get('/entree_stock/').get_json()[0]
    assert ligne['motif'] == 'Reste de chantier'
    assert ligne['motif_rejet'] == 'Refuse'


def test_filtre_par_organisation(client, payload_entree, referentiel):
    client.post('/entree_stock/', json=payload_entree())

    reponse = client.get(f"/entree_stock/filtre/{referentiel['org']}")
    assert reponse.status_code == 200
    assert len(reponse.get_json()) == 1


def test_filtre_par_organisation_inconnue_est_vide(client, payload_entree):
    client.post('/entree_stock/', json=payload_entree())
    assert client.get('/entree_stock/filtre/9999').get_json() == []


def test_suppression_annule_une_saisie(client, db, payload_entree):
    """Un auteur peut annuler sa saisie tant qu'elle n'est pas traitee."""
    client.post('/entree_stock/', json=payload_entree())
    identifiant = _derniere_entree(db).id

    assert client.delete(f'/entree_stock/{identifiant}').status_code == 200
    assert db.session.get(EntreeStock, identifiant) is None
