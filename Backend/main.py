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
    from app.Model.utilisateur_model import Utilisateur
    from app.Model.organisation_model import Organisation
    from app.Model.Depot_model import Depot
    from app.Model.categorie_model import Categorie
    from app.Model.article_model import Article
    from app.Model.sortie_model import Sortie
    return {
        "db": db,
        "SuperAdmin": SuperAdmin,
        "Utilisateur": Utilisateur,
        "Organisation": Organisation,
        "Depot" : Depot,
        "Categorie": Categorie,
        "Article": Article,
        "Sortie": Sortie
    }

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)