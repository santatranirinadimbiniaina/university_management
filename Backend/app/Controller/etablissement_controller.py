from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from ..Config.exts import db
from ..Model.etablissement_model import Etablissement

Etablissement_ns = Namespace('etablissements',
                             description='Création et gestion des établissements (super admin)')

Etablissement_model = Etablissement_ns.model('Etablissement', {
    'id_etablissement': fields.Integer(readOnly=True),
    'nom': fields.String(required=True),
    'adresse': fields.String(),
    'telephone': fields.String(),
    'email': fields.String(),
    'date_creation': fields.DateTime(readOnly=True),
})


@Etablissement_ns.route('/')
class EtablissementList(Resource):
    @Etablissement_ns.marshal_list_with(Etablissement_model)
    def get(self):
        return Etablissement.query.all()

    @jwt_required()
    @Etablissement_ns.expect(Etablissement_model)
    @Etablissement_ns.marshal_with(Etablissement_model, code=201)
    def post(self):
        """Créer un établissement (super admin uniquement)."""
        from .auth_helpers import super_admin_courant
        if not super_admin_courant():
            Etablissement_ns.abort(403, 'Seul le super admin peut créer un établissement')
        data = request.get_json() or {}
        if not data.get('nom'):
            Etablissement_ns.abort(400, 'Le nom de l\'établissement est requis')
        etab = Etablissement(
            nom=data.get('nom'),
            adresse=data.get('adresse'),
            telephone=data.get('telephone'),
            email=data.get('email'),
        )
        etab.save()
        return etab, 201


@Etablissement_ns.route('/<int:id>')
class EtablissementResource(Resource):
    @Etablissement_ns.marshal_with(Etablissement_model)
    def get(self, id):
        return db.session.get(Etablissement, id) or Etablissement_ns.abort(404,
                                                                           'Établissement non trouvé')

    @jwt_required()
    @Etablissement_ns.expect(Etablissement_model)
    @Etablissement_ns.marshal_with(Etablissement_model)
    def put(self, id):
        etab = db.session.get(Etablissement, id) or Etablissement_ns.abort(404,
                                                                           'Établissement non trouvé')
        data = request.get_json() or {}
        etab.update(
            nom=data.get('nom'),
            adresse=data.get('adresse'),
            telephone=data.get('telephone'),
            email=data.get('email'),
        )
        return etab

    @jwt_required()
    def delete(self, id):
        from .auth_helpers import super_admin_courant
        if not super_admin_courant():
            Etablissement_ns.abort(403, 'Seul le super admin peut supprimer un établissement')
        etab = db.session.get(Etablissement, id) or Etablissement_ns.abort(404,
                                                                           'Établissement non trouvé')
        etab.delete()
        return {'message': f'Établissement {id} supprimé'}, 200
