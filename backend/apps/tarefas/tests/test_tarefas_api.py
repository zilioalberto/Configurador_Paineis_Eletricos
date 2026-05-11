import secrets
from datetime import date, datetime, time, timedelta
from unittest.mock import patch

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from django.utils import timezone
from rest_framework.test import APIClient

from core.choices import DEFAULT_PERMISSIONS_BY_TIPO, TipoUsuarioChoices
from core.permissions import PermissionKeys
from apps.tarefas.models import (
    ApontamentoHora,
    ColunaTarefa,
    HistoricoTarefa,
    MotivoEncerramentoSessaoChoices,
    QuadroTarefa,
    SessaoTrabalhoTarefa,
    StatusSemanticoColunaChoices,
    StatusTarefaChoices,
    Tarefa,
    TipoTarefaChoices,
    TipoHistoricoTarefaChoices,
)
from apps.rh.models import Colaborador, JornadaTrabalho
from apps.tarefas.services.quadro_padrao import garantir_quadro_padrao_tarefas

User = get_user_model()


def _auth_client(user, password):
    client = APIClient()
    token = client.post(
        reverse("token_obtain_pair"),
        {"email": user.email, "password": password},
        format="json",
    )
    assert token.status_code == 200
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {token.data['access']}")
    return client


@pytest.fixture
def user_basico():
    raw = secrets.token_urlsafe(32)
    user = User.objects.create_user(
        email="tarefas-basico@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.USUARIO,
    )
    return user, raw


@pytest.fixture
def user_sem_permissoes():
    raw = secrets.token_urlsafe(32)
    defaults = list(DEFAULT_PERMISSIONS_BY_TIPO[TipoUsuarioChoices.USUARIO])
    user = User.objects.create_user(
        email="tarefas-sem-permissao@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.USUARIO,
        permissoes_negadas=defaults,
    )
    return user, raw


@pytest.fixture
def user_operacional():
    raw = secrets.token_urlsafe(32)
    user = User.objects.create_user(
        email="tarefas-operacional@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ORCAMENTISTA,
    )
    return user, raw


@pytest.fixture
def user_admin():
    raw = secrets.token_urlsafe(32)
    user = User.objects.create_superuser(
        email="tarefas-admin@test.com",
        password=raw,
        is_active=True,
        tipo_usuario=TipoUsuarioChoices.ADMIN,
    )
    return user, raw


@pytest.fixture
def quadro_colunas():
    quadro = QuadroTarefa.objects.create(nome="Tarefas", equipe="Producao")
    pendentes = ColunaTarefa.objects.create(
        quadro=quadro,
        nome="Pendentes",
        ordem=0,
        status_semantico=StatusSemanticoColunaChoices.PENDENTE,
    )
    trabalhando = ColunaTarefa.objects.create(
        quadro=quadro,
        nome="Trabalhando",
        ordem=1,
        status_semantico=StatusSemanticoColunaChoices.EM_ANDAMENTO,
    )
    entregue = ColunaTarefa.objects.create(
        quadro=quadro,
        nome="Entregue",
        ordem=2,
        status_semantico=StatusSemanticoColunaChoices.CONCLUIDO,
    )
    return quadro, pendentes, trabalhando, entregue


def _tarefa_interna(**kwargs):
    kwargs.setdefault("tipo_etapa", TipoTarefaChoices.INTERNA)
    return Tarefa.objects.create(**kwargs)


