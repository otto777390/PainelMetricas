/* POST /api/entrar — valida e-mail e senha no servidor e abre a sessão. */
import { lerConta, derivarHash, iguais, criarSessao, cookieSessao, json, semKV } from './_comum.js';

export async function onRequestPost({ request, env }) {
    const faltou = semKV(env);
    if (faltou) return faltou;

    let corpo;
    try { corpo = await request.json(); } catch (e) { return json({ ok: false, erro: 'corpo-invalido' }, { status: 400 }); }

    const email = String(corpo.email || '').trim().toLowerCase();
    const senha = String(corpo.senha || '');
    if (!email || !senha) return json({ ok: false, erro: 'faltam-campos' }, { status: 400 });

    const conta = await lerConta(env);
    const hash = await derivarHash(senha, conta.sal);

    /* Mensagem única para e-mail e senha: não entregamos qual dos dois errou. */
    if (email !== conta.email || !iguais(hash, conta.hash)) {
        return json({ ok: false, erro: 'credenciais' }, { status: 401 });
    }

    const sessao = await criarSessao(env, request);
    return json({ ok: true }, { cookie: cookieSessao(sessao.token) });
}
