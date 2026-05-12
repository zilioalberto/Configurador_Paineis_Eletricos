"""

URL configuration for the Django project (`config`).



The `urlpatterns` list routes URLs to views. For more information please see:

    https://docs.djangoproject.com/en/5.1/topics/http/urls/

"""

from django.contrib import admin

from django.urls import path, include

from rest_framework_simplejwt.views import TokenRefreshView

from config.auth_views import AuthMeView, ProtectedAuthTestView
from config.jwt_views import ZfwTokenObtainPairView

from config.health_views import healthcheck


API_V1_PREFIX = "api/v1/"

urlpatterns = [

    path("admin/", admin.site.urls),



    path(f"{API_V1_PREFIX}auth/token/", ZfwTokenObtainPairView.as_view(), name="token_obtain_pair"),

    path(f"{API_V1_PREFIX}auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    path(f"{API_V1_PREFIX}auth/me/", AuthMeView.as_view(), name="auth_me"),

    path(f"{API_V1_PREFIX}auth/test/", ProtectedAuthTestView.as_view(), name="test_auth"),

    path(f"{API_V1_PREFIX}health/", healthcheck, name="health"),

    path(API_V1_PREFIX, include("apps.accounts.api.urls")),

    path(API_V1_PREFIX, include("apps.configurador_paineis.projetos.api.urls")),

    path(API_V1_PREFIX, include("apps.configurador_paineis.cargas.api.urls")),

    path(API_V1_PREFIX, include("apps.catalogo.api.urls")),

    path(API_V1_PREFIX, include("apps.fiscal.api.urls")),

    path(API_V1_PREFIX, include("apps.cadastros.api.urls")),

    path(API_V1_PREFIX, include("apps.rh.api.urls")),

    path(API_V1_PREFIX, include("apps.configurador_paineis.dimensionamento.api.urls")),

    path(API_V1_PREFIX, include("apps.configurador_paineis.composicao_painel.api.urls")),

    path(API_V1_PREFIX, include("apps.tarefas.api.urls")),

    path(f"{API_V1_PREFIX}erp/", include("config.erp_api_urls")),

]
