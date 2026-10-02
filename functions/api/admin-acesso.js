/* =============================================================================
   Segunda senha, só para a área de administração
   =============================================================================

   Entrar no painel de métricas não deve dar acesso à administração: antes
   bastava clicar na engrenagem. Agora a área pede uma senha própria.

   A liberação fica presa à sessão (chave adm:<token> no KV) e dura 60 minutos.
   Não é um cookie novo: assim ninguém reaproveita a liberação em outra sessão,
   e fechar a sessão derruba junto.

   A senha NÃO está no código — este repositório é público. Ela é definida por
   você na primeira vez que abrir a área, e guardada só como hash.
   ========================================================================== */

import { sessaoAtual, derivarHash, iguais, aleatorio, json, semKV } from './_comum.js';

const MINUTOS_LIBERADO = 60;
const MINIMO = 6;

function chaveLiberacao(token) {
    return 'adm:' + token;
}

export async function onRequestGet({ request, env }) {
    const faltou = semKV(env);
    if (faltou) return faltou;

    const sessao = await sessaoAtual(env, request);
    if (!sessao) return json({ ok: false, erro: 'nao-autenticado' }, { status: 401 });

    const guardada = await env.PAINEL.get('senha-admin');
    const liberado = await env.PAINEL.get(chaveLiberacao(sessao.token));

    return json({ ok: true, configurada: !!guardada, liberado: !!liberado });
}

export async function onRequestPost({ request, env }) {
    const faltou = semKV(env);
    if (faltou) return faltou;

    const sessao = await sessaoAtual(env, request);
    if (!sessao) return json({ ok: false, erro: 'nao-autenticado' }, { status: 401 });

    let corpo;
    try { corpo = await request.json(); } catch (e) { return json({ ok: false, erro: 'corpo-invalido' }, { status: 400 }); }
    const senha = String(corpo.senha || '');

    const bruto = await env.PAINEL.get('senha-admin');

    /* Primeira vez: quem já tem sessão válida é o dono, então define a senha. */
    if (!bruto) {
        if (senha.length < MINIMO) {
            return json({ ok: false, erro: 'curta', mensagem: `Use pelo menos ${MINIMO} caracteres.` }, { status: 400 });
        }
        const sal = aleatorio(16);
        await env.PAINEL.put('senha-admin', JSON.stringify({
            sal: sal,
            hash: await derivarHash(senha, sal),
            criadaEm: new Date().toISOString(),
        }));
        await env.PAINEL.put(chaveLiberacao(sessao.token), '1', { expirationTtl: MINUTOS_LIBERADO * 60 });
        return json({ ok: true, criada: true });
    }

    const reg = JSON.parse(bruto);
    const hash = await derivarHash(senha, reg.sal);
    if (!iguais(hash, reg.hash)) {
        return json({ ok: false, erro: 'senha', mensagem: 'Senha incorreta.' }, { status: 401 });
    }

    await env.PAINEL.put(chaveLiberacao(sessao.token), '1', { expirationTtl: MINUTOS_LIBERADO * 60 });
    return json({ ok: true, minutos: MINUTOS_LIBERADO });
}

/* DELETE — tranca a área de novo sem sair da conta. */
export async function onRequestDelete({ request, env }) {
    const faltou = semKV(env);
    if (faltou) return faltou;

    const sessao = await sessaoAtual(env, request);
    if (sessao) await env.PAINEL.delete(chaveLiberacao(sessao.token));
    return json({ ok: true });
}

/** Usada pelo middleware: esta sessão já passou pela segunda senha? */
export async function estaLiberado(env, token) {
    return !!(await env.PAINEL.get(chaveLiberacao(token)));
}
