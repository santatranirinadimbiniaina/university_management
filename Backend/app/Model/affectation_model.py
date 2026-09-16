from ..Config.exts import db


class Affectation(db.Model):
    """Attribue un professeur à une classe pour une matière donnée :
    un professeur peut occuper une à plusieurs classes, et plusieurs
    professeurs peuvent enseigner des matières différentes d'une même classe."""
    __tablename__ = 'affectation'

    id_affectation = db.Column(db.Integer, primary_key=True, autoincrement=True)
    id_professeur = db.Column(db.Integer, db.ForeignKey('professeur.id_professeur'),
                              nullable=False)
    id_classe = db.Column(db.Integer, db.ForeignKey('classe.id_classe'), nullable=False)
    id_matiere = db.Column(db.Integer, db.ForeignKey('matiere.id_matiere'), nullable=False)

    __table_args__ = (
        db.UniqueConstraint('id_professeur', 'id_classe', 'id_matiere',
                            name='uq_affectation_unique'),
    )

    def __repr__(self):
        return (f'<Affectation prof={self.id_professeur} '
                f'classe={self.id_classe} matiere={self.id_matiere}>')

    def to_dict(self):
        return {
            'id_affectation': self.id_affectation,
            'id_professeur': self.id_professeur,
            'id_classe': self.id_classe,
            'id_matiere': self.id_matiere,
        }

    def save(self):
        db.session.add(self)
        db.session.commit()

    def delete(self):
        db.session.delete(self)
        db.session.commit()
