"""Configuration commune des tests du backend g_stock.

Les tests tournent sur une base SQLite en memoire, recreee pour chaque test :
aucune base MySQL n'est necessaire et aucun test n'en pollue un autre.
"""

import os
import sys
from pathlib import Path

import pytest

# Le paquet `app` se trouve dans Backend/, parent du repertoire tests/.
BACKEND_DIR = Path(__file__).resolve().parents[1]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# La configuration lit ces valeurs via python-decouple, qui retombe sur
# l'environnement : on les pose avant d'importer quoi que ce soit de `app`.
os.environ.setdefault('SECRET_KEY', 'cle-de-test-g-stock')
os.environ.setdefault('SQLALCHEMY_TRACK_MODIFICATIONS', 'False')

import app.Config.config as config_module  # noqa: E402

config_module.DevConfig.SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
config_module.DevConfig.SQLALCHEMY_ECHO = False

from app import create_app  # noqa: E402
from app.Config.exts import db as _db  # noqa: E402
from app.Model.article_model import Article  # noqa: E402
from app.Model.categorie_model import Categorie  # noqa: E402
from app.Model.Depot_model import Depot  # noqa: E402
from app.Model.organisation_model import Organisation  # noqa: E402
from app.Model.sortie_model import Sortie  # noqa: E402
from app.Model.entree_stock_model import EntreeStock  # noqa: E402
from flask_jwt_extended import create_access_token  # noqa: E402


@pytest.fixture()
def app():
    """Application Flask isolee, schema cree puis detruit a chaque test."""
    application = create_app()
    application.config.update(TESTING=True)

    with application.app_context():
        _db.create_all()
        yield application
        _db.session.remove()
        _db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


@pytest.fixture()
def db(app):
    return _db


# ──────────────────────────────────────────────
# Jetons
# ──────────────────────────────────────────────

@pytest.fixture()
def jeton(app):
    """Fabrique un jeton porteur d'un role et de permissions donnes.

    Usage : jeton(role='operateur', permission='validateur')
    """
    def _jeton(role='operateur', permission='', matricule='T001', identite='1'):
        return create_access_token(
            identity=str(identite),
            additional_claims={
                'role': role,
                'permission': permission,
                'matricule': matricule,
            },
        )
    return _jeton


@pytest.fixture()
def entetes():
    """Transforme un jeton en en-tetes HTTP."""
    def _entetes(token):
        return {'Authorization': f'Bearer {token}'}
    return _entetes


@pytest.fixture()
def validateur(jeton, entetes):
    """En-tetes d'un compte disposant de la permission `validateur`."""
    return entetes(jeton(role='operateur', permission='validateur', matricule='V001'))


@pytest.fixture()
def admin(jeton, entetes):
    """En-tetes d'un administrateur : souverain, meme sans permission listee."""
    return entetes(jeton(role='admin', permission='', matricule='A001'))


@pytest.fixture()
def sans_droit(jeton, entetes):
    """En-tetes d'un compte authentifie mais sans permission de validation."""
    return entetes(jeton(role='operateur', permission='expedition', matricule='O001'))


# ──────────────────────────────────────────────
# Jeux de donnees
# ──────────────────────────────────────────────

@pytest.fixture()
def referentiel(app):
    """Une organisation, un depot, deux categories et un article en stock."""
    org = Organisation(nom_organisation='Sfood')
    _db.session.add(org)
    _db.session.flush()

    depot = Depot(id_organisation=org.id_organisation, nom_depot='Depot central')
    _db.session.add(depot)
    _db.session.flush()

    cat_conso = Categorie(id_depot=depot.id_depot, id_organisation=org.id_organisation,
                          nom_categorie='Aliments', type_categorie='Consomable')
    cat_durable = Categorie(id_depot=depot.id_depot, id_organisation=org.id_organisation,
                            nom_categorie='Materiel', type_categorie='Non consomable')
    _db.session.add_all([cat_conso, cat_durable])
    _db.session.flush()

    article = Article(id_categorie=cat_conso.id_categorie, id_depot=depot.id_depot,
                      id_organisation=org.id_organisation, nom_article='Huile',
                      quantite=100, unite='L', date=None)
    _db.session.add(article)
    _db.session.commit()

    return {
        'org': org.id_organisation,
        'depot': depot.id_depot,
        'categorie': cat_conso.id_categorie,
        'categorie_durable': cat_durable.id_categorie,
        'article': article.id_article,
    }


@pytest.fixture()
def payload_sortie(referentiel):
    """Corps minimal valide pour creer un mouvement."""
    def _payload(**surcharges):
        base = {
            'id_article': referentiel['article'],
            'id_categorie': referentiel['categorie'],
            'id_depot': referentiel['depot'],
            'id_organisation': referentiel['org'],
            'date': '2026-08-12',
            'nom_article': 'Huile',
            'quantite_envoye': 30,
            'nom_expediteur': 'Alice',
            'createur': 'Alice',
            'matricule_createur': 'O001',
            'statut': 'en_attente',
        }
        base.update(surcharges)
        return base
    return _payload


@pytest.fixture()
def payload_entree(referentiel):
    """Corps minimal valide pour creer une entree de stock."""
    def _payload(**surcharges):
        base = {
            'type_entree': 'reappro',
            'id_article': referentiel['article'],
            'id_categorie': referentiel['categorie'],
            'id_depot': referentiel['depot'],
            'id_organisation': referentiel['org'],
            'nom_article': 'Huile',
            'quantite': 10,
            'unite': 'L',
            'date': '2026-08-12',
            'createur': 'Alice',
            'matricule_createur': 'O001',
        }
        base.update(surcharges)
        return base
    return _payload


@pytest.fixture()
def quantite_article(app):
    """Relit la quantite en stock d'un article."""
    def _quantite(id_article):
        return _db.session.get(Article, id_article).quantite
    return _quantite
