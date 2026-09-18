from ..Config.exts import db
from datetime import datetime


class Reclamation(db.Model):
    """Réclamation d'un étudiant concernant une note saisie (erreur de saisie
    suspectée). Le professeur auteur de la note la valide (statut + correction
    éventuelle de la note) ou la refuse."""
    __tablename__ = 'reclamation'

    STATUTS = ('en_attente', 'acceptee', 'refusee')

    id_reclamation = db.Column(db.Integer, primary_key=True, autoincrement=True)
    motif = db.Column(db.String(255), nullable=False)
    statut = db.Column(db.String(20), nullable=False, default='en_attente')
    date_reclamation = db.Column(db.DateTime, default=datetime.utcnow)
    date_traitement = db.Column(db.DateTime)

    id_etudiant = db.Column(db.Integer, db.ForeignKey('etudiant.id_etudiant'), nullable=False)
    id_note = db.Column(db.Integer, db.ForeignKey('note.id_note'), nullable=False)

    etudiant_rel = db.relationship('Etudiant', backref='reclamations')
    note_rel = db.relationship('Note', backref='reclamations')

    def __repr__(self):
        return f'<Reclamation note={self.id_note} statut={self.statut}>'

    def to_dict(self):
        return {
            'id_reclamation': self.id_reclamation,
            'motif': self.motif,
            'statut': self.statut,
            'date_reclamation': self.date_reclamation.isoformat()
            if self.date_reclamation else None,
            'date_traitement': self.date_traitement.isoformat()
            if self.date_traitement else None,
            'id_etudiant': self.id_etudiant,
            'id_note': self.id_note,
        }

    def save(self):
        db.session.add(self)
        db.session.commit()

    def delete(self):
        db.session.delete(self)
        db.session.commit()

    def traiter(self, statut):
        if statut not in self.STATUTS:
            raise ValueError(f"Statut invalide : {statut}")
        self.statut = statut
        self.date_traitement = datetime.utcnow()
        db.session.commit()
