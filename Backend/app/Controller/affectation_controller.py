from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from ..Config.exts import db
from ..Model.classe_model import Classe
from ..Model.matiere_model import Matiere
from ..Model.professeur_model import Professeur
from ..Model.affectation_model import Affectation

Affectation_ns = Namespace('affectations',
                           description='Affectation d\'un professeur à une ou plusieurs '
                                       'classes, chacune sur sa matière')

Affectation_model = Affectation_ns.model('Affectation', {
    'id_affectation': fields.Integer(readOnly=True),
    'id_professeur': fields.Integer(required=True),
    'id_classe': fields.Integer(required=True),
    'id_matiere': fields.Integer(required=True),
})


@Affectation_ns.route('/')
class AffectationList(Resource):
    @Affectation_ns.marshal_list_with(Affectation_model)
    def get(self):
        requete = Affectation.query
        id_prof = request.args.get('id_professeur', type=int)
        id_classe = request.args.get('id_classe', type=int)
        if id_prof:
            requete = requete.filter_by(id_professeur=id_prof)
        if id_classe:
            requete = requete.filter_by(id_classe=id_classe)
        return requete.all()

    @jwt_required()
    @Affectation_ns.expect(Affectation_model)
    @Affectation_ns.marshal_with(Affectation_model, code=201)
    def post(self):
        """Attribuer un professeur à une classe pour une matière
        (super admin ou directeur de l'établissement de la classe)."""
        from .auth_helpers import role_courant
        role, compte = role_courant()
        if role not in ('super_admin', 'directeur'):
            Affectation_ns.abort(403, 'Seul un super admin ou un directeur peut '
                                     'affecter un professeur')
        data = request.get_json() or {}
        prof = db.session.get(Professeur, data.get('id_professeur'))
        if not prof:
            Affectation_ns.abort(404, 'Professeur non trouvé')
        classe = db.session.get(Classe, data.get('id_classe'))
        if not classe:
            Affectation_ns.abort(404, 'Classe non trouvée')
        matiere = db.session.get(Matiere, data.get('id_matiere'))
        if not matiere:
            Affectation_ns.abort(404, 'Matière non trouvée')
        if role == 'directeur' and classe.etablissement.id_etablissement != compte.id_etablissement:
            Affectation_ns.abort(403, 'Vous ne gérez pas cet établissement')
        if matiere.id_classe != classe.id_classe:
            Affectation_ns.abort(400, 'Cette matière n\'appartient pas à cette classe')
        if Affectation.query.filter_by(id_professeur=prof.id_professeur,
                                       id_classe=classe.id_classe,
                                       id_matiere=matiere.id_matiere).first():
            Affectation_ns.abort(409, 'Cette affectation existe déjà')
        affectation = Affectation(id_professeur=prof.id_professeur,
                                  id_classe=classe.id_classe,
                                  id_matiere=matiere.id_matiere)
        affectation.save()
        return affectation, 201


@Affectation_ns.route('/<int:id>')
class AffectationResource(Resource):
    @Affectation_ns.marshal_with(Affectation_model)
    def get(self, id):
        return (db.session.get(Affectation, id)
                or Affectation_ns.abort(404, 'Affectation non trouvée'))

    @jwt_required()
    def delete(self, id):
        affectation = (db.session.get(Affectation, id)
                       or Affectation_ns.abort(404, 'Affectation non trouvée'))
        affectation.delete()
        return {'message': f'Affectation {id} supprimée'}, 200
