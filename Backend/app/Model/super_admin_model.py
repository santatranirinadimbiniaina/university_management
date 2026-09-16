from app.Config.exts import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash

class SuperAdmin(db.Model):
    __tablename__ = 'super_admin'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    matricule = db.Column(db.String(20), unique=True, nullable=False)
    mot_de_passe = db.Column(db.String(255), nullable=False)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    def __init__(self, matricule, mot_de_passe=None):
        self.matricule = matricule
        if mot_de_passe:
            self.set_password(mot_de_passe)

    def set_password(self, mot_de_passe):
        self.mot_de_passe = generate_password_hash(mot_de_passe)

    def check_password(self, mot_de_passe):
        return check_password_hash(self.mot_de_passe, mot_de_passe)
    
    def __rep__(self):
        return f'<SuperAdmin {self.matricule}>'
    def to_dict(self):
        return{
            'id': self.id,
            'matricule': self.matricule
        }
    
    def to_dict_public(self):
        """Version sans le hash du mot de passe, pour les réponses API."""
        return self.to_dict()
    
    def save(self):
        db.session.add(self)
        db.session.commit()

    def delete(self):
        db.session.delete(self)
        db.session.commit()
        
    def update(self, username, mot_de_passe=None):
        self.username = username
        if mot_de_passe:
            self.set_password(mot_de_passe)
        db.session.commit()