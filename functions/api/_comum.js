/* =============================================================================
   Base das Functions do painel (Cloudflare Pages).
   =============================================================================

   Tudo aqui roda NO SERVIDOR. É a diferença em relação ao acesso antigo: a
   senha nunca chega ao navegador e as sessões ficam gravadas no KV, então dá
   para listar e derrubar dispositivos de verdade.

   Precisa de um KV namespace vinculado ao projeto com o nome PAINEL.
   ========================================================================== */

export const COOKIE = 'painel_sessao';
export const DIAS_SESSAO = 30;

/* ------------------------------------------------------------------- senha */

/* O Workers limita o PBKDF2 a 100.000 iteracoes e lanca excecao acima disso.
   O Miniflare (wrangler local) NAO aplica esse limite, entao um valor maior
   passa nos testes da maquina e so quebra em producao, com erro 1101. */
const ITERACOES = 100000;

/** PBKDF2-SHA256. Guardamos só o hash e o sal — a senha em si nunca é salva. */
export async function derivarHash(senha, sal) {
    const enc = new TextEncoder();
    const chave = await crypto.subtle.importKey('raw', enc.encode(senha), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits(
        { name: 'PBKDF2', salt: enc.encode(sal), iterations: ITERACOES, hash: 'SHA-256' },
        chave,
        256,
    );
    return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function aleatorio(bytes = 24) {
    const buf = new Uint8Array(bytes);
    crypto.getRandomValues(buf);
    return [...buf].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Comparação em tempo constante, para não vazar a senha pelo tempo de resposta. */
export function iguais(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
    let dif = 0;
    for (let i = 0; i < a.length; i++) dif |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return dif === 0;
}

/* ------------------------------------------------------------------- conta */

/** Lê a conta do KV; na primeira vez, cria a partir das variáveis de ambiente. */
export async function lerConta(env) {
    const bruto = await env.PAINEL.get('conta');
    if (bruto) return JSON.parse(bruto);

    const email = (env.ADMIN_EMAIL || 'metricasml2026@gmail.com').trim().toLowerCase();
    const senha = env.ADMIN_SENHA || 'painelmetricas2026';
    const sal = aleatorio(16);

    const conta = {
        email: email,
        sal: sal,
        hash: await derivarHash(senha, sal),
        criadaEm: new Date().toISOString(),
        atualizadaEm: new Date().toISOString(),
    };
    await env.PAINEL.put('conta', JSON.stringify(conta));
    return conta;
}

export async function salvarConta(env, conta) {
    conta.atualizadaEm = new Date().toISOString();
    await env.PAINEL.put('conta', JSON.stringify(conta));
}

/* ----------------------------------------------------------------- sessões */

export function lerCookie(request, nome) {
    const bruto = request.headers.get('Cookie') || '';
    for (const parte of bruto.split(';')) {
        const [k, ...v] = parte.trim().split('=');
        if (k === nome) return decodeURIComponent(v.join('='));
    }
    return null;
}

export function cookieSessao(token, apagar) {
    const base = `${COOKIE}=${apagar ? '' : token}; Path=/; HttpOnly; Secure; SameSite=Lax`;
    return apagar ? `${base}; Max-Age=0` : `${base}; Max-Age=${DIAS_SESSAO * 86400}`;
}

/** Descrição curta do aparelho, a partir do User-Agent. */
export function descreverDispositivo(ua) {
    const u = ua || '';
    let navegador = 'Navegador desconhecido';
    if (/Edg\//.test(u)) navegador = 'Edge';
    else if (/OPR\/|Opera/.test(u)) navegador = 'Opera';
    else if (/Chrome\//.test(u) && !/Chromium/.test(u)) navegador = 'Chrome';
    else if (/Firefox\//.test(u)) navegador = 'Firefox';
    else if (/Safari\//.test(u)) navegador = 'Safari';

    let sistema = 'Sistema desconhecido';
    if (/Windows NT 10/.test(u)) sistema = 'Windows';
    else if (/Windows/.test(u)) sistema = 'Windows';
    else if (/Android/.test(u)) sistema = 'Android';
    else if (/iPhone|iPad|iPod/.test(u)) sistema = 'iPhone/iPad';
    else if (/Mac OS X/.test(u)) sistema = 'macOS';
    else if (/Linux/.test(u)) sistema = 'Linux';

    const celular = /Android|iPhone|iPad|iPod|Mobile/.test(u);

    /* Sem User-Agent reconhecido (curl, script, bot): mostra o que veio, cortado,
       em vez de dois "desconhecido" que não ajudam a identificar o acesso. */
    if (navegador === 'Navegador desconhecido' && sistema === 'Sistema desconhecido') {
        const cru = u.split(/[\s(]/)[0] || 'Origem não identificada';
        return { navegador: cru.slice(0, 30), sistema: 'Fora do navegador', tipo: 'Outro' };
    }

    return { navegador, sistema, tipo: celular ? 'Celular' : 'Computador' };
}

export async function criarSessao(env, request) {
    const token = aleatorio(32);
    const ua = request.headers.get('User-Agent') || '';
    const agora = new Date().toISOString();

    const sessao = {
        token: token,
        criadaEm: agora,
        ultimoAcesso: agora,
        ip: request.headers.get('CF-Connecting-IP') || '',
        pais: (request.cf && request.cf.country) || '',
        userAgent: ua,
        ...descreverDispositivo(ua),
    };

    await env.PAINEL.put('sessao:' + token, JSON.stringify(sessao), {
        expirationTtl: DIAS_SESSAO * 86400,
    });
    return sessao;
}

/** Sessão válida da requisição, ou null. Atualiza o último acesso. */
export async function sessaoAtual(env, request) {
    const token = lerCookie(request, COOKIE);
    if (!token) return null;

    const bruto = await env.PAINEL.get('sessao:' + token);
    if (!bruto) return null;

    const sessao = JSON.parse(bruto);
    const agora = new Date().toISOString();

    /* Grava o último acesso no máximo uma vez por hora, para não escrever no
       KV a cada carregamento de página. */
    if (!sessao.ultimoAcesso || Date.now() - new Date(sessao.ultimoAcesso).getTime() > 3600000) {
        sessao.ultimoAcesso = agora;
        await env.PAINEL.put('sessao:' + token, JSON.stringify(sessao), {
            expirationTtl: DIAS_SESSAO * 86400,
        });
    }
    return sessao;
}

export async function listarSessoes(env) {
    const lista = await env.PAINEL.list({ prefix: 'sessao:' });
    const sessoes = [];
    for (const chave of lista.keys) {
        const bruto = await env.PAINEL.get(chave.name);
        if (bruto) sessoes.push(JSON.parse(bruto));
    }
    return sessoes.sort((a, b) => new Date(b.ultimoAcesso) - new Date(a.ultimoAcesso));
}

export async function apagarSessao(env, token) {
    await env.PAINEL.delete('sessao:' + token);
}

/* ---------------------------------------------------------------- resposta */

export function json(dados, extra = {}) {
    return new Response(JSON.stringify(dados), {
        status: extra.status || 200,
        headers: {
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
            ...(extra.cookie ? { 'Set-Cookie': extra.cookie } : {}),
        },
    });
}

/** Falta a vinculação do KV: devolve uma mensagem clara em vez de erro 500. */
export function semKV(env) {
    if (env && env.PAINEL) return null;
    return json(
        { ok: false, erro: 'kv-ausente', mensagem: 'O KV namespace PAINEL não está vinculado a este projeto no Cloudflare.' },
        { status: 503 },
    );
}
