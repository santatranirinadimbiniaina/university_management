from flask import request
from flask_restx import Namespace, Resource, fields
from app.Config.exts import db
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from app.Model.utilisateur_model import Utilisateur

Utilisateur_ns = Namespace('utilisateurs')

Utilisateur_model = Utilisateur_ns.model("Utilisateur", {
        "id": fields.Integer(readOnly=True),
        "matricule": fields.String(required=True),
        "nom": fields.String(required=True),
        "role": fields.String(required=True),
        "classe": fields.String(required=True),
        "permission": fields.String(required=True),
        "mot_de_passe": fields.String(load_only=True, required=True),
        "date_creation": fields.DateTime(readOnly=True)
    },
)

login_model = Utilisateur_ns.model('Login', {
    'matricule': fields.String(required=True),
    'mot_de_passe': fields.String(required=True)
})

login_response = Utilisateur_ns.model('LoginResponse', {
    'message': fields.String(),
    'access_token': fields.String(),
    'refresh_token': fields.String(),
    'user': fields.Nested(Utilisateur_ns.model('UserInfo', {
        'id': fields.Integer(),
        'nom': fields.String(),
        'role': fields.String(),
        'classe': fields.String(),
        'permission': fields.String(),
        'matricule': fields.String()
    }))
})

@Utilisateur_ns.route("/")
class UtilisateurList(Resource):
    @Utilisateur_ns.marshal_list_with(Utilisateur_model)
    def get(self):
        return Utilisateur.query.all()

@Utilisateur_ns.route("/creer_utilisateur")
class UtilisateurRegistre(Resource):
    @Utilisateur_ns.marshal_with(Utilisateur_model)
    @Utilisateur_ns.expect(Utilisateur_model)
    def post(self):
        data = request.get_json()
        if not data.get('matricule'):
            Utilisateur_ns.abort(400, "Le matricule est requis")
        
        if not data.get('nom'):
            Utilisateur_ns.abort(400, "Le nom est requis")
        
        if not data.get('role'):
            Utilisateur_ns.abort(400, "Le rôle est requis")
        
        if not data.get('mot_de_passe'):
            Utilisateur_ns.abort(400, "Le mot de passe est requis")
        
        if Utilisateur.query.filter_by(matricule=data.get('matricule')).first():
            Utilisateur_ns.abort(409, "Ce matricule est déjà utilisé")
        nouvel_utilisateur = Utilisateur(
            matricule=data.get('matricule'),
            nom=data.get('nom'),
            role=data.get('role').lower(),
            classe=data.get('classe').lower(),
            permission=data.get('permission'),
            mot_de_passe=data.get('mot_de_passe')
        )
        
        nouvel_utilisateur.save()
        
        return nouvel_utilisateur, 201

@Utilisateur_ns.route('/<int:id>')
class UtilisateurResource(Resource):
    @Utilisateur_ns.marshal_with(Utilisateur_model)
    def get(self, id):
        return Utilisateur.query.get_or_404(id)

    @Utilisateur_ns.marshal_with(Utilisateur_model)
    @Utilisateur_ns.expect(Utilisateur_model)
    def put(self, id):
        utilisateur = Utilisateur.query.get_or_404(id)
        data = request.get_json()
        if data.get('mot_de_passe'):
            utilisateur.set_password(data.get('mot_de_passe'))
        
        utilisateur.update(
            nom=data.get('nom', utilisateur.nom),
            role=data.get('role', utilisateur.role).lower(),
            classe=data.get('classe', utilisateur.classe).lower(),
            permission=data.get('permission', utilisateur.permission)
        )
        return utilisateur

@Utilisateur_ns.route("/delete/<int:id>")
class UtilisateurDelete(Resource):
    def delete(self, id):
        utilisateur = Utilisateur.query.get_or_404(id)
        utilisateur.delete()
        return {"message": f"Utilisateur {id} supprimé"}, 200

@Utilisateur_ns.route('/login')
class Login(Resource):
    @Utilisateur_ns.expect(login_model)
    @Utilisateur_ns.marshal_with(login_response)
    def post(self):
        data = request.get_json()
        
        if not data.get('matricule') or not data.get('mot_de_passe'):
            Utilisateur_ns.abort(400, "Matricule et mot de passe requis")
        
        utilisateur = Utilisateur.query.filter_by(matricule=data.get('matricule')).first()
        
        if utilisateur and utilisateur.check_password(data.get('mot_de_passe')):
            # Création des tokens avec l'ID de l'utilisateur comme identité
            # identity en chaîne : flask-jwt-extended >= 4.7 rejette un
            # 'sub' non textuel au décodage.
            access_token = create_access_token(
                identity=str(utilisateur.id),
                additional_claims={
                    'role': utilisateur.role,
                    'classe': utilisateur.classe,
                    'permission': utilisateur.permission,
                    'matricule': utilisateur.matricule
                }
            )
            refresh_token = create_refresh_token(identity=str(utilisateur.id))
            
            return {
                'message': 'Connexion réussie',
                'access_token': access_token,
                'refresh_token': refresh_token,
                'user': {
                    'id': utilisateur.id,
                    'nom': utilisateur.nom,
                    'role': utilisateur.role,
                    'classe': utilisateur.classe,
                    'permission': utilisateur.permission,
                    'matricule': utilisateur.matricule
                }
            }, 200
            
        Utilisateur_ns.abort(401, "Identifiants invalides")

# Route pour rafraîchir le token
@Utilisateur_ns.route('/refresh')
class TokenRefresh(Resource):
    @jwt_required(refresh=True)
    def post(self):
        current_user_id = get_jwt_identity()
        utilisateur = Utilisateur.query.get(current_user_id)
        
        if not utilisateur:
            Utilisateur_ns.abort(404, "Utilisateur non trouvé")
        
        new_access_token = create_access_token(
            identity=str(current_user_id),
            additional_claims={
                'role': utilisateur.role,
                'classe': utilisateur.classe,
                'permission': utilisateur.permission,
                'matricule': utilisateur.matricule
            }
        )
        
        return {
            'access_token': new_access_token
        }, 200