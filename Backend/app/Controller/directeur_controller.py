from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required, create_access_token, create_refresh_token, \
    jwt_required as _jwt, get_jwt_identity
from ..Config.exts import db
from ..Model.directeur_model import Directeur
from ..Model.etablissement_model import Etablissement

Directeur_ns = Namespace('directeurs',
                         description='Directeurs (responsables) d\'établissement : créés par '
                                     'le super admin, ils administrent leur établissement')

# Le modèle de SORTIE n'expose jamais le hash du mot de passe
# (flask-restx 1.3.2 ignore load_only : il faut un modèle dédié).
Directeur_model = Directeur_ns.model('Directeur', {
    'id_directeur': fields.Integer(readOnly=True),
    'matricule': fields.String(required=True),
    'nom': fields.String(required=True),
    'prenom': fields.String(),
    'email': fields.String(),
    'telephone': fields.String(),
    'id_etablissement': fields.Integer(required=True),
    'date_creation': fields.DateTime(readOnly=True),
})

# Modèle d'ENTREE uniquement (documentation Swagger)
Directeur_input = Directeur_ns.model('DirecteurInput', {
    'matricule': fields.String(required=True),
    'nom': fields.String(required=True),
    'prenom': fields.String(),
    'email': fields.String(),
    'telephone': fields.String(),
    'id_etablissement': fields.Integer(required=True),
    'mot_de_passe': fields.String(required=True),
})

login_model = Directeur_ns.model('Login', {
    'matricule': fields.String(required=True),
    'mot_de_passe': fields.String(required=True),
})

_claims = {'role': 'directeur'}


def _jetons(directeur: Directeur):
    return {
        'access_token': create_access_token(
            identity=str(directeur.id_directeur),
            additional_claims={'role': 'directeur', 'matricule': directeur.matricule,
                               'id_etablissement': directeur.id_etablissement}),
        'refresh_token': create_refresh_token(identity=str(directeur.id_directeur)),
    }


@Directeur_ns.route('/')
class DirecteurList(Resource):
    @Directeur_ns.marshal_list_with(Directeur_model)
    def get(self):
        id_etab = request.args.get('id_etablissement', type=int)
        requete = Directeur.query
        if id_etab:
            requete = requete.filter_by(id_etablissement=id_etab)
        return requete.all()

    @jwt_required()
    @Directeur_ns.expect(Directeur_input)
    @Directeur_ns.marshal_with(Directeur_model, code=201)
    def post(self):
        """Créer le directeur d'un établissement (super admin uniquement)."""
        from .auth_helpers import super_admin_courant
        if not super_admin_courant():
            Directeur_ns.abort(403, 'Seul le super admin peut créer un directeur')

        data = request.get_json() or {}
        if not data.get('matricule') or not data.get('nom') or not data.get('mot_de_passe'):
            Directeur_ns.abort(400, 'Matricule, nom et mot de passe requis')
        if not data.get('id_etablissement'):
            Directeur_ns.abort(400, 'L\'établissement est requis')

        etab = db.session.get(Etablissement, data.get('id_etablissement'))
        if not etab:
            Directeur_ns.abort(404, 'Établissement non trouvé')

        if Directeur.query.filter_by(matricule=data.get('matricule')).first():
            Directeur_ns.abort(409, 'Ce matricule est déjà utilisé')

        directeur = Directeur(
            matricule=data.get('matricule'),
            nom=data.get('nom'),
            prenom=data.get('prenom'),
            email=data.get('email'),
            telephone=data.get('telephone'),
            id_etablissement=etab.id_etablissement,
            mot_de_passe=data.get('mot_de_passe'),
        )
        directeur.save()
        return directeur, 201


@Directeur_ns.route('/<int:id>')
class DirecteurResource(Resource):
    @Directeur_ns.marshal_with(Directeur_model)
    def get(self, id):
        return db.session.get(Directeur, id) or Directeur_ns.abort(404, 'Directeur non trouvé')

    @jwt_required()
    @Directeur_ns.expect(Directeur_input)
    @Directeur_ns.marshal_with(Directeur_model)
    def put(self, id):
        directeur = db.session.get(Directeur, id) or Directeur_ns.abort(404,
                                                                       'Directeur non trouvé')
        from .auth_helpers import super_admin_courant
        appelant = super_admin_courant()
        # Un directeur peut modifier son propre compte ; le super admin peut tout.
        from .auth_helpers import directeur_courant
        moi = directeur_courant()
        if not appelant and not (moi and moi.id_directeur == id):
            Directeur_ns.abort(403, 'Action non autorisée')

        data = request.get_json() or {}
        directeur.update(
            nom=data.get('nom'),
            prenom=data.get('prenom'),
            email=data.get('email'),
            telephone=data.get('telephone'),
            mot_de_passe=data.get('mot_de_passe'),
        )
        return directeur

    @jwt_required()
    def delete(self, id):
        from .auth_helpers import super_admin_courant
        if not super_admin_courant():
            Directeur_ns.abort(403, 'Seul le super admin peut supprimer un directeur')
        directeur = db.session.get(Directeur, id) or Directeur_ns.abort(404,
                                                                       'Directeur non trouvé')
        directeur.delete()
        return {'message': f'Directeur {id} supprimé'}, 200


@Directeur_ns.route('/login')
class DirecteurLogin(Resource):
    @Directeur_ns.expect(login_model)
    def post(self):
        """Connexion du directeur : accès à la gestion de son établissement."""
        data = request.get_json() or {}
        if not data.get('matricule') or not data.get('mot_de_passe'):
            Directeur_ns.abort(400, 'Matricule et mot de passe requis')
        directeur = Directeur.query.filter_by(matricule=data.get('matricule')).first()
        if not directeur or not directeur.check_password(data.get('mot_de_passe')):
            Directeur_ns.abort(401, 'Identifiants invalides')
        jetons = _jetons(directeur)
        return {
            'message': 'Connexion réussie',
            **jetons,
            'directeur': directeur.to_dict(),
        }, 200


@Directeur_ns.route('/refresh')
class DirecteurTokenRefresh(Resource):
    @_jwt(refresh=True)
    def post(self):
        """Renouveler le jeton d'accès d'un directeur."""
        directeur = db.session.get(Directeur, int(get_jwt_identity()))
        if not directeur:
            Directeur_ns.abort(404, 'Directeur non trouvé')
        return {'access_token': _jetons(directeur)['access_token']}, 200
