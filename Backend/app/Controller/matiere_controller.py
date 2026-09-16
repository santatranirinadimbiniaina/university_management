from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from ..Config.exts import db
from ..Model.classe_model import Classe
from ..Model.matiere_model import Matiere

Matiere_ns = Namespace('matieres',
                       description='Matières de chaque classe avec coefficient spécifique')


def _classe_autorisee(classe):
    """Vrai si le compte connecté (super admin ou directeur) peut gérer
    cette classe."""
    from .auth_helpers import role_courant
    role, compte = role_courant()
    if role == 'super_admin':
        return True
    if role == 'directeur':
        return classe.etablissement.id_etablissement == compte.id_etablissement
    return False

Matiere_model = Matiere_ns.model('Matiere', {
    'id_matiere': fields.Integer(readOnly=True),
    'nom_matiere': fields.String(required=True),
    'coefficient': fields.Float(required=True, description='Coefficient spécifique à la classe'),
    'id_classe': fields.Integer(required=True),
})


@Matiere_ns.route('/')
class MatiereList(Resource):
    @Matiere_ns.marshal_list_with(Matiere_model)
    def get(self):
        id_classe = request.args.get('id_classe', type=int)
        requete = Matiere.query
        if id_classe:
            requete = requete.filter_by(id_classe=id_classe)
        return requete.all()

    @jwt_required()
    @Matiere_ns.expect(Matiere_model)
    @Matiere_ns.marshal_with(Matiere_model, code=201)
    def post(self):
        """Créer une matière pour une classe, avec son coefficient (super admin)."""
        data = request.get_json() or {}
        if not data.get('nom_matiere'):
            Matiere_ns.abort(400, 'Le nom de la matière est requis')
        if data.get('coefficient') is None:
            Matiere_ns.abort(400, 'Le coefficient est requis')
        try:
            coefficient = float(data.get('coefficient'))
        except (TypeError, ValueError):
            Matiere_ns.abort(400, 'Le coefficient doit être un nombre')
        if coefficient <= 0:
            Matiere_ns.abort(400, 'Le coefficient doit être strictement positif')

        classe = db.session.get(Classe, data.get('id_classe'))
        if not classe:
            Matiere_ns.abort(404, 'Classe non trouvée')
        if not _classe_autorisee(classe):
            Matiere_ns.abort(403, 'Vous ne gérez pas cet établissement')
        if Matiere.query.filter_by(nom_matiere=data.get('nom_matiere'),
                                   id_classe=classe.id_classe).first():
            Matiere_ns.abort(409, 'Cette matière existe déjà dans cette classe')

        matiere = Matiere(nom_matiere=data.get('nom_matiere'),
                          coefficient=coefficient, id_classe=classe.id_classe)
        matiere.save()
        return matiere, 201


@Matiere_ns.route('/<int:id>')
class MatiereResource(Resource):
    @Matiere_ns.marshal_with(Matiere_model)
    def get(self, id):
        return db.session.get(Matiere, id) or Matiere_ns.abort(404, 'Matière non trouvée')

    @jwt_required()
    @Matiere_ns.expect(Matiere_model)
    @Matiere_ns.marshal_with(Matiere_model)
    def put(self, id):
        matiere = db.session.get(Matiere, id) or Matiere_ns.abort(404, 'Matière non trouvée')
        data = request.get_json() or {}
        matiere.update(nom_matiere=data.get('nom_matiere'),
                       coefficient=data.get('coefficient'))
        return matiere

    @jwt_required()
    def delete(self, id):
        matiere = db.session.get(Matiere, id) or Matiere_ns.abort(404, 'Matière non trouvée')
        if not _classe_autorisee(matiere.classe):
            Matiere_ns.abort(403, 'Vous ne gérez pas cet établissement')
        matiere.delete()
        return {'message': f'Matière {id} supprimée'}, 200
