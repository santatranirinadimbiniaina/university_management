from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from ..Config.exts import db
from ..Model.classe_model import Classe
from ..Model.etablissement_model import Etablissement

Classe_ns = Namespace('classes', description='Classes rattachées à un établissement')


def _etablissement_autorise(id_etablissement):
    """Vrai si le compte connecté (super admin ou directeur) peut gérer
    cet établissement."""
    from .auth_helpers import role_courant
    role, compte = role_courant()
    if role == 'super_admin':
        return True
    if role == 'directeur':
        return compte.id_etablissement == id_etablissement
    return False

Classe_model = Classe_ns.model('Classe', {
    'id_classe': fields.Integer(readOnly=True),
    'nom_classe': fields.String(required=True),
    'niveau': fields.String(),
    'id_etablissement': fields.Integer(required=True),
})


@Classe_ns.route('/')
class ClasseList(Resource):
    @Classe_ns.marshal_list_with(Classe_model)
    def get(self):
        id_etab = request.args.get('id_etablissement', type=int)
        requete = Classe.query
        if id_etab:
            requete = requete.filter_by(id_etablissement=id_etab)
        return requete.all()

    @jwt_required()
    @Classe_ns.expect(Classe_model)
    def post(self):
        """Créer une classe dans un établissement (super admin ou directeur
        de cet établissement)."""
        data = request.get_json() or {}
        if not data.get('nom_classe'):
            Classe_ns.abort(400, 'Le nom de la classe est requis')
        etab = db.session.get(Etablissement, data.get('id_etablissement'))
        if not etab:
            Classe_ns.abort(404, 'Établissement non trouvé')
        if not _etablissement_autorise(etab.id_etablissement):
            Classe_ns.abort(403, 'Vous ne gérez pas cet établissement')
        if Classe.query.filter_by(nom_classe=data.get('nom_classe'),
                                  id_etablissement=etab.id_etablissement).first():
            Classe_ns.abort(409, 'Cette classe existe déjà dans cet établissement')
        classe = Classe(
            nom_classe=data.get('nom_classe'),
            niveau=data.get('niveau'),
            id_etablissement=etab.id_etablissement,
        )
        classe.save()
        return classe.to_dict(), 201


@Classe_ns.route('/<int:id>')
class ClasseResource(Resource):
    @Classe_ns.marshal_with(Classe_model)
    def get(self, id):
        return db.session.get(Classe, id) or Classe_ns.abort(404, 'Classe non trouvée')

    @jwt_required()
    @Classe_ns.expect(Classe_model)
    @Classe_ns.marshal_with(Classe_model)
    def put(self, id):
        classe = db.session.get(Classe, id) or Classe_ns.abort(404, 'Classe non trouvée')
        data = request.get_json() or {}
        classe.update(nom_classe=data.get('nom_classe'), niveau=data.get('niveau'))
        return classe

    @jwt_required()
    def delete(self, id):
        classe = db.session.get(Classe, id) or Classe_ns.abort(404, 'Classe non trouvée')
        if not _etablissement_autorise(classe.id_etablissement):
            Classe_ns.abort(403, 'Vous ne gérez pas cet établissement')
        classe.delete()
        return {'message': f'Classe {id} supprimée'}, 200
