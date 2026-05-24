"""View de obtenção de par JWT (access + refresh) com mensagens em português."""
from rest_framework_simplejwt.views import TokenObtainPairView

from config.jwt_serializers import ZfwTokenObtainPairSerializer


class ZfwTokenObtainPairView(TokenObtainPairView):
    """POST `/auth/token/` — credenciais por e-mail e senha."""

    serializer_class = ZfwTokenObtainPairSerializer
