from app.Config.exts import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class Utilisateur(db.Model):
    __tablename__ = 'utilisateur'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    matricule = db.Column(db.String(20), nullable=False)
    mot_de_passe = db.Column(db.String(255), nullable=False)
    nom = db.Column(db.String(100), nullable=False)
    role = db.Column(db.String(20), nullable=False)
    classe = db.Column(db.String(100), nullable=False ) 
    permission = db.Column(db.String(100), nullable=False)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, matricule, nom, classe, role, permission, mot_de_passe):
        self.matricule = matricule
        self.nom = nom
        self.role = role
        self.classe = classe
        self.permission = permission
        self.set_password(mot_de_passe)
        
    def set_password(self, mot_de_passe):
        self.mot_de_passe = generate_password_hash(mot_de_passe)

    def check_password(self, mot_de_passe):
        return check_password_hash(self.mot_de_passe, mot_de_passe)
    
    def __repr__(self): 
        return f'<Utilisateur {self.matricule}>'
    
    def to_dict(self):
        return{
            'id': self.id,
            'matricule': self.matricule,
            'nom': self.nom,
            'role': self.role,
            'classe': self.classe,
            'permission': self.permission,
            'date_creation': self.date_creation.isoformat() if self.date_creation else None
        }
    
    def save(self):
        db.session.add(self)
        db.session.commit()

    def delete(self):
        db.session.delete(self)
        db.session.commit()

    def update(self, nom=None, role=None, password=None, permission=None, classe=None ):
        if nom:
            self.nom = nom
        if role:
            self.role = role
        if classe:
            self.classe = classe
        if permission:
            self.permission = permission
        if password:
            self.set_password(password)
        db.session.commit()