from django.db import models


class DimensoesMixin(models.Model):
    largura_mm = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    altura_mm = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    profundidade_mm = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)

    class Meta:
        abstract = True

    @property
    def area_frontal_mm2(self):
        if self.largura_mm and self.altura_mm:
            return self.largura_mm * self.altura_mm
        return None

    @property
    def volume_mm3(self):
        if self.largura_mm and self.altura_mm and self.profundidade_mm:
            return self.largura_mm * self.altura_mm * self.profundidade_mm
        return None


class AtivacaoMixin(models.Model):
    ativo = models.BooleanField(default=True)

    class Meta:
        abstract = True


class ObservacoesTecnicasMixin(models.Model):
    observacoes_tecnicas = models.TextField(blank=True)

    class Meta:
        abstract = True


class FabricanteMixin(models.Model):
    fabricante = models.CharField(max_length=100, blank=True)
    referencia_fabricante = models.CharField(max_length=120, blank=True)

    class Meta:
        abstract = True
        
        
class UpperCaseMixin:
    UPPERCASE_FIELDS = []

    def save(self, *args, **kwargs):
        for field in self.UPPERCASE_FIELDS:
            value = getattr(self, field, None)
            if isinstance(value, str):
                setattr(self, field, value.upper())

        super().save(*args, **kwargs)