from ..Config.exts import db
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash


class Etudiant(db.Model):
    """Étudiant inscrit dans une classe : identifiant (matricule) + mot de
    passe pour consulter ses notes et demander un relevé de notes."""
    __tablename__ = 'etudiant'

    id_etudiant = db.Column(db.Integer, primary_key=True, autoincrement=True)
    matricule = db.Column(db.String(20), unique=True, nullable=False)
    mot_de_passe = db.Column(db.String(255), nullable=False)
    nom = db.Column(db.String(100), nullable=False)
    prenom = db.Column(db.String(100))
    date_naissance = db.Column(db.Date)
    email = db.Column(db.String(120))
    id_classe = db.Column(db.Integer, db.ForeignKey('classe.id_classe'), nullable=False)
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    notes = db.relationship('Note', backref='etudiant', lazy='dynamic',
                            cascade='all, delete-orphan')
    demandes_releve = db.relationship('DemandeReleve', backref='etudiant', lazy='dynamic',
                                      cascade='all, delete-orphan')

    def __init__(self, matricule, nom, mot_de_passe, id_classe, prenom=None,
                 date_naissance=None, email=None):
        self.matricule = matricule
        self.nom = nom
        self.prenom = prenom
        self.date_naissance = date_naissance
        self.email = email
        self.id_classe = id_classe
        self.set_password(mot_de_passe)

    def set_password(self, mot_de_passe):
        self.mot_de_passe = generate_password_hash(mot_de_passe)

    def check_password(self, mot_de_passe):
        return check_password_hash(self.mot_de_passe, mot_de_passe)

    def __repr__(self):
        return f'<Etudiant {self.matricule}>'

    def to_dict(self):
        return {
            'id_etudiant': self.id_etudiant,
            'matricule': self.matricule,
            'nom': self.nom,
            'prenom': self.prenom,
            'date_naissance': self.date_naissance.isoformat() if self.date_naissance else None,
            'email': self.email,
            'id_classe': self.id_classe,
            'date_creation': self.date_creation.isoformat() if self.date_creation else None,
        }

    def save(self):
        db.session.add(self)
        db.session.commit()

    def delete(self):
        db.session.delete(self)
        db.session.commit()

    def update(self, nom=None, prenom=None, email=None, date_naissance=None,
               id_classe=None, mot_de_passe=None):
        if nom:
            self.nom = nom
        if prenom is not None:
            self.prenom = prenom
        if email is not None:
            self.email = email
        if date_naissance is not None:
            self.date_naissance = date_naissance
        if id_classe is not None:
            self.id_classe = id_classe
        if mot_de_passe:
            self.set_password(mot_de_passe)
        db.session.commit()
