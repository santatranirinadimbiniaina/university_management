from ..Config.exts import db

class Classe(db.Model):
    __tablename__ = 'Classe'
    id_classe = db.Column(db.Integer(), primary_key=True)
    nom_classe = db.Column(db.Integer(), db.ForeignKey('Organisation.id_organisation'), nullable=False)
    quantite = db.Column(db.Float(), nullable=False, default=0)
    utilisateurs = db.relationship('Utilisateur', backref='Classe', lazy='dynamic', cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Article> {self.nom_classe}"

    def save(self):
        db.session.add(self)
        db.session.commit()

    def delete(self):
        db.session.delete(self)
        db.session.commit()

    def update(self, nom_classe, quantite):
        self.nom_classe = nom_classe
        self.quantite = quantite
        db.session.commit()