@pytest.mark.django_db
class TestTarefasApi:
    def test_kanban_requires_permission(self, user_sem_permissoes):
        user, raw = user_sem_permissoes
        client = _auth_client(user, raw)
        response = client.get(reverse("tarefas-kanban"))
        assert response.status_code == 403

    def test_kanban_empty_allowed_for_default_user(self, user_basico):
        user, raw = user_basico
        client = _auth_client(user, raw)
        response = client.get(reverse("tarefas-kanban"))
        assert response.status_code == 200
        assert response.data == {"quadro": None}

    def test_kanban_colaborador_visualiza_apenas_tarefas_dele(self, user_basico, user_operacional, quadro_colunas):
        user, raw = user_basico
        outro, _ = user_operacional
        _, a_fazer, fazendo, _ = quadro_colunas
        tarefa_minha = Tarefa.objects.create(
            titulo="Minha tarefa",
            coluna=a_fazer,
            responsavel=user,
            criador=user,
        )
        _tarefa_interna(
            titulo="Tarefa de outro colaborador",
            coluna=fazendo,
            responsavel=outro,
            criador=outro,
        )
        tarefa_compartilhada = _tarefa_interna(
            titulo="Tarefa compartilhada",
            coluna=fazendo,
            responsavel=outro,
            criador=outro,
        )
        tarefa_compartilhada.colaboradores.add(user)
        client = _auth_client(user, raw)

        response = client.get(reverse("tarefas-kanban"))

        assert response.status_code == 200
        tarefas = [
            tarefa
            for coluna in response.data["quadro"]["colunas"]
            for tarefa in coluna["tarefas"]
        ]
        assert {str(tarefa["id"]) for tarefa in tarefas} == {
            str(tarefa_minha.id),
            str(tarefa_compartilhada.id),
        }
        assert response.data["quadro"]["total_tarefas"] == 2

    def test_admin_visualiza_todas_tarefas_no_kanban(self, user_admin, user_basico, user_operacional, quadro_colunas):
        admin, raw = user_admin
        user, _ = user_basico
        outro, _ = user_operacional
        _, a_fazer, fazendo, _ = quadro_colunas
        Tarefa.objects.create(titulo="Tarefa A", coluna=a_fazer, responsavel=user, criador=user)
        _tarefa_interna(titulo="Tarefa B", coluna=fazendo, responsavel=outro, criador=outro)
        client = _auth_client(admin, raw)

        response = client.get(reverse("tarefas-kanban"))

        assert response.status_code == 200
        tarefas = [
            tarefa
            for coluna in response.data["quadro"]["colunas"]
            for tarefa in coluna["tarefas"]
        ]
        assert len(tarefas) == 2
        assert response.data["quadro"]["total_tarefas"] == 2

    def test_kanban_inclui_total_horas_apontadas_por_tarefa(self, user_basico, quadro_colunas):
        user, raw = user_basico
        _, a_fazer, fazendo, _ = quadro_colunas
        tarefa = _tarefa_interna(titulo="Montagem com horas", coluna=fazendo, criador=user)
        outra_tarefa = _tarefa_interna(titulo="Outra tarefa", coluna=fazendo, criador=user)
        ApontamentoHora.objects.create(
            tarefa=tarefa,
            colaborador=user,
            data=date.today(),
            horas="1.25",
            etapa="Montagem",
        )
        ApontamentoHora.objects.create(
            tarefa=tarefa,
            colaborador=user,
            data=date.today(),
            horas="0.75",
            etapa="Teste",
        )
        ApontamentoHora.objects.create(
            tarefa=outra_tarefa,
            colaborador=user,
            data=date.today(),
            horas="3.00",
            etapa="Outro",
        )
        client = _auth_client(user, raw)

        response = client.get(reverse("tarefas-kanban"))

        assert response.status_code == 200
        tarefas = [
            item
            for coluna in response.data["quadro"]["colunas"]
            for item in coluna["tarefas"]
        ]
        tarefa_data = next(item for item in tarefas if item["id"] == str(tarefa.id))
        assert tarefa_data["total_horas_apontadas"] == "2.00"

    def test_kanban_total_horas_apontadas_so_do_colaborador_logado(
        self, user_basico, user_operacional, quadro_colunas
    ):
        user_a, raw_a = user_basico
        user_b, raw_b = user_operacional
        _, _, fazendo, _ = quadro_colunas
        tarefa = _tarefa_interna(titulo="Partilhada", coluna=fazendo, criador=user_a)
        tarefa.colaboradores.add(user_b)
        ApontamentoHora.objects.create(
            tarefa=tarefa,
            colaborador=user_a,
            data=date.today(),
            horas="1.25",
            etapa="A",
        )
        ApontamentoHora.objects.create(
            tarefa=tarefa,
            colaborador=user_b,
            data=date.today(),
            horas="10.00",
            etapa="B",
        )
        r_a = _auth_client(user_a, raw_a).get(reverse("tarefas-kanban"))
        assert r_a.status_code == 200
        tarefas_a = [
            item
            for coluna in r_a.data["quadro"]["colunas"]
            for item in coluna["tarefas"]
        ]
        data_a = next(item for item in tarefas_a if item["titulo"] == "Partilhada")
        assert data_a["total_horas_apontadas"] == "1.25"

        r_b = _auth_client(user_b, raw_b).get(reverse("tarefas-kanban"))
        assert r_b.status_code == 200
        data_b = next(
            item
            for coluna in r_b.data["quadro"]["colunas"]
            for item in coluna["tarefas"]
            if item["titulo"] == "Partilhada"
        )
        assert data_b["total_horas_apontadas"] == "10.00"

    def test_responsaveis_usa_usuarios_ativos_do_accounts(self, user_operacional):
        user, raw = user_operacional
        User.objects.create_user(
            email="tarefas-inativo@test.com",
            password=secrets.token_urlsafe(32),
            is_active=False,
            tipo_usuario=TipoUsuarioChoices.USUARIO,
        )
        outro = User.objects.create_user(
            email="tarefas-ativo@test.com",
            password=secrets.token_urlsafe(32),
            first_name="Maria",
            last_name="Oficina",
            is_active=True,
            tipo_usuario=TipoUsuarioChoices.USUARIO,
        )
        client = _auth_client(user, raw)

        response = client.get(reverse("tarefas-responsaveis"))

        assert response.status_code == 200
        ids = {item["id"] for item in response.data}
        assert user.id in ids
        assert outro.id in ids
        assert all(item["email"] != "tarefas-inativo@test.com" for item in response.data)

    def test_create_default_board_from_empty_state(self, user_operacional):
        user, raw = user_operacional
        client = _auth_client(user, raw)

        response = client.post(reverse("tarefas-quadro-padrao"), format="json")

        assert response.status_code == 201
        assert response.data["quadro"]["nome"] == "Tarefas"
        assert [coluna["nome"] for coluna in response.data["quadro"]["colunas"]] == [
            "Pendentes",
            "Trabalhando",
            "Entregue",
        ]

    def test_create_task_registers_history(self, user_operacional, quadro_colunas):
        user, raw = user_operacional
        _, a_fazer, _, _ = quadro_colunas
        client = _auth_client(user, raw)

        response = client.post(
            reverse("tarefas-list"),
            {
                "titulo": "Montar base do painel",
                "descricao": "Separar materiais e iniciar montagem.",
                "coluna": str(a_fazer.id),
                "responsavel": user.id,
                "colaboradores": [user.id],
                "prioridade": "ALTA",
            },
            format="json",
        )

        assert response.status_code == 201
        tarefa = Tarefa.objects.get(pk=response.data["id"])
        assert tarefa.criador == user
        assert list(tarefa.colaboradores.values_list("id", flat=True)) == [user.id]
        assert tarefa.status == StatusTarefaChoices.PENDENTE
        assert tarefa.tipo_etapa == TipoTarefaChoices.NAO_CLASSIFICADA
        assert HistoricoTarefa.objects.filter(
            tarefa=tarefa,
            tipo=TipoHistoricoTarefaChoices.CRIADA,
        ).exists()

    def test_move_task_updates_column_status_and_history(self, user_operacional, quadro_colunas):
        user, raw = user_operacional
        _, a_fazer, fazendo, _ = quadro_colunas
        tarefa = Tarefa.objects.create(
            titulo="Montar barramentos",
            coluna=a_fazer,
            responsavel=user,
            criador=user,
            tipo_etapa=TipoTarefaChoices.INTERNA,
        )
        tarefa_destino = _tarefa_interna(
            titulo="Separar cabos",
            coluna=fazendo,
            responsavel=user,
            criador=user,
            ordem=0,
        )
        client = _auth_client(user, raw)

        response = client.post(
            reverse("tarefas-mover", kwargs={"pk": tarefa.id}),
            {"coluna_id": str(fazendo.id), "ordem": 0},
            format="json",
        )

        assert response.status_code == 200
        tarefa.refresh_from_db()
        tarefa_destino.refresh_from_db()
        assert tarefa.coluna == fazendo
        assert tarefa.ordem == 0
        assert tarefa_destino.ordem == 1
        assert tarefa.status == StatusTarefaChoices.INICIADA
        assert HistoricoTarefa.objects.filter(
            tarefa=tarefa,
            tipo=TipoHistoricoTarefaChoices.MOVIDA,
            coluna_origem=a_fazer,
            coluna_destino=fazendo,
        ).exists()

    def test_move_task_to_entregue_stops_active_sessions(
        self, user_operacional, user_basico, quadro_colunas
    ):
        user, raw = user_operacional
        colaborador, _ = user_basico
        _, _, fazendo, entregue = quadro_colunas
        tarefa = _tarefa_interna(
            titulo="Finalizar montagem",
            coluna=fazendo,
            responsavel=user,
            criador=user,
        )
        tarefa.colaboradores.add(user, colaborador)
        sessao_user = SessaoTrabalhoTarefa.objects.create(
            tarefa=tarefa,
            colaborador=user,
        )
        sessao_colaborador = SessaoTrabalhoTarefa.objects.create(
            tarefa=tarefa,
            colaborador=colaborador,
        )
        client = _auth_client(user, raw)

        response = client.post(
            reverse("tarefas-mover", kwargs={"pk": tarefa.id}),
            {"coluna_id": str(entregue.id)},
            format="json",
        )

        assert response.status_code == 200
        tarefa.refresh_from_db()
        sessao_user.refresh_from_db()
        sessao_colaborador.refresh_from_db()
        assert tarefa.coluna == entregue
        assert tarefa.status == StatusTarefaChoices.CONCLUIDA
        assert tarefa.sessoes_trabalho.filter(finalizado_em__isnull=True).count() == 0
        assert sessao_user.finalizado_em is not None
        assert sessao_colaborador.finalizado_em is not None
        assert sessao_user.motivo_encerramento == MotivoEncerramentoSessaoChoices.SISTEMA
        assert sessao_colaborador.motivo_encerramento == MotivoEncerramentoSessaoChoices.SISTEMA
        assert set(
            ApontamentoHora.objects.filter(tarefa=tarefa).values_list(
                "colaborador_id",
                flat=True,
            )
        ) == {user.id, colaborador.id}
        assert HistoricoTarefa.objects.filter(
            tarefa=tarefa,
            tipo=TipoHistoricoTarefaChoices.APONTAMENTO,
        ).count() == 2

    def test_colaborador_classifica_sem_permissao_global(
        self, user_basico, user_operacional, quadro_colunas
    ):
        """Colaborador indicado na tarefa pode classificar sem tarefa.classificar."""
        criador, _raw_criador = user_operacional
        colab, raw_colab = user_basico
        _, pendentes, _, _ = quadro_colunas
        tarefa = Tarefa.objects.create(
            titulo="Triagem conjunta",
            coluna=pendentes,
            criador=criador,
            tipo_etapa=TipoTarefaChoices.NAO_CLASSIFICADA,
        )
        tarefa.colaboradores.add(colab)
        client = _auth_client(colab, raw_colab)

        response = client.post(
            reverse("tarefas-classificar", kwargs={"pk": tarefa.id}),
            {"tipo_etapa": TipoTarefaChoices.INTERNA},
            format="json",
        )

        assert response.status_code == 200
        tarefa.refresh_from_db()
        assert tarefa.tipo_etapa == TipoTarefaChoices.INTERNA

    def test_classificar_tarefa_exige_vinculo_para_proposta(self, user_operacional, quadro_colunas):
        user, raw = user_operacional
        _, a_fazer, _, _ = quadro_colunas
        tarefa = Tarefa.objects.create(
            titulo="Elaborar proposta tecnica",
            coluna=a_fazer,
            responsavel=user,
            criador=user,
        )
        client = _auth_client(user, raw)

        sem_prop = client.post(
            reverse("tarefas-classificar", kwargs={"pk": tarefa.id}),
            {"tipo_etapa": TipoTarefaChoices.PROPOSTA},
            format="json",
        )
        com_prop = client.post(
            reverse("tarefas-classificar", kwargs={"pk": tarefa.id}),
            {
                "tipo_etapa": TipoTarefaChoices.PROPOSTA,
                "proposta_referencia": "PROP-05001-26",
            },
            format="json",
        )

        assert sem_prop.status_code == 400
        assert com_prop.status_code == 200
        tarefa.refresh_from_db()
        assert tarefa.tipo_etapa == TipoTarefaChoices.PROPOSTA
        assert tarefa.proposta_referencia == "PROP-05001-26"
        assert HistoricoTarefa.objects.filter(
            tarefa=tarefa,
            tipo=TipoHistoricoTarefaChoices.CLASSIFICADA,
        ).exists()

    def test_update_task_registers_edit_history(self, user_operacional, quadro_colunas):
        user, raw = user_operacional
        _, a_fazer, _, _ = quadro_colunas
        tarefa = Tarefa.objects.create(
            titulo="Montar base",
            coluna=a_fazer,
            responsavel=user,
            criador=user,
        )
        client = _auth_client(user, raw)

        response = client.patch(
            reverse("tarefas-detail", kwargs={"pk": tarefa.id}),
            {"titulo": "Montar base revisada", "prioridade": "ALTA"},
            format="json",
        )

        assert response.status_code == 200
        tarefa.refresh_from_db()
        assert tarefa.titulo == "Montar base revisada"
        historico = HistoricoTarefa.objects.get(
            tarefa=tarefa,
            tipo=TipoHistoricoTarefaChoices.EDITADA,
        )
        assert historico.dados["campos"] == ["titulo", "prioridade"]

    def test_time_entry_must_be_positive(self, user_basico, quadro_colunas):
        user, _ = user_basico
        _, _, fazendo, _ = quadro_colunas
        tarefa = _tarefa_interna(titulo="Teste eletrico", coluna=fazendo, criador=user)

        with pytest.raises(Exception, match="horas"):
            ApontamentoHora.objects.create(
                tarefa=tarefa,
                colaborador=user,
                data=date.today(),
                horas=0,
            )

    def test_create_time_entry_registers_history(self, user_basico, quadro_colunas):
        user, raw = user_basico
        _, _, fazendo, _ = quadro_colunas
        tarefa = _tarefa_interna(titulo="Conferencia", coluna=fazendo, criador=user)
        client = _auth_client(user, raw)

        response = client.post(
            reverse("tarefas-apontamentos-list"),
            {
                "tarefa": str(tarefa.id),
                "data": date.today().isoformat(),
                "horas": "1.50",
                "etapa": "Montagem",
            },
            format="json",
        )

        assert response.status_code == 201
        assert HistoricoTarefa.objects.filter(
            tarefa=tarefa,
            tipo=TipoHistoricoTarefaChoices.APONTAMENTO,
        ).exists()

    def test_time_entry_log_filters_by_task(self, user_basico, user_operacional, quadro_colunas):
        user, raw = user_basico
        outro, _ = user_operacional
        _, _, fazendo, _ = quadro_colunas
        tarefa = _tarefa_interna(titulo="Log de horas", coluna=fazendo, criador=user)
        outra_tarefa = _tarefa_interna(titulo="Outra tarefa", coluna=fazendo, criador=user)
        apontamento = ApontamentoHora.objects.create(
            tarefa=tarefa,
            colaborador=user,
            data=date.today(),
            horas="1.25",
            etapa="Montagem",
        )
        ApontamentoHora.objects.create(
            tarefa=outra_tarefa,
            colaborador=outro,
            data=date.today(),
            horas="0.50",
            etapa="Teste",
        )
        client = _auth_client(user, raw)

        response = client.get(
            reverse("tarefas-apontamentos-list"),
            {"tarefa": str(tarefa.id)},
        )

        assert response.status_code == 200
        assert [item["id"] for item in response.data] == [str(apontamento.id)]
        assert response.data[0]["colaborador_nome"]
        assert response.data[0]["sessao_iniciado_em"] is None

    def test_timer_allows_multiple_collaborators_on_same_task(self, user_basico, user_operacional, quadro_colunas):
        user_a, raw_a = user_basico
        user_b, raw_b = user_operacional
        _, a_fazer, _, _ = quadro_colunas
        tarefa = _tarefa_interna(titulo="Montagem em equipe", coluna=a_fazer, criador=user_a)
        tarefa.colaboradores.add(user_a, user_b)

        response_a = _auth_client(user_a, raw_a).post(
            reverse("tarefas-timer-iniciar", kwargs={"tarefa_id": tarefa.id}),
            format="json",
        )
        response_b = _auth_client(user_b, raw_b).post(
            reverse("tarefas-timer-iniciar", kwargs={"tarefa_id": tarefa.id}),
            format="json",
        )

        assert response_a.status_code == 201
        assert response_b.status_code == 201
        assert SessaoTrabalhoTarefa.objects.filter(
            tarefa=tarefa,
            finalizado_em__isnull=True,
        ).count() == 2

    def test_timer_blocks_same_collaborator_on_two_tasks(self, user_basico, quadro_colunas):
        user, raw = user_basico
        _, a_fazer, _, _ = quadro_colunas
        tarefa_a = _tarefa_interna(titulo="Tarefa A", coluna=a_fazer, criador=user)
        tarefa_b = _tarefa_interna(titulo="Tarefa B", coluna=a_fazer, criador=user)
        tarefa_a.colaboradores.add(user)
        tarefa_b.colaboradores.add(user)
        client = _auth_client(user, raw)

        primeira = client.post(
            reverse("tarefas-timer-iniciar", kwargs={"tarefa_id": tarefa_a.id}),
            format="json",
        )
        segunda = client.post(
            reverse("tarefas-timer-iniciar", kwargs={"tarefa_id": tarefa_b.id}),
            format="json",
        )

        assert primeira.status_code == 201
        assert segunda.status_code == 409
        assert str(segunda.data["sessao"]["tarefa"]) == str(tarefa_a.id)

    def test_timer_nao_inicia_tarefa_de_outro_colaborador(self, user_basico, user_operacional, quadro_colunas):
        user, raw = user_basico
        outro, _ = user_operacional
        _, a_fazer, _, _ = quadro_colunas
        tarefa = Tarefa.objects.create(
            titulo="Tarefa de outro",
            coluna=a_fazer,
            responsavel=outro,
            criador=outro,
        )
        client = _auth_client(user, raw)

        response = client.post(
            reverse("tarefas-timer-iniciar", kwargs={"tarefa_id": tarefa.id}),
            format="json",
        )

        assert response.status_code == 404

    def test_timer_nao_inicia_tarefa_nao_classificada(self, user_basico, quadro_colunas):
        user, raw = user_basico
        _, a_fazer, _, _ = quadro_colunas
        tarefa = Tarefa.objects.create(titulo="Triagem pendente", coluna=a_fazer, criador=user)
        tarefa.colaboradores.add(user)
        client = _auth_client(user, raw)

        response = client.post(
            reverse("tarefas-timer-iniciar", kwargs={"tarefa_id": tarefa.id}),
            format="json",
        )

        assert response.status_code == 400
        assert SessaoTrabalhoTarefa.objects.filter(tarefa=tarefa).count() == 0

    def test_timer_nao_inicia_tarefa_entregue(self, user_basico, quadro_colunas):
        user, raw = user_basico
        _, _, _, entregue = quadro_colunas
        tarefa = Tarefa.objects.create(titulo="Tarefa entregue", coluna=entregue, criador=user)
        client = _auth_client(user, raw)

        response = client.post(
            reverse("tarefas-timer-iniciar", kwargs={"tarefa_id": tarefa.id}),
            format="json",
        )

        assert response.status_code == 400
        assert SessaoTrabalhoTarefa.objects.filter(tarefa=tarefa).count() == 0

    def test_timer_stop_creates_individual_time_entry(self, user_basico, quadro_colunas):
        user, raw = user_basico
        _, a_fazer, _, _ = quadro_colunas
        tarefa = _tarefa_interna(titulo="Cronometrar", coluna=a_fazer, criador=user)
        client = _auth_client(user, raw)

        inicio = client.post(
            reverse("tarefas-timer-iniciar", kwargs={"tarefa_id": tarefa.id}),
            format="json",
        )
        ativo = client.get(reverse("tarefas-timer-ativo"))
        parada = client.post(reverse("tarefas-timer-parar"), format="json")

        assert inicio.status_code == 201
        assert ativo.status_code == 200
        assert str(ativo.data["sessao"]["tarefa"]) == str(tarefa.id)
        assert parada.status_code == 200
        apontamento = ApontamentoHora.objects.get(pk=parada.data["apontamento"]["id"])
        assert apontamento.tarefa == tarefa
        assert apontamento.colaborador == user
        assert apontamento.horas > 0
        assert parada.data["apontamento"]["sessao_iniciado_em"] is not None
        assert parada.data["apontamento"]["sessao_finalizado_em"] is not None
        assert SessaoTrabalhoTarefa.objects.filter(
            colaborador=user,
            finalizado_em__isnull=True,
        ).count() == 0

    def test_dashboard_horas_dia_soma_apenas_apontamentos_do_colaborador(self, user_basico, user_operacional, quadro_colunas):
        user, raw = user_basico
        outro, _ = user_operacional
        _, _, fazendo, _ = quadro_colunas
        tarefa = _tarefa_interna(
            titulo="Minha tarefa",
            coluna=fazendo,
            responsavel=user,
            criador=user,
        )
        outra_tarefa = _tarefa_interna(
            titulo="Outra tarefa",
            coluna=fazendo,
            responsavel=outro,
            criador=outro,
        )
        hoje = date.today()
        ApontamentoHora.objects.create(
            tarefa=tarefa,
            colaborador=user,
            data=hoje,
            horas="1.25",
            etapa="Montagem",
        )
        ApontamentoHora.objects.create(
            tarefa=tarefa,
            colaborador=user,
            data=hoje,
            horas="0.75",
            etapa="Teste",
        )
        ApontamentoHora.objects.create(
            tarefa=outra_tarefa,
            colaborador=outro,
            data=hoje,
            horas="3.00",
            etapa="Outro",
        )
        client = _auth_client(user, raw)

        response = client.get(
            reverse("tarefas-dashboard-horas-dia"),
            {"data": hoje.isoformat()},
        )

        assert response.status_code == 200
        assert response.data["total_horas"] == "2.00"
        assert response.data["total_apontamentos"] == 2
        assert response.data["total_tarefas"] == 1
        assert {item["colaborador"] for item in response.data["apontamentos"]} == {user.id}

    def test_relatorio_horas_gestao_total_e_filtro_proposta(
        self, user_admin, user_basico, user_operacional, quadro_colunas
    ):
        admin, raw_admin = user_admin
        user_a, _ = user_basico
        user_b, _ = user_operacional
        _, _, fazendo, _ = quadro_colunas
        t_prop1 = Tarefa.objects.create(
            titulo="Tarefa proposta A",
            coluna=fazendo,
            criador=user_a,
            tipo_etapa=TipoTarefaChoices.PROPOSTA,
            proposta_referencia="PROP-001",
        )
        t_prop2 = Tarefa.objects.create(
            titulo="Tarefa proposta B",
            coluna=fazendo,
            criador=user_a,
            tipo_etapa=TipoTarefaChoices.PROPOSTA,
            proposta_referencia="PROP-002",
        )
        t_op = Tarefa.objects.create(
            titulo="Tarefa OP",
            coluna=fazendo,
            criador=user_a,
            tipo_etapa=TipoTarefaChoices.PRODUCAO,
            proposta_referencia="PROP-001",
            ordem_producao_referencia="OP-99",
        )
        hoje = date.today()
        ApontamentoHora.objects.create(
            tarefa=t_prop1, colaborador=user_a, data=hoje, horas="2.00", etapa="A"
        )
        ApontamentoHora.objects.create(
            tarefa=t_prop1, colaborador=user_b, data=hoje, horas="1.50", etapa="B"
        )
        ApontamentoHora.objects.create(
            tarefa=t_prop2, colaborador=user_a, data=hoje, horas="5.00", etapa="C"
        )
        ApontamentoHora.objects.create(
            tarefa=t_op, colaborador=user_a, data=hoje, horas="4.00", etapa="D"
        )

        client = _auth_client(admin, raw_admin)
        periodo = {"data_inicio": hoje.isoformat(), "data_fim": hoje.isoformat()}

        r_tudo = client.get(reverse("tarefas-relatorio-horas-gestao"), periodo)
        assert r_tudo.status_code == 200
        assert r_tudo.data["total_horas"] == "12.50"
        assert len(r_tudo.data["por_proposta"]) == 2
        assert {p["proposta_referencia"] for p in r_tudo.data["por_proposta"]} == {"PROP-001", "PROP-002"}
        assert len(r_tudo.data["por_ordem_producao"]) == 1
        assert r_tudo.data["por_ordem_producao"][0]["ordem_producao_referencia"] == "OP-99"
        assert r_tudo.data["por_ordem_producao"][0]["total_horas"] == "4.00"

        r_colab = client.get(
            reverse("tarefas-relatorio-horas-gestao"),
            {**periodo, "colaborador": str(user_a.id)},
        )
        assert r_colab.status_code == 200
        assert r_colab.data["total_horas"] == "11.00"
        assert r_colab.data["filtros"]["colaborador_id"] == user_a.id
        assert len(r_colab.data["por_colaborador"]) == 1
        assert r_colab.data["por_colaborador"][0]["total_horas"] == "11.00"

        r_prop = client.get(
            reverse("tarefas-relatorio-horas-gestao"),
            {**periodo, "proposta": "PROP-001"},
        )
        assert r_prop.status_code == 200
        assert r_prop.data["total_horas"] == "3.50"
        assert len(r_prop.data["por_tarefa"]) == 1

        r_prop_colab_b = client.get(
            reverse("tarefas-relatorio-horas-gestao"),
            {**periodo, "proposta": "PROP-001", "colaborador": str(user_b.id)},
        )
        assert r_prop_colab_b.status_code == 200
        assert r_prop_colab_b.data["total_horas"] == "1.50"

        r_op = client.get(
            reverse("tarefas-relatorio-horas-gestao"),
            {**periodo, "ordem_producao": "OP-99"},
        )
        assert r_op.status_code == 200
        assert r_op.data["total_horas"] == "4.00"

        r_invalido = client.get(
            reverse("tarefas-relatorio-horas-gestao"),
            {"proposta": "X", "ordem_producao": "Y"},
        )
        assert r_invalido.status_code == 400

        r_colab_invalido = client.get(
            reverse("tarefas-relatorio-horas-gestao"),
            {**periodo, "colaborador": "abc"},
        )
        assert r_colab_invalido.status_code == 400

    def test_relatorio_horas_gestao_colaboradores_periodo(
        self, user_admin, user_basico, user_operacional, quadro_colunas
    ):
        admin, raw_admin = user_admin
        user_a, _ = user_basico
        user_b, _ = user_operacional
        _, _, fazendo, _ = quadro_colunas
        tarefa = _tarefa_interna(
            titulo="Tarefa apontamentos lista",
            coluna=fazendo,
            criador=user_a,
            responsavel=user_a,
        )
        hoje = date.today()
        ApontamentoHora.objects.create(
            tarefa=tarefa, colaborador=user_b, data=hoje, horas="1.00", etapa="X"
        )
        client = _auth_client(admin, raw_admin)
        periodo = {"data_inicio": hoje.isoformat(), "data_fim": hoje.isoformat()}

        r_sem = client.get(reverse("tarefas-relatorio-horas-gestao-colaboradores"), {})
        assert r_sem.status_code == 400

        r_ok = client.get(
            reverse("tarefas-relatorio-horas-gestao-colaboradores"),
            periodo,
        )
        assert r_ok.status_code == 200
        assert len(r_ok.data) == 1
        assert r_ok.data[0]["id"] == user_b.id

        ontem = hoje - timedelta(days=1)
        r_vazio = client.get(
            reverse("tarefas-relatorio-horas-gestao-colaboradores"),
            {"data_inicio": ontem.isoformat(), "data_fim": ontem.isoformat()},
        )
        assert r_vazio.status_code == 200
        assert r_vazio.data == []

    def test_aprovar_apontamento_marca_aprovador(self, user_admin, user_basico, quadro_colunas):
        admin, raw = user_admin
        user, _ = user_basico
        _, _, fazendo, _ = quadro_colunas
        tarefa = _tarefa_interna(titulo="Apontamento para aprovar", coluna=fazendo, criador=user)
        apontamento = ApontamentoHora.objects.create(
            tarefa=tarefa,
            colaborador=user,
            data=date.today(),
            horas="1.25",
            etapa="Montagem",
        )
        client = _auth_client(admin, raw)

        response = client.post(
            reverse("tarefas-apontamentos-aprovar", kwargs={"pk": apontamento.id}),
            format="json",
        )

        assert response.status_code == 200
        apontamento.refresh_from_db()
        assert apontamento.status_aprovacao == "APROVADO"
        assert apontamento.aprovado_por == admin

    def test_gestor_exclui_tarefa_nao_iniciada(self, quadro_colunas):
        raw = secrets.token_urlsafe(32)
        user = User.objects.create_user(
            email="tarefas-gestor-del@test.com",
            password=raw,
            is_active=True,
            tipo_usuario=TipoUsuarioChoices.USUARIO,
            permissoes_extras=[
                PermissionKeys.TAREFA_VISUALIZAR_TODAS,
                PermissionKeys.TAREFA_EXCLUIR,
            ],
        )
        _quadro, pendentes, _trabalhando, _entregue = quadro_colunas
        tarefa = _tarefa_interna(titulo="Excluir ok", coluna=pendentes, criador=user)
        client = _auth_client(user, raw)

        response = client.delete(reverse("tarefas-detail", kwargs={"pk": tarefa.pk}))

        assert response.status_code == 204
        assert not Tarefa.objects.filter(pk=tarefa.pk).exists()

    def test_usuario_sem_perfil_gestor_nao_exclui(
        self, user_basico, quadro_colunas
    ):
        user, raw = user_basico
        _quadro, pendentes, _trabalhando, _entregue = quadro_colunas
        tarefa = _tarefa_interna(titulo="Sem exclusão", coluna=pendentes, criador=user)
        client = _auth_client(user, raw)

        response = client.delete(reverse("tarefas-detail", kwargs={"pk": tarefa.pk}))

        assert response.status_code == 403
        assert Tarefa.objects.filter(pk=tarefa.pk).exists()

    def test_visualizar_todas_sem_excluir_nao_exclui_tarefa(self, quadro_colunas):
        raw = secrets.token_urlsafe(32)
        user = User.objects.create_user(
            email="tarefas-gestor-sem-excluir@test.com",
            password=raw,
            is_active=True,
            tipo_usuario=TipoUsuarioChoices.USUARIO,
            permissoes_extras=[PermissionKeys.TAREFA_VISUALIZAR_TODAS],
        )
        _quadro, pendentes, _trabalhando, _entregue = quadro_colunas
        tarefa = _tarefa_interna(titulo="Só vê, não exclui", coluna=pendentes, criador=user)
        client = _auth_client(user, raw)

        response = client.delete(reverse("tarefas-detail", kwargs={"pk": tarefa.pk}))

        assert response.status_code == 403
        assert Tarefa.objects.filter(pk=tarefa.pk).exists()

    def test_gestor_exclui_tarefa_com_apontamento(self, quadro_colunas):
        raw = secrets.token_urlsafe(32)
        user = User.objects.create_user(
            email="tarefas-gestor-del2@test.com",
            password=raw,
            is_active=True,
            tipo_usuario=TipoUsuarioChoices.USUARIO,
            permissoes_extras=[
                PermissionKeys.TAREFA_VISUALIZAR_TODAS,
                PermissionKeys.TAREFA_EXCLUIR,
            ],
        )
        _quadro, _pendentes, trabalhando, _entregue = quadro_colunas
        tarefa = _tarefa_interna(titulo="Com horas", coluna=trabalhando, criador=user)
        ApontamentoHora.objects.create(
            tarefa=tarefa,
            colaborador=user,
            data=date.today(),
            horas="0.25",
            etapa="Teste",
        )
        client = _auth_client(user, raw)

        response = client.delete(reverse("tarefas-detail", kwargs={"pk": tarefa.pk}))

        assert response.status_code == 204
        assert not Tarefa.objects.filter(pk=tarefa.pk).exists()

    def test_gestor_exclui_tarefa_em_coluna_iniciada(self, quadro_colunas):
        raw = secrets.token_urlsafe(32)
        user = User.objects.create_user(
            email="tarefas-gestor-del3@test.com",
            password=raw,
            is_active=True,
            tipo_usuario=TipoUsuarioChoices.USUARIO,
            permissoes_extras=[
                PermissionKeys.TAREFA_VISUALIZAR_TODAS,
                PermissionKeys.TAREFA_EXCLUIR,
            ],
        )
        _quadro, _pendentes, trabalhando, _entregue = quadro_colunas
        tarefa = _tarefa_interna(titulo="Em andamento", coluna=trabalhando, criador=user)
        assert tarefa.status == StatusTarefaChoices.INICIADA
        client = _auth_client(user, raw)

        response = client.delete(reverse("tarefas-detail", kwargs={"pk": tarefa.pk}))

        assert response.status_code == 204
        assert not Tarefa.objects.filter(pk=tarefa.pk).exists()


