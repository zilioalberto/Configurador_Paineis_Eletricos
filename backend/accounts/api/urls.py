from django.urls import path

from accounts.api import views

urlpatterns = [
    path("auth/user-tipo-choices/", views.UserTipoChoicesView.as_view(), name="auth_user_tipo_choices"),
    path("auth/users/", views.AdminUserListCreateView.as_view(), name="auth_users_list_create"),
    path("auth/users/<int:pk>/", views.AdminUserRetrieveUpdateView.as_view(), name="auth_users_detail"),
]
