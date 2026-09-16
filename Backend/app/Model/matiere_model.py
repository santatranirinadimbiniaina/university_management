from ..Config.exts import db
from decimal import Decimal


class Matiere(db.Model):
    """Une matière est créée pour une classe donnée, avec le coefficient
    spécifique de cette classe (une même matière peut avoir des coefficients
    différents selon les classes)."""
    __tablename__ = 'matiere'

    id_matiere = db.Column(db.Integer, primary_key=True, autoincrement=True)
    nom_matiere = db.Column(db.String(100), nullable=False)
    coefficient = db.Column(db.Numeric(4, 1), nullable=False, default=Decimal('1.0'))
    id_classe = db.Column(db.Integer, db.ForeignKey('classe.id_classe'), nullable=False)

    __table_args__ = (
        db.UniqueConstraint('nom_matiere', 'id_classe', name='uq_matiere_par_classe'),
    )

    affectations = db.relationship('Affectation', backref='matiere', lazy='dynamic',
                                   cascade='all, delete-orphan')

    def __repr__(self):
        return f'<Matiere {self.nom_matiere} (coef {self.coefficient})>'

    def to_dict(self):
        return {
            'id_matiere': self.id_matiere,
            'nom_matiere': self.nom_matiere,
            'coefficient': float(self.coefficient) if self.coefficient is not None else None,
            'id_classe': self.id_classe,
        }

    def save(self):
        db.session.add(self)
        db.session.commit()

    def delete(self):
        db.session.delete(self)
        db.session.commit()

    def update(self, nom_matiere=None, coefficient=None):
        if nom_matiere:
            self.nom_matiere = nom_matiere
        if coefficient is not None:
            self.coefficient = coefficient
        db.session.commit()