@pytest.mark.django_db
class TestTarefasJornadaTimer:
    def test_iniciar_timer_rejeitado_fora_jornada(self, user_basico, quadro_colunas):
        user, raw = user_basico
        client = _auth_client(user, raw)
        jornada = JornadaTrabalho.objects.create(
            nome="JR-test",
            carga_horaria_semanal=44,
            hora_inicio=time(8, 0),
            hora_fim=time(17, 48),
            dias_semana=[0, 1, 2, 3, 4],
        )
        Colaborador.objects.create(
            matricula="JR-M1",
            nome="Colaborador JR",
            usuario=user,
            jornada=jornada,
        )
        _, _pendentes, trabalhando, _ = quadro_colunas
        tarefa = _tarefa_interna(titulo="Task jornada", coluna=trabalhando, criador=user)
        noite = timezone.make_aware(datetime(2026, 5, 11, 20, 0))
        with patch("apps.tarefas.api.views.timezone.now", return_value=noite):
            response = client.post(
                reverse("tarefas-timer-iniciar", kwargs={"tarefa_id": tarefa.id}),
                format="json",
            )
        assert response.status_code == 400

    def test_timer_ativo_encerra_ao_passar_fim_jornada(self, user_basico, quadro_colunas):
        user, raw = user_basico
        client = _auth_client(user, raw)
        jornada = JornadaTrabalho.objects.create(
            nome="JR-test-2",
            carga_horaria_semanal=44,
            hora_inicio=time(8, 0),
            hora_fim=time(17, 48),
            dias_semana=[0, 1, 2, 3, 4],
        )
        Colaborador.objects.create(
            matricula="JR-M2",
            nome="Colaborador JR",
            usuario=user,
            jornada=jornada,
        )
        _, _pendentes, trabalhando, _ = quadro_colunas
        tarefa = _tarefa_interna(titulo="Task auto", coluna=trabalhando, criador=user)
        sessao = SessaoTrabalhoTarefa.objects.create(
            tarefa=tarefa,
            colaborador=user,
            etapa="Cronometro",
        )
        inicio = timezone.make_aware(datetime(2026, 5, 11, 17, 40))
        SessaoTrabalhoTarefa.objects.filter(pk=sessao.pk).update(iniciado_em=inicio)
        depois = timezone.make_aware(datetime(2026, 5, 11, 18, 5))
        with patch("apps.tarefas.api.views.timezone.now", return_value=depois):
            response = client.get(reverse("tarefas-timer-ativo"))
        assert response.status_code == 200
        assert response.data["sessao"] is None
        sessao.refresh_from_db()
        assert sessao.finalizado_em is not None
        assert sessao.motivo_encerramento == MotivoEncerramentoSessaoChoices.FIM_JORNADA


