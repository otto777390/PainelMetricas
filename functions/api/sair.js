/* POST /api/sair — encerra a sessão deste dispositivo. */
import { sessaoAtual, apagarSessao, cookieSessao, json, semKV } from './_comum.js';

export async function onRequestPost({ request, env }) {
    const faltou = semKV(env);
    if (faltou) return faltou;

    const sessao = await sessaoAtual(env, request);
    if (sessao) await apagarSessao(env, sessao.token);

    return json({ ok: true }, { cookie: cookieSessao('', true) });
}
