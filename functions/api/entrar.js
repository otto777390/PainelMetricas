/* POST /api/entrar — valida e-mail e senha no servidor e abre a sessão.
 *
 * Sem limite de tentativas, por escolha: o bloqueio depois de 5 erros estava
 * trancando o dono para fora. A proteção contra força bruta passa a ser o
 * tamanho da senha — 24 caracteres aleatórios não caem por tentativa cega.
 */
import { lerConta, derivarHash, iguais, criarSessao, cookieSessao, json, semKV } from './_comum.js';

export async function onRequestPost({ request, env }) {
    const faltou = semKV(env);
    if (faltou) return faltou;

    let corpo;
    try { corpo = await request.json(); } catch (e) { return json({ ok: false, erro: 'corpo-invalido' }, { status: 400 }); }

    const email = String(corpo.email || '').trim().toLowerCase();
    const senha = String(corpo.senha || '');
    if (!email || !senha) return json({ ok: false, erro: 'faltam-campos' }, { status: 400 });

    let conta;
    try {
        conta = await lerConta(env);
    } catch (e) {
        if (e && e.semConta) {
            return json({
                ok: false,
                erro: 'sem-conta',
                mensagem: 'Nenhuma conta configurada. Defina ADMIN_EMAIL e ADMIN_SENHA nas variáveis do projeto no Cloudflare.',
            }, { status: 503 });
        }
        throw e;
    }

    const hash = await derivarHash(senha, conta.sal);

    /* Mensagem única para e-mail e senha: não entregamos qual dos dois errou. */
    if (email !== conta.email || !iguais(hash, conta.hash)) {
        return json({ ok: false, erro: 'credenciais', mensagem: 'E-mail ou senha incorretos.' }, { status: 401 });
    }

    const sessao = await criarSessao(env, request);
    return json({ ok: true }, { cookie: cookieSessao(sessao.token) });
}
