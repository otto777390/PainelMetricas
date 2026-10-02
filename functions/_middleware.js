/* =============================================================================
   Porteiro das páginas protegidas
   =============================================================================

   Roda ANTES de qualquer arquivo estático ser entregue. Sem sessão válida, a
   página de administração nem chega ao navegador — antes disso o HTML era
   servido para qualquer visitante, que via a tela (sem dados, mas via).

   O painel de métricas continua aberto por aqui de propósito: ele já tem o seu
   próprio guarda no navegador, e bloqueá-lo no servidor quebraria o modo local.
   ========================================================================== */

import { sessaoAtual } from './api/_comum.js';

/* Caminhos que exigem sessão para o próprio HTML ser entregue. */
const PROTEGIDOS = ['/admin', '/admin.html'];

export async function onRequest(contexto) {
    const { request, env, next } = contexto;
    const caminho = new URL(request.url).pathname.toLowerCase().replace(/\/+$/, '');

    if (PROTEGIDOS.indexOf(caminho) === -1) return next();

    /* Sem o KV vinculado não há como validar — nega, em vez de abrir sozinho. */
    if (!env.PAINEL) {
        return Response.redirect(new URL('/login', request.url).toString(), 302);
    }

    const sessao = await sessaoAtual(env, request);
    if (!sessao) {
        return Response.redirect(new URL('/login', request.url).toString(), 302);
    }

    return next();
}
