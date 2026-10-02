/* POST /api/entrar — valida e-mail e senha no servidor e abre a sessão.
 *
 * Tem freio de força bruta: 5 erros seguidos do mesmo IP travam novas
 * tentativas por 15 minutos. Sem isso, uma senha de 18 caracteres não adianta —
 * basta deixar um script tentando a noite inteira.
 */
import { lerConta, derivarHash, iguais, criarSessao, cookieSessao,
         bloqueioRestante, registrarFalha, limparFalhas, json, semKV } from './_comum.js';

export async function onRequestPost({ request, env }) {
    const faltou = semKV(env);
    if (faltou) return faltou;

    const ip = request.headers.get('CF-Connecting-IP') || '';

    const preso = await bloqueioRestante(env, ip);
    if (preso > 0) {
        return json({
            ok: false,
            erro: 'bloqueado',
            mensagem: `Muitas tentativas. Tente de novo em ${preso} minuto${preso > 1 ? 's' : ''}.`,
        }, { status: 429 });
    }

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
        const restam = await registrarFalha(env, ip);
        return json({
            ok: false,
            erro: 'credenciais',
            mensagem: restam > 0 && restam <= 2
                ? `E-mail ou senha incorretos. Mais ${restam} tentativa${restam > 1 ? 's' : ''} antes do bloqueio.`
                : 'E-mail ou senha incorretos.',
        }, { status: 401 });
    }

    await limparFalhas(env, ip);
    const sessao = await criarSessao(env, request);
    return json({ ok: true }, { cookie: cookieSessao(sessao.token) });
}
