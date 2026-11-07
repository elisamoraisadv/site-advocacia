// Gerador do site da advocacia.
// Lê o conteúdo em /content, aplica os modelos e gera o site pronto em /dist.
// Uso: npm run build   (para publicar)
//      npm run preview (gera links relativos, para abrir os arquivos direto no navegador)

import fs from 'node:fs';
import path from 'node:path';
import { marked } from 'marked';
import YAML from 'yaml';

const ROOT = path.dirname(new URL(import.meta.url).pathname);
const OUT = path.join(ROOT, 'dist');
const PREVIEW = process.argv.includes('--preview');

// ---------- utilidades ----------
const read = (p) => fs.readFileSync(p, 'utf8');
const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const slugify = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

function parseMd(file) {
  const raw = read(file).replace(/^﻿/, '');
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  let data = {};
  try { data = m ? (YAML.parse(m[1]) || {}) : {}; }
  catch (e) { throw new Error(`Erro no cabeçalho do arquivo ${path.relative(ROOT, file)}: ${e.message}`); }
  const body = m ? m[2] : raw;
  return { data, body, slug: path.basename(file, '.md') };
}

const listMd = (dir) => fs.existsSync(dir)
  ? fs.readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => parseMd(path.join(dir, f)))
  : [];

const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const fmtData = (d) => `${d.getDate()} de ${MESES[d.getMonth()]} de ${d.getFullYear()}`;
const isoData = (d) => d.toISOString();

function tempoLeitura(md) {
  const palavras = md.replace(/[#*_>`\-\[\]()]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palavras / 200));
}

function copyDir(src, dst) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dst, { recursive: true });
  for (const e of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, e.name), d = path.join(dst, e.name);
    if (e.isDirectory()) copyDir(s, d); else fs.copyFileSync(s, d);
  }
}

// ---------- conteúdo ----------
const S = JSON.parse(read(path.join(ROOT, 'content/configuracoes.json')));
const SITE = S.dominio.replace(/\/$/, '');

const areas = listMd(path.join(ROOT, 'content/areas'))
  .sort((a, b) => (a.data.ordem ?? 99) - (b.data.ordem ?? 99));

const artigos = listMd(path.join(ROOT, 'content/artigos'))
  .filter((a) => !a.data.rascunho)
  .map((a) => ({ ...a, date: new Date(a.data.date || Date.now()) }))
  .sort((a, b) => b.date - a.date);

const waLink = `https://wa.me/${String(S.whatsapp).replace(/\D/g, '')}?text=${encodeURIComponent(S.whatsapp_mensagem || '')}`;
const igLink = S.instagram ? `https://instagram.com/${S.instagram.replace(/^@/, '')}` : '';

