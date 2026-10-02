/* GET  /api/dispositivos — lista as sessões abertas (dispositivos conectados).
   POST /api/dispositivos — encerra uma sessão (ou todas as outras).

   É este endpoint que torna "dispositivos conectados" real: cada login grava
   uma sessão no KV, então existe algo concreto para listar e derrubar. */
import { sessaoAtual, listarSessoes, apagarSessao, json, semKV } from './_comum.js';

export async function onRequestGet({ request, env }) {
    const faltou = semKV(env);
    if (faltou) return faltou;

    const atual = await sessaoAtual(env, request);
    if (!atual) return json({ ok: false, erro: 'nao-autenticado' }, { status: 401 });

    const sessoes = await listarSessoes(env);
    return json({
        ok: true,
        dispositivos: sessoes.map((s) => ({
            token: s.token,
            atual: s.token === atual.token,
            navegador: s.navegador,
            sistema: s.sistema,
            tipo: s.tipo,
            ip: s.ip,
            pais: s.pais,
            criadaEm: s.criadaEm,
            ultimoAcesso: s.ultimoAcesso,
        })),
    });
}

export async function onRequestPost({ request, env }) {
    const faltou = semKV(env);
    if (faltou) return faltou;

    const atual = await sessaoAtual(env, request);
    if (!atual) return json({ ok: false, erro: 'nao-autenticado' }, { status: 401 });

    let corpo;
    try { corpo = await request.json(); } catch (e) { return json({ ok: false, erro: 'corpo-invalido' }, { status: 400 }); }

    /* Derrubar todos os outros, mantendo este dispositivo conectado. */
    if (corpo.todosOsOutros) {
        const sessoes = await listarSessoes(env);
        let encerradas = 0;
        for (const s of sessoes) {
            if (s.token === atual.token) continue;
            await apagarSessao(env, s.token);
            encerradas++;
        }
        return json({ ok: true, encerradas: encerradas });
    }

    const alvo = String(corpo.token || '');
    if (!alvo) return json({ ok: false, erro: 'faltam-campos' }, { status: 400 });
    if (alvo === atual.token) {
        return json({ ok: false, erro: 'proprio-dispositivo', mensagem: 'Use Sair para encerrar este dispositivo.' }, { status: 400 });
    }

    await apagarSessao(env, alvo);
    return json({ ok: true, encerradas: 1 });
}
