import secrets

import pytest
from django.contrib.auth import get_user_model

from core.choices import TipoUsuarioChoices

User = get_user_model()


@pytest.mark.django_db
def test_create_user_sem_email_levanta_value_error():
    dummy_password = secrets.token_urlsafe(16)
    with pytest.raises(ValueError, match="e-mail"):
        User.objects.create_user(email="", password=dummy_password)


@pytest.mark.django_db
def test_create_user_normaliza_email_e_persiste():
    raw_password = secrets.token_urlsafe(32)
    u = User.objects.create_user("  Test@Example.com  ", raw_password)
    assert u.email.lower() == "test@example.com"
    assert u.check_password(raw_password)
    assert u.is_staff is False
    assert u.is_superuser is False


@pytest.mark.django_db
def test_create_superuser_flags():
    raw_password = secrets.token_urlsafe(32)
    u = User.objects.create_superuser("admin@example.com", raw_password)
    assert u.is_staff is True
    assert u.is_superuser is True
    assert u.tipo_usuario == TipoUsuarioChoices.ADMIN


def test_create_superuser_sem_is_staff():
    raw_password = secrets.token_urlsafe(16)
    with pytest.raises(ValueError, match="is_staff"):
        User.objects.create_superuser(
            "a@b.com", raw_password, is_staff=False, is_superuser=True
        )


def test_create_superuser_sem_is_superuser():
    raw_password = secrets.token_urlsafe(16)
    with pytest.raises(ValueError, match="is_superuser"):
        User.objects.create_superuser(
            "a@b.com", raw_password, is_staff=True, is_superuser=False
        )
