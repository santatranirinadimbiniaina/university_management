from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from ..Config.exts import db
from ..Model.demande_releve_model import DemandeReleve
from ..Model.etudiant_model import Etudiant
from ..Model.classe_model import Classe
from .auth_helpers import etudiant_courant

DemandeReleve_ns = Namespace('demandes-releve',
                             description='Demandes de relevé de notes faites par les étudiants')

DemandeReleve_model = DemandeReleve_ns.model('DemandeReleve', {
    'id_demande': fields.Integer(readOnly=True),
    'motif': fields.String(),
    'statut': fields.String(readOnly=True),
    'date_demande': fields.DateTime(readOnly=True),
    'date_traitement': fields.DateTime(readOnly=True),
    'id_etudiant': fields.Integer(readOnly=True),
})


@DemandeReleve_ns.route('/')
class DemandeReleveList(Resource):
    @jwt_required()
    @DemandeReleve_ns.marshal_list_with(DemandeReleve_model)
    def get(self):
        """Étudiant : ses demandes. Super admin : toutes. Directeur : celles de
        son établissement."""
        etudiant = etudiant_courant()
        if etudiant:
            return etudiant.demandes_releve.all()
        requete = DemandeReleve.query.join(
            DemandeReleve.etudiant).join(Etudiant.classe)
        statut = request.args.get('statut')
        if statut:
            requete = requete.filter_by(statut=statut)
        from .auth_helpers import role_courant
        role, compte = role_courant()
        if role == 'directeur':
            requete = requete.filter(
                Classe.id_etablissement == compte.id_etablissement)
        elif role not in ('super_admin', 'directeur'):
            DemandeReleve_ns.abort(403, 'Action non autorisée')
        return requete.all()

    @jwt_required()
    @DemandeReleve_ns.expect(DemandeReleve_ns.model('NouvelleDemande', {
        'motif': fields.String(),
    }))
    @DemandeReleve_ns.marshal_with(DemandeReleve_model, code=201)
    def post(self):
        """Faire une demande de relevé de notes (étudiant connecté)."""
        etudiant = etudiant_courant()
        if not etudiant:
            DemandeReleve_ns.abort(403, 'Seul un étudiant connecté peut demander '
                                        'un relevé de notes')
        data = request.get_json() or {}
        demande = DemandeReleve(id_etudiant=etudiant.id_etudiant,
                                motif=data.get('motif'))
        demande.save()
        return demande, 201


@DemandeReleve_ns.route('/<int:id>')
class DemandeReleveResource(Resource):
    @jwt_required()
    @DemandeReleve_ns.marshal_with(DemandeReleve_model)
    def get(self, id):
        demande = (db.session.get(DemandeReleve, id)
                   or DemandeReleve_ns.abort(404, 'Demande non trouvée'))
        etudiant = etudiant_courant()
        if etudiant and demande.id_etudiant != etudiant.id_etudiant:
            DemandeReleve_ns.abort(403, 'Accès refusé à cette demande')
        return demande

    @jwt_required()
    def delete(self, id):
        demande = (db.session.get(DemandeReleve, id)
                   or DemandeReleve_ns.abort(404, 'Demande non trouvée'))
        etudiant = etudiant_courant()
        if etudiant and demande.id_etudiant != etudiant.id_etudiant:
            DemandeReleve_ns.abort(403, 'Accès refusé à cette demande')
        demande.delete()
        return {'message': f'Demande {id} supprimée'}, 200


@DemandeReleve_ns.route('/<int:id>/traiter')
class DemandeReleveTraitement(Resource):
    @jwt_required()
    @DemandeReleve_ns.expect(DemandeReleve_ns.model('Traitement', {
        'statut': fields.String(required=True,
                                enum=list(DemandeReleve.STATUTS)),
    }))
    @DemandeReleve_ns.marshal_with(DemandeReleve_model)
    def put(self, id):
        """Traiter une demande : super admin ou directeur de l'établissement
        de l'étudiant."""
        from .auth_helpers import role_courant
        role, compte = role_courant()
        if role not in ('super_admin', 'directeur'):
            DemandeReleve_ns.abort(403, 'Action non autorisée')
        demande = (db.session.get(DemandeReleve, id)
                   or DemandeReleve_ns.abort(404, 'Demande non trouvée'))
        if role == 'directeur':
            if demande.etudiant.classe.etablissement.id_etablissement != compte.id_etablissement:
                DemandeReleve_ns.abort(403, 'Cette demande ne concerne pas votre '
                                             'établissement')
        data = request.get_json() or {}
        statut = data.get('statut')
        if statut not in DemandeReleve.STATUTS:
            DemandeReleve_ns.abort(400, 'Statut invalide')
        demande.traiter(statut)
        return demande
