from django.db.models import Q
from rest_framework import status
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet, ReadOnlyModelViewSet

from catalogo.api.serializers import (
    CategoriaProdutoSerializer,
    ProdutoDetailSerializer,
    ProdutoListSerializer,
    ProdutoWriteSerializer,
)
from catalogo.models import CategoriaProduto, Produto


class CategoriaProdutoViewSet(ReadOnlyModelViewSet):
    serializer_class = CategoriaProdutoSerializer
    queryset = CategoriaProduto.objects.filter(ativo=True).order_by("nome")


class ProdutoViewSet(ModelViewSet):
    queryset = (
        Produto.objects.select_related("categoria")
        .select_related(
            "especificacao_contatora",
            "especificacao_disjuntor_motor",
            "especificacao_seccionadora",
        )
        .order_by("codigo", "descricao")
    )

    def get_queryset(self):
        qs = super().get_queryset()
        categoria_id = self.request.query_params.get("categoria")
        if categoria_id:
            qs = qs.filter(categoria_id=categoria_id)
        search = (self.request.query_params.get("search") or "").strip()
        if search:
            qs = qs.filter(
                Q(codigo__icontains=search)
                | Q(descricao__icontains=search)
                | Q(fabricante__icontains=search)
            ).filter(ativo=True)
            qs = qs.order_by("codigo", "descricao")[:40]
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return ProdutoListSerializer
        if self.action in ("create", "update", "partial_update"):
            return ProdutoWriteSerializer
        return ProdutoDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        read = ProdutoDetailSerializer(
            serializer.instance,
            context=self.get_serializer_context(),
        )
        return Response(read.data, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        instance.refresh_from_db()
        read = ProdutoDetailSerializer(instance, context=self.get_serializer_context())
        return Response(read.data)