// ---------- links (absolutos no site, relativos na prévia) ----------
// `pagina` é o caminho da página atual, ex.: "artigos/meu-artigo/"
function url(alvo, pagina) {
  if (/^(https?:|mailto:|tel:|#)/.test(alvo)) return alvo;
  if (!PREVIEW) return alvo;
  const profundidade = pagina.split('/').filter(Boolean).length;
  let rel = '../'.repeat(profundidade) + alvo.replace(/^\//, '');
  if (rel === '' ) rel = './';
  if (rel.endsWith('/')) rel += 'index.html';
  return rel;
}

// Corrige caminhos de imagens e links internos no HTML gerado a partir do Markdown
function fixHtmlLinks(html, pagina) {
  return html.replace(/(href|src)="(\/[^"]*)"/g, (_, attr, p) => `${attr}="${url(p, pagina)}"`);
}

function resolverLinkBio(u) {
  if (u === 'whatsapp') return waLink;
  if (u === 'email') return `mailto:${S.email}`;
  if (u === 'instagram') return igLink;
  return u;
}

// ---------- ícones (SVG inline, sem dependências) ----------
const ICON = {
  wa: '<svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.7-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2c0 1.3.9 2.5 1 2.7.1.2 1.8 2.8 4.4 3.9 1.6.7 2.3.8 3.1.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z"/></svg>',
  ig: '<svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20"><path fill="currentColor" d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4ZM17.3 5.5a1.2 1.2 0 1 0 0 2.4 1.2 1.2 0 0 0 0-2.4ZM21.9 7c-.1-1.6-.4-3-1.6-4.2S17.6 1.2 16 1.1C14.4 1 9.6 1 8 1.1 6.4 1.2 5 1.5 3.8 2.7S2.2 5.4 2.1 7C2 8.6 2 13.4 2.1 15c.1 1.6.4 3 1.6 4.2s2.6 1.5 4.2 1.6c1.6.1 6.4.1 8 0 1.6-.1 3-.4 4.2-1.6s1.5-2.6 1.6-4.2c.1-1.6.1-6.4.2-8Zm-2 9.9a3.3 3.3 0 0 1-1.8 1.8c-1.3.5-4.3.4-5.7.4s-4.4.1-5.7-.4a3.3 3.3 0 0 1-1.8-1.8c-.5-1.3-.4-4.3-.4-5.7s-.1-4.4.4-5.7a3.3 3.3 0 0 1 1.8-1.8C8 3.2 11 3.3 12.3 3.3s4.4-.1 5.7.4a3.3 3.3 0 0 1 1.8 1.8c.5 1.3.4 4.3.4 5.7s.1 4.4-.4 5.7Z"/></svg>',
  mail: '<svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20"><path fill="none" stroke="currentColor" stroke-width="1.8" d="M3 5.5h18v13H3zM3.5 6l8.5 7 8.5-7"/></svg>',
  in: '<svg viewBox="0 0 24 24" aria-hidden="true" width="20" height="20"><path fill="currentColor" d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9.5h4v11H3zM9.5 9.5h3.8v1.6h.1c.5-1 1.8-2 3.8-2 4 0 4.8 2.6 4.8 6v5.4h-4v-4.8c0-1.2 0-2.6-1.6-2.6s-1.9 1.2-1.9 2.5v4.9h-4z"/></svg>',
};

// ---------- layout ----------
function layout({ pagina, titulo, descricao, conteudo, imagem, tipo = 'website', schema = [], semTituloSufixo = false }) {
  const tituloFinal = semTituloSufixo ? titulo : `${titulo} | ${S.marca}`;
  const canonical = `${SITE}/${pagina}`;
  const og = imagem ? (imagem.startsWith('http') ? imagem : SITE + imagem) : `${SITE}/img/og-padrao.png`;
  const u = (p) => url(p, pagina);
  const nav = [
    ['/sobre/', 'Sobre'], ['/areas/', 'Áreas de atuação'], ['/artigos/', 'Artigos'], ['/contato/', 'Contato'],
  ].map(([h, t]) => `<a href="${u(h)}"${('/' + pagina).startsWith(h) ? ' aria-current="page"' : ''}>${t}</a>`).join('');

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(tituloFinal)}</title>
<meta name="description" content="${esc(descricao)}">
<link rel="canonical" href="${esc(canonical)}">
<meta property="og:type" content="${tipo}">
<meta property="og:locale" content="pt_BR">
<meta property="og:site_name" content="${esc(S.marca)}">
<meta property="og:title" content="${esc(titulo)}">
<meta property="og:description" content="${esc(descricao)}">
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:image" content="${esc(og)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="theme-color" content="#403E3F">
<link rel="icon" href="${u('/img/favicon.png')}" type="image/png">
<link rel="apple-touch-icon" href="${u('/img/favicon.png')}">
<link rel="alternate" type="application/rss+xml" title="Artigos | ${esc(S.marca)}" href="${u('/feed.xml')}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Gilda+Display&family=Jost:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="${u('/assets/estilo.css')}">
${schema.map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`).join('\n')}
</head>
<body>
<a class="pular" href="#conteudo">Pular para o conteúdo</a>
<header class="topo">
  <div class="topo-in">
    <a class="marca" href="${u('/')}"><img src="${u(S.logo)}" alt="${esc(S.marca)}" width="240" height="36"></a>
    <button class="menu-btn" aria-expanded="false" aria-controls="menu">Menu</button>
    <nav id="menu" class="menu" aria-label="Principal">${nav}
      <a class="btn btn-wa btn-sm" href="${waLink}" target="_blank" rel="noopener">${ICON.wa}<span>WhatsApp</span></a>
    </nav>
  </div>
</header>
<main id="conteudo">
${conteudo}
</main>
<footer class="rodape">
  <div class="rodape-in">
    <div>
      <p class="rodape-marca"><img src="${u(S.logo_claro)}" alt="${esc(S.marca)}" width="240" height="36" loading="lazy"></p>
      <p>${esc(S.nome)}, ${esc(S.oab)}</p>
      <p>${esc(S.cidade)}</p>
      <p>${esc(S.atendimento)}</p>
    </div>
    <div>
      <p class="rodape-tit">Navegue</p>
      <p><a href="${u('/areas/')}">Áreas de atuação</a></p>
      <p><a href="${u('/artigos/')}">Artigos</a></p>
      <p><a href="${u('/links/')}">Links</a></p>
      <p><a href="${u('/privacidade/')}">Política de privacidade</a></p>
    </div>
    <div>
      <p class="rodape-tit">Contato</p>
      <p><a href="${waLink}" target="_blank" rel="noopener">WhatsApp</a></p>
      <p><a href="mailto:${esc(S.email)}">${esc(S.email)}</a></p>
      ${igLink ? `<p><a href="${igLink}" target="_blank" rel="noopener">Instagram @${esc(S.instagram.replace(/^@/, ''))}</a></p>` : ''}
      ${S.linkedin ? `<p><a href="${esc(S.linkedin)}" target="_blank" rel="noopener">LinkedIn</a></p>` : ''}
    </div>
  </div>
  <p class="rodape-nota">As informações deste site têm caráter informativo e não substituem a consulta a uma advogada sobre o seu caso.</p>
</footer>
<a class="wa-flutuante" href="${waLink}" target="_blank" rel="noopener" aria-label="Conversar no WhatsApp">${ICON.wa}</a>
<script>
const b=document.querySelector('.menu-btn'),m=document.getElementById('menu');
b.addEventListener('click',()=>{const o=b.getAttribute('aria-expanded')==='true';b.setAttribute('aria-expanded',String(!o));m.classList.toggle('aberto',!o);});
</script>
</body>
</html>`;
}

function write(pagina, html) {
  const dir = path.join(OUT, pagina);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), html);
}

// ---------- blocos reutilizáveis ----------
const pessoaSchema = {
  '@type': 'Person',
  name: S.nome_completo || S.nome,
  alternateName: S.nome,
  jobTitle: 'Advogada',
  identifier: S.oab,
  url: SITE,
  sameAs: [igLink, S.linkedin].filter(Boolean),
};
const escritorioSchema = {
  '@context': 'https://schema.org',
  '@type': 'LegalService',
  name: S.marca,
  url: SITE,
  email: S.email,
  telephone: '+' + String(S.whatsapp).replace(/\D/g, ''),
  image: SITE + S.foto_principal,
  areaServed: 'BR',
  address: { '@type': 'PostalAddress', addressLocality: S.cidade.split(/[–-]/)[0].trim(), addressRegion: 'MT', addressCountry: 'BR' },
  founder: pessoaSchema,
  knowsAbout: areas.map((a) => a.data.title),
};

function cartaoArtigo(a, pagina, destaque = false) {
  const u = (p) => url(p, pagina);
  return `<article class="item-artigo${destaque ? ' destaque' : ''}">
    <p class="meta"><time datetime="${isoData(a.date)}">${fmtData(a.date)}</time>${a.data.tags?.length ? ` <span class="tag">${esc(a.data.tags[0])}</span>` : ''}</p>
    <h3><a href="${u(`/artigos/${a.slug}/`)}">${esc(a.data.title)}</a></h3>
    <p>${esc(a.data.description || '')}</p>
  </article>`;
}

function chamadaContato(pagina) {
  return `<section class="chamada">
  <div class="chamada-in">
    <h2>Tem um contrato para assinar ou para escrever?</h2>
    <p>Conte rapidamente o que você precisa. Eu respondo com os próximos passos.</p>
    <div class="acoes">
      <a class="btn btn-wa" href="${waLink}" target="_blank" rel="noopener">${ICON.wa}<span>Conversar no WhatsApp</span></a>
      <a class="btn btn-linha" href="mailto:${esc(S.email)}">Enviar e-mail</a>
    </div>
  </div>
</section>`;
}

// ---------- páginas ----------
function paginaInicial() {
  const pagina = '';
  const u = (p) => url(p, pagina);
  const recentes = artigos.slice(0, 3);
  const conteudo = `
<section class="hero">
  <div class="hero-in">
    <div class="hero-texto">
      <h1>${esc(S.hero_titulo)}</h1>
      <p class="lead">${esc(S.hero_texto)}</p>
      <div class="acoes">
        <a class="btn btn-wa" href="${waLink}" target="_blank" rel="noopener">${ICON.wa}<span>Conversar no WhatsApp</span></a>
        <a class="btn btn-linha" href="${u('/areas/')}">Ver áreas de atuação</a>
      </div>
      <div class="assinatura" aria-label="Assinatura">
        <span class="linha"></span>
        <span class="nome">${esc(S.nome)}</span>
        <span class="oab">Advogada · ${esc(S.oab)}</span>
      </div>
    </div>
    <figure class="hero-foto">
      <img src="${u(S.foto_principal)}" alt="${esc(S.nome)}, advogada" width="560" height="700" fetchpriority="high">
    </figure>
  </div>
</section>

<section class="secao">
  <div class="secao-in">
    <h2 class="titulo-secao">Áreas de atuação</h2>
    <div class="lista-areas">
      ${areas.map((a) => `<a class="area" href="${u(`/areas/${a.slug}/`)}">
        <h3>${esc(a.data.title)}</h3>
        <p>${esc(a.data.resumo || '')}</p>
        <span class="area-ver">Saiba mais</span>
      </a>`).join('')}
    </div>
  </div>
</section>

<section class="secao secao-clausulas">
  <div class="secao-in">
    <h2 class="titulo-secao">Como funciona o atendimento</h2>
    <ol class="clausulas">
      <li><h3>Primeira conversa</h3><p>Você conta o que precisa pelo WhatsApp ou e-mail. Eu entendo o caso e indico o caminho.</p></li>
      <li><h3>Proposta por escrito</h3><p>Você recebe o escopo do trabalho, o prazo e as condições antes de começar.</p></li>
      <li><h3>Análise e redação</h3><p>Eu reviso ou escrevo o contrato e explico cada ponto importante em linguagem simples.</p></li>
      <li><h3>Entrega e assinatura</h3><p>Ajustamos o que for preciso e o documento fica pronto para assinar, inclusive digitalmente.</p></li>
    </ol>
  </div>
</section>

<section class="secao secao-sobre">
  <div class="secao-in sobre-curto">
    <img src="${u(S.foto_atendimento || S.foto_sobre)}" alt="${esc(S.nome)} em atendimento" width="360" height="450" loading="lazy">
    <div>
      <h2 class="titulo-secao">Quem vai cuidar do seu contrato</h2>
      <p class="lead">${esc(S.sobre_resumo)}</p>
      <p><a class="link-forte" href="${u('/sobre/')}">Conheça minha trajetória</a></p>
    </div>
  </div>
</section>

${recentes.length ? `<section class="secao">
  <div class="secao-in">
    <div class="cab-secao">
      <h2 class="titulo-secao">Artigos recentes</h2>
      <a class="link-forte" href="${u('/artigos/')}">Todos os artigos</a>
    </div>
    <div class="lista-artigos">${recentes.map((a) => cartaoArtigo(a, pagina)).join('')}</div>
  </div>
</section>` : ''}

${chamadaContato(pagina)}`;

  write(pagina, layout({
    pagina, titulo: `${S.marca} | Advocacia consultiva em contratos em ${S.cidade}`, semTituloSufixo: true,
    descricao: S.seo_descricao, conteudo, imagem: S.foto_principal,
    schema: [escritorioSchema, { '@context': 'https://schema.org', '@type': 'WebSite', name: S.marca, url: SITE }],
  }));
}

function paginaSobre() {
  const pagina = 'sobre/';
  const u = (p) => url(p, pagina);
  const conteudo = `
<div class="pagina pagina-sobre">
  <div class="sobre-grid">
    <div>
      <h1>Sobre</h1>
      <div class="texto">${fixHtmlLinks(marked.parse(S.sobre_texto || ''), pagina)}</div>
      <div class="assinatura"><span class="linha"></span><span class="nome">${esc(S.nome)}</span><span class="oab">Advogada · ${esc(S.oab)}</span></div>
    </div>
    <img class="sobre-foto" src="${u(S.foto_sobre)}" alt="${esc(S.nome)}" width="440" height="660">
  </div>
</div>
${chamadaContato(pagina)}`;
  write(pagina, layout({
    pagina, titulo: `Sobre ${S.nome}`, descricao: S.sobre_resumo, conteudo, imagem: S.foto_sobre,
    tipo: 'profile', schema: [{ '@context': 'https://schema.org', ...pessoaSchema }],
  }));
}

function paginasAreas() {
  const pagina = 'areas/';
  const u = (p) => url(p, pagina);
  const conteudo = `
<div class="pagina">
  <h1>Áreas de atuação</h1>
  <p class="lead">Advocacia consultiva: o foco é prevenir problemas com contratos bem feitos e orientação clara.</p>
  <div class="lista-areas lista-areas-pagina">
    ${areas.map((a) => `<a class="area" href="${u(`/areas/${a.slug}/`)}"><h2>${esc(a.data.title)}</h2><p>${esc(a.data.resumo || '')}</p><span class="area-ver">Saiba mais</span></a>`).join('')}
  </div>
</div>
${chamadaContato(pagina)}`;
  write(pagina, layout({ pagina, titulo: 'Áreas de atuação', descricao: S.seo_descricao, conteudo }));

  for (const a of areas) {
    const pg = `areas/${a.slug}/`;
    const uu = (p) => url(p, pg);
    const temaArtigos = a.data.tag_artigos ? slugify(a.data.tag_artigos) : '';
    const relacionados = temaArtigos ? artigos.filter((x) => (x.data.tags || []).some((t) => slugify(t) === temaArtigos)).slice(0, 3) : [];
    const c = `
<div class="pagina">
  <nav class="trilha" aria-label="Trilha"><a href="${uu('/')}">Início</a> / <a href="${uu('/areas/')}">Áreas de atuação</a></nav>
  <h1>${esc(a.data.title)}</h1>
  <p class="lead">${esc(a.data.resumo || '')}</p>
  <div class="texto">${fixHtmlLinks(marked.parse(a.body), pg)}</div>
  <p><a class="btn btn-wa" href="${waLink}" target="_blank" rel="noopener">${ICON.wa}<span>Falar sobre ${esc(a.data.title.toLowerCase())}</span></a></p>
  ${relacionados.length ? `<h2 class="titulo-secao mt">Artigos sobre o tema</h2><div class="lista-artigos">${relacionados.map((x) => cartaoArtigo(x, pg)).join('')}</div>` : ''}
</div>`;
    write(pg, layout({
      pagina: pg, titulo: a.data.title, descricao: a.data.seo_descricao || a.data.resumo, conteudo: c,
      schema: [{
        '@context': 'https://schema.org', '@type': 'Service', name: a.data.title, description: a.data.seo_descricao || a.data.resumo,
        provider: { '@type': 'LegalService', name: S.marca, url: SITE }, areaServed: 'BR',
      }],
    }));
  }
}

function paginasArtigos() {
  const pagina = 'artigos/';
  const tags = [...new Set(artigos.flatMap((a) => a.data.tags || []))];
  const conteudo = `
<div class="pagina">
  <h1>Artigos</h1>
  <p class="lead">Conteúdo sobre contratos, escrito para quem não é da área jurídica.</p>
  ${tags.length > 1 ? `<div class="filtros" role="group" aria-label="Filtrar por tema">
    <button class="filtro" aria-pressed="true" data-tag="">Todos</button>
    ${tags.map((t) => `<button class="filtro" aria-pressed="false" data-tag="${esc(slugify(t))}">${esc(t)}</button>`).join('')}
  </div>` : ''}
  <div class="lista-artigos lista-artigos-pagina">
    ${artigos.length ? artigos.map((a, i) => `<div data-tags="${esc((a.data.tags || []).map(slugify).join(' '))}">${cartaoArtigo(a, pagina, i === 0)}</div>`).join('') : '<p>Os primeiros artigos serão publicados em breve.</p>'}
  </div>
</div>
<script>
document.querySelectorAll('.filtro').forEach(f=>f.addEventListener('click',()=>{
  document.querySelectorAll('.filtro').forEach(x=>x.setAttribute('aria-pressed',String(x===f)));
  const t=f.dataset.tag;
  document.querySelectorAll('[data-tags]').forEach(el=>{el.hidden=t&&!el.dataset.tags.split(' ').includes(t);});
}));
</script>`;
  write(pagina, layout({ pagina, titulo: 'Artigos sobre contratos', descricao: `Artigos sobre contratos empresariais, contratos para pessoa física e para criadores de conteúdo, por ${S.nome}.`, conteudo }));

  for (const a of artigos) {
    const pg = `artigos/${a.slug}/`;
    const u = (p) => url(p, pg);
    const outros = artigos.filter((x) => x !== a).slice(0, 2);
    const img = a.data.image || '';
    const c = `
<article class="pagina artigo">
  <nav class="trilha" aria-label="Trilha"><a href="${u('/')}">Início</a> / <a href="${u('/artigos/')}">Artigos</a></nav>
  <header class="artigo-cab">
    <h1>${esc(a.data.title)}</h1>
    <p class="lead">${esc(a.data.description || '')}</p>
    <p class="meta">Por <a href="${u('/sobre/')}">${esc(S.nome)}</a>, ${esc(S.oab)}. <time datetime="${isoData(a.date)}">${fmtData(a.date)}</time>. Leitura de ${tempoLeitura(a.body)} min.</p>
  </header>
  ${img ? `<img class="artigo-capa" src="${u(img)}" alt="" loading="eager">` : ''}
  <div class="texto">${fixHtmlLinks(marked.parse(a.body), pg)}</div>
  <aside class="autora">
    <img src="${u(S.foto_perfil || S.foto_sobre)}" alt="" width="88" height="88" loading="lazy">
    <div>
      <p class="autora-nome">${esc(S.nome)}</p>
      <p>${esc(S.sobre_resumo)}</p>
      <p class="autora-links"><a href="${waLink}" target="_blank" rel="noopener">${ICON.wa} WhatsApp</a>${igLink ? ` <a href="${igLink}" target="_blank" rel="noopener">${ICON.ig} Instagram</a>` : ''}</p>
    </div>
  </aside>
  ${outros.length ? `<h2 class="titulo-secao mt">Leia também</h2><div class="lista-artigos">${outros.map((x) => cartaoArtigo(x, pg)).join('')}</div>` : ''}
</article>
${chamadaContato(pg)}`;
    write(pg, layout({
      pagina: pg, titulo: a.data.title, descricao: a.data.description || '', conteudo: c, imagem: img || S.foto_principal, tipo: 'article',
      schema: [{
        '@context': 'https://schema.org', '@type': 'BlogPosting',
        headline: a.data.title, description: a.data.description, datePublished: isoData(a.date), dateModified: isoData(a.date),
        image: img ? (img.startsWith('http') ? img : SITE + img) : SITE + S.foto_principal,
        author: pessoaSchema, publisher: { '@type': 'Organization', name: S.marca, url: SITE },
        mainEntityOfPage: `${SITE}/${pg}`, inLanguage: 'pt-BR', keywords: (a.data.tags || []).join(', '),
      }, {
        '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Início', item: SITE + '/' },
          { '@type': 'ListItem', position: 2, name: 'Artigos', item: SITE + '/artigos/' },
          { '@type': 'ListItem', position: 3, name: a.data.title, item: `${SITE}/${pg}` },
        ],
      }],
    }));
  }
}

