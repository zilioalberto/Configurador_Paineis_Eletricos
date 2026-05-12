import secrets

import pytest
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APIClient

User = get_user_model()


@pytest.mark.django_db
class TestErpModuleMetaView:
    def test_requires_authentication(self):
        client = APIClient()
        response = client.get(reverse("erp-module-meta", kwargs={"slug": "catalogo"}))
        assert response.status_code in (401, 403)

    def test_unknown_module_returns_404(self):
        raw_secret = secrets.token_urlsafe(32)
        user = User.objects.create_user(
            email="erp-meta@test.com",
            password=raw_secret,
            is_active=True,
        )
        client = APIClient()
        client.force_authenticate(user=user)
        response = client.get(reverse("erp-module-meta", kwargs={"slug": "modulo-inexistente"}))
        assert response.status_code == 404

    def test_catalogo_and_roadmap_slugs_return_meta(self):
        raw_secret = secrets.token_urlsafe(32)
        user = User.objects.create_user(
            email="erp-meta-2@test.com",
            password=raw_secret,
            is_active=True,
        )
        client = APIClient()
        client.force_authenticate(user=user)
        for slug in ("catalogo", "cadastros", "documentos", "pedidos-venda"):
            response = client.get(reverse("erp-module-meta", kwargs={"slug": slug}))
            assert response.status_code == 200, slug
            assert response.data["backend_package"]
            assert response.data["title"]
