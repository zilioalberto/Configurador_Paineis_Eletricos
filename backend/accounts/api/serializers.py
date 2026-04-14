from django.contrib.auth import get_user_model
from rest_framework import serializers

from core.choices import TipoUsuarioChoices

User = get_user_model()


class AdminUserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "email",
            "first_name",
            "last_name",
            "telefone",
            "tipo_usuario",
            "is_active",
            "date_created",
        )
        read_only_fields = fields


class AdminUserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = (
            "email",
            "password",
            "first_name",
            "last_name",
            "telefone",
            "tipo_usuario",
            "is_active",
        )

    def validate_tipo_usuario(self, value):
        valid = {c for c, _ in TipoUsuarioChoices.choices}
        if value not in valid:
            raise serializers.ValidationError("Tipo de utilizador inválido.")
        return value

    def validate_email(self, value):
        normalized = User.objects.normalize_email(value)
        if User.objects.filter(email__iexact=normalized).exists():
            raise serializers.ValidationError("Já existe utilizador com este e-mail.")
        return normalized

    def create(self, validated_data):
        password = validated_data.pop("password")
        return User.objects.create_user(password=password, **validated_data)


class AdminUserUpdateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            "email",
            "first_name",
            "last_name",
            "telefone",
            "tipo_usuario",
            "is_active",
            "password",
        )

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

    def update(self, instance, validated_data):
        password = validated_data.pop("password", None)
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        if password:
            instance.set_password(password)
        instance.save()
        return instance
