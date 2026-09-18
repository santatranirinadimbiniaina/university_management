"""Tests unitaires des nouvelles fonctionnalités : remarques sur les notes,
réclamations des étudiants (traitées par le professeur) et résultats par classe
pour le directeur."""
from decimal import Decimal

from flask_jwt_extended import create_access_token

from app.Config.exts import db
from app.Model.classe_model import Classe
from app.Model.etablissement_model import Etablissement
from app.Model.etudiant_model import Etudiant
from app.Model.matiere_model import Matiere
from app.Model.note_model import Note
from app.Model.professeur_model import Professeur


# ══════════════════════════════════════════════
# Jeu de données de base
# ══════════════════════════════════════════════

def monter_contexte(app):
    """Établissement + classe + matière + prof affecté + 2 étudiants.

    Renvoie les entêtes des 3 acteurs : super admin, prof, étudiant (1er).
    """
    with app.app_context():
        from app.Model.super_admin_model import SuperAdmin
        db.session.add(SuperAdmin(matricule='ADM01', mot_de_passe='admin123'))

        etab = Etablissement(nom='Lycée Test')
        db.session.add(etab)
        db.session.commit()

        classe = Classe(nom_classe='2nde A', id_etablissement=etab.id_etablissement)
        db.session.add(classe)
        db.session.commit()

        matiere = Matiere(nom_matiere='Maths', coefficient=Decimal('2'),
                          id_classe=classe.id_classe)
        db.session.add(matiere)
        db.session.commit()

        prof = Professeur(matricule='PROF01', nom='Dupont', prenom='Jean',
                          mot_de_passe='prof123')
        db.session.add(prof)
        db.session.commit()

        from app.Model.affectation_model import Affectation
        db.session.add(Affectation(id_professeur=prof.id_professeur,
                                   id_classe=classe.id_classe,
                                   id_matiere=matiere.id_matiere))
        db.session.commit()

        etu1 = Etudiant(matricule='ETU01', nom='Martin', prenom='Alice',
                        mot_de_passe='etu123', id_classe=classe.id_classe)
        etu2 = Etudiant(matricule='ETU02', nom='Bernard', prenom='Marc',
                        mot_de_passe='etu123', id_classe=classe.id_classe)
        db.session.add_all([etu1, etu2])
        db.session.commit()

        jeton_admin = create_access_token(identity='1',
                                          additional_claims={'role': 'super_admin'})
        jeton_prof = create_access_token(identity=str(prof.id_professeur),
                                         additional_claims={'role': 'professeur'})
        jeton_etu = create_access_token(identity=str(etu1.id_etudiant),
                                        additional_claims={'role': 'etudiant'})
        return {
            'admin': {'Authorization': f'Bearer {jeton_admin}'},
            'prof': {'Authorization': f'Bearer {jeton_prof}'},
            'etu': {'Authorization': f'Bearer {jeton_etu}'},
            'id_classe': classe.id_classe,
            'id_matiere': matiere.id_matiere,
            'id_prof': prof.id_professeur,
            'id_etu1': etu1.id_etudiant,
            'id_etu2': etu2.id_etudiant,
        }


def ajouter_note(client, entetes_prof, id_etudiant, id_matiere, valeur, **kwargs):
    payload = {'id_etudiant': id_etudiant, 'id_matiere': id_matiere,
               'note': valeur, **kwargs}
    r = client.post('/notes/', json=payload, headers=entetes_prof)
    assert r.status_code == 201, r.get_json()
    return r.get_json()


# ══════════════════════════════════════════════
# Remarques sur les notes
# ══════════════════════════════════════════════

def test_note_avec_remarque_a_la_saisie(client, app):
    ctx = monter_contexte(app)
    note = ajouter_note(client, ctx['prof'], ctx['id_etu1'], ctx['id_matiere'],
                        15.5, remarque='Bon travail, soigne la rédaction')
    assert note['remarque'] == 'Bon travail, soigne la rédaction'


def test_prof_modifie_la_remarque(client, app):
    ctx = monter_contexte(app)
    note = ajouter_note(client, ctx['prof'], ctx['id_etu1'], ctx['id_matiere'], 8)

    r = client.put(f"/notes/{note['id_note']}", json={'remarque': 'Doit progresser'},
                   headers=ctx['prof'])
    assert r.status_code == 200, r.get_json()
    assert r.get_json()['remarque'] == 'Doit progresser'


