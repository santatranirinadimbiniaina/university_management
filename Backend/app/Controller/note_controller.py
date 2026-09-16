from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from decimal import Decimal, InvalidOperation
from ..Config.exts import db
from ..Model.classe_model import Classe
from ..Model.matiere_model import Matiere
from ..Model.etudiant_model import Etudiant
from ..Model.note_model import Note
from .auth_helpers import prof_courant

Note_ns = Namespace('notes',
                    description='Saisie des notes par le professeur de la classe/matière')

Note_model = Note_ns.model('Note', {
    'id_note': fields.Integer(readOnly=True),
    'note': fields.Float(required=True, description='Note sur 20'),
    'type_evaluation': fields.String(default='devoir'),
    'semestre': fields.String(default='S1'),
    'id_etudiant': fields.Integer(required=True),
    'id_matiere': fields.Integer(required=True),
    'id_professeur': fields.Integer(readOnly=True),
    'date_saisie': fields.DateTime(readOnly=True),
})


@Note_ns.route('/')
class NoteList(Resource):
    @Note_ns.marshal_list_with(Note_model)
    def get(self):
        requete = Note.query
        id_etudiant = request.args.get('id_etudiant', type=int)
        id_matiere = request.args.get('id_matiere', type=int)
        semestre = request.args.get('semestre')
        if id_etudiant:
            requete = requete.filter_by(id_etudiant=id_etudiant)
        if id_matiere:
            requete = requete.filter_by(id_matiere=id_matiere)
        if semestre:
            requete = requete.filter_by(semestre=semestre)
        return requete.all()

    @jwt_required()
    @Note_ns.expect(Note_model)
    @Note_ns.marshal_with(Note_model, code=201)
    def post(self):
        """Ajouter une note : réservé au professeur affecté à cette classe
        sur cette matière."""
        prof = prof_courant()
        if not prof:
            Note_ns.abort(403, 'Seul un professeur connecté peut saisir des notes')

        data = request.get_json() or {}
        try:
            valeur = Decimal(str(data.get('note')))
        except (InvalidOperation, TypeError):
            Note_ns.abort(400, 'La note doit être un nombre')
        if valeur < 0 or valeur > 20:
            Note_ns.abort(400, 'La note doit être comprise entre 0 et 20')

        etudiant = db.session.get(Etudiant, data.get('id_etudiant'))
        if not etudiant:
            Note_ns.abort(404, 'Étudiant non trouvé')
        matiere = db.session.get(Matiere, data.get('id_matiere'))
        if not matiere:
            Note_ns.abort(404, 'Matière non trouvée')

        if not prof.enseigne(etudiant.id_classe, matiere.id_matiere):
            Note_ns.abort(403, 'Vous n\'enseignez pas cette matière dans la classe '
                               'de cet étudiant')

        note = Note(
            note=valeur,
            type_evaluation=data.get('type_evaluation', 'devoir'),
            semestre=data.get('semestre', 'S1'),
            id_etudiant=etudiant.id_etudiant,
            id_matiere=matiere.id_matiere,
            id_professeur=prof.id_professeur,
        )
        note.save()
        return note, 201


@Note_ns.route('/<int:id>')
class NoteResource(Resource):
    @Note_ns.marshal_with(Note_model)
    def get(self, id):
        return db.session.get(Note, id) or Note_ns.abort(404, 'Note non trouvée')

    @jwt_required()
    @Note_ns.expect(Note_model)
    @Note_ns.marshal_with(Note_model)
    def put(self, id):
        prof = prof_courant()
        if not prof:
            Note_ns.abort(403, 'Seul un professeur connecté peut modifier des notes')
        note = db.session.get(Note, id) or Note_ns.abort(404, 'Note non trouvée')
        if note.id_professeur != prof.id_professeur:
            Note_ns.abort(403, 'Vous ne pouvez modifier que vos propres notes')
        data = request.get_json() or {}
        note.update(note=data.get('note'),
                    type_evaluation=data.get('type_evaluation'),
                    semestre=data.get('semestre'))
        return note

    @jwt_required()
    def delete(self, id):
        prof = prof_courant()
        if not prof:
            Note_ns.abort(403, 'Seul un professeur connecté peut supprimer des notes')
        note = db.session.get(Note, id) or Note_ns.abort(404, 'Note non trouvée')
        if note.id_professeur != prof.id_professeur:
            Note_ns.abort(403, 'Vous ne pouvez supprimer que vos propres notes')
        note.delete()
        return {'message': f'Note {id} supprimée'}, 200


@Note_ns.route('/bulletin/<int:id_etudiant>')
class Bulletin(Resource):
    def get(self, id_etudiant):
        """Moyenne pondérée par les coefficients de chaque matière de la classe."""
        etudiant = db.session.get(Etudiant, id_etudiant) or Note_ns.abort(
            404, 'Étudiant non trouvé')
        classe = db.session.get(Classe, etudiant.id_classe)
        semestre = request.args.get('semestre')
        lignes = []
        total_points, total_coefs = Decimal('0'), Decimal('0')
        for matiere in classe.matieres:
            requete = Note.query.filter_by(id_etudiant=etudiant.id_etudiant,
                                           id_matiere=matiere.id_matiere)
            if semestre:
                requete = requete.filter_by(semestre=semestre)
            notes = [n.note for n in requete.all()]
            moyenne = (sum(notes) / len(notes)) if notes else None
            coefficient = Decimal(str(matiere.coefficient))
            if moyenne is not None:
                total_points += moyenne * coefficient
                total_coefs += coefficient
            lignes.append({
                'matiere': matiere.nom_matiere,
                'coefficient': float(coefficient),
                'notes': [float(n) for n in notes],
                'moyenne': float(moyenne) if moyenne is not None else None,
            })
        moyenne_generale = float(total_points / total_coefs) if total_coefs else None
        return {
            'etudiant': etudiant.to_dict(),
            'classe': classe.to_dict(),
            'semestre': semestre,
            'lignes': lignes,
            'moyenne_generale': moyenne_generale,
        }, 200
