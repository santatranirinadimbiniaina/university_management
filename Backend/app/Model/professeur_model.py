from ..Config.exts import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash


class Professeur(db.Model):
    """Professeur : identifiant (matricule) + mot de passe, attribué à une ou
    plusieurs classes via ses affectations, chacune sur une matière précise."""
    __tablename__ = 'professeur'

    id_professeur = db.Column(db.Integer, primary_key=True, autoincrement=True)
    matricule = db.Column(db.String(20), unique=True, nullable=False)
    mot_de_passe = db.Column(db.String(255), nullable=False)
    nom = db.Column(db.String(100), nullable=False)
    prenom = db.Column(db.String(100))
    email = db.Column(db.String(120))
    telephone = db.Column(db.String(30))
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    affectations = db.relationship('Affectation', backref='professeur', lazy='dynamic',
                                   cascade='all, delete-orphan')

    def __init__(self, matricule, nom, mot_de_passe, prenom=None, email=None,
                 telephone=None):
        self.matricule = matricule
        self.nom = nom
        self.prenom = prenom
        self.email = email
        self.telephone = telephone
        self.set_password(mot_de_passe)

    def set_password(self, mot_de_passe):
        self.mot_de_passe = generate_password_hash(mot_de_passe)

    def check_password(self, mot_de_passe):
        return check_password_hash(self.mot_de_passe, mot_de_passe)

    def __repr__(self):
        return f'<Professeur {self.matricule}>'

    def to_dict(self):
        return {
            'id_professeur': self.id_professeur,
            'matricule': self.matricule,
            'nom': self.nom,
            'prenom': self.prenom,
            'email': self.email,
            'telephone': self.telephone,
            'date_creation': self.date_creation.isoformat() if self.date_creation else None,
        }

    def classes_et_matieres(self):
        """Liste des couples (classe, matière) occupés par le professeur."""
        return [(a.classe, a.matiere) for a in self.affectations]

    def enseigne(self, id_classe, id_matiere):
        """Vrai si le professeur occupe cette classe sur cette matière."""
        return self.affectations.filter_by(id_classe=id_classe,
                                           id_matiere=id_matiere).first() is not None

    def save(self):
        db.session.add(self)
        db.session.commit()

    def delete(self):
        db.session.delete(self)
        db.session.commit()

    def update(self, nom=None, prenom=None, email=None, telephone=None,
               mot_de_passe=None):
        if nom:
            self.nom = nom
        if prenom is not None:
            self.prenom = prenom
        if email is not None:
            self.email = email
        if telephone is not None:
            self.telephone = telephone
        if mot_de_passe:
            self.set_password(mot_de_passe)
        db.session.commit()