# ══════════════════════════════════════════════
# Réclamations
# ══════════════════════════════════════════════

def test_etudiant_reclame_sur_sa_note(client, app):
    ctx = monter_contexte(app)
    note = ajouter_note(client, ctx['prof'], ctx['id_etu1'], ctx['id_matiere'], 5)

    r = client.post('/reclamations/', json={'id_note': note['id_note'],
                                            'motif': 'Erreur de saisie probable'},
                    headers=ctx['etu'])
    assert r.status_code == 201, r.get_json()
    assert r.get_json()['statut'] == 'en_attente'


def test_etudiant_ne_reclame_pas_sur_note_d_autrui(client, app):
    ctx = monter_contexte(app)
    note = ajouter_note(client, ctx['prof'], ctx['id_etu2'], ctx['id_matiere'], 12)

    # L'étudiant 1 tente de réclamer sur la note de l'étudiant 2
    r = client.post('/reclamations/', json={'id_note': note['id_note'],
                                            'motif': 'X'}, headers=ctx['etu'])
    assert r.status_code == 403


def test_reclamation_double_refusee(client, app):
    ctx = monter_contexte(app)
    note = ajouter_note(client, ctx['prof'], ctx['id_etu1'], ctx['id_matiere'], 5)
    client.post('/reclamations/', json={'id_note': note['id_note'], 'motif': 'A'},
                headers=ctx['etu'])
    r = client.post('/reclamations/', json={'id_note': note['id_note'], 'motif': 'B'},
                    headers=ctx['etu'])
    assert r.status_code == 409


def test_prof_accepte_et_corrige_la_note(client, app):
    ctx = monter_contexte(app)
    note = ajouter_note(client, ctx['prof'], ctx['id_etu1'], ctx['id_matiere'], 5)
    r = client.post('/reclamations/', json={'id_note': note['id_note'],
                                            'motif': 'J avais bon'},
                    headers=ctx['etu'])
    id_rec = r.get_json()['id_reclamation']

    r = client.put(f'/reclamations/{id_rec}/traiter',
                   json={'statut': 'acceptee', 'nouvelle_note': 13.5,
                         'remarque': 'Corrigé après vérification de la copie'},
                   headers=ctx['prof'])
    assert r.status_code == 200, r.get_json()
    assert r.get_json()['statut'] == 'acceptee'

    # La note a bien été corrigée + remarque ajoutée
    r = client.get(f"/notes/{note['id_note']}")
    assert float(r.get_json()['note']) == 13.5
    assert r.get_json()['remarque'] == 'Corrigé après vérification de la copie'


def test_prof_refuse_la_reclamation_note_intacte(client, app):
    ctx = monter_contexte(app)
    note = ajouter_note(client, ctx['prof'], ctx['id_etu1'], ctx['id_matiere'], 5)
    r = client.post('/reclamations/', json={'id_note': note['id_note'], 'motif': 'Non'},
                    headers=ctx['etu'])
    id_rec = r.get_json()['id_reclamation']

    r = client.put(f'/reclamations/{id_rec}/traiter', json={'statut': 'refusee'},
                   headers=ctx['prof'])
    assert r.status_code == 200
    assert client.get(f"/notes/{note['id_note']}").get_json()['note'] == 5


def test_un_autre_prof_ne_traite_pas_la_reclamation(client, app):
    ctx = monter_contexte(app)
    note = ajouter_note(client, ctx['prof'], ctx['id_etu1'], ctx['id_matiere'], 5)
    r = client.post('/reclamations/', json={'id_note': note['id_note'], 'motif': 'X'},
                    headers=ctx['etu'])
    id_rec = r.get_json()['id_reclamation']

    with app.app_context():
        autre = Professeur(matricule='PROF02', nom='Sow', mot_de_passe='p')
        db.session.add(autre)
        db.session.commit()
        jeton = create_access_token(identity=str(autre.id_professeur),
                                    additional_claims={'role': 'professeur'})
    r = client.put(f'/reclamations/{id_rec}/traiter', json={'statut': 'acceptee'},
                   headers={'Authorization': f'Bearer {jeton}'})
    assert r.status_code == 403


