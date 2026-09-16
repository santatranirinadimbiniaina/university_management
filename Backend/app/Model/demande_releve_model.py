from ..Config.exts import db
from datetime import datetime


class DemandeReleve(db.Model):
    """Demande de relevé de notes faite par un étudiant, traitée par
    l'administration (statut : en_attente / traitee / refusee)."""
    __tablename__ = 'demande_releve'

    STATUTS = ('en_attente', 'traitee', 'refusee')

    id_demande = db.Column(db.Integer, primary_key=True, autoincrement=True)
    motif = db.Column(db.String(255))
    statut = db.Column(db.String(20), nullable=False, default='en_attente')
    date_demande = db.Column(db.DateTime, default=datetime.utcnow)
    date_traitement = db.Column(db.DateTime)

    id_etudiant = db.Column(db.Integer, db.ForeignKey('etudiant.id_etudiant'), nullable=False)

    def __repr__(self):
        return f'<DemandeReleve etudiant={self.id_etudiant} statut={self.statut}>'

    def to_dict(self):
        return {
            'id_demande': self.id_demande,
            'motif': self.motif,
            'statut': self.statut,
            'date_demande': self.date_demande.isoformat() if self.date_demande else None,
            'date_traitement': self.date_traitement.isoformat() if self.date_traitement else None,
            'id_etudiant': self.id_etudiant,
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
