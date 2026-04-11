import pytest
from django.contrib.auth import get_user_model


User = get_user_model()


@pytest.mark.django_db
def test_create_user_sem_email_levanta_value_error():
    with pytest.raises(ValueError, match="e-mail"):
        User.objects.create_user(email="", password="x")


@pytest.mark.django_db
def test_create_user_normaliza_email_e_persiste():
    u = User.objects.create_user("  Test@Example.com  ", "secret-pass-xyz")
    assert u.email.lower() == "test@example.com"
    assert u.check_password("secret-pass-xyz")
    assert u.is_staff is False
    assert u.is_superuser is False


@pytest.mark.django_db
def test_create_superuser_flags():
    u = User.objects.create_superuser("admin@example.com", "secret-pass-admin")
    assert u.is_staff is True
    assert u.is_superuser is True


def test_create_superuser_sem_is_staff():
    with pytest.raises(ValueError, match="is_staff"):
        User.objects.create_superuser(
            "a@b.com", "p", is_staff=False, is_superuser=True
        )


def test_create_superuser_sem_is_superuser():
    with pytest.raises(ValueError, match="is_superuser"):
        User.objects.create_superuser(
            "a@b.com", "p", is_staff=True, is_superuser=False
        )
