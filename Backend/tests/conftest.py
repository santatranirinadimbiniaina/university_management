"""Configuration commune des tests du backend.

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
os.environ.setdefault('SECRET_KEY', 'cle-de-test-university-management')
os.environ.setdefault('SQLALCHEMY_TRACK_MODIFICATIONS', 'False')

import app.Config.config as config_module  # noqa: E402

config_module.DevConfig.SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
config_module.DevConfig.SQLALCHEMY_ECHO = False

from app import create_app  # noqa: E402
from app.Config.exts import db as _db  # noqa: E402
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


@pytest.fixture()
def jeton_super_admin(app):
    """En-tetes HTTP d'un super admin reellement present en base."""
    from app.Model.super_admin_model import SuperAdmin

    def _jeton(matricule='ADM01'):
        admin = SuperAdmin(matricule=matricule, mot_de_passe='admin123')
        _db.session.add(admin)
        _db.session.commit()
        jeton = create_access_token(identity=str(admin.id),
                                    additional_claims={'role': 'super_admin'})
        return {'Authorization': f'Bearer {jeton}'}
    return _jeton


@pytest.fixture()
def super_admin_http(client):
    """Super admin cree et connecte via les vrais endpoints HTTP.

    Renvoie {'entetes': {...}, 'refresh': str, 'admin': {...}}.
    """
    r = client.post('/super_admin/creer_admin', json={
        'matricule': 'SA-HTTP', 'mot_de_passe': 'admin123',
    })
    assert r.status_code == 201, r.get_json()

    r = client.post('/super_admin/login', json={
        'matricule': 'SA-HTTP', 'mot_de_passe': 'admin123',
    })
    assert r.status_code == 200, r.get_json()
    corps = r.get_json()
    return {
        'entetes': {'Authorization': f"Bearer {corps['access_token']}"},
        'refresh': corps['refresh_token'],
        'admin': corps['admin'],
    }
