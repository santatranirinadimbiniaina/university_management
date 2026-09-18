from flask import Flask, make_response, send_from_directory, request, make_response
from flask_restx import Api
from .Config.config import DevConfig
from celery import Celery
from .Config.exts import db, jwt
from flask_cors import CORS
from json import dumps
from decimal import Decimal
from flask_migrate import Migrate
import os
from datetime import timedelta, datetime, date
from . import registre_model

from app.Controller.admin_controller import SuperAdmin_ns
from app.Controller.scolaire import (
    Etablissement_ns, Directeur_ns, Classe_ns, Matiere_ns, Professeur_ns,
    Affectation_ns, Etudiant_ns, Note_ns, Reclamation_ns, DemandeReleve_ns,
)

def output_json(data, code, headers=None):
    def custom_serializer(obj):
        if isinstance(obj, Decimal): return float(obj)
        if isinstance(obj, (datetime, date)): return obj.isoformat()
        raise TypeError(f"Object of type {obj.__class__.__name__} is not JSON serializable")
    dumped = dumps(data, default=custom_serializer) + "\n"
    resp = make_response(dumped, code)
    resp.headers.extend(headers or {})
    resp.headers['Content-Type'] = 'application/json'
    return resp

migrate = Migrate()
CELERY_BROKER_URL = 'redis://localhost:6379/0'
CELERY_RESULT_BACKEND = 'redis://localhost:6379/0'
celery = Celery(__name__, broker=CELERY_BROKER_URL, backend=CELERY_RESULT_BACKEND)

def create_app():
    app = Flask(__name__)
    app.config['MAX_CONTENT_LENGTH'] = 600 * 1024 * 1024

    app.config.from_object(DevConfig)
    app.config['JWT_SECRET_KEY'] = app.config.get('SECRET_KEY')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)
    # flask-jwt-extended >= 4.7 refuse un 'sub' non textuel : les tokens déjà
    # en circulation (identity = id entier) doivent rester décodables, sinon
    # les endpoints protégés répondraient 403 à tout le monde.
    app.config['JWT_VERIFY_SUB'] = False
    app.config.update(CELERY_BROKER_URL=CELERY_BROKER_URL, CELERY_RESULT_BACKEND=CELERY_RESULT_BACKEND)

    celery.conf.update(app.config)
    db.init_app(app)
    jwt.init_app(app)
    migrate.init_app(app, db)

    CORS(app, resources={r"/*": {"origins": "*"}},
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
         allow_headers=["Content-Type", "Authorization"],
         expose_headers=["Authorization"],
         supports_credentials=True)
    
    # @app.after_request
    # def apply_cors(response):
    #     origin = request.headers.get('Origin')
    #     allowed_origins = [
    #         'https://gsi.isourcia.com'
    #     ]
        
    #     if origin in allowed_origins:
    #         response.headers['Access-Control-Allow-Origin'] = origin
    #         response.headers['Access-Control-Allow-Credentials'] = 'true'
    #         response.headers['Access-Control-Allow-Methods'] = 'GET,POST,PUT,DELETE,OPTIONS,PATCH'
    #         response.headers['Access-Control-Allow-Headers'] = 'Content-Type,Authorization,X-Requested-With'
    #         response.headers['Access-Control-Max-Age'] = '3600'
    #     return response

    api = Api(app, doc="/docs")

    api.add_namespace(SuperAdmin_ns)
    api.add_namespace(Etablissement_ns)
    api.add_namespace(Directeur_ns)
    api.add_namespace(Classe_ns)
    api.add_namespace(Matiere_ns)
    api.add_namespace(Professeur_ns)
    api.add_namespace(Affectation_ns)
    api.add_namespace(Etudiant_ns)
    api.add_namespace(Note_ns)
    api.add_namespace(Reclamation_ns)
    api.add_namespace(DemandeReleve_ns)

    @app.route("/health")
    def health():
        return {"status": "ok"}, 200

    api.representations["application/json"] = output_json
    return app
