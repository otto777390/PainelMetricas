/* GET /api/sessao — o guarda das páginas internas pergunta aqui se pode entrar. */
import { sessaoAtual, lerConta, json, semKV } from './_comum.js';

export async function onRequestGet({ request, env }) {
    const faltou = semKV(env);
    if (faltou) return faltou;

    const sessao = await sessaoAtual(env, request);
    if (!sessao) return json({ ok: false, autenticado: false }, { status: 401 });

    /* A sessão já prova o acesso; o e-mail é só para exibir. Se a conta sumiu
       do KV, não derruba a resposta por causa de um rótulo. */
    let email = '';
    try { email = (await lerConta(env)).email; } catch (e) { /* segue sem o rótulo */ }

    return json({ ok: true, autenticado: true, email: email, desde: sessao.criadaEm });
}
