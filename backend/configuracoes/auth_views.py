from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.authentication import JWTAuthentication


class _JwtAuthenticatedReadOnlyView(APIView):
    """Base só com métodos seguros (GET/HEAD/OPTIONS) para leitura autenticada por JWT."""

    authentication_classes = [JWTAuthentication]
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "head", "options"]


class AuthMeView(_JwtAuthenticatedReadOnlyView):
    def get(self, request):
        user = request.user
        return Response(
            {
                "email": user.email,
                "first_name": user.first_name or "",
                "last_name": user.last_name or "",
                "tipo_usuario": user.tipo_usuario,
                "is_staff": bool(user.is_staff),
                "is_superuser": bool(user.is_superuser),
            }
        )


class ProtectedAuthTestView(_JwtAuthenticatedReadOnlyView):
    def get(self, request):
        return Response(
            {
                "message": "Autenticação JWT funcionando com sucesso.",
                "user": request.user.email,
            }
        )
