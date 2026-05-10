from django.db.models import Q
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
