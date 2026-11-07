# Site da advocacia: como colocar no ar e publicar artigos

Este projeto é o site completo de Elisa Morais Advocacia (elisamoraisadvocacia.com.br). Ele tem:

- Página inicial, Sobre, Áreas de atuação (uma página para cada área), Artigos, Contato, Links (para a bio do Instagram) e Política de privacidade
- Painel em `elisamoraisadvocacia.com.br/admin` para escrever artigos e editar textos, fotos e contatos sem mexer em código
- SEO pronto: título e descrição por página, dados estruturados para o Google (escritório, artigos, trilha de navegação), `sitemap.xml`, `robots.txt`, feed RSS e imagem de compartilhamento para WhatsApp e redes sociais
- Botão de WhatsApp fixo em todas as páginas

Custo: R$ 0 por mês. O site fica hospedado no GitHub Pages, gratuito e sem limite prático de publicações. Você só continua pagando o domínio e o e-mail.

---

## Passo 1. Criar a conta e o repositório no GitHub (10 min)

1. Crie uma conta em github.com.
2. Clique em **+ → New repository**. Nome: `site-advocacia`. Marque **Public** (o GitHub Pages gratuito exige repositório público; ele só contém o que já é público no site, sem senhas).
3. Clique em **Create repository**.

## Passo 2. Enviar os arquivos (5 min)

1. Na página do repositório vazio, clique em **uploading an existing file**.
2. Abra a pasta `site` do zip, selecione tudo (Ctrl+A ou Cmd+A) e arraste para a página. Clique em **Commit changes**.
3. Confira se apareceu a pasta `.github` na lista. No Mac e no Windows ela costuma ficar oculta e não sobe. Se não apareceu:
   - Clique em **Add file → Create new file**
   - No nome, digite exatamente: `.github/workflows/publicar.yml`
   - Cole o conteúdo do quadro abaixo e clique em **Commit changes**

```yaml
# Publica o site no GitHub Pages sempre que algo muda (inclusive artigos salvos pelo painel).
name: Publicar site

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  publicar:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deploy.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - run: npm install
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deploy
        uses: actions/deploy-pages@v4
```

4. Abra o arquivo `static/admin/config.yml`, clique no lápis e troque `SEU-USUARIO/SEU-REPOSITORIO` pelo seu (ex.: `elisamorais/site-advocacia`). Clique em **Commit changes**.

## Passo 3. Ligar o GitHub Pages (5 min)

1. No repositório: **Settings → Pages**.
2. Em **Source**, escolha **GitHub Actions**.
3. Vá na aba **Actions** do repositório. Se o "Publicar site" não estiver rodando, clique nele e em **Run workflow**.
4. Em cerca de 1 minuto o site estará no ar em `seu-usuario.github.io/site-advocacia` (provisório; o visual só fica 100% certo no domínio próprio).

## Passo 4. Apontar o domínio elisamoraisadvocacia.com.br (15 min + propagação)

1. No GitHub: **Settings → Pages → Custom domain**, digite `elisamoraisadvocacia.com.br` e salve.
2. Na **Locaweb** (Central do Cliente → seu domínio → **DNS / Gerenciar zona DNS**), crie ou edite:
   - 4 registros **A** para o domínio (`@` ou campo vazio): `185.199.108.153`, `185.199.109.153`, `185.199.110.153` e `185.199.111.153`
   - 1 registro **CNAME** para `www` apontando para `seu-usuario.github.io`
   - Se já existir registro A ou CNAME antigo para `@` ou `www`, edite ou remova esse registro antigo do site.
3. **Não apague nem altere os registros MX, TXT (SPF, DKIM), `mail`, `smtp`, `pop`, `imap` ou `webmail`.** Eles mantêm o contato@elisamoraisadvocacia.com.br funcionando.
4. Se o domínio estiver no Registro.br usando os servidores DNS da Locaweb, a alteração é feita na Locaweb. Se usar os servidores do próprio Registro.br, faça o mesmo no painel do Registro.br.
5. Volte em **Settings → Pages**: quando a verificação ficar verde (pode levar algumas horas), marque **Enforce HTTPS**.

Não cancele o plano da Locaweb sem antes confirmar se o e-mail está nele. Se estiver, dá para trocar por um plano só de e-mail.

## Passo 4b. Primeiro acesso ao painel (5 min, uma vez só)

1. No GitHub: foto do perfil → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
   - Nome: `Painel do site`
   - Expiration: o maior prazo disponível (quando vencer, é só gerar outro)
   - Repository access: **Only select repositories → site-advocacia**
   - Permissions → Repository permissions → **Contents: Read and write**
2. Clique em **Generate token** e copie o código (ele só aparece uma vez).
3. Acesse `elisamoraisadvocacia.com.br/admin`, escolha **Sign in with token** e cole o código. O navegador lembra do login.

## Passo 5. Avisar o Google (10 min)

1. Acesse search.google.com/search-console e adicione o seu domínio (opção **Domínio**).
2. Verifique com o registro TXT que o Google indicar, no mesmo painel de DNS.
3. Em **Sitemaps**, envie: `sitemap.xml`.
4. Também vale criar ou atualizar o **Perfil da Empresa no Google** (Google Meu Negócio) com o link do site.

---

## Dia a dia: publicar um artigo

1. Acesse `elisamoraisadvocacia.com.br/admin`.
2. **Artigos → Novo artigo**.
3. Preencha título, resumo para o Google, data, temas e o texto. Use os botões do editor para subtítulos, listas e negrito.
4. Clique em **Save** (Salvar). Em 1 a 2 minutos o artigo está no ar, no sitemap e na página de links.

Para guardar sem publicar, marque **Rascunho**.

Em **Configurações do site** você troca fotos, textos da página inicial, WhatsApp, Instagram e os botões da página de links.

## Dicas para os artigos aparecerem no Google

- Um artigo responde a uma pergunta. Use no título a frase que o cliente digitaria: "Contrato verbal tem validade?", "O que é cláusula de exclusividade?".
- O resumo para o Google deve ter entre 120 e 160 caracteres.
- Use subtítulos (o editor chama de "Heading 2") para cada parte da resposta.
- Quando fizer sentido, inclua a cidade ("em Cuiabá", "em Mato Grosso").
- Faça links entre artigos e para a página da área relacionada.
- Constância vale mais que volume: um artigo bem feito a cada 2 semanas já constrói autoridade em alguns meses.
- Reaproveite: cada artigo pode virar carrossel e Reels, com link na bio apontando para `/links`.

## Lembretes da OAB (Provimento 205/2021)

O site foi escrito em tom informativo e sóbrio. Ao editar, evite:

- divulgar preços, descontos ou formas de pagamento;
- prometer resultados;
- expressões de captação ("ligue já", "o melhor advogado").

Mantenha o nome e o número da OAB visíveis (já estão no rodapé e na página de cada artigo).

---

## Para quem for mexer no código

- A publicação roda em `.github/workflows/publicar.yml` a cada alteração no repositório.
- `npm install` e depois `npm run build` gera o site em `dist/`.
- `npm run preview` gera uma versão com links relativos, para abrir os arquivos direto no navegador.
- Conteúdo: `content/` (artigos e áreas em Markdown, configurações em JSON). Visual: `static/assets/estilo.css`. Modelos das páginas: `build.mjs`.
