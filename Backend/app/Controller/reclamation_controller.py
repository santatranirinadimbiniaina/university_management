from flask import request
from flask_restx import Namespace, Resource, fields
from flask_jwt_extended import jwt_required
from decimal import Decimal, InvalidOperation
from ..Config.exts import db
from ..Model.reclamation_model import Reclamation
from ..Model.note_model import Note
from ..Model.etudiant_model import Etudiant
from ..Model.classe_model import Classe
from .auth_helpers import etudiant_courant, prof_courant, role_courant

Reclamation_ns = Namespace('reclamations',
                           description='Réclamations des étudiants sur une note, '
                                       'traitées par le professeur auteur')

Reclamation_model = Reclamation_ns.model('Reclamation', {
    'id_reclamation': fields.Integer(readOnly=True),
    'motif': fields.String(required=True),
    'statut': fields.String(readOnly=True),
    'date_reclamation': fields.DateTime(readOnly=True),
    'date_traitement': fields.DateTime(readOnly=True),
    'id_etudiant': fields.Integer(readOnly=True),
    'id_note': fields.Integer(required=True),
})

NOTE_INCONNUE = 'Note non trouvée'


def _note_accesible(note, role, compte):
    """Vrai si le compte peut voir cette réclamation/note."""
    if role == 'super_admin':
        return True
    if role == 'professeur':
        return note.id_professeur == compte.id_professeur
    if role == 'directeur':
        etudiant = db.session.get(Etudiant, note.id_etudiant)
        classe = db.session.get(Classe, etudiant.id_classe) if etudiant else None
        return bool(classe) and classe.id_etablissement == compte.id_etablissement
    if role == 'etudiant':
        return note.id_etudiant == compte.id_etudiant
    return False


@Reclamation_ns.route('/')
class ReclamationList(Resource):
    @jwt_required()
    @Reclamation_ns.marshal_list_with(Reclamation_model)
    def get(self):
        """Étudiant : ses réclamations. Professeur : celles de ses notes.
        Directeur : celles de son établissement. Super admin : toutes."""
        role, compte = role_courant()
        if role is None:
            Reclamation_ns.abort(403, 'Action non autorisée')

        requete = Reclamation.query
        if role == 'etudiant':
            requete = requete.filter_by(id_etudiant=compte.id_etudiant)
        elif role == 'professeur':
            requete = requete.join(Reclamation.note_rel).filter(
                Note.id_professeur == compte.id_professeur)
        elif role == 'directeur':
            requete = (requete.join(Reclamation.note_rel)
                       .join(Etudiant, Etudiant.id_etudiant == Note.id_etudiant)
                       .join(Classe, Classe.id_classe == Etudiant.id_classe)
                       .filter(Classe.id_etablissement == compte.id_etablissement))
        statut = request.args.get('statut')
        if statut:
            requete = requete.filter_by(statut=statut)
        return requete.all()

    @jwt_required()
    @Reclamation_ns.expect(Reclamation_ns.model('NouvelleReclamation', {
        'id_note': fields.Integer(required=True),
        'motif': fields.String(required=True),
    }))
    @Reclamation_ns.marshal_with(Reclamation_model, code=201)
    def post(self):
        """Faire une réclamation sur une note (étudiant connecté)."""
        etudiant = etudiant_courant()
        if not etudiant:
            Reclamation_ns.abort(403, 'Seul un étudiant connecté peut réclamer')

        data = request.get_json() or {}
        motif = (data.get('motif') or '').strip()
        if not motif:
            Reclamation_ns.abort(400, 'Le motif de la réclamation est requis')

        note = db.session.get(Note, data.get('id_note'))
        if not note:
            Reclamation_ns.abort(404, NOTE_INCONNUE)
        if note.id_etudiant != etudiant.id_etudiant:
            Reclamation_ns.abort(403, 'Vous ne pouvez réclamer que sur vos propres notes')

        existante = Reclamation.query.filter_by(id_note=note.id_note,
                                                statut='en_attente').first()
        if existante:
            Reclamation_ns.abort(409, 'Une réclamation est déjà en attente sur cette note')

        reclamation = Reclamation(motif=motif, id_etudiant=etudiant.id_etudiant,
                                  id_note=note.id_note)
        reclamation.save()
        return reclamation, 201


@Reclamation_ns.route('/<int:id>')
class ReclamationResource(Resource):
    @jwt_required()
    @Reclamation_ns.marshal_with(Reclamation_model)
    def get(self, id):
        role, compte = role_courant()
        reclamation = (db.session.get(Reclamation, id)
                       or Reclamation_ns.abort(404, 'Réclamation non trouvée'))
        if not _note_accesible(reclamation.note_rel, role, compte):
            Reclamation_ns.abort(403, 'Accès refusé à cette réclamation')
        return reclamation

    @jwt_required()
    def delete(self, id):
        """L'étudiant peut retirer sa réclamation tant qu'elle est en attente."""
        etudiant = etudiant_courant()
        reclamation = (db.session.get(Reclamation, id)
                       or Reclamation_ns.abort(404, 'Réclamation non trouvée'))
        if not etudiant or reclamation.id_etudiant != etudiant.id_etudiant:
            Reclamation_ns.abort(403, 'Action non autorisée')
        if reclamation.statut != 'en_attente':
            Reclamation_ns.abort(409, 'Cette réclamation a déjà été traitée')
        reclamation.delete()
        return {'message': f'Réclamation {id} supprimée'}, 200


@Reclamation_ns.route('/<int:id>/traiter')
class ReclamationTraitement(Resource):
    @jwt_required()
    @Reclamation_ns.expect(Reclamation_ns.model('TraitementReclamation', {
        'statut': fields.String(required=True, enum=list(Reclamation.STATUTS)),
        'nouvelle_note': fields.Float(description='Nouvelle valeur de la note si '
                                                  'la réclamation est acceptée'),
        'remarque': fields.String(description='Remarque ajoutée à la note'),
    }))
    @Reclamation_ns.marshal_with(Reclamation_model)
    def put(self, id):
        """Traiter une réclamation : réservé au professeur auteur de la note.
        Si acceptée, il peut corriger la valeur de la note et ajouter une remarque."""
        prof = prof_courant()
        if not prof:
            Reclamation_ns.abort(403, 'Seul le professeur auteur de la note peut '
                                      'traiter une réclamation')
        reclamation = (db.session.get(Reclamation, id)
                       or Reclamation_ns.abort(404, 'Réclamation non trouvée'))
        note = db.session.get(Note, reclamation.id_note)
        if not note or note.id_professeur != prof.id_professeur:
            Reclamation_ns.abort(403, 'Cette réclamation ne concerne pas vos notes')

        data = request.get_json() or {}
        statut = data.get('statut')
        if statut not in Reclamation.STATUTS:
            Reclamation_ns.abort(400, 'Statut invalide')

        if statut == 'acceptee':
            nouvelle = data.get('nouvelle_note')
            if nouvelle is not None:
                try:
                    valeur = Decimal(str(nouvelle))
                except (InvalidOperation, TypeError):
                    Reclamation_ns.abort(400, 'La note doit être un nombre')
                if valeur < 0 or valeur > 20:
                    Reclamation_ns.abort(400, 'La note doit être comprise entre 0 et 20')
                note.update(note=valeur)
            remarque = data.get('remarque')
            if remarque is not None:
                note.update(remarque=remarque)

        reclamation.traiter(statut)
        return reclamation
