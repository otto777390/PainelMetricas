/* =============================================================================
   CREDENCIAIS E CONTROLE DE ACESSO DO PAINEL
   =============================================================================

   AVISO — isto NÃO é segurança de verdade.

   O painel é um site estático: todo o código roda no navegador de quem abre.
   Qualquer pessoa que aperte Ctrl+U ou F12 lê o e-mail e a senha abaixo, e
   quem digitar o endereço de index.html direto também entra. Isto serve para
   dar o fluxo de entrada e evitar acesso casual — nada além disso.

   Para virar acesso real seria preciso um servidor validando a senha e
   entregando as páginas só depois disso. Hoje não existe servidor no meio.
   ========================================================================== */

const ACESSOS = [
    { email: 'metricasml2026@gmail.com', senha: 'painelmetricas2026' }
];

(function (raiz) {
    'use strict';

    const CHAVE = 'painel-sessao';
    const PAGINA_LOGIN = 'login.html';
    const PAGINA_INICIAL = 'index.html';

    function normalizar(texto) {
        return String(texto || '').trim().toLowerCase();
    }

    function estaLogado() {
        try {
            return localStorage.getItem(CHAVE) === 'ok';
        } catch (e) {
            return false;
        }
    }

    function entrar(email, senha) {
        const alvo = normalizar(email);
        const valido = ACESSOS.some(function (conta) {
            return normalizar(conta.email) === alvo && conta.senha === String(senha);
        });
        if (!valido) return false;

        try { localStorage.setItem(CHAVE, 'ok'); } catch (e) { /* storage bloqueado */ }
        return true;
    }

    function sair() {
        try { localStorage.removeItem(CHAVE); } catch (e) { /* storage bloqueado */ }
        location.replace(PAGINA_LOGIN);
    }

    /** Chamado no <head> das páginas internas: sem sessão, volta para o login. */
    function exigirLogin() {
        if (!estaLogado()) location.replace(PAGINA_LOGIN);
    }

    /** Chamado no login: quem já entrou não precisa ver o formulário de novo. */
    function pularSeLogado() {
        if (estaLogado()) location.replace(PAGINA_INICIAL);
    }

    raiz.PainelAcesso = {
        estaLogado: estaLogado,
        entrar: entrar,
        sair: sair,
        exigirLogin: exigirLogin,
        pularSeLogado: pularSeLogado
    };
})(typeof globalThis !== 'undefined' ? globalThis : this);
