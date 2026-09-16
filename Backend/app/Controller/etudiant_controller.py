from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from ..Config.exts import db
from ..Model.classe_model import Classe
from ..Model.etudiant_model import Etudiant
from ..utils.dates import parse_date

Etudiant_ns = Namespace('etudiants',
                        description='Étudiants inscrits dans une classe, avec identifiant '
                                    'et mot de passe')

# Le modèle de SORTIE n'expose jamais le hash du mot de passe.
Etudiant_model = Etudiant_ns.model('Etudiant', {
    'id_etudiant': fields.Integer(readOnly=True),
    'matricule': fields.String(required=True),
    'nom': fields.String(required=True),
    'prenom': fields.String(),
    'date_naissance': fields.String(),
    'email': fields.String(),
    'id_classe': fields.Integer(required=True),
    'date_creation': fields.DateTime(readOnly=True),
})

Etudiant_input = Etudiant_ns.model('EtudiantInput', {
    'matricule': fields.String(required=True),
    'nom': fields.String(required=True),
    'prenom': fields.String(),
    'date_naissance': fields.String(),
    'email': fields.String(),
    'id_classe': fields.Integer(required=True),
    'mot_de_passe': fields.String(required=True),
})

login_model = Etudiant_ns.model('Login', {
    'matricule': fields.String(required=True),
    'mot_de_passe': fields.String(required=True),
})


@Etudiant_ns.route('/')
class EtudiantList(Resource):
    @Etudiant_ns.marshal_list_with(Etudiant_model)
    def get(self):
        id_classe = request.args.get('id_classe', type=int)
        requete = Etudiant.query
        if id_classe:
            requete = requete.filter_by(id_classe=id_classe)
        return requete.all()

    @jwt_required()
    @Etudiant_ns.expect(Etudiant_input)
    @Etudiant_ns.marshal_with(Etudiant_model, code=201)
    def post(self):
        """Inscrire un étudiant dans une classe (super admin ou directeur de
        l'établissement de la classe)."""
        from .auth_helpers import role_courant
        role, _compte = role_courant()
        if role not in ('super_admin', 'directeur'):
            Etudiant_ns.abort(403, 'Seul un super admin ou un directeur peut '
                                     'inscrire un étudiant')
        data = request.get_json() or {}
        if not data.get('matricule') or not data.get('nom') or not data.get('mot_de_passe'):
            Etudiant_ns.abort(400, 'Matricule, nom et mot de passe requis')
        if not data.get('id_classe'):
            Etudiant_ns.abort(400, 'La classe est requise')
        if Etudiant.query.filter_by(matricule=data.get('matricule')).first():
            Etudiant_ns.abort(409, 'Ce matricule est déjà utilisé')
        classe = db.session.get(Classe, data.get('id_classe'))
        if not classe:
            Etudiant_ns.abort(404, 'Classe non trouvée')
        if role == 'directeur' and classe.etablissement.id_etablissement != _compte.id_etablissement:
            Etudiant_ns.abort(403, 'Vous ne gérez pas cet établissement')
        etudiant = Etudiant(
            matricule=data.get('matricule'),
            nom=data.get('nom'),
            prenom=data.get('prenom'),
            date_naissance=parse_date(data.get('date_naissance')),
            email=data.get('email'),
            id_classe=classe.id_classe,
            mot_de_passe=data.get('mot_de_passe'),
        )
        etudiant.save()
        return etudiant, 201


@Etudiant_ns.route('/<int:id>')
class EtudiantResource(Resource):
    @Etudiant_ns.marshal_with(Etudiant_model)
    def get(self, id):
        return db.session.get(Etudiant, id) or Etudiant_ns.abort(404, 'Étudiant non trouvé')

    @jwt_required()
    @Etudiant_ns.expect(Etudiant_input)
    @Etudiant_ns.marshal_with(Etudiant_model)
    def put(self, id):
        etudiant = db.session.get(Etudiant, id) or Etudiant_ns.abort(404, 'Étudiant non trouvé')
        data = request.get_json() or {}
        etudiant.update(
            nom=data.get('nom'), prenom=data.get('prenom'), email=data.get('email'),
            date_naissance=parse_date(data.get('date_naissance')),
            id_classe=data.get('id_classe'), mot_de_passe=data.get('mot_de_passe'))
        return etudiant

    @jwt_required()
    def delete(self, id):
        etudiant = db.session.get(Etudiant, id) or Etudiant_ns.abort(404, 'Étudiant non trouvé')
        etudiant.delete()
        return {'message': f'Étudiant {id} supprimé'}, 200


@Etudiant_ns.route('/login')
class EtudiantLogin(Resource):
    @Etudiant_ns.expect(login_model)
    def post(self):
        """Connexion de l'étudiant : consulter ses notes, demander un relevé."""
        data = request.get_json() or {}
        if not data.get('matricule') or not data.get('mot_de_passe'):
            Etudiant_ns.abort(400, 'Matricule et mot de passe requis')
        etudiant = Etudiant.query.filter_by(matricule=data.get('matricule')).first()
        if not etudiant or not etudiant.check_password(data.get('mot_de_passe')):
            Etudiant_ns.abort(401, 'Identifiants invalides')
        from flask_jwt_extended import create_access_token, create_refresh_token
        return {
            'message': 'Connexion réussie',
            'access_token': create_access_token(
                identity=str(etudiant.id_etudiant),
                additional_claims={'role': 'etudiant', 'matricule': etudiant.matricule}),
            'refresh_token': create_refresh_token(identity=str(etudiant.id_etudiant)),
            'etudiant': etudiant.to_dict(),
        }, 200


@Etudiant_ns.route('/refresh')
class EtudiantTokenRefresh(Resource):
    @jwt_required(refresh=True)
    def post(self):
        """Renouveler le jeton d'accès d'un étudiant."""
        from flask_jwt_extended import get_jwt_identity
        etudiant = db.session.get(Etudiant, int(get_jwt_identity()))
        if not etudiant:
            Etudiant_ns.abort(404, 'Étudiant non trouvé')
        return {
            'access_token': create_access_token(
                identity=str(etudiant.id_etudiant),
                additional_claims={'role': 'etudiant', 'matricule': etudiant.matricule}),
        }, 200
