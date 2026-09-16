from ..Config.exts import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash


class Directeur(db.Model):
    """Directeur (ou responsable) d'un établissement.

    Créé par le super admin après la création de l'établissement. Le directeur
    administre SON établissement : classes, matières, professeurs, étudiants
    et traitement des demandes de relevé. Le super admin ne crée pas ces
    éléments à la place du directeur.
    """
    __tablename__ = 'directeur'

    id_directeur = db.Column(db.Integer, primary_key=True, autoincrement=True)
    matricule = db.Column(db.String(20), unique=True, nullable=False)
    mot_de_passe = db.Column(db.String(255), nullable=False)
    nom = db.Column(db.String(100), nullable=False)
    prenom = db.Column(db.String(100))
    email = db.Column(db.String(120))
    telephone = db.Column(db.String(30))
    id_etablissement = db.Column(db.Integer, db.ForeignKey('etablissement.id_etablissement'),
                                 nullable=False)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    etablissement = db.relationship('Etablissement', backref='directeurs', lazy='joined')

    def __init__(self, matricule, nom, mot_de_passe, id_etablissement, prenom=None,
                 email=None, telephone=None):
        self.matricule = matricule
        self.nom = nom
        self.prenom = prenom
        self.email = email
        self.telephone = telephone
        self.id_etablissement = id_etablissement
        self.set_password(mot_de_passe)

    def set_password(self, mot_de_passe):
        self.mot_de_passe = generate_password_hash(mot_de_passe)

    def check_password(self, mot_de_passe):
        return check_password_hash(self.mot_de_passe, mot_de_passe)

    def __repr__(self):
        return f'<Directeur {self.matricule}>'

    def to_dict(self):
        return {
            'id_directeur': self.id_directeur,
            'matricule': self.matricule,
            'nom': self.nom,
            'prenom': self.prenom,
            'email': self.email,
            'telephone': self.telephone,
            'id_etablissement': self.id_etablissement,
            'date_creation': self.date_creation.isoformat() if self.date_creation else None,
        }

    def save(self):
        db.session.add(self)
        db.session.commit()

    def delete(self):
        db.session.delete(self)
        db.session.commit()

    def update(self, nom=None, prenom=None, email=None, telephone=None,
               id_etablissement=None, mot_de_passe=None):
        if nom:
            self.nom = nom
        if prenom is not None:
            self.prenom = prenom
        if email is not None:
            self.email = email
        if telephone is not None:
            self.telephone = telephone
        if id_etablissement is not None:
            self.id_etablissement = id_etablissement
        if mot_de_passe:
            self.set_password(mot_de_passe)
        db.session.commit()
