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




urlpatterns = [

    path("admin/", admin.site.urls),



    path("api/v1/auth/token/", ZfwTokenObtainPairView.as_view(), name="token_obtain_pair"),

    path("api/v1/auth/token/refresh/", TokenRefreshView.as_view(), name="token_refresh"),

    path("api/v1/auth/me/", AuthMeView.as_view(), name="auth_me"),

    path("api/v1/auth/test/", ProtectedAuthTestView.as_view(), name="test_auth"),

    path("api/v1/health/", healthcheck, name="health"),

    path("api/v1/", include("accounts.api.urls")),

    path("api/v1/", include("projetos.api.urls")),

    path("api/v1/", include("cargas.api.urls")),

    path("api/v1/", include("catalogo.api.urls")),

    path("api/v1/", include("dimensionamento.api.urls")),

    path("api/v1/", include("composicao_painel.api.urls")),

]