function paginaContato() {
  const pagina = 'contato/';
  const conteudo = `
<div class="pagina">
  <h1>Contato</h1>
  <p class="lead">Escolha o canal que preferir. ${esc(S.atendimento)}.</p>
  <div class="canais">
    <a class="canal" href="${waLink}" target="_blank" rel="noopener">${ICON.wa}<span><strong>WhatsApp</strong>Resposta mais rápida, em horário comercial</span></a>
    <a class="canal" href="mailto:${esc(S.email)}">${ICON.mail}<span><strong>E-mail</strong>${esc(S.email)}</span></a>
    ${igLink ? `<a class="canal" href="${igLink}" target="_blank" rel="noopener">${ICON.ig}<span><strong>Instagram</strong>@${esc(S.instagram.replace(/^@/, ''))}</span></a>` : ''}
    ${S.linkedin ? `<a class="canal" href="${esc(S.linkedin)}" target="_blank" rel="noopener">${ICON.in}<span><strong>LinkedIn</strong>Perfil profissional</span></a>` : ''}
  </div>
  <p class="nota">${esc(S.nome)}, ${esc(S.oab)}. ${esc(S.cidade)}.</p>
</div>`;
  write(pagina, layout({ pagina, titulo: 'Contato', descricao: `Fale com ${S.nome} pelo WhatsApp, e-mail ou Instagram. ${S.atendimento}.`, conteudo }));
}

