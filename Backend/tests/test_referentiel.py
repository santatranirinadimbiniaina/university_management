"""Tests du referentiel : organisations, depots, categories et articles.

Ce sont les endpoints de la rubrique Organisation. Un compte disposant de la
permission `administration` les appelle directement (effet immediat sur le
stock) ; un compte `inventaire` passe par `entree_stock` (voir
test_entree_stock.py).
"""

from datetime import date

from app.Model.article_model import Article
from app.Model.categorie_model import Categorie
from app.Model.Depot_model import Depot
from app.Model.organisation_model import Organisation


# ══════════════════════════════════════════════
# Organisations
# ══════════════════════════════════════════════

def test_creation_organisation(client, db):
    reponse = client.post('/Organisation/', json={'nom_organisation': 'Isourcia'})
    assert reponse.status_code == 201
    assert db.session.query(Organisation).filter_by(nom_organisation='Isourcia').first()


def test_liste_organisations(client, referentiel):
    reponse = client.get('/Organisation/')
    assert reponse.status_code == 200
    assert len(reponse.get_json()) == 1


def test_modification_organisation(client, db, referentiel):
    reponse = client.put(f"/Organisation/{referentiel['org']}",
                         json={'nom_organisation': 'Sfood renomme'})
    assert reponse.status_code == 200
    assert db.session.get(Organisation, referentiel['org']).nom_organisation == 'Sfood renomme'


def test_organisation_inexistante(client):
    assert client.get('/Organisation/9999').status_code == 404


# ══════════════════════════════════════════════
# Depots
# ══════════════════════════════════════════════

def test_creation_depot(client, db, referentiel):
    reponse = client.post('/Depot/', json={
        'id_organisation': referentiel['org'], 'nom_depot': 'Depot secondaire'})
    assert reponse.status_code == 201
    assert db.session.query(Depot).filter_by(nom_depot='Depot secondaire').first()


def test_liste_depots(client, referentiel):
    lignes = client.get('/Depot/').get_json()
    assert len(lignes) == 1
    assert lignes[0]['nom_depot'] == 'Depot central'


def test_modification_depot(client, db, referentiel):
    reponse = client.put(f"/Depot/{referentiel['depot']}", json={
        'nom_depot': 'Depot renomme', 'id_organisation': referentiel['org']})
    assert reponse.status_code == 200
    assert db.session.get(Depot, referentiel['depot']).nom_depot == 'Depot renomme'


# ══════════════════════════════════════════════
# Categories
# ══════════════════════════════════════════════

def test_creation_categorie(client, db, referentiel):
    reponse = client.post('/Categorie/', json={
        'id_depot': referentiel['depot'], 'id_organisation': referentiel['org'],
        'nom_categorie': 'Boissons', 'type_categorie': 'Consomable'})
    assert reponse.status_code == 201

    creee = db.session.query(Categorie).filter_by(nom_categorie='Boissons').first()
    assert creee.type_categorie == 'Consomable'


def test_le_type_de_categorie_distingue_les_consommables(client, referentiel):
    """La rubrique Consommables s'appuie sur ce champ pour filtrer les articles."""
    lignes = client.get('/Categorie/').get_json()
    types = {l['nom_categorie']: l['type_categorie'] for l in lignes}
    assert types['Aliments'] == 'Consomable'
    assert types['Materiel'] == 'Non consomable'


def test_modification_categorie(client, db, referentiel):
    reponse = client.put(f"/Categorie/{referentiel['categorie']}", json={
        'nom_categorie': 'Aliments secs', 'type_categorie': 'Consomable',
        'id_depot': referentiel['depot'], 'id_organisation': referentiel['org']})
    assert reponse.status_code == 200
    assert db.session.get(Categorie, referentiel['categorie']).nom_categorie == 'Aliments secs'


# ══════════════════════════════════════════════
# Articles
# ══════════════════════════════════════════════

def test_creation_article(client, db, referentiel):
    reponse = client.post('/Article/', json={
        'id_categorie': referentiel['categorie'], 'id_depot': referentiel['depot'],
        'id_organisation': referentiel['org'], 'nom_article': 'Sucre',
        'quantite': 40, 'unite': 'kg', 'date': '2026-08-12'})

    assert reponse.status_code == 201
    cree = db.session.query(Article).filter_by(nom_article='Sucre').first()
    assert cree.quantite == 40
    assert cree.date == date(2026, 8, 12)


def test_creation_article_sans_date(client, db, referentiel):
    reponse = client.post('/Article/', json={
        'id_categorie': referentiel['categorie'], 'id_depot': referentiel['depot'],
        'id_organisation': referentiel['org'], 'nom_article': 'Sel', 'quantite': 5})
    assert reponse.status_code == 201
    assert db.session.query(Article).filter_by(nom_article='Sel').first().date is None


def test_liste_articles(client, referentiel):
    lignes = client.get('/Article/').get_json()
    assert len(lignes) == 1
    assert lignes[0]['nom_article'] == 'Huile'
    assert lignes[0]['quantite'] == 100


def test_ajout_de_stock_direct(client, db, referentiel, quantite_article):
    """Regime « saisie immediate » : l'admin met a jour la quantite cumulee."""
    reponse = client.put(f"/Article/{referentiel['article']}", json={
        'nom_article': 'Huile', 'quantite': 150, 'unite': 'L',
        'id_categorie': referentiel['categorie'], 'id_depot': referentiel['depot'],
        'id_organisation': referentiel['org']})

    assert reponse.status_code == 200
    assert quantite_article(referentiel['article']) == 150


def test_modification_article_conserve_la_date_si_absente(client, db, referentiel):
    client.put(f"/Article/{referentiel['article']}", json={'quantite': 120})
    article = db.session.get(Article, referentiel['article'])
    assert article.quantite == 120
    assert article.nom_article == 'Huile'


def test_suppression_article(client, db, referentiel):
    assert client.delete(f"/Article/{referentiel['article']}").status_code == 200
    assert db.session.get(Article, referentiel['article']) is None


def test_article_inexistant(client):
    assert client.get('/Article/9999').status_code == 404


# ══════════════════════════════════════════════
# Sante
# ══════════════════════════════════════════════

def test_endpoint_de_sante(client):
    reponse = client.get('/health')
    assert reponse.status_code == 200
    assert reponse.get_json()['status'] == 'ok'
