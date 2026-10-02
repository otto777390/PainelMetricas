/* =============================================================================
   Porteiro das páginas protegidas
   =============================================================================

   Roda ANTES de qualquer arquivo estático ser entregue.

   A administração tem DUAS portas:
     1. sessão da conta (o login normal)
     2. a senha própria da área, pedida em /admin-entrar

   Sem a primeira, vai para o login. Sem a segunda, vai para a tela da senha do
   admin. Antes bastava clicar na engrenagem para cair direto na administração.

   O painel de métricas continua aberto por aqui de propósito: ele já tem o seu
   próprio guarda no navegador, e bloqueá-lo no servidor quebraria o modo local.
   ========================================================================== */

import { sessaoAtual } from './api/_comum.js';
import { estaLiberado } from './api/admin-acesso.js';

const PAGINA_ADMIN = ['/admin', '/admin.html'];
const PAGINA_SENHA_ADMIN = ['/admin-entrar', '/admin-entrar.html'];

export async function onRequest(contexto) {
    const { request, env, next } = contexto;
    const caminho = new URL(request.url).pathname.toLowerCase().replace(/\/+$/, '');

    const ehAdmin = PAGINA_ADMIN.indexOf(caminho) !== -1;
    const ehSenhaAdmin = PAGINA_SENHA_ADMIN.indexOf(caminho) !== -1;
    if (!ehAdmin && !ehSenhaAdmin) return next();

    const paraLogin = () => Response.redirect(new URL('/login', request.url).toString(), 302);

    /* Sem o KV não há como validar nada — nega, em vez de abrir sozinho. */
    if (!env.PAINEL) return paraLogin();

    const sessao = await sessaoAtual(env, request);
    if (!sessao) return paraLogin();

    const liberado = await estaLiberado(env, sessao.token);

    /* Já liberado e pedindo a tela da senha: manda direto para a administração. */
    if (ehSenhaAdmin && liberado) {
        return Response.redirect(new URL('/admin', request.url).toString(), 302);
    }

    /* Administração sem a segunda senha: vai pedir. */
    if (ehAdmin && !liberado) {
        return Response.redirect(new URL('/admin-entrar', request.url).toString(), 302);
    }

    return next();
}
