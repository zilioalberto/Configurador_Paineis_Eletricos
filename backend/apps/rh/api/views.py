from django.contrib.auth import get_user_model
from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.viewsets import ModelViewSet

from apps.accounts.api.permissions import HasEffectivePermission
from apps.rh.api.serializers import (
    CargoSerializer,
    ColaboradorSerializer,
    DepartamentoSerializer,
    EquipeSerializer,
    JornadaTrabalhoSerializer,
)
from apps.rh.models import Cargo, Colaborador, Departamento, Equipe, JornadaTrabalho
from core.permissions import PermissionKeys

User = get_user_model()


class RhPermissionMixin:
    permission_classes = [HasEffectivePermission]

    def required_permission(self, request, view):
        if self.action in ("list", "retrieve"):
            return PermissionKeys.RH_VISUALIZAR
        return PermissionKeys.RH_EDITAR


class DepartamentoViewSet(RhPermissionMixin, ModelViewSet):
    serializer_class = DepartamentoSerializer

    def get_queryset(self):
        qs = Departamento.objects.all()
        ativo = (self.request.query_params.get("ativo") or "").strip().lower()
        if ativo in ("1", "true", "yes", "on"):
            qs = qs.filter(ativo=True)
        elif ativo in ("0", "false", "no", "off"):
            qs = qs.filter(ativo=False)

        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(Q(nome__icontains=search) | Q(codigo__icontains=search))
        return qs.order_by("nome")


class CargoViewSet(RhPermissionMixin, ModelViewSet):
    serializer_class = CargoSerializer

    def get_queryset(self):
        qs = Cargo.objects.all()
        ativo = (self.request.query_params.get("ativo") or "").strip().lower()
        if ativo in ("1", "true", "yes", "on"):
            qs = qs.filter(ativo=True)
        elif ativo in ("0", "false", "no", "off"):
            qs = qs.filter(ativo=False)

        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(nome__icontains=search)
        return qs.order_by("nome")


class JornadaTrabalhoViewSet(RhPermissionMixin, ModelViewSet):
    serializer_class = JornadaTrabalhoSerializer

    def get_queryset(self):
        qs = JornadaTrabalho.objects.all()
        ativo = (self.request.query_params.get("ativo") or "").strip().lower()
        if ativo in ("1", "true", "yes", "on"):
            qs = qs.filter(ativo=True)
        elif ativo in ("0", "false", "no", "off"):
            qs = qs.filter(ativo=False)
        return qs.order_by("nome")


class EquipeViewSet(RhPermissionMixin, ModelViewSet):
    serializer_class = EquipeSerializer

    def get_queryset(self):
        qs = Equipe.objects.select_related("departamento", "lider")
        ativo = (self.request.query_params.get("ativo") or "").strip().lower()
        if ativo in ("1", "true", "yes", "on"):
            qs = qs.filter(ativo=True)
        elif ativo in ("0", "false", "no", "off"):
            qs = qs.filter(ativo=False)

        departamento = self.request.query_params.get("departamento")
        if departamento:
            qs = qs.filter(departamento_id=departamento)

        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(nome__icontains=search)
                | Q(departamento__nome__icontains=search)
                | Q(lider__nome__icontains=search)
            )
        return qs.order_by("nome")


class RhUsuariosParaVinculoView(APIView):
    """
    Lista utilizadores ativos ainda não vinculados a um colaborador,
    mais o utilizador já ligado ao colaborador em edição (para manter a seleção).

    Exige permissão de edição de RH (gestão do vínculo é feita no cadastro do colaborador).
    """

    permission_classes = [IsAuthenticated, HasEffectivePermission]
    required_permission = PermissionKeys.RH_EDITAR

    def get(self, request):
        colaborador_pk = (request.query_params.get("colaborador") or "").strip()
        search = (request.query_params.get("search") or "").strip()

        ocupados = Colaborador.objects.exclude(usuario_id__isnull=True)
        if colaborador_pk:
            ocupados = ocupados.exclude(pk=colaborador_pk)
        ocupando_ids = ocupados.values_list("usuario_id", flat=True)

        qs = User.objects.filter(is_active=True).exclude(pk__in=ocupando_ids).order_by("email")
        if search:
            qs = qs.filter(Q(email__icontains=search) | Q(first_name__icontains=search) | Q(last_name__icontains=search))

        data = [
            {
                "id": u.pk,
                "email": u.email,
                "nome": " ".join([u.first_name or "", u.last_name or ""]).strip() or None,
            }
            for u in qs
        ]
        return Response(data)


class ColaboradorViewSet(RhPermissionMixin, ModelViewSet):
    serializer_class = ColaboradorSerializer

    def get_queryset(self):
        qs = Colaborador.objects.select_related(
            "usuario",
            "cargo",
            "departamento",
            "equipe",
            "jornada",
        )
        ativo = (self.request.query_params.get("ativo") or "").strip().lower()
        if ativo in ("1", "true", "yes", "on"):
            qs = qs.filter(ativo=True)
        elif ativo in ("0", "false", "no", "off"):
            qs = qs.filter(ativo=False)

        departamento = self.request.query_params.get("departamento")
        if departamento:
            qs = qs.filter(departamento_id=departamento)

        equipe = self.request.query_params.get("equipe")
        if equipe:
            qs = qs.filter(equipe_id=equipe)

        cargo = self.request.query_params.get("cargo")
        if cargo:
            qs = qs.filter(cargo_id=cargo)

        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(nome__icontains=search)
                | Q(matricula__icontains=search)
                | Q(email__icontains=search)
                | Q(documento__icontains=search)
                | Q(cargo__nome__icontains=search)
                | Q(departamento__nome__icontains=search)
                | Q(equipe__nome__icontains=search)
            )
        return qs.order_by("nome")
