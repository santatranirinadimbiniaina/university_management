from ..Config.exts import db
from datetime import datetime


class Etablissement(db.Model):
    __tablename__ = 'etablissement'

    id_etablissement = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nom = db.Column(db.String(150), nullable=False)
    adresse = db.Column(db.String(255))
    telephone = db.Column(db.String(30))
    email = db.Column(db.String(120))
    date_creation = db.Column(db.DateTime, default=datetime.utcnow)

    classes = db.relationship('Classe', backref='etablissement', lazy='dynamic',
                              cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Etablissement {self.nom}>'

    def to_dict(self):
        return {
            'id_etablissement': self.id_etablissement,
            'nom': self.nom,
            'adresse': self.adresse,
            'telephone': self.telephone,
            'email': self.email,
            'date_creation': self.date_creation.isoformat() if self.date_creation else None,
        }

    def save(self):
        db.session.add(self)
        db.session.commit()

    def delete(self):
        db.session.delete(self)
        db.session.commit()

    def update(self, nom=None, adresse=None, telephone=None, email=None):
        if nom:
            self.nom = nom
        if adresse is not None:
            self.adresse = adresse
        if telephone is not None:
            self.telephone = telephone
        if email is not None:
            self.email = email
        db.session.commit()
