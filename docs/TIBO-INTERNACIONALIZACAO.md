# Tibo — internacionalização

Idiomas base desta versão:

- Português (Brasil): `pt-BR`
- English (United States): `en-US`
- Español (Bolivia): `es-BO`

A preferência é persistida no navegador em `tibo.locale` e o `<html lang>` acompanha a seleção.

A infraestrutura está em `src/i18n/index.tsx`. Novas telas devem usar `useI18n().t()` em vez de colocar textos de interface diretamente no componente.

Para datas, números e moedas, use `Intl.DateTimeFormat(locale)` e `Intl.NumberFormat(locale, { style: 'currency', currency })`.
