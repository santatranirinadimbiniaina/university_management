"""Espaces de noms restx pour le flux scolaire."""
from .etablissement_controller import Etablissement_ns
from .directeur_controller import Directeur_ns
from .classe_controller import Classe_ns
from .matiere_controller import Matiere_ns
from .professeur_controller import Professeur_ns
from .affectation_controller import Affectation_ns
from .etudiant_controller import Etudiant_ns
from .note_controller import Note_ns
from .demande_releve_controller import DemandeReleve_ns

__all__ = [
    'Etablissement_ns', 'Directeur_ns', 'Classe_ns', 'Matiere_ns',
    'Professeur_ns', 'Affectation_ns', 'Etudiant_ns', 'Note_ns',
    'DemandeReleve_ns',
]
