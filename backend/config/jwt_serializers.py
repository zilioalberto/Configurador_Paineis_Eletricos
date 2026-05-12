from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


class ZfwTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Serializer JWT com mensagens em português para o utilizador final."""

    default_error_messages = {
        **TokenObtainPairSerializer.default_error_messages,
        "no_active_account": (
            "E-mail ou senha incorretos. Se a conta existir mas estiver inativa, "
            "fale com o administrador."
        ),
    }