@pytest.mark.django_db
def test_garantir_quadro_padrao_remove_colunas_extras_e_move_tarefas(user_operacional):
    user, _raw = user_operacional
    quadro = QuadroTarefa.objects.create(nome="Tarefas", equipe="teste")
    for nome, ordem, sem in (
        ("Pendentes", 0, StatusSemanticoColunaChoices.PENDENTE),
        ("Trabalhando", 1, StatusSemanticoColunaChoices.EM_ANDAMENTO),
        ("Entregue", 2, StatusSemanticoColunaChoices.CONCLUIDO),
    ):
        ColunaTarefa.objects.create(
            quadro=quadro, nome=nome, ordem=ordem, status_semantico=sem
        )
    extra = ColunaTarefa.objects.create(
        quadro=quadro,
        nome="Legado",
        ordem=3,
        status_semantico=StatusSemanticoColunaChoices.PENDENTE,
    )
    tarefa = Tarefa.objects.create(
        titulo="Só na coluna extra",
        coluna=extra,
        criador=user,
        tipo_etapa=TipoTarefaChoices.INTERNA,
    )

    garantir_quadro_padrao_tarefas(usuario=user)

    assert ColunaTarefa.objects.filter(quadro=quadro).count() == 3
    assert not ColunaTarefa.objects.filter(pk=extra.pk).exists()
    tarefa.refresh_from_db()
    assert tarefa.coluna.ordem == 0


