from rest_framework.decorators import (
    api_view,
    authentication_classes,
    permission_classes,
)
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.authentication import JWTAuthentication


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def auth_me(request):
    user = request.user
    return Response(
        {
            "email": user.email,
            "first_name": user.first_name or "",
            "last_name": user.last_name or "",
            "tipo_usuario": user.tipo_usuario,
        }
    )


@api_view(["GET"])
@authentication_classes([JWTAuthentication])
@permission_classes([IsAuthenticated])
def protected_test(request):
    return Response(
        {
            "message": "Autenticação JWT funcionando com sucesso.",
            "user": request.user.email,
        }
    )
