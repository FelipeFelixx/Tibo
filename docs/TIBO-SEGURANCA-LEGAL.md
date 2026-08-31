# Tibo — segurança, idade, documentos legais e administração

## Idade

A versão atual exige **13 anos ou mais** para criar conta. A data de nascimento é solicitada no cadastro e também é validada no banco.

Contas de adolescentes (13–17) podem usar o Tibo, mas devem receber proteções adicionais de produto, privacidade, publicidade e moderação.

Menores de 13 anos ficam bloqueados nesta versão. Isso não significa que o Tibo esteja automaticamente em conformidade em todas as jurisdições: antes de oferecer o serviço a menores de 13 anos, deve existir um fluxo de consentimento parental verificável e revisão jurídica específica.

A FTC informa que a COPPA alcança serviços direcionados a menores de 13 anos e, em determinadas situações, serviços de público geral que tenham conhecimento efetivo de que coletam dados de menores de 13 anos. A ANPD também destaca o melhor interesse de crianças e adolescentes e salvaguardas específicas no tratamento de seus dados.

## Consentimento

No cadastro, o usuário aceita separadamente:

- Termos de Uso;
- Política de Privacidade.

As versões aceitas são registradas em `account_consents` junto com data de nascimento e horário do aceite.

Versões atuais:

- Terms: `2026-08-16`
- Privacy: `2026-08-16`

Esses documentos são **documentos-base de produto**, não parecer jurídico.

## Documentos

Rotas:

- `/termos`
- `/privacidade`
- `/seguranca-adolescentes`

Antes do lançamento comercial, os textos devem ser revisados por advogado e adaptados por país.

## Administração do Tibo Business

O backoffice inicial fica em:

- `/admin/negocios`

O acesso é protegido por `platform_admins` e pelas funções `is_platform_admin`, `admin_list_business_verifications` e `admin_review_business_verification`.

O primeiro administrador precisa ser cadastrado de forma controlada no banco/ambiente administrativo. Não há usuário administrador embutido no código.

## Tibo Business

A criação de empresa continua sendo permitida para iniciar o processo, mas a veiculação de anúncios depende de:

1. empresa verificada;
2. conta de anúncios ativa;
3. pagamento configurado;
4. regras de campanha satisfeitas.

## Internacionalização

A infraestrutura global está em `src/i18n/index.tsx`.

Idiomas-base:

- `pt-BR`
- `en-US`
- `es-BO`

A escolha é persistida no navegador e o `<html lang>` é atualizado.

A internacionalização precisa continuar sendo aplicada às telas existentes; textos novos não devem ser colocados diretamente nos componentes quando houver chave de tradução.

## Aviso de lançamento

Nenhuma implementação de software garante ausência de responsabilidade judicial. O Tibo deve ter revisão jurídica local, processo de atendimento a titulares, segurança, moderação, resposta a denúncias, gestão de incidentes e documentação operacional antes do lançamento público.
