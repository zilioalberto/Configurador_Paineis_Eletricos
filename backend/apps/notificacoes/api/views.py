"""API de notificações internas do utilizador autenticado."""
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.notificacoes.api.serializers import NotificacaoInternaSerializer
from apps.notificacoes.models import NotificacaoInterna


class NotificacaoInternaListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificacaoInternaSerializer

    def get_queryset(self):
        return NotificacaoInterna.objects.filter(destinatario=self.request.user).order_by(
            "-criado_em"
        )[:50]


class NotificacaoInternaContagemView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        nao_lidas = NotificacaoInterna.objects.filter(
            destinatario=request.user,
            lida=False,
        ).count()
        return Response({"nao_lidas": nao_lidas})


class NotificacaoInternaMarcarLidaView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        notif = NotificacaoInterna.objects.filter(
            destinatario=request.user,
            pk=pk,
        ).first()
        if not notif:
            return Response({"detail": "Notificação não encontrada."}, status=status.HTTP_404_NOT_FOUND)
        if not notif.lida:
            notif.lida = True
            notif.lida_em = timezone.now()
            notif.save(update_fields=("lida", "lida_em"))
        return Response(NotificacaoInternaSerializer(notif).data)


class NotificacaoInternaMarcarTodasLidasView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        agora = timezone.now()
        atualizadas = NotificacaoInterna.objects.filter(
            destinatario=request.user,
            lida=False,
        ).update(lida=True, lida_em=agora)
        return Response({"marcadas": atualizadas})