def test_prof_voit_les_reclamations_de_ses_notes(client, app):
    ctx = monter_contexte(app)
    note = ajouter_note(client, ctx['prof'], ctx['id_etu1'], ctx['id_matiere'], 5)
    client.post('/reclamations/', json={'id_note': note['id_note'], 'motif': 'A'},
                headers=ctx['etu'])

    r = client.get('/reclamations/', headers=ctx['prof'])
    assert r.status_code == 200
    assert len(r.get_json()) == 1
    assert r.get_json()[0]['statut'] == 'en_attente'


def test_etudiant_ne_voit_que_ses_reclamations(client, app):
    ctx = monter_contexte(app)
    note2 = ajouter_note(client, ctx['prof'], ctx['id_etu2'], ctx['id_matiere'], 12)

    with app.app_context():
        etu2 = db.session.get(Etudiant, ctx['id_etu2'])
        jeton2 = create_access_token(identity=str(etu2.id_etudiant),
                                     additional_claims={'role': 'etudiant'})
    entetes2 = {'Authorization': f'Bearer {jeton2}'}
    client.post('/reclamations/', json={'id_note': note2['id_note'], 'motif': 'X'},
                headers=entetes2)

    # L'étudiant 1 ne voit rien
    r = client.get('/reclamations/', headers=ctx['etu'])
    assert r.status_code == 200
    assert len(r.get_json()) == 0
    # L'étudiant 2 voit la sienne
    r = client.get('/reclamations/', headers=entetes2)
    assert len(r.get_json()) == 1


def test_etudiant_retire_sa_reclamation_en_attente(client, app):
    ctx = monter_contexte(app)
    note = ajouter_note(client, ctx['prof'], ctx['id_etu1'], ctx['id_matiere'], 5)
    r = client.post('/reclamations/', json={'id_note': note['id_note'], 'motif': 'A'},
                    headers=ctx['etu'])
    id_rec = r.get_json()['id_reclamation']

    r = client.delete(f'/reclamations/{id_rec}', headers=ctx['etu'])
    assert r.status_code == 200
    assert client.get('/reclamations/', headers=ctx['etu']).get_json() == []


# ══════════════════════════════════════════════
# Résultats par classe (directeur)
# ══════════════════════════════════════════════

def test_resultats_classement_par_moyenne(client, app):
    ctx = monter_contexte(app)
    ajouter_note(client, ctx['prof'], ctx['id_etu1'], ctx['id_matiere'], 15)
    ajouter_note(client, ctx['prof'], ctx['id_etu1'], ctx['id_matiere'], 11)
    ajouter_note(client, ctx['prof'], ctx['id_etu2'], ctx['id_matiere'], 18)

    r = client.get(f"/notes/resultats/{ctx['id_classe']}", headers=ctx['admin'])
    assert r.status_code == 200, r.get_json()
    corps = r.get_json()
    assert corps['classe']['id_classe'] == ctx['id_classe']

    # Classement de la matière : ETU02 (18) avant ETU01 (13)
    ligne = corps['matieres'][0]
    assert ligne['matiere'] == 'Maths'
    classement = ligne['classement']
    assert classement[0]['etudiant'] == 'Marc Bernard'
    assert classement[0]['moyenne'] == 18
    assert classement[0]['rang'] == 1
    assert classement[1]['moyenne'] == 13  # (15 + 11) / 2
    assert classement[1]['rang'] == 2

    # Classement général cohérent
    gen = corps['classement_general']
    assert gen[0]['etudiant'] == 'Marc Bernard'
    assert gen[1]['moyenne_generale'] == 13


def test_resultats_filtre_par_semestre(client, app):
    ctx = monter_contexte(app)
    ajouter_note(client, ctx['prof'], ctx['id_etu1'], ctx['id_matiere'], 15,
                 semestre='S1')
    ajouter_note(client, ctx['prof'], ctx['id_etu1'], ctx['id_matiere'], 5,
                 semestre='S2')

    r = client.get(f"/notes/resultats/{ctx['id_classe']}?semestre=S2",
                   headers=ctx['admin'])
    ligne = r.get_json()['matieres'][0]
    assert len(ligne['classement']) == 1
    assert ligne['classement'][0]['moyenne'] == 5


def test_resultats_refuse_au_professeur_et_etudiant(client, app):
    ctx = monter_contexte(app)
    r = client.get(f"/notes/resultats/{ctx['id_classe']}", headers=ctx['prof'])
    assert r.status_code == 403
    r = client.get(f"/notes/resultats/{ctx['id_classe']}", headers=ctx['etu'])
    assert r.status_code == 403