function paginaLinks() {
  const pagina = 'links/';
  const u = (p) => url(p, pagina);
  const conteudo = `
<div class="pagina pagina-links">
  <img class="links-foto" src="${u(S.foto_perfil || S.foto_principal)}" alt="${esc(S.nome)}" width="112" height="112">
  <h1>${esc(S.nome)}</h1>
  <p>Advogada, ${esc(S.oab)}</p>
  <ul class="links-lista">
    ${(S.links || []).map((l) => `<li><a href="${esc(u(resolverLinkBio(l.url)))}"${/^https?:/.test(resolverLinkBio(l.url)) ? ' target="_blank" rel="noopener"' : ''}>${esc(l.titulo)}</a></li>`).join('')}
    ${artigos[0] ? `<li><a href="${u(`/artigos/${artigos[0].slug}/`)}">Artigo novo: ${esc(artigos[0].data.title)}</a></li>` : ''}
  </ul>
</div>`;
  write(pagina, layout({ pagina, titulo: 'Links', descricao: `Links de ${S.nome}: WhatsApp, artigos e contato.`, conteudo }));
}

function paginaPrivacidade() {
  const pagina = 'privacidade/';
  const md = `Esta política explica como os dados pessoais são tratados neste site, em conformidade com a Lei Geral de Proteção de Dados (Lei nº 13.709/2018).

## Quais dados são coletados

Este site não possui formulários de cadastro. Quando você entra em contato por WhatsApp ou e-mail, os dados que você envia (nome, telefone, e-mail e informações sobre o seu caso) são usados apenas para responder e prestar o atendimento solicitado.

## Sigilo profissional

As informações compartilhadas no atendimento são protegidas pelo sigilo profissional da advocacia.

## Cookies e serviços de terceiros

O site pode usar serviços de terceiros, como fontes tipográficas e ferramentas de estatística de acesso, que podem registrar dados técnicos de navegação (como endereço IP e tipo de navegador).

## Seus direitos

Você pode solicitar a confirmação, o acesso, a correção ou a exclusão dos seus dados pelo e-mail ${S.email}.

## Responsável

${S.nome}, ${S.oab}.`;
  const conteudo = `<div class="pagina"><h1>Política de privacidade</h1><div class="texto">${marked.parse(md)}</div></div>`;
  write(pagina, layout({ pagina, titulo: 'Política de privacidade', descricao: `Política de privacidade e tratamento de dados de ${S.marca}.`, conteudo }));
}

