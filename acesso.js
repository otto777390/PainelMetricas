/* =============================================================================
   ACESSO DO PAINEL — lado do navegador
   =============================================================================

   A validação da senha acontece no servidor (functions/api/). Aqui só
   perguntamos "posso entrar?" e mostramos o resultado. A senha não existe
   neste arquivo, e o cookie da sessão é HttpOnly: o JavaScript não consegue
   lê-lo nem forjá-lo.

   MODO LOCAL: abrindo por file:// ou localhost sem as Functions, a API não
   responde. Nesse caso caímos para o acesso simples de antes, para continuar
   dando para desenvolver na máquina. Ele vale SÓ fora do site publicado.
   ========================================================================== */

(function (raiz) {
    'use strict';

    const PAGINA_LOGIN = 'login.html';
    const PAGINA_INICIAL = 'index.html';

    /* ---------------------------------------------------------- modo local */

    const CHAVE_LOCAL = 'painel-sessao';

    const ehLocal = location.protocol === 'file:'
        || ['localhost', '127.0.0.1', '[::1]'].indexOf(location.hostname) !== -1;

    function localLogado() {
        try { return localStorage.getItem(CHAVE_LOCAL) === 'ok'; } catch (e) { return false; }
    }

    /* ------------------------------------------------------------ chamadas */

    async function api(caminho, opcoes) {
        const resposta = await fetch('/api/' + caminho, Object.assign({
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
        }, opcoes || {}));

        let dados = {};
        try { dados = await resposta.json(); } catch (e) { /* sem corpo */ }
        dados.status = resposta.status;
        return dados;
    }

    /** true/false; null quando a API não existe (modo local). */
    async function verificarSessao() {
        try {
            const r = await api('sessao');
            if (r.erro === 'kv-ausente') return { indisponivel: true, mensagem: r.mensagem };
            return { autenticado: r.autenticado === true, email: r.email };
        } catch (e) {
            return { indisponivel: true };
        }
    }

    async function entrar(email, senha) {
        try {
            const r = await api('entrar', { method: 'POST', body: JSON.stringify({ email: email, senha: senha }) });

            if (r.erro === 'kv-ausente') {
                return { ok: false, mensagem: r.mensagem };
            }
            if (r.ok) return { ok: true };
            return { ok: false, mensagem: r.mensagem || 'E-mail ou senha incorretos.' };

        } catch (e) {
            /* Sem API (file:// ou localhost sem as Functions): libera, para dar
               para desenvolver na máquina. NÃO há senha guardada aqui — este
               arquivo é público no GitHub, e a senha de verdade mora só no
               servidor, como hash. Localmente os dados são simulados: não há
               nada a proteger. */
            if (ehLocal) {
                try { localStorage.setItem(CHAVE_LOCAL, 'ok'); } catch (e2) {}
                return { ok: true, local: true };
            }
            return { ok: false, mensagem: 'Não foi possível falar com o servidor. Tente de novo.' };
        }
    }

    async function sair() {
        try { await api('sair', { method: 'POST' }); } catch (e) { /* segue */ }
        try { localStorage.removeItem(CHAVE_LOCAL); } catch (e) { /* segue */ }
        location.replace(PAGINA_LOGIN);
    }

    /* -------------------------------------------------------------- guarda */

    /** Esconde a página até saber se pode mostrar, para o painel não piscar. */
    function esconder() {
        const estilo = document.createElement('style');
        estilo.id = 'guarda-acesso';
        estilo.textContent = 'html{visibility:hidden}';
        (document.head || document.documentElement).appendChild(estilo);
    }

    function revelar() {
        const estilo = document.getElementById('guarda-acesso');
        if (estilo) estilo.remove();
    }

    /** Chamado no <head> das páginas internas. */
    function exigirLogin() {
        esconder();

        verificarSessao().then(function (r) {
            if (r.autenticado) { revelar(); return; }

            /* API fora do ar: no site publicado isso é barreira, local não. */
            if (r.indisponivel) {
                if (ehLocal && localLogado()) { revelar(); return; }
                if (ehLocal) { location.replace(PAGINA_LOGIN); return; }
                revelar();
                return;
            }

            location.replace(PAGINA_LOGIN);
        }).catch(function () {
            if (ehLocal && localLogado()) { revelar(); return; }
            location.replace(PAGINA_LOGIN);
        });
    }

    /** Chamado no login: quem já entrou não precisa ver o formulário. */
    function pularSeLogado() {
        verificarSessao().then(function (r) {
            if (r.autenticado) { location.replace(PAGINA_INICIAL); return; }
            if (r.indisponivel && ehLocal && localLogado()) location.replace(PAGINA_INICIAL);
        }).catch(function () {
            if (ehLocal && localLogado()) location.replace(PAGINA_INICIAL);
        });
    }

    raiz.PainelAcesso = {
        entrar: entrar,
        sair: sair,
        exigirLogin: exigirLogin,
        pularSeLogado: pularSeLogado,
        verificarSessao: verificarSessao,
        api: api,
        ehLocal: ehLocal,
    };
})(typeof globalThis !== 'undefined' ? globalThis : this);
