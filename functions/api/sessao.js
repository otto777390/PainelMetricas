/* GET /api/sessao — o guarda das páginas internas pergunta aqui se pode entrar. */
import { sessaoAtual, lerConta, json, semKV } from './_comum.js';

export async function onRequestGet({ request, env }) {
    const faltou = semKV(env);
    if (faltou) return faltou;

    const sessao = await sessaoAtual(env, request);
    if (!sessao) return json({ ok: false, autenticado: false }, { status: 401 });

    const conta = await lerConta(env);
    return json({ ok: true, autenticado: true, email: conta.email, desde: sessao.criadaEm });
}
