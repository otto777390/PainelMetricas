/* Sincroniza os dois projetos. Rode sempre que mexer no motor ou no catálogo:
 *
 *   node sync-vendra.mjs
 *
 * Vai nas duas direções:
 *   motor-painel.js         ->  Vendra (src/lib/painel/)
 *   catálogo + fotos reais  ->  réplica do ML (catalogo.js e produtos/)
 *
 * O catálogo mora na Vendra (src/data/catalog/products.json, gerado por
 * `npm run catalog:build`), porque lá é o produto de verdade. A réplica do ML
 * recebe uma cópia dos itens que giram, para as duas telas mostrarem os mesmos
 * produtos com as mesmas fotos.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const AQUI = dirname(fileURLToPath(import.meta.url));
const VENDRA = join(AQUI, '..', 'ML SAAS CLAUDE');

/* Quantos itens do catálogo giram. Precisa bater com PRODUTOS_ATIVOS do motor. */
const ATIVOS = 12;

// ------------------------------------------------- motor -> Vendra

const ORIGEM_MOTOR = join(AQUI, 'motor-painel.js');
const DESTINO_MOTOR_DIR = join(VENDRA, 'src', 'lib', 'painel');
const DESTINO_MOTOR = join(DESTINO_MOTOR_DIR, 'motor-painel.js');

if (!existsSync(ORIGEM_MOTOR)) {
    console.error('nao encontrei o motor em', ORIGEM_MOTOR);
    process.exit(1);
}

const aviso = [
    '/* ===========================================================================',
    '   ARQUIVO GERADO — NAO EDITE AQUI.',
    '',
    '   Origem: Desktop\\ML\\motor-painel.js',
    '   Para atualizar: edite a origem e rode `node sync-vendra.mjs` na pasta ML.',
    '   =========================================================================== */',
    ''
].join('\n');

mkdirSync(DESTINO_MOTOR_DIR, { recursive: true });
writeFileSync(DESTINO_MOTOR, aviso + readFileSync(ORIGEM_MOTOR, 'utf8'), 'utf8');
console.log('motor  ->', DESTINO_MOTOR);

// ------------------------------------------------- catálogo -> réplica do ML

const ORIGEM_CATALOGO = join(VENDRA, 'src', 'data', 'catalog', 'products.json');
if (!existsSync(ORIGEM_CATALOGO)) {
    console.error('nao encontrei o catalogo da Vendra em', ORIGEM_CATALOGO);
    process.exit(1);
}

const produtos = JSON.parse(readFileSync(ORIGEM_CATALOGO, 'utf8'));

function caminhoImagem(produto) {
    const img = Array.isArray(produto.images) ? produto.images[0] : produto.images;
    if (!img) return '';
    return typeof img === 'string' ? img : (img.url || '');
}

const selecionados = produtos.slice(0, ATIVOS).map((p) => ({
    id: p.id,
    nome: p.name,
    sku: p.sku,
    custo: p.costPrice,
    estoque: p.stock,
    imagem: caminhoImagem(p)
}));

/* Copia as fotos para a pasta da réplica, senão o <img> não acha o arquivo. */
const DESTINO_FOTOS = join(AQUI, 'produtos');
let copiadas = 0, faltando = 0;

for (const item of selecionados) {
    if (!item.imagem) { faltando++; continue; }
    const relativo = item.imagem.replace(/^\//, '').split('/');
    const origem = join(VENDRA, 'public', ...relativo);
    if (!existsSync(origem)) { faltando++; item.imagem = ''; continue; }
    const destino = join(DESTINO_FOTOS, ...relativo.slice(1));
    mkdirSync(dirname(destino), { recursive: true });
    copyFileSync(origem, destino);
    item.imagem = 'produtos/' + relativo.slice(1).join('/');
    copiadas++;
}

const saida = [
    '/* ===========================================================================',
    '   ARQUIVO GERADO — NAO EDITE AQUI.',
    '',
    '   Catalogo compartilhado, exportado do products.json da Vendra.',
    '   Para atualizar: rode `node sync-vendra.mjs` na pasta ML.',
    '   =========================================================================== */',
    '',
    'const CATALOGO_PAINEL = ' + JSON.stringify(selecionados, null, 2) + ';',
    '',
    "if (typeof module !== 'undefined' && module.exports) module.exports = CATALOGO_PAINEL;",
    ''
].join('\n');

writeFileSync(join(AQUI, 'catalogo.js'), saida, 'utf8');

console.log('catalogo ->', join(AQUI, 'catalogo.js'), `(${selecionados.length} produtos)`);
console.log('fotos    ->', DESTINO_FOTOS, `(${copiadas} copiadas${faltando ? ', ' + faltando + ' sem imagem' : ''})`);
