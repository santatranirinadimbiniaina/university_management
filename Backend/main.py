from app import create_app, celery
from app.Config.exts import db
from flask.cli import with_appcontext
import click
from datetime import datetime, date
import json
from decimal import Decimal
from flask.json.provider import DefaultJSONProvider

class CustomJSONProvider(DefaultJSONProvider):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)

        if isinstance(obj, (datetime, date)):
            return obj.isoformat()
            
        return super().default(obj)

app = create_app()
app.json = CustomJSONProvider(app)

@app.shell_context_processor
def make_shell_context():
    from app.Model.super_admin_model import SuperAdmin
    from app.Model.etablissement_model import Etablissement
    from app.Model.directeur_model import Directeur
    from app.Model.classe_model import Classe
    from app.Model.matiere_model import Matiere
    from app.Model.professeur_model import Professeur
    from app.Model.affectation_model import Affectation
    from app.Model.etudiant_model import Etudiant
    from app.Model.note_model import Note
    from app.Model.demande_releve_model import DemandeReleve
    return {
        "db": db,
        "SuperAdmin": SuperAdmin,
        "Etablissement": Etablissement,
        "Directeur": Directeur,
        "Classe": Classe,
        "Matiere": Matiere,
        "Professeur": Professeur,
        "Affectation": Affectation,
        "Etudiant": Etudiant,
        "Note": Note,
        "DemandeReleve": DemandeReleve
    }

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)