@pytest.mark.django_db
def test_garantir_quadro_padrao_elimina_cinco_colunas_sem_conflito_nome(user_operacional):
    """Legado com Iniciadas/Finalizadas + Trabalhando/Entregue extras: fundir antes de renomear."""
    user, _raw = user_operacional
    quadro = QuadroTarefa.objects.create(nome="Tarefas", equipe="teste")
    for nome, ordem, sem in (
        ("Pendentes", 0, StatusSemanticoColunaChoices.PENDENTE),
        ("Iniciadas", 1, StatusSemanticoColunaChoices.INICIADA),
        ("Finalizadas", 2, StatusSemanticoColunaChoices.FINALIZADA),
        ("Trabalhando", 3, StatusSemanticoColunaChoices.EM_ANDAMENTO),
        ("Entregue", 4, StatusSemanticoColunaChoices.CONCLUIDO),
    ):
        ColunaTarefa.objects.create(
            quadro=quadro, nome=nome, ordem=ordem, status_semantico=sem
        )

    garantir_quadro_padrao_tarefas(usuario=user)

    assert ColunaTarefa.objects.filter(quadro=quadro).count() == 3
    ordenadas = list(ColunaTarefa.objects.filter(quadro=quadro).order_by("ordem"))
    assert [c.nome for c in ordenadas] == ["Pendentes", "Trabalhando", "Entregue"]
    assert [c.status_semantico for c in ordenadas] == [
        StatusSemanticoColunaChoices.PENDENTE,
        StatusSemanticoColunaChoices.EM_ANDAMENTO,
        StatusSemanticoColunaChoices.CONCLUIDO,
    ]
