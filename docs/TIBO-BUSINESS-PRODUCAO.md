# Tibo Business + Tibo Ads — checklist de produção

## O que esta versão entrega

- Tibo Business com verificação comercial obrigatória.
- Conta de anúncios separada por negócio.
- Papéis de equipe: owner, admin e analyst.
- Campanhas continuam em rascunho até a conta cumprir os requisitos de veiculação.
- Bloqueio no banco para impedir ativação sem empresa verificada, conta de anúncios ativa e pagamento configurado.
- Faturamento com referências seguras do provedor; o Tibo não armazena número completo de cartão.
- Ledger de transações de anúncios para conciliação futura.
- Tibo Ads só entrega campanhas que passaram pelas regras comerciais.
- Business continua sendo web-only.
- Idiomas base: pt-BR, en-US e es-BO.

## Pagamentos

A camada de dados está preparada para um provedor de pagamentos. Antes do primeiro tráfego pago real, o Tibo precisa conectar o checkout/webhook do provedor escolhido e preencher `billing_profiles.provider_customer_id` e `billing_profiles.provider_payment_method_id`, além de manter `billing_profiles.status = 'active'`.

Não coloque chaves secretas ou dados de cartão em `VITE_*` nem no navegador.

Para o Tibo operar como empresa no Brasil, Stripe é uma opção de referência para cartões e pagamentos internacionais. A disponibilidade do Stripe depende do país da entidade que recebe os pagamentos; Bolívia não aparece na lista atual de países onde a Stripe mantém contas de negócios. Isso não impede um anunciante boliviano de pagar o Tibo se a entidade recebedora do Tibo estiver em um país suportado, mas a entidade e a conta de recebimento precisam obedecer às regras do provedor.

## Aprovação de negócio

O cadastro público começa como `pending`. O backoffice/admin do Tibo deve revisar os dados e alterar:

- `businesses.verification_status = 'verified'`
- `ad_accounts.status = 'active'`

Depois que o provedor confirmar o método de pagamento:

- `billing_profiles.status = 'active'`
- `billing_profiles.provider_payment_method_id = <referência segura do provedor>`

Somente então o banco permite `ad_campaigns.status = 'active'`.

## Próximo passo obrigatório antes de anunciar de verdade

Implementar o webhook do provedor para:

1. confirmar pagamento/autorização;
2. registrar `ad_billing_transactions`;
3. atualizar `billing_profiles.status`;
4. atualizar `ad_campaigns.spent` conforme o consumo real;
5. pausar campanhas quando houver falha de cobrança, limite ou saldo insuficiente;
6. tratar chargeback/reembolso.

A interface e o banco já estão separados para essa etapa.
