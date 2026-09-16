from ..Config.exts import db


class Classe(db.Model):
    """Une classe appartient à un établissement et porte ses propres matières
    avec leurs coefficients spécifiques (chaque classe a ses coefficients)."""
    __tablename__ = 'classe'

    id_classe = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nom_classe = db.Column(db.String(100), nullable=False)
    niveau = db.Column(db.String(50))
    id_etablissement = db.Column(db.Integer, db.ForeignKey('etablissement.id_etablissement'),
                                 nullable=False)

    __table_args__ = (
        db.UniqueConstraint('nom_classe', 'id_etablissement', name='uq_classe_par_etablissement'),
    )

    matieres = db.relationship('Matiere', backref='classe', lazy='dynamic',
                               cascade='all, delete-orphan')
    etudiants = db.relationship('Etudiant', backref='classe', lazy='dynamic')

    def __repr__(self):
        return f'<Classe {self.nom_classe}>'

    def to_dict(self):
        return {
            'id_classe': self.id_classe,
            'nom_classe': self.nom_classe,
            'niveau': self.niveau,
            'id_etablissement': self.id_etablissement,
        }

    def save(self):
        db.session.add(self)
        db.session.commit()

    def delete(self):
        db.session.delete(self)
        db.session.commit()

    def update(self, nom_classe=None, niveau=None):
        if nom_classe:
            self.nom_classe = nom_classe
        if niveau is not None:
            self.niveau = niveau
        db.session.commit()
