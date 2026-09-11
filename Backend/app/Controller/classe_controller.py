from flask_restx import Namespace, Resource, fields
from ..Model.classe_model import Classe
from ..Config.exts import db
from ..utils.dates import parse_date
from flask import request

Classe_ns = Namespace('Classe', description="Un Espace pour les classes")

Classe_model = Classe_ns.model(
    "Classe",
    {
        "id_classe": fields.Integer(),
        "nom_classe": fields.String(),
        "quantite": fields.Float(),
    }
)


@Classe_ns.route("/")
class ClasseList(Resource):
    @Classe_ns.marshal_list_with(Classe_model)
    def get(self):
        return Classe.query.all()

    @Classe_ns.expect(Classe_model)
    def post(self):
        data = request.get_json() or request.form
        new_classe = Classe(
            nom_classe=data.get('nom_classe'),
            quantite=data.get('quantite', 0)
        )
        new_classe.save()
        return {"message": "Classe enregistré"}, 201


@Classe_ns.route('/<int:id>')
class ClasseResource(Resource):
    @Classe_ns.marshal_with(Classe_model)
    def get(self, id):
        return Classe.query.get_or_404(id)

    @Classe_ns.marshal_with(Classe_model)
    def put(self, id):
        classe = Classe.query.get_or_404(id)
        data = request.get_json() or request.form
        classe.update(
            nom_classe=data.get('nom_Classe', Classe.nom_classe),
            quantite=data.get('quantite', Classe.quantite)
        )
        return Classe

    @Classe_ns.marshal_with(Classe_model)
    def delete(self, id):
        classe = Classe.query.get_or_404(id)
        classe.delete()
        return Classe
