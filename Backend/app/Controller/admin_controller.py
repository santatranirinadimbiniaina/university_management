from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import create_access_token, create_refresh_token, jwt_required, get_jwt_identity
from app.Config.exts import db
from app.Model.super_admin_model import SuperAdmin

SuperAdmin_ns = Namespace('super_admin')

SuperAdmin_model = SuperAdmin_ns.model("SuperAdmin", {
    "id": fields.Integer(readOnly=True),
    "matricule": fields.String(required=True),
    "mot_de_passe": fields.String(load_only=True),
    "date_creation": fields.DateTime(readOnly=True)
})

login_model = SuperAdmin_ns.model('Login', {
    'matricule': fields.String(required=True),
    'mot_de_passe': fields.String(required=True)
})

login_response = SuperAdmin_ns.model('LoginResponse', {
    'message': fields.String(),
    'access_token': fields.String(),
    'refresh_token': fields.String(),
    'admin': fields.Nested(SuperAdmin_ns.model('AdminInfo', {
        'id': fields.Integer(),
        'matricule': fields.String()
    }))
})

@SuperAdmin_ns.route("/")
class SuperAdminList(Resource):
    @SuperAdmin_ns.marshal_list_with(SuperAdmin_model)
    def get(self):
        return SuperAdmin.query.all()

@SuperAdmin_ns.route("/creer_admin")
class SuperAdminRegister(Resource):
    @SuperAdmin_ns.marshal_with(SuperAdmin_model)
    @SuperAdmin_ns.expect(SuperAdmin_model)
    def post(self):
        data = request.get_json()
        
        matricule = data.get('matricule')
        mdp = data.get('mot_de_passe')

        if not matricule or not mdp:
            SuperAdmin_ns.abort(400, "Matricule et mot de passe requis")
        try:
            nouvel_admin = SuperAdmin(
                matricule=matricule,
                mot_de_passe=mdp  
            )
            
            nouvel_admin.save() 
            
            return nouvel_admin, 201

        except TypeError as e:
            SuperAdmin_ns.abort(500, f"Erreur de création : {str(e)}")
        
@SuperAdmin_ns.route('/<int:id>')
class SuperAdminResource(Resource):
    @SuperAdmin_ns.marshal_with(SuperAdmin_model)
    def get(self, id):
        return SuperAdmin.query.get_or_404(id)

    @SuperAdmin_ns.marshal_with(SuperAdmin_model)
    @SuperAdmin_ns.expect(SuperAdmin_model)
    def put(self, id):
        admin = SuperAdmin.query.get_or_404(id)
        data = request.get_json()

        if data.get('matricule'):
            existing = SuperAdmin.query.filter_by(matricule=data.get('matricule')).first()
            if existing and existing.id != id:
                SuperAdmin_ns.abort(409, "Ce matricule est déjà utilisé")
            admin.matricule = data.get('matricule')
        
        if data.get('mot_de_passe'):
            admin.set_password(data.get('mot_de_passe'))
        
        admin.save()
        return admin

@SuperAdmin_ns.route("/delete/<int:id>")
class SuperAdminDelete(Resource):
    def delete(self, id):
        admin = SuperAdmin.query.get_or_404(id)
        admin.delete()
        return {"message": f"Super Admin {id} supprimé"}, 200

@SuperAdmin_ns.route('/login')
class SuperAdminLogin(Resource):
    @SuperAdmin_ns.expect(login_model)
    @SuperAdmin_ns.marshal_with(login_response)
    def post(self):
        data = request.get_json()
        
        if not data.get('matricule') or not data.get('mot_de_passe'):
            SuperAdmin_ns.abort(400, "Matricule et mot de passe requis")
        
        admin = SuperAdmin.query.filter_by(matricule=data.get('matricule')).first()
        
        if admin and admin.check_password(data.get('mot_de_passe')):
            access_token = create_access_token(
                identity=admin.id,
                additional_claims={
                    'role': 'super_admin',
                    'matricule': admin.matricule
                }
            )
            refresh_token = create_refresh_token(identity=admin.id)
            
            return {
                'message': 'Connexion réussie',
                'access_token': access_token,
                'refresh_token': refresh_token,
                'admin': {
                    'id': admin.id,
                    'matricule': admin.matricule
                }
            }, 200
            
        SuperAdmin_ns.abort(401, "Identifiants invalides")

@SuperAdmin_ns.route('/refresh')
class TokenRefresh(Resource):
    @jwt_required(refresh=True)
    def post(self):
        current_admin_id = get_jwt_identity()
        admin = SuperAdmin.query.get(current_admin_id)
        
        if not admin:
            SuperAdmin_ns.abort(404, "Admin non trouvé")
        
        new_access_token = create_access_token(
            identity=current_admin_id,
            additional_claims={
                'role': 'super_admin',
                'matricule': admin.matricule
            }
        )
        
        return {
            'access_token': new_access_token
        }, 200        