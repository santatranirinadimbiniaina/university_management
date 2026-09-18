from ..Config.exts import db
from datetime import datetime
from decimal import Decimal


class Note(db.Model):
    """Note d'un étudiant dans une matière, saisie par le professeur qui
    occupe cette classe sur cette matière (vérifié dans le contrôleur)."""
    __tablename__ = 'note'

    id_note = db.Column(db.Integer, primary_key=True, autoincrement=True)
    note = db.Column(db.Numeric(5, 2), nullable=False)
    type_evaluation = db.Column(db.String(50), default='devoir')
    semestre = db.Column(db.String(20), default='S1')
    date_saisie = db.Column(db.DateTime, default=datetime.utcnow)

    id_etudiant = db.Column(db.Integer, db.ForeignKey('etudiant.id_etudiant'), nullable=False)
    id_matiere = db.Column(db.Integer, db.ForeignKey('matiere.id_matiere'), nullable=False)
    id_professeur = db.Column(db.Integer, db.ForeignKey('professeur.id_professeur'),
                              nullable=False)
    remarque = db.Column(db.String(255))

    __table_args__ = (
        db.CheckConstraint('note >= 0 AND note <= 20', name='ck_note_0_20'),
    )

    def __repr__(self):
        return f'<Note {self.note} etudiant={self.id_etudiant} matiere={self.id_matiere}>'

    def to_dict(self):
        return {
            'id_note': self.id_note,
            'note': float(self.note) if self.note is not None else None,
            'type_evaluation': self.type_evaluation,
            'semestre': self.semestre,
            'date_saisie': self.date_saisie.isoformat() if self.date_saisie else None,
            'id_etudiant': self.id_etudiant,
            'id_matiere': self.id_matiere,
            'id_professeur': self.id_professeur,
            'remarque': self.remarque,
        }

    def save(self):
        db.session.add(self)
        db.session.commit()

    def delete(self):
        db.session.delete(self)
        db.session.commit()

    def update(self, note=None, type_evaluation=None, semestre=None, remarque=None):
        if note is not None:
            self.note = Decimal(str(note))
        if type_evaluation:
            self.type_evaluation = type_evaluation
        if semestre:
            self.semestre = semestre
        if remarque is not None:
            self.remarque = remarque
        db.session.commit()
