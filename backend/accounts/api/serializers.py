from django.contrib.auth import get_user_model
from rest_framework import serializers

from core.choices import DEFAULT_PERMISSIONS_BY_TIPO, PermissaoUsuarioChoices, TipoUsuarioChoices

User = get_user_model()


class AdminUserListSerializer(serializers.ModelSerializer):
    permissoes_efetivas = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "telefone",
            "tipo_usuario",
            "permissoes_extras",
            "permissoes_negadas",
            "permissoes_efetivas",
            "is_active",
            "date_created",
        )
        read_only_fields = fields

    def get_permissoes_efetivas(self, obj):
        return obj.permissoes_efetivas


class AdminUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    permissoes = serializers.ListField(
        child=serializers.CharField(), required=False, allow_empty=True, write_only=True
    )

    class Meta:
        model = User
        fields = (
            "email",
            "password",
            "first_name",
            "last_name",
            "telefone",
            "tipo_usuario",
            "permissoes_extras",
            "permissoes_negadas",
            "permissoes",
            "is_active",
        )
        read_only_fields = ("permissoes_extras", "permissoes_negadas")

    def validate_tipo_usuario(self, value):
        valid = {c for c, _ in TipoUsuarioChoices.choices}
        if value not in valid:
            raise serializers.ValidationError("Tipo de utilizador inválido.")
        return value

    def validate_permissoes(self, value):
        valid = {choice.value for choice in PermissaoUsuarioChoices}
        invalid = sorted(set(value) - valid)
        if invalid:
            raise serializers.ValidationError(
                f"Permissões inválidas: {', '.join(invalid)}."
            )
        return sorted(set(value))

    def validate_email(self, value):
        normalized = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("Já existe utilizador com este e-mail.")
        return normalized

    def create(self, validated_data):
        selected_permissions = set(validated_data.pop("permissoes", []))
        password = validated_data.pop("password")
        tipo = validated_data["tipo_usuario"]
        defaults = set(DEFAULT_PERMISSIONS_BY_TIPO.get(tipo, set()))
        validated_data["permissoes_extras"] = sorted(selected_permissions - defaults)
        validated_data["permissoes_negadas"] = sorted(defaults - selected_permissions)
        return User.objects.create_user(password=password, **validated_data)


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)
    permissoes = serializers.ListField(
        child=serializers.CharField(), required=False, allow_empty=True, write_only=True
    )

    class Meta:
        model = User
        fields = (
            "email",
            "first_name",
            "last_name",
            "telefone",
            "tipo_usuario",
            "permissoes_extras",
            "permissoes_negadas",
            "permissoes",
            "is_active",
            "password",
        )
        read_only_fields = ("permissoes_extras", "permissoes_negadas")

    def validate_tipo_usuario(self, value):
        valid = {c for c, _ in TipoUsuarioChoices.choices}
        if value not in valid:
            raise serializers.ValidationError("Tipo de utilizador inválido.")
        return value

    def validate_email(self, value):
        normalized = User.objects.normalize_email(value)
        qs = User.objects.filter(email__iexact=normalized)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Já existe utilizador com este e-mail.")
        return normalized

    def validate_password(self, value):
        if value and len(value) < 8:
            raise serializers.ValidationError("A senha deve ter pelo menos 8 caracteres.")
        return value

    def validate_permissoes(self, value):
        valid = {choice.value for choice in PermissaoUsuarioChoices}
        invalid = sorted(set(value) - valid)
        if invalid:
            raise serializers.ValidationError(
                f"Permissões inválidas: {', '.join(invalid)}."
            )
        return sorted(set(value))

    def update(self, instance, validated_data):
        selected_permissions = validated_data.pop("permissoes", None)
        password = validated_data.pop("password", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        if selected_permissions is not None:
            defaults = set(DEFAULT_PERMISSIONS_BY_TIPO.get(instance.tipo_usuario, set()))
            selected = set(selected_permissions)
            instance.permissoes_extras = sorted(selected - defaults)
            instance.permissoes_negadas = sorted(defaults - selected)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
