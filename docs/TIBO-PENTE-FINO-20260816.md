# Tibo — pente fino desta revisão

## Mantido

- Aparência e identidade visual atuais.
- Tibo Social como produto principal.
- Tibo Business somente web.
- Clips/Reels e feed de vídeo.
- Internacionalização PT/EN/ES existente e preferência persistida.
- Verificação comercial e painel administrativo.
- Termos, privacidade e proteção mínima de idade já presentes no projeto.

## Corrigido nesta revisão

- Vídeos do feed iniciam muted/autoplay quando o navegador permite.
- Editor de vídeo inicia muted para não ser bloqueado pela política de autoplay do navegador.
- Avatar usa `object-contain` por padrão para evitar cortar metade da foto; quando não existe imagem, cai para iniciais.
- Toast/alerta global sobe para o topo e respeita a área segura do celular.
- Tibo Ads passa a exigir saldo pré-pago antes da entrega.
- Tibo Ads passa a ter cobrança CPL no lançamento.
- Lead tem formulário próprio no anúncio e cobrança atômica por lead.
- Checkout Stripe e webhook preparados em Supabase Edge Functions.
- Proteção de idempotência para checkout e leads.
- Aprovação de Business passa a ativar a conta de anúncios quando a verificação é aprovada.
- Campanha só pode ser ativada se estiver verificada, financiada e tiver criativo.
- Entrega de anúncios considera público, saldo restante, frescor e uma pequena rotação por usuário.
- Checkout suporta BRL/USD.

## Limite conhecido

O editor do navegador não consegue transformar qualquer codec de vídeo (por exemplo, HEVC/H.265 de alguns celulares) em H.264 universalmente sem um pipeline de transcodificação. Esta revisão melhora o autoplay e a experiência de erro, mas o pipeline de transcodificação é uma etapa posterior de escala.

A internacionalização já cobre o núcleo do produto, autenticação, navegação, Business, Clips e anúncios. Ainda existem textos legados em algumas telas secundárias que devem ser migrados para chaves de tradução antes de declarar a cobertura de 100% do texto da interface.
