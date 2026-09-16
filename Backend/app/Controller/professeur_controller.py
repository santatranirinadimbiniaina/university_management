from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from ..Config.exts import db
from ..Model.professeur_model import Professeur

Professeur_ns = Namespace('professeurs',
                          description='Professeurs : identifiant + mot de passe, '
                                      'affectés à une ou plusieurs classes et matières')

# Le modèle de SORTIE n'expose jamais le hash du mot de passe.
Professeur_model = Professeur_ns.model('Professeur', {
    'id_professeur': fields.Integer(readOnly=True),
    'matricule': fields.String(required=True),
    'nom': fields.String(required=True),
    'prenom': fields.String(),
    'email': fields.String(),
    'telephone': fields.String(),
    'date_creation': fields.DateTime(readOnly=True),
})

Professeur_input = Professeur_ns.model('ProfesseurInput', {
    'matricule': fields.String(required=True),
    'nom': fields.String(required=True),
    'prenom': fields.String(),
    'email': fields.String(),
    'telephone': fields.String(),
    'mot_de_passe': fields.String(required=True),
})

login_model = Professeur_ns.model('Login', {
    'matricule': fields.String(required=True),
    'mot_de_passe': fields.String(required=True),
})


@Professeur_ns.route('/')
class ProfesseurList(Resource):
    @Professeur_ns.marshal_list_with(Professeur_model)
    def get(self):
        return Professeur.query.all()

    @jwt_required()
    @Professeur_ns.expect(Professeur_input)
    @Professeur_ns.marshal_with(Professeur_model, code=201)
    def post(self):
        """Créer un professeur avec son identifiant et mot de passe
        (super admin ou directeur d'établissement)."""
        from .auth_helpers import role_courant
        role, _compte = role_courant()
        if role not in ('super_admin', 'directeur'):
            Professeur_ns.abort(403, 'Seul un super admin ou un directeur peut '
                                     'créer un professeur')
        data = request.get_json() or {}
        if not data.get('matricule') or not data.get('nom') or not data.get('mot_de_passe'):
            Professeur_ns.abort(400, 'Matricule, nom et mot de passe requis')
        if Professeur.query.filter_by(matricule=data.get('matricule')).first():
            Professeur_ns.abort(409, 'Ce matricule est déjà utilisé')
        prof = Professeur(
            matricule=data.get('matricule'),
            nom=data.get('nom'),
            prenom=data.get('prenom'),
            email=data.get('email'),
            telephone=data.get('telephone'),
            mot_de_passe=data.get('mot_de_passe'),
        )
        prof.save()
        return prof, 201


@Professeur_ns.route('/<int:id>')
class ProfesseurResource(Resource):
    @Professeur_ns.marshal_with(Professeur_model)
    def get(self, id):
        return db.session.get(Professeur, id) or Professeur_ns.abort(404,
                                                                     'Professeur non trouvé')

    @jwt_required()
    @Professeur_ns.expect(Professeur_input)
    @Professeur_ns.marshal_with(Professeur_model)
    def put(self, id):
        prof = db.session.get(Professeur, id) or Professeur_ns.abort(404,
                                                                     'Professeur non trouvé')
        data = request.get_json() or {}
        prof.update(nom=data.get('nom'), prenom=data.get('prenom'),
                    email=data.get('email'), telephone=data.get('telephone'),
                    mot_de_passe=data.get('mot_de_passe'))
        return prof

    @jwt_required()
    def delete(self, id):
        prof = db.session.get(Professeur, id) or Professeur_ns.abort(404,
                                                                     'Professeur non trouvé')
        prof.delete()
        return {'message': f'Professeur {id} supprimé'}, 200


@Professeur_ns.route('/login')
class ProfesseurLogin(Resource):
    @Professeur_ns.expect(login_model)
    def post(self):
        """Connexion du professeur : renvoie un jeton JWT pour saisir ses notes."""
        data = request.get_json() or {}
        if not data.get('matricule') or not data.get('mot_de_passe'):
            Professeur_ns.abort(400, 'Matricule et mot de passe requis')
        prof = Professeur.query.filter_by(matricule=data.get('matricule')).first()
        if not prof or not prof.check_password(data.get('mot_de_passe')):
            Professeur_ns.abort(401, 'Identifiants invalides')
        from flask_jwt_extended import create_access_token, create_refresh_token
        return {
            'message': 'Connexion réussie',
            'access_token': create_access_token(
                identity=str(prof.id_professeur),
                additional_claims={'role': 'professeur', 'matricule': prof.matricule}),
            'refresh_token': create_refresh_token(identity=str(prof.id_professeur)),
            'professeur': prof.to_dict(),
        }, 200


@Professeur_ns.route('/refresh')
class ProfesseurTokenRefresh(Resource):
    @jwt_required(refresh=True)
    def post(self):
        """Renouveler le jeton d'accès d'un professeur."""
        from flask_jwt_extended import get_jwt_identity
        prof = db.session.get(Professeur, int(get_jwt_identity()))
        if not prof:
            Professeur_ns.abort(404, 'Professeur non trouvé')
        return {
            'access_token': create_access_token(
                identity=str(prof.id_professeur),
                additional_claims={'role': 'professeur', 'matricule': prof.matricule}),
        }, 200
