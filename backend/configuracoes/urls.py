"""

URL configuration for configuracoes project.



The `urlpatterns` list routes URLs to views. For more information please see:

    https://docs.djangoproject.com/en/5.1/topics/http/urls/

"""

from django.contrib import admin

from django.urls import path, include

from rest_framework_simplejwt.views import TokenRefreshView

from configuracoes.auth_views import AuthMeView, ProtectedAuthTestView
from configuracoes.jwt_views import ZfwTokenObtainPairView

from configuracoes.health_views import healthcheck


API_V1_PREFIX = "api/v1/"

urlpatterns = [

    path("admin/", admin.site.urls),



    path(f"{API_V1_PREFIX}auth/token/", ZfwTokenObtainPairView.as_view(), name="token_obtain_pair"),

    path(f"{API_V1_PREFIX}auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    path(f"{API_V1_PREFIX}auth/me/", AuthMeView.as_view(), name="auth_me"),

    path(f"{API_V1_PREFIX}auth/test/", ProtectedAuthTestView.as_view(), name="test_auth"),

    path(f"{API_V1_PREFIX}health/", healthcheck, name="health"),

    path(API_V1_PREFIX, include("accounts.api.urls")),

    path(API_V1_PREFIX, include("projetos.api.urls")),

    path(API_V1_PREFIX, include("cargas.api.urls")),

    path(API_V1_PREFIX, include("catalogo.api.urls")),

    path(API_V1_PREFIX, include("dimensionamento.api.urls")),

    path(API_V1_PREFIX, include("composicao_painel.api.urls")),

]

