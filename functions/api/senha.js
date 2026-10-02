/* POST /api/senha — troca a senha da conta.

   Diferente do acesso antigo, a troca vale para TODOS os dispositivos: a senha
   mora no servidor. E ela SEMPRE derruba as outras sessoes — quem continuava
   conectado com a senha antiga perde o acesso na hora. So o aparelho que fez a
   troca segue conectado. */
import { sessaoAtual, lerConta, salvarConta, derivarHash, iguais, aleatorio,
         listarSessoes, apagarSessao, json, semKV } from './_comum.js';

const MINIMO = 8;

export async function onRequestPost({ request, env }) {
    const faltou = semKV(env);
    if (faltou) return faltou;

    const atual = await sessaoAtual(env, request);
    if (!atual) return json({ ok: false, erro: 'nao-autenticado' }, { status: 401 });

    let corpo;
    try { corpo = await request.json(); } catch (e) { return json({ ok: false, erro: 'corpo-invalido' }, { status: 400 }); }

    const senhaAtual = String(corpo.senhaAtual || '');
    const senhaNova = String(corpo.senhaNova || '');

    if (senhaNova.length < MINIMO) {
        return json({ ok: false, erro: 'curta', mensagem: `A nova senha precisa de pelo menos ${MINIMO} caracteres.` }, { status: 400 });
    }

    const conta = await lerConta(env);
    const hashAtual = await derivarHash(senhaAtual, conta.sal);
    if (!iguais(hashAtual, conta.hash)) {
        return json({ ok: false, erro: 'senha-atual', mensagem: 'A senha atual está incorreta.' }, { status: 401 });
    }

    if (iguais(await derivarHash(senhaNova, conta.sal), conta.hash)) {
        return json({ ok: false, erro: 'repetida', mensagem: 'A nova senha é igual à atual.' }, { status: 400 });
    }

    /* Sal novo a cada troca: dois hashes da mesma senha nunca ficam iguais. */
    conta.sal = aleatorio(16);
    conta.hash = await derivarHash(senhaNova, conta.sal);
    await salvarConta(env, conta);

    /* Trocar a senha SEMPRE derruba os outros dispositivos. Sem exceção e sem
       parâmetro para pular: quem troca a senha quer justamente expulsar quem
       estava conectado com a antiga. */
    let encerradas = 0;
    for (const s of await listarSessoes(env)) {
        if (s.token === atual.token) continue;
        await apagarSessao(env, s.token);
        encerradas++;
    }

    return json({ ok: true, sessoesEncerradas: encerradas });
}
