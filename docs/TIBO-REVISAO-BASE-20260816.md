# Tibo — revisão da base build-passou (2026-08-16)

Esta revisão usa como base `tibo-build-passou-20260816-1535.zip`, a versão que o usuário confirmou com `npm run build` concluído.

## Correções preparadas nesta revisão

- **Avatares:** adicionada uma imagem própria para Radix Avatar (`SignedAvatarImage`) para que a foto e o fallback de iniciais não apareçam simultaneamente. A inicial fica como fallback real quando não existe foto ou enquanto a URL assinada ainda não carregou.
- **Vídeo:** corrigido o upload de `video/quicktime`, que anteriormente podia receber extensão `.mp4` mantendo MIME `video/quicktime`. Agora extensão e MIME permanecem coerentes (`.mov` + `video/quicktime`).
- **Editor de vídeo:** prévia tenta iniciar automaticamente em modo silencioso, usa preload automático, loop e mostra erro de codec/carregamento de forma mais clara.
- **Clips:** mantida a área `/clips`; adicionada entrada rápida no TopBar e melhorias de reprodução automática/preload/erro no `ClipViewer`.
- **Internacionalização:** preservada a arquitetura global do `I18nProvider` e ampliadas chaves para Clips, editor e administração. A preferência continua em `localStorage` e também atualiza `document.documentElement.lang`.
- **Admin Business:** o dashboard existente de revisão continua protegido pelo RPC `is_platform_admin`; a tela está preparada para tradução.

## Pontos importantes encontrados

### Internacionalização
A infraestrutura é global, mas a base ainda contém textos hardcoded em algumas telas. Portanto, esta revisão **não deve ser considerada 100% internacionalizada ainda**. Os próximos alvos são Feed/PostCard/CommentThread, Stories, Mensagens, Perfil, Comunidades e estados de erro/notificação.

### Vídeo
O código atual preserva o arquivo original. Isso significa que um vídeo em codec não suportado pelo navegador continuará sem reprodução. A correção de MIME/extensão evita um erro de armazenamento introduzido anteriormente, mas **não é uma transcodificação**. Para produção internacional, o pipeline ideal deverá gerar uma versão web compatível (por exemplo, MP4/H.264/AAC e/ou WebM) no servidor.

### Business / pagamentos
O projeto já possui verificação, conta de anúncios e estrutura de faturamento. O componente informa que os dados sensíveis do cartão devem ficar no provedor de pagamento. A integração efetiva de cobrança, repasse e reconciliação depende da escolha/configuração do provedor e não deve ser simulada no frontend.

### Segurança jurídica
A base já registra versões de Termos/Privacidade, data de nascimento e consentimento, bloqueia menores de 13 anos no banco e possui página de segurança para adolescentes. Isso é uma **camada técnica de compliance**, não uma garantia jurídica. Antes do lançamento comercial, os textos e regras precisam de revisão jurídica por jurisdição, principalmente para adolescentes, publicidade, privacidade e pagamentos.

### Administração
A aprovação de Tibo Business fica em `/admin/negocios`, protegida por `platform_admins` e pelas funções administrativas no Supabase. Não se deve liberar esse acesso apenas por uma rota frontend.

## Próxima etapa recomendada

1. Completar a tradução de todos os textos de interface.
2. Fechar pipeline de transcodificação/compatibilidade de vídeo.
3. Integrar provedor de pagamentos com webhooks e ledger de cobrança.
4. Fazer revisão jurídica por país antes de ativar comercialmente.
5. Testar o fluxo completo de adolescente, denúncia, bloqueio, exclusão de conta e direitos de privacidade.
6. Manter Tibo Business como experiência web responsiva; o futuro app nativo será para usuários Tibo.
