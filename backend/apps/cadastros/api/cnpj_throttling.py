"""Rate limit das consultas CNPJ (protecao Brasil API e abuso)."""
from rest_framework.throttling import SimpleRateThrottle


class CnpjConsultaThrottle(SimpleRateThrottle):
    scope = "cnpj_consulta"

    def get_cache_key(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return None
        return self.cache_format % {
            "scope": self.scope,
            "ident": str(request.user.pk),
        }
