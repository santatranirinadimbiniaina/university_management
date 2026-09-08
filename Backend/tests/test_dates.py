"""Tests du convertisseur de dates partage par les controleurs."""

from datetime import date, datetime

import pytest

from app.utils.dates import parse_date


@pytest.mark.parametrize('entree, attendu', [
    ('2026-08-12', date(2026, 8, 12)),
    ('2026-01-01', date(2026, 1, 1)),
    # Un horodatage complet : seule la partie date est retenue.
    ('2026-08-12T10:30:00', date(2026, 8, 12)),
    ('2026-08-12 10:30:00', date(2026, 8, 12)),
])
def test_conversion_depuis_une_chaine(entree, attendu):
    assert parse_date(entree) == attendu


@pytest.mark.parametrize('entree', [None, '', '  ' and ''])
def test_valeur_vide_devient_none(entree):
    assert parse_date(entree) is None


@pytest.mark.parametrize('entree', ['pas-une-date', '12/08/2026', '2026-13-45', 'null', 42.5])
def test_valeur_illisible_devient_none(entree):
    """Mieux vaut une date absente qu'une exception 500 sur une saisie douteuse."""
    assert parse_date(entree) is None


def test_objet_date_est_renvoye_inchange():
    valeur = date(2026, 8, 12)
    assert parse_date(valeur) is valeur


def test_objet_datetime_est_ramene_a_sa_date():
    assert parse_date(datetime(2026, 8, 12, 10, 30)) == date(2026, 8, 12)
