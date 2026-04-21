from rest_framework_simplejwt.views import TokenObtainPairView

from configuracoes.jwt_serializers import ZfwTokenObtainPairSerializer


class ZfwTokenObtainPairView(TokenObtainPairView):
    serializer_class = ZfwTokenObtainPairSerializer