function pagina404() {
  const conteudo = `<div class="pagina"><h1>Página não encontrada</h1><p class="lead">O endereço pode ter mudado. Volte para o <a href="/">início</a> ou veja os <a href="/artigos/">artigos</a>.</p></div>`;
  const html = layout({ pagina: '404/', titulo: 'Página não encontrada', descricao: 'Página não encontrada.', conteudo });
  fs.writeFileSync(path.join(OUT, '404.html'), PREVIEW ? html : html.replace(/href="\.\.\//g, 'href="/'));
}

function arquivosSeo() {
  const paginas = ['', 'sobre/', 'areas/', ...areas.map((a) => `areas/${a.slug}/`), 'artigos/', 'contato/', 'links/', 'privacidade/'];
  const urls = [
    ...paginas.map((p) => `<url><loc>${SITE}/${p}</loc></url>`),
    ...artigos.map((a) => `<url><loc>${SITE}/artigos/${a.slug}/</loc><lastmod>${isoData(a.date).slice(0, 10)}</lastmod></url>`),
  ];
  fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);
  fs.writeFileSync(path.join(OUT, 'robots.txt'), `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${SITE}/sitemap.xml\n`);
  const itens = artigos.slice(0, 20).map((a) => `<item><title>${esc(a.data.title)}</title><link>${SITE}/artigos/${a.slug}/</link><guid>${SITE}/artigos/${a.slug}/</guid><pubDate>${a.date.toUTCString()}</pubDate><description>${esc(a.data.description || '')}</description></item>`);
  fs.writeFileSync(path.join(OUT, 'feed.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>${esc(S.marca)}</title><link>${SITE}/</link><description>${esc(S.seo_descricao)}</description><language>pt-BR</language>\n${itens.join('\n')}\n</channel></rss>\n`);
}

// ---------- executar ----------
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
copyDir(path.join(ROOT, 'static'), OUT);
paginaInicial();
paginaSobre();
paginasAreas();
paginasArtigos();
paginaContato();
paginaLinks();
paginaPrivacidade();
pagina404();
arquivosSeo();
console.log(`Site gerado em dist/ — ${artigos.length} artigo(s), ${areas.length} área(s).${PREVIEW ? ' (modo prévia)' : ''}`);
