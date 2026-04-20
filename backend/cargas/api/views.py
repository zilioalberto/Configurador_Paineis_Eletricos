from rest_framework.viewsets import ModelViewSet

from accounts.api.permissions import HasEffectivePermission
from cargas.api.serializers import (
    CargaDetailSerializer,
    CargaListSerializer,
    CargaModeloSerializer,
    CargaWriteSerializer,
)
from cargas.models import Carga, CargaModelo
from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from core.permissions import PermissionKeys
from projetos.services.rastreabilidade import registrar_evento_projeto


class CargaViewSet(ModelViewSet):
    queryset = Carga.objects.select_related(
        "projeto",
        "motor",
        "valvula",
        "resistencia",
        "sensor",
        "transdutor",
    ).order_by("projeto", "tag")
    permission_classes = [HasEffectivePermission]

    def get_queryset(self):
        qs = super().get_queryset()
        projeto_id = self.request.query_params.get("projeto")
        if projeto_id:
            qs = qs.filter(projeto_id=projeto_id)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return CargaListSerializer
        if self.action in ("create", "update", "partial_update"):
            return CargaWriteSerializer
        return CargaDetailSerializer

    def required_permission(self, request, view):
        if self.action in ("list", "retrieve"):
            return PermissionKeys.MATERIAL_VISUALIZAR_LISTA
        if self.action in ("create", "update", "partial_update", "destroy"):
            return PermissionKeys.MATERIAL_EDITAR_LISTA
        return None

    def perform_create(self, serializer):
        carga = serializer.save()
        registrar_evento_projeto(
            projeto=carga.projeto,
            usuario=self.request.user,
            modulo="cargas",
            acao="criada",
            descricao=f"Carga {carga.tag} criada.",
            detalhes={"carga_id": str(carga.id), "tag": carga.tag},
        )

    def perform_update(self, serializer):
        carga = serializer.save()
        registrar_evento_projeto(
            projeto=carga.projeto,
            usuario=self.request.user,
            modulo="cargas",
            acao="editada",
            descricao=f"Carga {carga.tag} atualizada.",
            detalhes={"carga_id": str(carga.id), "tag": carga.tag},
        )

    def perform_destroy(self, instance):
        projeto = instance.projeto
        carga_id = str(instance.id)
        tag = instance.tag
        super().perform_destroy(instance)
        registrar_evento_projeto(
            projeto=projeto,
            usuario=self.request.user,
            modulo="cargas",
            acao="excluida",
            descricao=f"Carga {tag} excluída.",
            detalhes={"carga_id": carga_id, "tag": tag},
        )


class CargaModeloListCreateView(APIView):
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.MATERIAL_EDITAR_LISTA

    def get(self, request):
        qs = CargaModelo.objects.filter(ativo=True).order_by("nome")
        tipo = request.query_params.get("tipo")
        q = request.query_params.get("q")
        if tipo:
            qs = qs.filter(tipo=tipo)
        if q:
            termos = [termo.strip() for termo in q.split() if termo.strip()]
            for termo in termos:
                qs = qs.filter(nome__icontains=termo)
        return Response(CargaModeloSerializer(qs, many=True).data)

    def post(self, request):
        serializer = CargaModeloSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        modelo = serializer.save(
            criado_por=request.user if request.user.is_authenticated else None,
            atualizado_por=request.user if request.user.is_authenticated else None,
        )
        return Response(CargaModeloSerializer(modelo).data, status=status.HTTP_201_CREATED)


class CargaModeloDetailView(APIView):
    permission_classes = [HasEffectivePermission]
    required_permission = PermissionKeys.MATERIAL_EDITAR_LISTA

    def put(self, request, pk):
        modelo = get_object_or_404(CargaModelo, pk=pk)
        serializer = CargaModeloSerializer(modelo, data=request.data)
        serializer.is_valid(raise_exception=True)
        atualizado = serializer.save(
            atualizado_por=request.user if request.user.is_authenticated else None
        )
        return Response(CargaModeloSerializer(atualizado).data)

    def delete(self, request, pk):
        modelo = get_object_or_404(CargaModelo, pk=pk)
        modelo.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
