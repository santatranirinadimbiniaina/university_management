"""Reproduction exacte du flux frontend :

1. POST /super_admin/creer_admin
2. POST /super_admin/login  -> jeton (émis avec identity ENTIER, comme en prod)
3. POST /etablissements/
4. POST /directeurs/ avec le jeton du login
5. POST /directeurs/login
"""


def test_flux_complet_http(client, super_admin_http):
    entetes = super_admin_http['entetes']

    # 1. Établissement
    r = client.post('/etablissements/', json={'nom': 'Lycée Démo'}, headers=entetes)
    assert r.status_code == 201, r.get_json()
    id_etab = r.get_json()['id_etablissement']

    # 2. Directeur — payload identique à celui envoyé par le frontend
    payload = {
        'matricule': 'DIR-001',
        'nom': 'Dia',
        'prenom': 'Aminata',
        'email': 'direction@demo.sn',
        'telephone': '+221 77 000 00 00',
        'id_etablissement': id_etab,
        'mot_de_passe': 'dir123',
    }
    r = client.post('/directeurs/', json=payload, headers=entetes)
    assert r.status_code == 201, (
        f"Échec création directeur: {r.status_code} {r.get_json()}"
    )

    # 3. Connexion du directeur
    r = client.post('/directeurs/login', json={
        'matricule': 'DIR-001', 'mot_de_passe': 'dir123',
    })
    assert r.status_code == 200, r.get_json()
    jetons = r.get_json()
    assert jetons['access_token']
    assert jetons['directeur']['id_etablissement'] == id_etab

    # 4. Le jeton du directeur ouvre la création de classe dans son établissement
    entetes_dir = {'Authorization': f"Bearer {jetons['access_token']}"}
    r = client.post('/classes/', json={
        'nom_classe': '2nde A', 'id_etablissement': id_etab,
    }, headers=entetes_dir)
    assert r.status_code == 201, r.get_json()


def test_payload_frontend_avec_champs_vides(client, super_admin_http):
    """Le frontend peut envoyer des champs optionnels vides ou absents."""
    entetes = super_admin_http['entetes']
    id_etab = client.post('/etablissements/', json={'nom': 'Ecole'},
                          headers=entetes).get_json()['id_etablissement']

    payload = {
        'matricule': 'DIR-002',
        'nom': 'Sow',
        'prenom': '',
        'email': '',
        'telephone': '',
        'id_etablissement': id_etab,
        'mot_de_passe': 'dir123',
    }
    r = client.post('/directeurs/', json=payload, headers=entetes)
    assert r.status_code == 201, (
        f"Champs vides refusés: {r.status_code} {r.get_json()}"
    )


def test_refresh_directeur(client, super_admin_http):
    entetes = super_admin_http['entetes']
    id_etab = client.post('/etablissements/', json={'nom': 'Ecole'},
                          headers=entetes).get_json()['id_etablissement']
    client.post('/directeurs/', json={
        'matricule': 'DIR-003', 'nom': 'Ba', 'id_etablissement': id_etab,
        'mot_de_passe': 'dir123',
    }, headers=entetes)

    r = client.post('/directeurs/login', json={'matricule': 'DIR-003',
                                               'mot_de_passe': 'dir123'})
    refresh = r.get_json()['refresh_token']

    r = client.post('/directeurs/refresh',
                    headers={'Authorization': f'Bearer {refresh}'})
    assert r.status_code == 200, r.get_json()
    assert r.get_json()['access_token']
