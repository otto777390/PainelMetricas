/* Servidor estático da réplica do ML.
 *
 *   node servidor.mjs          -> http://localhost:8080
 *
 * Sem dependência nenhuma: usa só o `http` que já vem no Node. Serve para sair
 * do `file://`, onde o navegador bloqueia fetch, módulos ES e service workers.
 * Com isto a réplica roda em localhost igual à Vendra, e passa a poder consumir
 * uma API no dia em que existir uma.
 */
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, join, normalize, sep } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = dirname(fileURLToPath(import.meta.url));
const PORTA = Number(process.env.PORTA || 8080);

const TIPOS = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let caminho = decodeURIComponent(url.pathname);
    if (caminho === '/') caminho = '/index.html';

    /* Impede sair da pasta com ../ */
    const alvo = join(RAIZ, normalize(caminho).replace(/^(\.\.[/\\])+/, ''));
    if (!alvo.startsWith(RAIZ + sep) && alvo !== RAIZ) {
      res.writeHead(403).end('403');
      return;
    }

    const info = await stat(alvo);
    const arquivo = info.isDirectory() ? join(alvo, 'index.html') : alvo;
    const conteudo = await readFile(arquivo);

    res.writeHead(200, {
      'Content-Type': TIPOS[extname(arquivo).toLowerCase()] ?? 'application/octet-stream',
      /* O painel é ao vivo: sem cache, senão o navegador segura os dados. */
      'Cache-Control': 'no-cache',
    });
    res.end(conteudo);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end('<h1>404</h1><p><a href="/index.html">Métricas</a> · <a href="/ao-vivo.html">Ao vivo</a></p>');
  }
}).listen(PORTA, () => {
  console.log(`Réplica do ML em http://localhost:${PORTA}`);
  console.log(`  Métricas  http://localhost:${PORTA}/index.html`);
  console.log(`  Ao vivo   http://localhost:${PORTA}/ao-vivo.html`);
});
